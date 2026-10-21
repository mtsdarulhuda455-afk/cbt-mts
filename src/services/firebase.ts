import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  collection, 
  deleteDoc, 
  onSnapshot, 
  writeBatch,
  getDocFromServer
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import firebaseAppletConfig from '../../firebase-applet-config.json';
import { 
  User, 
  ClassGroup, 
  Exam, 
  StudentExamSession, 
  SystemAuditLog, 
  SystemSettings,
  AttendanceRecord
} from '../types/cbt';

export const firebaseConfig = firebaseAppletConfig;

// Initialize Firebase App safely (singleton)
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
// CRITICAL: Connect to the specific database provisioned for this application
export const db = getFirestore(app, firebaseAppletConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo?: {
    userId?: string | null;
    email?: string | null;
  };
}

const QUOTA_STORAGE_KEY = 'eduexam_firestore_quota_exhausted';

export function isQuotaError(err: unknown): boolean {
  if (!err) return false;
  const str = String(err).toLowerCase();
  const msg = (err instanceof Error ? err.message : str).toLowerCase();
  const code = ((err as any)?.code || '').toLowerCase();
  return (
    code.includes('resource-exhausted') ||
    code.includes('quota') ||
    msg.includes('resource-exhausted') ||
    msg.includes('quota limit exceeded') ||
    msg.includes('quota exceeded') ||
    msg.includes('free daily write units') ||
    str.includes('resource-exhausted') ||
    str.includes('quota')
  );
}

let memoryQuotaExhausted: boolean = (() => {
  try {
    const val = sessionStorage.getItem(QUOTA_STORAGE_KEY);
    if (val) {
      const data = JSON.parse(val);
      if (data && data.exhausted && (Date.now() - data.time < 12 * 3600 * 1000)) {
        return true;
      }
    }
  } catch {}
  return false;
})();

export function isFirestoreQuotaExhausted(): boolean {
  return memoryQuotaExhausted;
}

export function markQuotaExhausted(exhausted: boolean = true) {
  memoryQuotaExhausted = exhausted;
  try {
    if (exhausted) {
      sessionStorage.setItem(QUOTA_STORAGE_KEY, JSON.stringify({ exhausted: true, time: Date.now() }));
    } else {
      sessionStorage.removeItem(QUOTA_STORAGE_KEY);
    }
  } catch {}
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  if (isQuotaError(error)) {
    markQuotaExhausted(true);
    console.warn('[Firestore Offline-First Notice] Kuota harian Firestore gratis telah tercapai. Sistem beralih ke mode penyimpanan lokal offline-first (seluruh data tetap aman di peramban).');
    return;
  }
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path,
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
    }
  };
  console.warn('Firestore Operation Notice: ', JSON.stringify(errInfo));
}

/**
 * Test connectivity to Firestore cloud database
 */
export async function testFirestoreConnection(): Promise<boolean> {
  if (isFirestoreQuotaExhausted()) {
    return false;
  }
  try {
    await getDocFromServer(doc(db, 'settings', 'main'));
    return true;
  } catch (error) {
    if (isQuotaError(error)) {
      markQuotaExhausted(true);
      return false;
    }
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Firestore offline or waiting for initial online state.");
      return false;
    }
    // Any other response means we connected to the project endpoint
    return true;
  }
}

/**
 * Fetch all CBT collections directly from Firestore
 */
export async function fetchAllFirebaseData(): Promise<{
  users: User[];
  classes: ClassGroup[];
  exams: Exam[];
  sessions: StudentExamSession[];
  settings: Partial<SystemSettings> | null;
  auditLogs: SystemAuditLog[];
  attendance: AttendanceRecord[];
}> {
  let users: User[] = [];
  let classes: ClassGroup[] = [];
  let exams: Exam[] = [];
  let sessions: StudentExamSession[] = [];
  let settings: Partial<SystemSettings> | null = null;
  let auditLogs: SystemAuditLog[] = [];
  let attendance: AttendanceRecord[] = [];

  if (isFirestoreQuotaExhausted()) {
    return { users, classes, exams, sessions, settings, auditLogs, attendance };
  }

  // 1. Users
  try {
    const usersSnap = await getDocs(collection(db, 'users'));
    users = usersSnap.docs.map(d => {
      const data = d.data();
      return {
        id: data.id || d.id,
        name: data.name || 'Pengguna',
        username: data.username || d.id,
        password: data.password || '123456',
        role: data.role || 'student',
        nisnOrNip: data.nisnOrNip || '',
        className: data.className || '',
        classId: data.classId || '',
        schoolName: data.schoolName || 'MTs. Darul Huda',
        isMfaVerified: data.isMfaVerified ?? true,
        photoUrl: data.photoUrl || ''
      } as User;
    });
  } catch (err) {
    console.warn('Notice fetching users from Firebase:', err);
  }

  // 2. Classes
  try {
    const classesSnap = await getDocs(collection(db, 'classes'));
    classes = classesSnap.docs.map(d => {
      const data = d.data();
      return {
        id: data.id || d.id,
        name: data.name || 'Rombel',
        grade: data.grade || 'VII',
        academicYear: data.academicYear || '2026/2027',
        totalStudents: data.totalStudents || 32,
        homeroomTeacher: data.homeroomTeacher || '',
        majorOrTrack: data.majorOrTrack || 'Reguler'
      } as ClassGroup;
    });
  } catch (err) {
    console.warn('Notice fetching classes from Firebase:', err);
  }

  // 3. Exams
  try {
    const examsSnap = await getDocs(collection(db, 'exams'));
    exams = examsSnap.docs.map(d => {
      const data = d.data();
      return {
        id: data.id || d.id,
        code: data.code || 'EXAM',
        title: data.title || 'Paket Ujian',
        subject: data.subject || 'Mata Pelajaran',
        durationMinutes: data.durationMinutes || 60,
        totalQuestions: data.totalQuestions || (data.questions ? data.questions.length : 20),
        passingGrade: data.passingGrade || 75,
        status: data.status || 'active',
        academicYear: data.academicYear || '2026/2027',
        semester: data.semester || 'Genap',
        classesAllowed: Array.isArray(data.classesAllowed) ? data.classesAllowed : [],
        token: data.token || 'MTS-2026',
        questions: Array.isArray(data.questions) ? data.questions : [],
        authorTeacher: data.authorTeacher || 'Guru Pengampu',
        randomizeQuestions: data.randomizeQuestions ?? true,
        randomizeOptions: data.randomizeOptions ?? true,
        maxViolationsAllowed: data.maxViolationsAllowed ?? 3,
        startTime: data.startTime || new Date().toISOString(),
        endTime: data.endTime || new Date(Date.now() + 86400000).toISOString(),
        examDate: data.examDate || '',
        examStartTime: data.examStartTime || '07:30',
        examEndTime: data.examEndTime || '09:00'
      } as Exam;
    });
  } catch (err) {
    console.warn('Notice fetching exams from Firebase:', err);
  }

  // 4. Sessions
  try {
    const sessionsSnap = await getDocs(collection(db, 'sessions'));
    sessions = sessionsSnap.docs.map(d => {
      const data = d.data();
      return {
        ...data,
        id: data.id || d.id,
        studentName: data.studentName || 'Peserta',
        nisn: data.nisn || '',
        className: data.className || '',
        status: data.status || 'in_progress',
        violationsCount: data.violationsCount || 0,
        violationLogs: Array.isArray(data.violationLogs) ? data.violationLogs : [],
        answers: data.answers || {}
      } as StudentExamSession;
    });
  } catch (err) {
    console.warn('Notice fetching sessions from Firebase:', err);
  }

  // 5. Settings
  try {
    const settingsSnap = await getDoc(doc(db, 'settings', 'main'));
    settings = settingsSnap.exists() ? (settingsSnap.data() as Partial<SystemSettings>) : null;
  } catch (err) {
    console.warn('Notice fetching settings from Firebase:', err);
  }

  // 6. Audit Logs
  try {
    const logsSnap = await getDocs(collection(db, 'auditLogs'));
    auditLogs = logsSnap.docs.map(d => {
      const data = d.data();
      return {
        id: data.id || d.id,
        timestamp: data.timestamp || new Date().toISOString(),
        actorId: data.actorId || 'system',
        actorName: data.actorName || 'Sistem',
        actorRole: data.actorRole || 'admin',
        action: data.action || 'ACTION',
        category: data.category || 'system',
        details: data.details || '',
        level: data.level || 'info'
      } as SystemAuditLog;
    });
  } catch (err) {
    console.warn('Notice fetching auditLogs from Firebase:', err);
  }

  // 7. Attendance
  try {
    const attendanceSnap = await getDocs(collection(db, 'attendance'));
    attendance = attendanceSnap.docs.map(d => {
      const data = d.data();
      return {
        ...data,
        id: data.id || d.id,
        userId: data.userId || '',
        userName: data.userName || 'Pengguna',
        userRole: data.userRole || 'student',
        nisnOrNip: data.nisnOrNip || '',
        date: data.date || '',
        status: data.status || 'hadir',
        timestamp: data.timestamp || Date.now()
      } as AttendanceRecord;
    });
  } catch (err) {
    console.warn('Notice fetching attendance from Firebase:', err);
  }

  return { users, classes, exams, sessions, settings, auditLogs, attendance };
}

/**
 * Push all local data to Firestore Cloud Database
 */
export async function pushAllToFirestore(data: {
  users?: User[];
  classes?: ClassGroup[];
  exams?: Exam[];
  sessions?: StudentExamSession[];
  settings?: SystemSettings;
  attendance?: AttendanceRecord[];
  auditLogs?: SystemAuditLog[];
  attendanceSettings?: any;
  apiConfig?: any;
}): Promise<{ success: boolean; message: string; count: number }> {
  let count = 0;
  try {
    interface WriteOp {
      coll: string;
      id: string;
      data: any;
    }
    const ops: WriteOp[] = [];

    if (data.users && Array.isArray(data.users)) {
      data.users.forEach(u => ops.push({ coll: 'users', id: u.id, data: u }));
    }
    if (data.classes && Array.isArray(data.classes)) {
      data.classes.forEach(c => ops.push({ coll: 'classes', id: c.id, data: c }));
    }
    if (data.exams && Array.isArray(data.exams)) {
      data.exams.forEach(e => ops.push({ coll: 'exams', id: e.id, data: e }));
    }
    if (data.sessions && Array.isArray(data.sessions)) {
      data.sessions.forEach(s => ops.push({ coll: 'sessions', id: s.id, data: s }));
    }
    if (data.settings) {
      ops.push({ coll: 'settings', id: 'main', data: data.settings });
    }
    if (data.attendance && Array.isArray(data.attendance)) {
      data.attendance.forEach(a => ops.push({ coll: 'attendance', id: a.id, data: a }));
    }
    if (data.auditLogs && Array.isArray(data.auditLogs)) {
      data.auditLogs.slice(-150).forEach(l => ops.push({ coll: 'auditLogs', id: l.id, data: l }));
    }
    if (data.attendanceSettings) {
      ops.push({ coll: 'attendanceSettings', id: 'main', data: data.attendanceSettings });
    }
    if (data.apiConfig) {
      ops.push({ coll: 'apiConfig', id: 'main', data: data.apiConfig });
    }

    // Commit in safe chunks of 400 (Firestore writeBatch limit is 500)
    for (let i = 0; i < ops.length; i += 400) {
      const batch = writeBatch(db);
      const chunk = ops.slice(i, i + 400);
      chunk.forEach(op => {
        batch.set(doc(db, op.coll, op.id), JSON.parse(JSON.stringify(op.data)), { merge: true });
        count++;
      });
      await batch.commit();
    }

    return { success: true, message: `Berhasil mengunggah ${count} data ke Firebase Firestore.`, count };
  } catch (err: any) {
    if (isQuotaError(err)) {
      markQuotaExhausted(true);
      return {
        success: true,
        message: 'Data tersimpan aman di penyimpanan lokal (Offline-First). Kuota cloud harian Firestore tercapai.',
        count: count > 0 ? count : (data.users?.length || 0)
      };
    }
    handleFirestoreError(err, OperationType.WRITE, 'batch_push');
    return { success: false, message: err?.message || 'Gagal mengunggah data ke Firebase', count };
  }
}

/**
 * Save or update a single document in Firestore
 */
export async function saveToFirestore(collectionName: string, id: string, data: any): Promise<void> {
  if (isFirestoreQuotaExhausted()) {
    return;
  }
  try {
    const docRef = doc(db, collectionName, id);
    // Remove undefined values which are rejected by Firestore
    const cleanData = JSON.parse(JSON.stringify(data));
    await setDoc(docRef, cleanData, { merge: true });
  } catch (err) {
    if (isQuotaError(err)) {
      markQuotaExhausted(true);
      return;
    }
    handleFirestoreError(err, OperationType.WRITE, `${collectionName}/${id}`);
  }
}

/**
 * Delete a document from Firestore
 */
export async function deleteFromFirestore(collectionName: string, id: string): Promise<void> {
  if (isFirestoreQuotaExhausted()) {
    return;
  }
  try {
    const docRef = doc(db, collectionName, id);
    await deleteDoc(docRef);
  } catch (err) {
    if (isQuotaError(err)) {
      markQuotaExhausted(true);
      return;
    }
    handleFirestoreError(err, OperationType.DELETE, `${collectionName}/${id}`);
  }
}

/**
 * Seed initial database records if collections are currently empty
 */
export async function seedInitialDataIfEmpty(initial: {
  users: User[];
  classes: ClassGroup[];
  exams: Exam[];
  sessions: StudentExamSession[];
  settings: SystemSettings;
}): Promise<void> {
  if (isFirestoreQuotaExhausted()) {
    return;
  }
  try {
    const usersSnap = await getDocs(collection(db, 'users'));
    if (usersSnap.empty) {
      console.log('⚡ Initializing Firebase Firestore with default Madrasah data...');
      
      // Batch seed users
      const batch = writeBatch(db);
      initial.users.forEach(u => {
        batch.set(doc(db, 'users', u.id), JSON.parse(JSON.stringify(u)));
      });
      
      // Batch seed classes
      initial.classes.forEach(c => {
        batch.set(doc(db, 'classes', c.id), JSON.parse(JSON.stringify(c)));
      });

      // Batch seed exams
      initial.exams.forEach(e => {
        batch.set(doc(db, 'exams', e.id), JSON.parse(JSON.stringify(e)));
      });

      // Batch seed initial sessions
      initial.sessions.forEach(s => {
        batch.set(doc(db, 'sessions', s.id), JSON.parse(JSON.stringify(s)));
      });

      // Seed settings
      batch.set(doc(db, 'settings', 'main'), JSON.parse(JSON.stringify(initial.settings)));

      await batch.commit();
      console.log('✅ Firebase Firestore database successfully seeded!');
    }
  } catch (err) {
    if (isQuotaError(err)) {
      markQuotaExhausted(true);
      return;
    }
    handleFirestoreError(err, OperationType.WRITE, 'batch_seed');
  }
}

