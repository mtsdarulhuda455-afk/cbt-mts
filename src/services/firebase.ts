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

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
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
  try {
    await getDocFromServer(doc(db, 'settings', 'main'));
    return true;
  } catch (error) {
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
  users: User[];
  classes: ClassGroup[];
  exams: Exam[];
  sessions: StudentExamSession[];
  settings: SystemSettings;
  attendance: AttendanceRecord[];
}): Promise<{ success: boolean; message: string; count: number }> {
  let count = 0;
  try {
    const batch = writeBatch(db);
    data.users.forEach(u => {
      batch.set(doc(db, 'users', u.id), JSON.parse(JSON.stringify(u)), { merge: true });
      count++;
    });
    data.classes.forEach(c => {
      batch.set(doc(db, 'classes', c.id), JSON.parse(JSON.stringify(c)), { merge: true });
      count++;
    });
    data.exams.forEach(e => {
      batch.set(doc(db, 'exams', e.id), JSON.parse(JSON.stringify(e)), { merge: true });
      count++;
    });
    data.sessions.forEach(s => {
      batch.set(doc(db, 'sessions', s.id), JSON.parse(JSON.stringify(s)), { merge: true });
      count++;
    });
    batch.set(doc(db, 'settings', 'main'), JSON.parse(JSON.stringify(data.settings)), { merge: true });
    count++;
    data.attendance.forEach(a => {
      batch.set(doc(db, 'attendance', a.id), JSON.parse(JSON.stringify(a)), { merge: true });
      count++;
    });

    await batch.commit();
    return { success: true, message: `Berhasil mengunggah ${count} data ke Firebase Firestore.`, count };
  } catch (err: any) {
    handleFirestoreError(err, OperationType.WRITE, 'batch_push');
    return { success: false, message: err?.message || 'Gagal mengunggah data ke Firebase', count };
  }
}

/**
 * Save or update a single document in Firestore
 */
export async function saveToFirestore(collectionName: string, id: string, data: any): Promise<void> {
  try {
    const docRef = doc(db, collectionName, id);
    // Remove undefined values which are rejected by Firestore
    const cleanData = JSON.parse(JSON.stringify(data));
    await setDoc(docRef, cleanData, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${collectionName}/${id}`);
  }
}

/**
 * Delete a document from Firestore
 */
export async function deleteFromFirestore(collectionName: string, id: string): Promise<void> {
  try {
    const docRef = doc(db, collectionName, id);
    await deleteDoc(docRef);
  } catch (err) {
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
    handleFirestoreError(err, OperationType.WRITE, 'batch_seed');
  }
}

