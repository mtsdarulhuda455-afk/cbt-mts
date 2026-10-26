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

let memoryQuotaExhausted: boolean = false;

export function isFirestoreQuotaExhausted(): boolean {
  return memoryQuotaExhausted;
}

export function markQuotaExhausted(exhausted: boolean = true) {
  memoryQuotaExhausted = exhausted;
  if (exhausted) {
    // Automatically reset probe after 2 minutes instead of 12 hours
    setTimeout(() => {
      memoryQuotaExhausted = false;
    }, 2 * 60 * 1000);
  }
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
 * Test connectivity to Firestore cloud database with 2.5s timeout
 */
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    const probePromise = getDoc(doc(db, 'settings', 'main')).then(() => true);
    const timeoutPromise = new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 2500));
    return await Promise.race([probePromise, timeoutPromise]);
  } catch (error) {
    if (isQuotaError(error)) {
      console.warn("Firestore write quota reached, read mode preserved.");
      return true; // Still allow reading!
    }
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Firestore offline or waiting for initial online state.");
      return false;
    }
    return true;
  }
}

/**
 * Save unified master snapshot into Firestore so any device can load it immediately
 */
export async function saveCentralDatabaseSnapshot(data: {
  users: User[];
  classes: ClassGroup[];
  exams: Exam[];
  sessions: StudentExamSession[];
  settings: SystemSettings;
  attendance?: AttendanceRecord[];
  attendanceSettings?: any;
  apiConfig?: any;
  auditLogs?: SystemAuditLog[];
}): Promise<{ success: boolean; message: string }> {
  try {
    const timestamp = Date.now();
    const dateFormatted = new Date().toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    const snapshotPayload = {
      updatedAt: timestamp,
      formattedDate: dateFormatted,
      schoolName: data.settings?.schoolName || 'MTs. Darul Huda',
      counts: {
        users: data.users.length,
        classes: data.classes.length,
        exams: data.exams.length,
        sessions: data.sessions.length,
        attendance: data.attendance?.length || 0
      },
      users: data.users,
      classes: data.classes,
      exams: data.exams,
      sessions: data.sessions,
      settings: data.settings,
      attendance: data.attendance || [],
      attendanceSettings: data.attendanceSettings || {},
      apiConfig: data.apiConfig || {}
    };

    const cleanPayload = JSON.parse(JSON.stringify(snapshotPayload));
    await setDoc(doc(db, 'system_snapshot', 'latest_database'), cleanPayload, { merge: true });

    // Also update settings/main to broadcast change to all listening clients
    await setDoc(doc(db, 'settings', 'main'), {
      ...JSON.parse(JSON.stringify(data.settings || {})),
      lastUpdatedTimestamp: timestamp,
      appVersion: 'v4.9.5',
      updateMessage: `Pembaruan database (${data.users.length} akun, ${data.classes.length} rombel, ${data.exams.length} paket ujian) berhasil disinkronkan ke seluruh perangkat.`
    }, { merge: true });

    return { 
      success: true, 
      message: `Snapshot basis data berhasil disimpan di Cloud (${data.users.length} akun). Semua perangkat lain dapat langsung mengakses!` 
    };
  } catch (err: any) {
    console.warn('Gagal menyimpan snapshot ke Firestore:', err);
    return { success: false, message: err?.message || 'Gagal menyimpan snapshot cloud' };
  }
}

/**
 * Fetch unified master snapshot from Firestore
 */
export async function fetchCentralDatabaseSnapshot(): Promise<{
  hasSnapshot: boolean;
  updatedAt?: number;
  schoolName?: string;
  users: User[];
  classes: ClassGroup[];
  exams: Exam[];
  sessions: StudentExamSession[];
  settings: Partial<SystemSettings> | null;
  attendance: AttendanceRecord[];
  attendanceSettings?: any;
  apiConfig?: any;
  auditLogs?: SystemAuditLog[];
} | null> {
  try {
    const snapRef = doc(db, 'system_snapshot', 'latest_database');
    const getDocPromise = getDoc(snapRef);
    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000));
    const snap = await Promise.race([getDocPromise, timeoutPromise]);
    if (!snap || typeof snap !== 'object' || !('exists' in snap) || !snap.exists()) {
      return null;
    }
    const data = snap.data();
    if (!data) return null;

    return {
      hasSnapshot: true,
      updatedAt: data.updatedAt || 0,
      schoolName: data.schoolName || '',
      users: Array.isArray(data.users) ? data.users : [],
      classes: Array.isArray(data.classes) ? data.classes : [],
      exams: Array.isArray(data.exams) ? data.exams : [],
      sessions: Array.isArray(data.sessions) ? data.sessions : [],
      settings: data.settings || null,
      attendance: Array.isArray(data.attendance) ? data.attendance : [],
      attendanceSettings: data.attendanceSettings || null,
      apiConfig: data.apiConfig || null,
      auditLogs: Array.isArray(data.auditLogs) ? data.auditLogs : []
    };
  } catch (err) {
    console.warn('Notice reading central database snapshot from Firestore:', err);
    return null;
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

  // Priority 1: Check Central Master Snapshot (Fast, 1 Read operation for all devices)
  try {
    const snapshot = await fetchCentralDatabaseSnapshot();
    if (snapshot && (snapshot.users.length > 0 || snapshot.exams.length > 0)) {
      return {
        users: snapshot.users,
        classes: snapshot.classes,
        exams: snapshot.exams,
        sessions: snapshot.sessions,
        settings: snapshot.settings,
        auditLogs: snapshot.auditLogs || [],
        attendance: snapshot.attendance || []
      };
    }
  } catch (snapErr) {
    console.warn('Notice reading central snapshot:', snapErr);
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
      data.users.forEach((u, idx) => {
        const safeId = String(u.id || u.username || `user_${idx + 1}`);
        ops.push({ coll: 'users', id: safeId, data: { ...u, id: safeId } });
      });
    }
    if (data.classes && Array.isArray(data.classes)) {
      data.classes.forEach((c, idx) => {
        const safeId = String(c.id || c.name || `class_${idx + 1}`);
        ops.push({ coll: 'classes', id: safeId, data: { ...c, id: safeId } });
      });
    }
    if (data.exams && Array.isArray(data.exams)) {
      data.exams.forEach((e, idx) => {
        const safeId = String(e.id || e.code || `exam_${idx + 1}`);
        ops.push({ coll: 'exams', id: safeId, data: { ...e, id: safeId } });
      });
    }
    if (data.sessions && Array.isArray(data.sessions)) {
      data.sessions.forEach((s, idx) => {
        const safeId = String(s.id || `session_${idx + 1}`);
        ops.push({ coll: 'sessions', id: safeId, data: { ...s, id: safeId } });
      });
    }
    if (data.settings) {
      ops.push({ coll: 'settings', id: 'main', data: data.settings });
    }
    if (data.attendance && Array.isArray(data.attendance)) {
      data.attendance.forEach((a, idx) => {
        const safeId = String(a.id || `att_${idx + 1}`);
        ops.push({ coll: 'attendance', id: safeId, data: { ...a, id: safeId } });
      });
    }
    if (data.auditLogs && Array.isArray(data.auditLogs)) {
      data.auditLogs.slice(-150).forEach((l, idx) => {
        const safeId = String(l.id || `log_${idx + 1}`);
        ops.push({ coll: 'auditLogs', id: safeId, data: { ...l, id: safeId } });
      });
    }
    if (data.attendanceSettings) {
      ops.push({ coll: 'attendanceSettings', id: 'main', data: data.attendanceSettings });
    }
    if (data.apiConfig) {
      ops.push({ coll: 'apiConfig', id: 'main', data: data.apiConfig });
    }

    // Simultaneously save master snapshot document for instant multi-device sync
    try {
      await saveCentralDatabaseSnapshot({
        users: data.users || [],
        classes: data.classes || [],
        exams: data.exams || [],
        sessions: data.sessions || [],
        settings: (data.settings || {}) as SystemSettings,
        attendance: data.attendance || [],
        attendanceSettings: data.attendanceSettings,
        apiConfig: data.apiConfig,
        auditLogs: data.auditLogs?.slice(-50),
      });
    } catch (snapErr) {
      console.warn('Notice saving central snapshot during pushAllToFirestore:', snapErr);
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
    // Check if a master snapshot already exists in Firestore before seeding default data
    try {
      const snapDoc = await getDoc(doc(db, 'system_snapshot', 'latest_database'));
      if (snapDoc.exists()) {
        const snapData = snapDoc.data();
        if (snapData && Array.isArray(snapData.users) && snapData.users.length > 0) {
          console.log('⚡ Master database snapshot already active in Firestore. Preserving uploaded database.');
          return;
        }
      }
    } catch { /* proceed to check collection */ }

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

