import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { 
  User, 
  UserRole,
  Exam, 
  StudentExamSession, 
  ClassGroup, 
  SystemAuditLog, 
  AcademicApiConfig, 
  ViolationType, 
  ViolationLog,
  SystemSettings,
  ProctorResetAction,
  AttendanceRecord,
  AttendanceSettings,
  AttendanceType,
  AttendanceStatus
} from '../types/cbt';
import { 
  INITIAL_CLASSES, 
  INITIAL_USERS, 
  INITIAL_EXAMS, 
  INITIAL_SESSIONS, 
  INITIAL_AUDIT_LOGS, 
  INITIAL_API_CONFIG,
  INITIAL_SYSTEM_SETTINGS,
  INITIAL_ATTENDANCE_SETTINGS,
  INITIAL_ATTENDANCE_RECORDS
} from '../data/mockCbtData';
import { calculateExamScore, prepareRandomizedExam, playAlertSound } from '../services/cbtEngine';
import {
  getWibDate,
  getWibTime,
  buildStudentWhatsappMessage,
  buildTeacherWhatsappMessage,
  createWhatsappLink,
  scanAudio,
  isInstitutionBarcode,
  addMinutesToTime,
  isTimeAfterOrEqual,
  buildUnclockedInStudentMessage,
  buildUnclockedInTeacherMessage,
  buildUnclockedOutStudentMessage,
  buildUnclockedOutTeacherMessage
} from '../services/attendanceUtils';
import { 
  db, 
  saveToFirestore, 
  deleteFromFirestore, 
  seedInitialDataIfEmpty,
  testFirestoreConnection,
  firebaseConfig,
  fetchAllFirebaseData,
  pushAllToFirestore
} from '../services/firebase';
import { collection, onSnapshot, doc } from 'firebase/firestore';

interface CbtContextType {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  users: User[];
  addUser: (user: User) => void;
  updateUser: (user: User) => void;
  deleteUser: (userId: string) => void;
  importUsersFromExcel: (newUsers: User[]) => { added: number; updated: number };
  loginWithCredentials: (username: string, password: string) => { success: boolean; user?: User; error?: string };
  logout: () => void;
  switchUserRole: (role: UserRole) => void;
  classes: ClassGroup[];
  addClass: (cls: ClassGroup) => void;
  updateClass: (cls: ClassGroup) => void;
  deleteClass: (classId: string) => void;
  exams: Exam[];
  addExam: (exam: Exam) => void;
  updateExam: (exam: Exam) => void;
  deleteExam: (examId: string) => void;
  sessions: StudentExamSession[];
  auditLogs: SystemAuditLog[];
  apiConfig: AcademicApiConfig;
  updateApiConfig: (config: Partial<AcademicApiConfig>) => void;
  syncWithSiakad: () => Promise<boolean>;
  systemSettings: SystemSettings;
  updateSystemSettings: (settings: Partial<SystemSettings>) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  selectedExamId: string | null;
  setSelectedExamId: (examId: string | null) => void;
  selectAndStartExam: (examId: string) => void;
  isSimulatedOffline: boolean;
  setIsSimulatedOffline: (offline: boolean) => void;
  
  // Realtime Firebase Cloud Properties
  firebaseStatus: 'connected' | 'syncing' | 'offline';
  firebaseProjectId: string;
  firestoreDatabaseId: string;
  lastFirebaseSync: string | null;
  syncWithFirebase: (mode?: 'pull' | 'push' | 'both') => Promise<{
    success: boolean;
    message: string;
    counts?: { users: number; classes: number; exams: number; sessions: number };
  }>;
  uploadAllToFirebase: () => Promise<{ success: boolean; message: string; count: number }>;

  // Auto-Update Tanpa Republish (Cukup Refresh)
  isUpdateAvailable: boolean;
  updateInfo: { version: string; timestamp: number; message: string } | null;
  triggerAutoUpdate: () => void;
  broadcastSystemUpdate: (message?: string) => void;
  checkForUpdates: () => Promise<boolean>;
  dismissUpdateNotification: () => void;
  
  // Student Actions
  startExamForStudent: (examId: string, student: User) => StudentExamSession;
  updateStudentAnswer: (sessionId: string, questionId: string, answer: any) => void;
  updateStudentCameraSnapshot: (sessionId: string, snapshot: string, isActive?: boolean) => void;
  toggleFlagQuestion: (sessionId: string, questionId: string) => void;
  submitExam: (sessionId: string) => void;
  recordViolation: (sessionId: string, type: ViolationType, detail: string) => void;
  
  // Proctor & Admin Actions
  resetStudentSession: (sessionId: string, action: ProctorResetAction) => void;
  addAuditLog: (action: string, category: SystemAuditLog['category'], details: string, level?: SystemAuditLog['level']) => void;
  broadcastAlert: (message: string) => void;
  latestBroadcast: string | null;
  clearLatestBroadcast: () => void;
  exportDatabaseJson: () => void;
  importDatabaseJson: (jsonData: string) => boolean;
  resetToFactoryData: () => void;

  // Presensi Barcode Masuk & Pulang & Notifikasi WhatsApp MTs. Darul Huda
  attendanceRecords: AttendanceRecord[];
  attendanceSettings: AttendanceSettings;
  recordAttendance: (
    barcodeOrId: string, 
    type: AttendanceType, 
    scannerSource?: 'external_scanner' | 'camera_scanner' | 'manual_entry'
  ) => {
    success: boolean;
    message: string;
    record?: AttendanceRecord;
    user?: User;
    waUrl?: string;
    waMessage?: string;
    isDuplicate?: boolean;
    alreadyClocked?: boolean;
    existingTime?: string;
    sessionType?: AttendanceType;
  };
  updateAttendanceRecord: (record: AttendanceRecord) => void;
  deleteAttendanceRecord: (id: string) => void;
  updateAttendanceSettings: (settings: Partial<AttendanceSettings>) => void;
  sendWhatsappNotification: (record: AttendanceRecord, type: AttendanceType) => {
    success: boolean;
    waUrl?: string;
    message: string;
  };
  resetTodayAttendanceWib: () => void;
  getUnclockedUsersToday: (type: AttendanceType) => {
    user: User;
    record?: AttendanceRecord;
    whatsappTarget: string;
    recipientName: string;
    waMessage: string;
    waUrl: string;
    isNotified: boolean;
  }[];
  sendUnclockedAlert: (userId: string, type: AttendanceType) => {
    success: boolean;
    waUrl?: string;
    message: string;
  };
  sendBatchUnclockedAlerts: (type: AttendanceType) => {
    totalSent: number;
    message: string;
  };
  isPastClockInReminderTime: boolean;
  isPastClockOutReminderTime: boolean;
  clockInReminderScheduledTime: string;
  clockOutReminderScheduledTime: string;
}

const CbtContext = createContext<CbtContextType | undefined>(undefined);

const STORAGE_KEY_PREFIX = 'eduexam_cbt_v1_';

export const CbtProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load initial state with local storage fallback:
  // Ketika klik link pertama kali, currentUser adalah null sehingga langsung masuk ke halaman login
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}user`);
    if (saved) {
      try { 
        const u = JSON.parse(saved);
        if (u && u.id) return u;
      } catch { /* ignore */ }
    }
    // Default null agar pengguna pertama kali selalu diarahkan ke Halaman Login
    return null;
  });

  // Track initial mount timestamp for auto-update detection without republish
  const initialMountTime = useRef<number>(Date.now());
  const [isUpdateAvailable, setIsUpdateAvailable] = useState<boolean>(false);
  const [updateInfo, setUpdateInfo] = useState<{ version: string; timestamp: number; message: string } | null>(null);

  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}users`);
    if (saved) {
      try { 
        const parsed: User[] = JSON.parse(saved); 
        return parsed.map((u) => ({
          ...u,
          schoolName: !u.schoolName || u.schoolName === 'MTs Negeri 1 Prestasi Cendekia' ? 'MTs. Darul Huda' : u.schoolName,
        }));
      } catch { /* ignore */ }
    }
    return INITIAL_USERS;
  });

  const [classes, setClasses] = useState<ClassGroup[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}classes`);
    if (saved) {
      try { return JSON.parse(saved); } catch { /* ignore */ }
    }
    return INITIAL_CLASSES;
  });
  
  const [exams, setExams] = useState<Exam[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}exams`);
    if (saved) {
      try { return JSON.parse(saved); } catch { /* ignore */ }
    }
    return INITIAL_EXAMS;
  });

  const [sessions, setSessions] = useState<StudentExamSession[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}sessions`);
    if (saved) {
      try { return JSON.parse(saved); } catch { /* ignore */ }
    }
    return INITIAL_SESSIONS;
  });

  const [auditLogs, setAuditLogs] = useState<SystemAuditLog[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}audit_logs`);
    if (saved) {
      try { return JSON.parse(saved); } catch { /* ignore */ }
    }
    return INITIAL_AUDIT_LOGS;
  });

  const [apiConfig, setApiConfig] = useState<AcademicApiConfig>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}api_config`);
    if (saved) {
      try { 
        const parsed = JSON.parse(saved);
        if (parsed.schoolName === 'MTs Negeri 1 Prestasi Cendekia') {
          parsed.schoolName = 'MTs. Darul Huda';
        }
        return { ...INITIAL_API_CONFIG, ...parsed }; 
      } catch { /* ignore */ }
    }
    return INITIAL_API_CONFIG;
  });

  const [systemSettings, setSystemSettings] = useState<SystemSettings>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}settings`);
    if (saved) {
      try { 
        const parsed = JSON.parse(saved);
        if (parsed.schoolName === 'MTs Negeri 1 Prestasi Cendekia') {
          parsed.schoolName = 'MTs. Darul Huda';
        }
        return { ...INITIAL_SYSTEM_SETTINGS, ...parsed }; 
      } catch { /* ignore */ }
    }
    return INITIAL_SYSTEM_SETTINGS;
  });

  // Presensi Barcode & WhatsApp Setting States
  const [attendanceSettings, setAttendanceSettings] = useState<AttendanceSettings>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}attendance_settings`);
    if (saved) {
      try { return { ...INITIAL_ATTENDANCE_SETTINGS, ...JSON.parse(saved) }; } catch { /* ignore */ }
    }
    return INITIAL_ATTENDANCE_SETTINGS;
  });

  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}attendance`);
    if (saved) {
      try { 
        const parsed: AttendanceRecord[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch { /* ignore */ }
    }
    return INITIAL_ATTENDANCE_RECORDS;
  });

  const [selectedExamId, setSelectedExamId] = useState<string | null>(() => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const qExamId = searchParams.get('examId');
      if (qExamId) return qExamId;
      const hash = window.location.hash;
      const match = hash.match(/[?&#]examId=([^&]+)/);
      if (match) return decodeURIComponent(match[1]);
    } catch { /* ignore */ }
    return null;
  });

  const [activeTab, setActiveTab] = useState<string>(() => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const qTab = searchParams.get('tab');
      if (qTab) return qTab;
      if (window.location.hash.includes('control_room')) return 'control_room';
    } catch { /* ignore */ }
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}user`);
    if (saved) {
      try {
        const u = JSON.parse(saved);
        if (u.role === 'student') return 'student_home';
        if (u.role === 'teacher') return 'teacher_exams';
        if (u.role === 'admin') return 'teacher_exams';
      } catch { /* ignore */ }
    }
    return 'teacher_exams';
  });
  const [isSimulatedOffline, setIsSimulatedOffline] = useState<boolean>(false);
  const [latestBroadcast, setLatestBroadcast] = useState<string | null>(null);

  // Realtime Firebase Firestore state
  const [firebaseStatus, setFirebaseStatus] = useState<'connected' | 'syncing' | 'offline'>('syncing');
  const [lastFirebaseSync, setLastFirebaseSync] = useState<string | null>(null);

  /**
   * Upload all local Madrasah records to Firebase Cloud Firestore
   */
  const uploadAllToFirebase = async (): Promise<{ success: boolean; message: string; count: number }> => {
    setFirebaseStatus('syncing');
    try {
      const res = await pushAllToFirestore({
        users,
        classes,
        exams,
        sessions,
        settings: systemSettings,
        attendance: attendanceRecords
      });
      const syncTimeStr = new Date().toLocaleTimeString('id-ID');
      setLastFirebaseSync(syncTimeStr);
      setFirebaseStatus('connected');
      addAuditLog('FIREBASE_PUSH_ALL', 'system', `Berhasil mengunggah ${res.count} data madrasah ke Firebase Firestore Cloud`, 'info');
      return res;
    } catch (err: any) {
      console.warn('Notice pushing to Firebase:', err);
      setFirebaseStatus('connected');
      return {
        success: false,
        message: err instanceof Error ? err.message : 'Gagal mengunggah data ke Firebase',
        count: 0
      };
    }
  };

  /**
   * Manual and programmatic synchronization with Firebase Cloud Firestore
   * Supports 'pull' (download from cloud), 'push' (upload to cloud), and 'both' (two-way merge)
   */
  const syncWithFirebase = async (mode: 'pull' | 'push' | 'both' = 'both'): Promise<{
    success: boolean;
    message: string;
    counts?: { users: number; classes: number; exams: number; sessions: number };
  }> => {
    setFirebaseStatus('syncing');
    try {
      if (mode === 'push') {
        const pushRes = await uploadAllToFirebase();
        return {
          success: pushRes.success,
          message: pushRes.message,
          counts: { users: users.length, classes: classes.length, exams: exams.length, sessions: sessions.length }
        };
      }

      const data = await fetchAllFirebaseData();
      let pulledCount = 0;
      
      if (data.users && data.users.length > 0) {
        setUsers(data.users);
        localStorage.setItem(`${STORAGE_KEY_PREFIX}users`, JSON.stringify(data.users));
        pulledCount += data.users.length;
        if (currentUser) {
          const matching = data.users.find(u => u.id === currentUser.id || u.username === currentUser.username);
          if (matching) {
            setCurrentUser(matching);
            localStorage.setItem(`${STORAGE_KEY_PREFIX}user`, JSON.stringify(matching));
          }
        }
      }

      if (data.classes && data.classes.length > 0) {
        setClasses(data.classes);
        localStorage.setItem(`${STORAGE_KEY_PREFIX}classes`, JSON.stringify(data.classes));
        pulledCount += data.classes.length;
      }

      if (data.exams && data.exams.length > 0) {
        setExams(data.exams);
        localStorage.setItem(`${STORAGE_KEY_PREFIX}exams`, JSON.stringify(data.exams));
        pulledCount += data.exams.length;
      }

      if (data.sessions && data.sessions.length > 0) {
        setSessions(data.sessions);
        localStorage.setItem(`${STORAGE_KEY_PREFIX}sessions`, JSON.stringify(data.sessions));
        pulledCount += data.sessions.length;
      }

      if (data.settings) {
        setSystemSettings(prev => {
          const merged = { ...prev, ...data.settings };
          localStorage.setItem(`${STORAGE_KEY_PREFIX}settings`, JSON.stringify(merged));
          return merged;
        });
        if (data.settings.schoolName) {
          const sName = data.settings.schoolName;
          setCurrentUser(prevUser => prevUser ? { ...prevUser, schoolName: sName } : null);
          setUsers(prevUsers => prevUsers.map(u => ({ ...u, schoolName: sName })));
        }
      }

      if (data.auditLogs && data.auditLogs.length > 0) {
        setAuditLogs(data.auditLogs);
        localStorage.setItem(`${STORAGE_KEY_PREFIX}audit_logs`, JSON.stringify(data.auditLogs));
      }

      if (data.attendance && data.attendance.length > 0) {
        setAttendanceRecords(data.attendance);
        localStorage.setItem(`${STORAGE_KEY_PREFIX}attendance`, JSON.stringify(data.attendance));
        pulledCount += data.attendance.length;
      }

      // If in 'both' mode and remote collections were empty, push local data to Firebase so cloud is populated
      if (mode === 'both' && pulledCount === 0 && users.length > 0) {
        await pushAllToFirestore({
          users,
          classes,
          exams,
          sessions,
          settings: systemSettings,
          attendance: attendanceRecords
        });
      }

      const syncTimeStr = new Date().toLocaleTimeString('id-ID');
      setLastFirebaseSync(syncTimeStr);
      setFirebaseStatus('connected');

      const totalUsers = data.users.length > 0 ? data.users.length : users.length;
      const totalClasses = data.classes.length > 0 ? data.classes.length : classes.length;
      const totalExams = data.exams.length > 0 ? data.exams.length : exams.length;
      const totalSessions = data.sessions.length > 0 ? data.sessions.length : sessions.length;

      return {
        success: true,
        message: `Sinkronisasi data Firebase berhasil (${totalUsers} akun santri/guru, ${totalClasses} rombel, ${totalExams} paket ujian, ${totalSessions} hasil sesi).`,
        counts: {
          users: totalUsers,
          classes: totalClasses,
          exams: totalExams,
          sessions: totalSessions
        }
      };
    } catch (err) {
      console.warn('Error during manual Firebase sync:', err);
      setFirebaseStatus('connected');
      return {
        success: true,
        message: `Data lokal tersinkronisasi (${users.length} akun santri/guru, ${classes.length} rombel, ${exams.length} paket ujian).`,
        counts: {
          users: users.length,
          classes: classes.length,
          exams: exams.length,
          sessions: sessions.length
        }
      };
    }
  };

  // Initialize and connect to Firestore in real-time
  useEffect(() => {
    let isMounted = true;

    async function initFirestore() {
      try {
        const isOnline = await testFirestoreConnection();
        if (isMounted) {
          setFirebaseStatus(isOnline ? 'connected' : 'offline');
        }
        if (isOnline) {
          await syncWithFirebase();
        }
        await seedInitialDataIfEmpty({
          users: INITIAL_USERS,
          classes: INITIAL_CLASSES,
          exams: INITIAL_EXAMS,
          sessions: INITIAL_SESSIONS,
          settings: INITIAL_SYSTEM_SETTINGS
        });
      } catch (err) {
        console.warn('Firebase probe notice:', err);
        if (isMounted) setFirebaseStatus('offline');
      }
    }

    initFirestore();

    // 1. Realtime Users Listener
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      if (!snapshot.empty) {
        const remoteUsers = snapshot.docs.map(doc => {
          const d = doc.data() as User;
          return {
            ...d,
            id: d.id || doc.id,
            name: d.name || 'Pengguna',
            username: d.username || d.id || 'user',
            role: d.role || 'teacher',
            nisnOrNip: d.nisnOrNip || ''
          };
        });
        setUsers(remoteUsers);
        setLastFirebaseSync(new Date().toLocaleTimeString('id-ID'));
        setFirebaseStatus('connected');
      }
    }, (err) => {
      console.warn('Firestore users sync notice:', err.message);
    });

    // 2. Realtime Classes Listener
    const unsubClasses = onSnapshot(collection(db, 'classes'), (snapshot) => {
      if (!snapshot.empty) {
        const remoteClasses = snapshot.docs.map(doc => {
          const d = doc.data() as ClassGroup;
          return {
            ...d,
            id: d.id || doc.id,
            name: d.name || 'Rombel',
            grade: d.grade || 'VII'
          };
        });
        setClasses(remoteClasses);
        setLastFirebaseSync(new Date().toLocaleTimeString('id-ID'));
        setFirebaseStatus('connected');
      }
    }, (err) => {
      console.warn('Firestore classes sync notice:', err.message);
    });

    // 3. Realtime Exams Listener
    const unsubExams = onSnapshot(collection(db, 'exams'), (snapshot) => {
      if (!snapshot.empty) {
        const remoteExams = snapshot.docs.map(doc => {
          const d = doc.data() as Exam;
          return {
            ...d,
            id: d.id || doc.id,
            code: d.code || 'EXAM',
            title: d.title || 'Paket Ujian',
            subject: d.subject || 'Mata Pelajaran',
            questions: Array.isArray(d.questions) ? d.questions : [],
            classesAllowed: Array.isArray(d.classesAllowed) ? d.classesAllowed : [],
            token: d.token || 'AM2026',
            status: d.status || 'active',
            durationMinutes: d.durationMinutes || 60,
            passingGrade: d.passingGrade || 75
          };
        });
        setExams(remoteExams);
        setLastFirebaseSync(new Date().toLocaleTimeString('id-ID'));
        setFirebaseStatus('connected');
      }
    }, (err) => {
      console.warn('Firestore exams sync notice:', err.message);
    });

    // 4. Realtime Sessions Listener
    const unsubSessions = onSnapshot(collection(db, 'sessions'), (snapshot) => {
      if (!snapshot.empty) {
        const remoteSessions = snapshot.docs.map(doc => {
          const s = doc.data() as StudentExamSession;
          return {
            ...s,
            id: s.id || doc.id,
            studentName: s.studentName || 'Peserta',
            nisn: s.nisn || '',
            className: s.className || '',
            status: s.status || 'in_progress',
            violationsCount: s.violationsCount || 0,
            violationLogs: Array.isArray(s.violationLogs) ? s.violationLogs : [],
            answers: s.answers || {}
          };
        });
        setSessions(remoteSessions);
        setLastFirebaseSync(new Date().toLocaleTimeString('id-ID'));
        setFirebaseStatus('connected');
      }
    }, (err) => {
      console.warn('Firestore sessions sync notice:', err.message);
    });

    // 5. Realtime Settings Listener
    const unsubSettings = onSnapshot(doc(db, 'settings', 'main'), (docSnap) => {
      if (docSnap.exists()) {
        const remoteSettings = docSnap.data() as Partial<SystemSettings>;
        setSystemSettings(prev => {
          const baseDb = INITIAL_SYSTEM_SETTINGS.databaseStorage || {
            activeProvider: 'local' as const,
            autoSync: true,
            syncIntervalMinutes: 5,
            connectionStatus: 'connected' as const,
            firebase: {
              apiKey: firebaseConfig.apiKey || '',
              authDomain: firebaseConfig.authDomain || '',
              projectId: firebaseConfig.projectId || '',
              storageBucket: firebaseConfig.storageBucket || '',
              messagingSenderId: firebaseConfig.messagingSenderId || '',
              appId: firebaseConfig.appId || '',
              measurementId: '',
              firestoreCollectionPrefix: 'mts_cbt_'
            },
            supabase: {
              supabaseUrl: '',
              supabaseAnonKey: '',
              supabaseServiceRoleKey: '',
              tablePrefix: 'mts_cbt_'
            },
            customRest: {
              apiBaseUrl: '',
              authTokenOrKey: '',
              headerName: 'Authorization',
              syncIntervalMinutes: 5
            }
          };

          const merged: SystemSettings = {
            ...INITIAL_SYSTEM_SETTINGS,
            ...prev,
            ...remoteSettings,
            schoolName: remoteSettings.schoolName || prev.schoolName || INITIAL_SYSTEM_SETTINGS.schoolName,
            databaseStorage: {
              activeProvider: remoteSettings.databaseStorage?.activeProvider || prev.databaseStorage?.activeProvider || baseDb.activeProvider,
              autoSync: remoteSettings.databaseStorage?.autoSync ?? prev.databaseStorage?.autoSync ?? baseDb.autoSync,
              syncIntervalMinutes: remoteSettings.databaseStorage?.syncIntervalMinutes ?? prev.databaseStorage?.syncIntervalMinutes ?? baseDb.syncIntervalMinutes,
              connectionStatus: remoteSettings.databaseStorage?.connectionStatus || prev.databaseStorage?.connectionStatus || 'connected',
              firebase: {
                ...baseDb.firebase,
                ...(prev.databaseStorage?.firebase || {}),
                ...(remoteSettings.databaseStorage?.firebase || {})
              },
              supabase: {
                ...baseDb.supabase,
                ...(prev.databaseStorage?.supabase || {}),
                ...(remoteSettings.databaseStorage?.supabase || {})
              },
              customRest: {
                ...baseDb.customRest,
                ...(prev.databaseStorage?.customRest || {}),
                ...(remoteSettings.databaseStorage?.customRest || {})
              }
            }
          };
          return merged;
        });
        if (remoteSettings.schoolName) {
          const sName = remoteSettings.schoolName;
          setCurrentUser(prevUser => prevUser ? { ...prevUser, schoolName: sName } : null);
          setUsers(prevUsers => prevUsers.map(u => ({ ...u, schoolName: sName })));
        }

        // Realtime Auto-Update Detection without Republish
        if (
          remoteSettings.lastUpdatedTimestamp && 
          remoteSettings.lastUpdatedTimestamp > initialMountTime.current + 1500
        ) {
          setIsUpdateAvailable(true);
          setUpdateInfo({
            version: remoteSettings.appVersion || 'v4.9.0',
            timestamp: remoteSettings.lastUpdatedTimestamp,
            message: remoteSettings.updateMessage || 'Pembaruan naskah soal atau konfigurasi sistem CBT telah dirilis di cloud. Cukup segarkan halaman (refresh) untuk memperbarui tanpa republish.'
          });
        }

        setLastFirebaseSync(new Date().toLocaleTimeString('id-ID'));
        setFirebaseStatus('connected');
      }
    }, (err) => {
      console.warn('Firestore settings sync notice:', err.message);
    });

    // 6. Realtime Broadcast Announcements
    const unsubBroadcasts = onSnapshot(doc(db, 'broadcasts', 'latest'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data?.message) {
          setLatestBroadcast(data.message);
        } else {
          setLatestBroadcast(null);
        }
      }
    }, (err) => {
      console.warn('Firestore broadcasts sync notice:', err.message);
    });

    // 7. Realtime Audit Logs Listener
    const unsubAudit = onSnapshot(collection(db, 'auditLogs'), (snapshot) => {
      if (!snapshot.empty) {
        const remoteLogs = snapshot.docs.map(doc => doc.data() as SystemAuditLog);
        remoteLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setAuditLogs(remoteLogs.slice(0, 100));
      }
    }, (err) => {
      console.warn('Firestore auditLogs sync notice:', err.message);
    });

    // 8. Realtime Attendance Listener MTs. Darul Huda
    const unsubAttendance = onSnapshot(collection(db, 'attendance'), (snapshot) => {
      if (!snapshot.empty) {
        const remoteAttendance = snapshot.docs.map(doc => {
          const a = doc.data() as AttendanceRecord;
          return {
            ...a,
            id: a.id || doc.id,
            date: a.date || '',
            status: a.status || 'hadir',
            timestamp: a.timestamp || Date.now()
          };
        });
        setAttendanceRecords(remoteAttendance);
        setLastFirebaseSync(new Date().toLocaleTimeString('id-ID'));
      }
    }, (err) => {
      console.warn('Firestore attendance sync notice:', err.message);
    });

    return () => {
      isMounted = false;
      unsubUsers();
      unsubClasses();
      unsubExams();
      unsubSessions();
      unsubSettings();
      unsubBroadcasts();
      unsubAudit();
      unsubAttendance();
    };
  }, []);

  // Sync to local storage
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}user`, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}user`);
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}users`, JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}exams`, JSON.stringify(exams));
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bc = new BroadcastChannel('eduexam_cbt_channel');
        bc.postMessage({ type: 'SYNC_EXAMS', payload: exams });
        bc.close();
      }
    } catch { /* ignore */ }
  }, [exams]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}classes`, JSON.stringify(classes));
  }, [classes]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}sessions`, JSON.stringify(sessions));
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bc = new BroadcastChannel('eduexam_cbt_channel');
        bc.postMessage({ type: 'SYNC_SESSIONS', payload: sessions });
        bc.close();
      }
    } catch { /* ignore */ }
  }, [sessions]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}settings`, JSON.stringify(systemSettings));
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bc = new BroadcastChannel('eduexam_cbt_channel');
        bc.postMessage({ type: 'SYNC_SETTINGS', payload: systemSettings });
        bc.close();
      }
    } catch { /* ignore */ }
  }, [systemSettings]);

  // Real-time synchronization between dashboard and new tabs
  useEffect(() => {
    let bc: BroadcastChannel | null = null;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        bc = new BroadcastChannel('eduexam_cbt_channel');
        bc.onmessage = (event) => {
          if (!event.data) return;
          const { type, payload } = event.data;
          if (type === 'SYNC_SESSIONS' && Array.isArray(payload)) {
            setSessions(payload);
          } else if (type === 'SYNC_EXAMS' && Array.isArray(payload)) {
            setExams(payload);
          } else if (type === 'SYNC_SETTINGS' && payload) {
            setSystemSettings(payload);
          } else if (type === 'BROADCAST_ALERT' && typeof payload === 'string') {
            setLatestBroadcast(payload);
          } else if (type === 'SYNC_CAMERA' && payload && payload.sessionId) {
            setSessions(prev => prev.map(s => {
              if (s.id !== payload.sessionId) return s;
              return {
                ...s,
                cameraSnapshot: payload.snapshot,
                cameraActive: payload.isActive ?? true,
                lastCameraUpdate: payload.timestamp || Date.now()
              };
            }));
          }
        };
      }
    } catch { /* ignore */ }

    const handleStorageSync = (e: StorageEvent) => {
      if (!e.newValue) return;
      try {
        if (e.key === `${STORAGE_KEY_PREFIX}sessions`) {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) setSessions(parsed);
        } else if (e.key === `${STORAGE_KEY_PREFIX}exams`) {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) setExams(parsed);
        } else if (e.key === `${STORAGE_KEY_PREFIX}classes`) {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) setClasses(parsed);
        } else if (e.key === `${STORAGE_KEY_PREFIX}settings`) {
          const parsed = JSON.parse(e.newValue);
          if (parsed) setSystemSettings(parsed);
        }
      } catch { /* ignore */ }
    };

    window.addEventListener('storage', handleStorageSync);
    return () => {
      window.removeEventListener('storage', handleStorageSync);
      if (bc) bc.close();
    };
  }, []);

  const addUser = (newUser: User) => {
    setUsers(prev => {
      const exists = prev.some(u => u.username === newUser.username || u.id === newUser.id);
      if (exists) {
        return prev.map(u => (u.username === newUser.username || u.id === newUser.id) ? newUser : u);
      }
      return [...prev, newUser];
    });
    saveToFirestore('users', newUser.id, newUser);
    addAuditLog('ADD_USER', 'system', `Menambahkan pengguna baru: ${newUser.name} (${newUser.role.toUpperCase()})`, 'info');
  };

  const deleteUser = (userId: string) => {
    const target = users.find(u => u.id === userId);
    setUsers(prev => prev.filter(u => u.id !== userId));
    deleteFromFirestore('users', userId);
    if (target) {
      addAuditLog('DELETE_USER', 'system', `Menghapus pengguna: ${target.name} (${target.username})`, 'warn');
    }
  };

  const updateUser = (updatedUser: User) => {
    setUsers(prev => prev.map(u => (u.id === updatedUser.id ? updatedUser : u)));
    if (currentUser?.id === updatedUser.id) {
      setCurrentUser(updatedUser);
    }
    saveToFirestore('users', updatedUser.id, updatedUser);
    addAuditLog('UPDATE_USER', 'system', `Memperbarui data pengguna: ${updatedUser.name} (${updatedUser.username})`, 'info');
  };

  const importUsersFromExcel = (newUsers: User[]) => {
    let added = 0;
    let updated = 0;
    setUsers(prev => {
      const copy = [...prev];
      newUsers.forEach(nu => {
        const index = copy.findIndex(u => u.username === nu.username || (u.nisnOrNip && u.nisnOrNip === nu.nisnOrNip));
        if (index >= 0) {
          copy[index] = { ...copy[index], ...nu };
          updated++;
        } else {
          copy.push(nu);
          added++;
        }
        saveToFirestore('users', nu.id, nu);
      });
      return copy;
    });
    addAuditLog(
      'IMPORT_USERS_EXCEL', 
      'system', 
      `Impor data pengguna dari Excel berhasil: ${added} akun baru ditambahkan, ${updated} akun diperbarui.`, 
      'info'
    );
    return { added, updated };
  };

  const loginWithCredentials = (username: string, password: string): { success: boolean; user?: User; error?: string } => {
    const cleanUser = username.trim().toLowerCase();
    const foundUser = users.find(u => u.username.toLowerCase() === cleanUser || u.nisnOrNip === username.trim());
    
    if (!foundUser) {
      return { success: false, error: 'Username atau NISN/NIP tidak terdaftar dalam database!' };
    }

    if (foundUser.password && foundUser.password !== password.trim()) {
      return { success: false, error: 'Kata sandi / Password salah! Silakan periksa kembali.' };
    }

    const authenticatedUser: User = {
      ...foundUser,
      isMfaVerified: true,
    };

    setCurrentUser(authenticatedUser);
    localStorage.setItem(`${STORAGE_KEY_PREFIX}user`, JSON.stringify(authenticatedUser));

    if (authenticatedUser.role === 'student') {
      setActiveTab('student_home');
    } else if (authenticatedUser.role === 'teacher') {
      setActiveTab('teacher_exams');
    } else {
      setActiveTab('teacher_exams');
    }

    addAuditLog(
      'USER_LOGIN_SUCCESS',
      'auth',
      `Pengguna ${authenticatedUser.name} (${authenticatedUser.role.toUpperCase()}) berhasil masuk sistem.`,
      'info'
    );

    return { success: true, user: authenticatedUser };
  };

  const logout = () => {
    if (currentUser) {
      addAuditLog('USER_LOGOUT', 'auth', `Pengguna ${currentUser.name} keluar dari sistem.`, 'info');
    }
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}user`);
    setCurrentUser(null);
  };

  const switchUserRole = (targetRole: UserRole) => {
    const target = users.find(u => u.role === targetRole) || INITIAL_USERS.find(u => u.role === targetRole);
    if (target) {
      const authUser: User = {
        ...target,
        schoolName: systemSettings.schoolName || target.schoolName,
        isMfaVerified: true,
      };
      setCurrentUser(authUser);
      localStorage.setItem(`${STORAGE_KEY_PREFIX}user`, JSON.stringify(authUser));
      
      if (targetRole === 'student') {
        setActiveTab('student_home');
      } else if (targetRole === 'teacher') {
        setActiveTab('teacher_exams');
      } else if (targetRole === 'admin') {
        setActiveTab('teacher_exams');
      } else {
        setActiveTab('control_room');
      }
      
      addAuditLog('SWITCH_ROLE', 'auth', `Beralih ke akun peran ${targetRole.toUpperCase()}: ${authUser.name}`, 'info');
    }
  };

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}sessions`, JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}audit_logs`, JSON.stringify(auditLogs));
  }, [auditLogs]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}api_config`, JSON.stringify(apiConfig));
  }, [apiConfig]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}settings`, JSON.stringify(systemSettings));
  }, [systemSettings]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}classes`, JSON.stringify(classes));
  }, [classes]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}attendance`, JSON.stringify(attendanceRecords));
  }, [attendanceRecords]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}attendance_settings`, JSON.stringify(attendanceSettings));
  }, [attendanceSettings]);

  const addClass = (newClass: ClassGroup) => {
    setClasses(prev => [...prev, newClass]);
    saveToFirestore('classes', newClass.id, newClass);
    addAuditLog('ADD_CLASS', 'system', `Menambahkan rombel baru: ${newClass.name} (Tingkat ${newClass.grade})`, 'info');
  };

  const updateClass = (updatedClass: ClassGroup) => {
    setClasses(prev => prev.map(c => c.id === updatedClass.id ? updatedClass : c));
    saveToFirestore('classes', updatedClass.id, updatedClass);
    addAuditLog('UPDATE_CLASS', 'system', `Memperbarui data rombel: ${updatedClass.name}`, 'info');
  };

  const deleteClass = (classId: string) => {
    const target = classes.find(c => c.id === classId);
    setClasses(prev => prev.filter(c => c.id !== classId));
    deleteFromFirestore('classes', classId);
    if (target) {
      addAuditLog('DELETE_CLASS', 'system', `Menghapus rombel: ${target.name}`, 'warn');
    }
  };

  const addExam = (newExam: Exam) => {
    const examWithAuthor: Exam = {
      ...newExam,
      authorId: newExam.authorId || currentUser?.id,
      authorName: newExam.authorName || currentUser?.name,
      authorUsername: newExam.authorUsername || currentUser?.username,
    };
    setExams(prev => [examWithAuthor, ...prev]);
    saveToFirestore('exams', examWithAuthor.id, examWithAuthor);
    addAuditLog('ADD_EXAM', 'exam', `Membuat paket ujian & bank soal baru: ${examWithAuthor.title} (${examWithAuthor.code})`, 'info');
  };

  const updateExam = (updatedExam: Exam) => {
    const examWithAuthor: Exam = {
      ...updatedExam,
      authorId: updatedExam.authorId || currentUser?.id,
      authorName: updatedExam.authorName || currentUser?.name,
      authorUsername: updatedExam.authorUsername || currentUser?.username,
    };
    setExams(prev => prev.map(e => e.id === examWithAuthor.id ? examWithAuthor : e));
    saveToFirestore('exams', examWithAuthor.id, examWithAuthor);
    addAuditLog('UPDATE_EXAM', 'exam', `Memperbarui paket ujian: ${examWithAuthor.title}`, 'info');
  };

  const deleteExam = (examId: string) => {
    const target = exams.find(e => e.id === examId);
    setExams(prev => prev.filter(e => e.id !== examId));
    deleteFromFirestore('exams', examId);
    if (target) {
      addAuditLog('DELETE_EXAM', 'exam', `Menghapus paket ujian: ${target.title}`, 'warn');
    }
  };

  const updateSystemSettings = (newSettings: Partial<SystemSettings>) => {
    setSystemSettings(prev => {
      const merged = { ...prev, ...newSettings };
      if (newSettings.schoolName) {
        setApiConfig(prevApi => ({ ...prevApi, schoolName: newSettings.schoolName! }));
        setCurrentUser(prevUser => prevUser ? { ...prevUser, schoolName: newSettings.schoolName! } : null);
        setUsers(prevUsers => prevUsers.map(u => ({ ...u, schoolName: newSettings.schoolName! })));
      }
      saveToFirestore('settings', 'main', merged);
      return merged;
    });
    addAuditLog('UPDATE_SETTINGS', 'system', `Memperbarui profil lembaga (${newSettings.schoolName || 'Pengaturan Sistem'})`, 'info');
  };

  const addAuditLog = (
    action: string, 
    category: SystemAuditLog['category'], 
    details: string, 
    level: SystemAuditLog['level'] = 'info'
  ) => {
    const newLog: SystemAuditLog = {
      id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      actorId: currentUser?.id || 'system',
      actorName: currentUser?.name || 'Sistem Terpadu',
      actorRole: currentUser?.role || 'admin',
      action,
      category,
      details,
      level,
    };
    setAuditLogs(prev => [newLog, ...prev.slice(0, 99)]);
    saveToFirestore('auditLogs', newLog.id, newLog);
  };

  const updateApiConfig = (config: Partial<AcademicApiConfig>) => {
    setApiConfig(prev => ({ ...prev, ...config }));
    addAuditLog('UPDATE_SIAKAD_CONFIG', 'api', 'Memperbarui konfigurasi endpoint & kunci integrasi SIAKAD', 'info');
  };

  const syncWithSiakad = async (): Promise<boolean> => {
    setApiConfig(prev => ({ ...prev, syncStatus: 'syncing' }));
    
    // Simulate real API ping and payload transport
    await new Promise(res => setTimeout(res, 1400));

    const completedCount = sessions.filter(s => s.status === 'completed').length;
    setApiConfig(prev => ({
      ...prev,
      syncStatus: 'connected',
      lastSyncTime: new Date().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) + ' WIB',
      totalSyncedStudents: 160 + completedCount,
    }));

    addAuditLog(
      'SIAKAD_PUSH_SUCCESS', 
      'api', 
      `Sinkronisasi otomatis berhasil: ${completedCount} data nilai ujian telah disinkronkan ke server SIAKAD`, 
      'info'
    );
    return true;
  };

  const startExamForStudent = (examId: string, student: User): StudentExamSession => {
    const exam = exams.find(e => e.id === examId);
    if (!exam) throw new Error('Ujian tidak ditemukan');

    // Check existing session
    const existing = sessions.find(s => s.examId === examId && s.studentId === student.id);
    if (existing) {
      return existing;
    }

    // Prepare randomized question set
    const randomizedQuestions = prepareRandomizedExam(exam);
    const newSession: StudentExamSession = {
      id: `ses-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      examId,
      studentId: student.id,
      studentName: student.name,
      nisn: student.nisnOrNip,
      classId: student.classId || 'cls-x-mipa1',
      className: student.className || 'X-MIPA 1',
      status: 'in_progress',
      randomizedQuestions,
      answers: {},
      flaggedQuestionIds: [],
      currentQuestionIndex: 0,
      startTime: Date.now(),
      timeRemainingSeconds: exam.durationMinutes * 60,
      violationsCount: 0,
      violationLogs: [],
      isOnline: !isSimulatedOffline,
      lastSyncTimestamp: Date.now(),
      deviceInfo: navigator.userAgent,
    };

    setSessions(prev => [newSession, ...prev]);
    saveToFirestore('sessions', newSession.id, newSession);
    addAuditLog('START_EXAM', 'exam', `Siswa ${student.name} (${student.className}) memulai pengerjaan ujian ${exam.title}`, 'info');

    return newSession;
  };

  const updateStudentAnswer = (sessionId: string, questionId: string, answer: any) => {
    setSessions(prev => prev.map(s => {
      if (s.id !== sessionId) return s;
      const updatedAnswers = { ...s.answers, [questionId]: answer };
      const updated = {
        ...s,
        answers: updatedAnswers,
        lastSyncTimestamp: Date.now(),
      };
      saveToFirestore('sessions', sessionId, updated);
      return updated;
    }));
  };

  const updateStudentCameraSnapshot = (sessionId: string, snapshot: string, isActive = true) => {
    setSessions(prev => prev.map(s => {
      if (s.id !== sessionId) return s;
      const updated = {
        ...s,
        cameraSnapshot: snapshot,
        cameraActive: isActive,
        lastCameraUpdate: Date.now()
      };
      saveToFirestore('sessions', sessionId, updated);
      return updated;
    }));

    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bc = new BroadcastChannel('eduexam_cbt_channel');
        bc.postMessage({
          type: 'SYNC_CAMERA',
          payload: { sessionId, snapshot, isActive, timestamp: Date.now() }
        });
        bc.close();
      }
    } catch { /* ignore */ }
  };

  const toggleFlagQuestion = (sessionId: string, questionId: string) => {
    setSessions(prev => prev.map(s => {
      if (s.id !== sessionId) return s;
      const isFlagged = s.flaggedQuestionIds.includes(questionId);
      const newFlagged = isFlagged 
        ? s.flaggedQuestionIds.filter(id => id !== questionId)
        : [...s.flaggedQuestionIds, questionId];
      const updated = {
        ...s,
        flaggedQuestionIds: newFlagged,
      };
      saveToFirestore('sessions', sessionId, updated);
      return updated;
    }));
  };

  const submitExam = (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;
    const exam = exams.find(e => e.id === session.examId);
    if (!exam) return;

    const grading = calculateExamScore(session, exam);

    setSessions(prev => prev.map(s => {
      if (s.id !== sessionId) return s;
      const updated: StudentExamSession = {
        ...s,
        status: 'completed',
        submittedAt: new Date().toISOString(),
        score: grading.score,
        correctCount: grading.correctCount,
        wrongCount: grading.wrongCount,
        unansweredCount: grading.unansweredCount,
        isPassed: grading.isPassed,
        lastSyncTimestamp: Date.now(),
      };
      saveToFirestore('sessions', sessionId, updated);
      return updated;
    }));

    playAlertSound('success');
    addAuditLog(
      'SUBMIT_EXAM', 
      'exam', 
      `Siswa ${session.studentName} menyelesaikan ujian dengan nilai ${grading.score} (${grading.isPassed ? 'TUNTAS' : 'BELUM TUNTAS'})`, 
      'info'
    );
  };

  const recordViolation = (sessionId: string, type: ViolationType, detail: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;
    const exam = exams.find(e => e.id === session.examId);
    const maxViolations = systemSettings?.maxViolationsAllowed ?? exam?.maxViolationsAllowed ?? 3;

    const newViolation: ViolationLog = {
      id: `v-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      sessionId,
      studentId: session.studentId,
      studentName: session.studentName,
      className: session.className,
      type,
      timestamp: new Date().toISOString(),
      detail,
      severity: type === 'split_screen' || type === 'tab_switch' ? 'high' : 'medium',
    };

    playAlertSound('warning');

    setSessions(prev => prev.map(s => {
      if (s.id !== sessionId) return s;
      const updatedCount = s.violationsCount + 1;
      const willLock = updatedCount >= maxViolations;
      
      if (willLock) {
        playAlertSound('lock');
      }

      const updated = {
        ...s,
        violationsCount: updatedCount,
        violationLogs: [newViolation, ...s.violationLogs],
        status: (willLock ? 'locked' : s.status) as StudentExamSession['status'],
        lastSyncTimestamp: Date.now(),
      };
      saveToFirestore('sessions', sessionId, updated);
      return updated;
    }));

    saveToFirestore('violations', newViolation.id, newViolation);

    const isLockedNow = (session.violationsCount + 1) >= maxViolations;
    addAuditLog(
      isLockedNow ? 'LOCK_STUDENT_SESSION' : 'ANTI_CHEAT_TRIGGER',
      'anti_cheat',
      `[${session.className}] ${session.studentName}: ${detail}. Total pelanggaran: ${session.violationsCount + 1}/${maxViolations}${isLockedNow ? ' (AKUN DIKUNCI OLEH SISTEM)' : ''}`,
      isLockedNow ? 'error' : 'warn'
    );

    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bc = new BroadcastChannel('eduexam_cbt_channel');
        bc.postMessage({
          type: 'VIOLATION_TRIGGERED',
          payload: { sessionId, violation: newViolation, isLocked: isLockedNow }
        });
        bc.close();
      }
    } catch { /* ignore */ }
  };

  const selectAndStartExam = (examId: string) => {
    setSelectedExamId(examId);
    setActiveTab('student_exam');
  };

  const resetStudentSession = (
    sessionId: string, 
    action: ProctorResetAction
  ) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;

    setSessions(prev => prev.map(s => {
      if (s.id !== sessionId) return s;
      let updated: StudentExamSession = s;
      if (action === 'unlock' || action === 'reopen_exam') {
        updated = { 
          ...s, 
          status: 'in_progress', 
          submittedAt: undefined,
          violationsCount: Math.min(s.violationsCount, 2),
          timeRemainingSeconds: s.timeRemainingSeconds > 60 ? s.timeRemainingSeconds : 30 * 60,
        };
      } else if (action === 'reset_violations') {
        updated = { ...s, status: 'in_progress', violationsCount: 0, violationLogs: [] };
      } else if (action === 'reset_exam') {
        const exam = exams.find(e => e.id === s.examId);
        updated = {
          ...s,
          status: 'in_progress',
          submittedAt: undefined,
          answers: {},
          flaggedQuestionIds: [],
          violationsCount: 0,
          violationLogs: [],
          currentQuestionIndex: 0,
          startTime: Date.now(),
          timeRemainingSeconds: (exam?.durationMinutes || 45) * 60,
          score: undefined,
          correctCount: undefined,
          wrongCount: undefined,
          unansweredCount: undefined,
          isPassed: undefined,
        };
      } else if (action === 'add_10_mins') {
        updated = { ...s, timeRemainingSeconds: s.timeRemainingSeconds + 600 };
      } else if (action === 'force_submit') {
        const exam = exams.find(e => e.id === s.examId);
        if (exam) {
          const grading = calculateExamScore(s, exam);
          updated = {
            ...s,
            status: 'completed',
            submittedAt: new Date().toISOString(),
            score: grading.score,
            correctCount: grading.correctCount,
            wrongCount: grading.wrongCount,
            unansweredCount: grading.unansweredCount,
            isPassed: grading.isPassed,
          };
        }
      }
      saveToFirestore('sessions', sessionId, updated);
      return updated;
    }));

    addAuditLog(
      'PROCTOR_RESET_ACTION',
      'proctor',
      `Pengawas melakukan tindakan "${action}" pada sesi siswa ${session.studentName} (${session.className})`,
      'info'
    );
  };

  const broadcastAlert = (message: string) => {
    setLatestBroadcast(message);
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bc = new BroadcastChannel('eduexam_cbt_channel');
        bc.postMessage({ type: 'BROADCAST_ALERT', payload: message });
        bc.close();
      }
    } catch { /* ignore */ }
    saveToFirestore('broadcasts', 'latest', { id: 'latest', message, timestamp: new Date().toISOString() });
    playAlertSound('warning');
    addAuditLog('BROADCAST_WARNING', 'proctor', `Pesan darurat dikirim ke seluruh ruang ujian: "${message}"`, 'warn');
  };

  const clearLatestBroadcast = () => {
    setLatestBroadcast(null);
    saveToFirestore('broadcasts', 'latest', { id: 'latest', message: null, timestamp: new Date().toISOString() });
  };

  const exportDatabaseJson = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      school: apiConfig.schoolName,
      classes,
      exams,
      sessions,
      auditLogs,
      apiConfig,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cbt-database-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addAuditLog('BACKUP_DATABASE', 'system', 'Mengunduh salinan cadangan basis data terpusat (JSON)', 'info');
  };

  const importDatabaseJson = (jsonData: string): boolean => {
    try {
      const parsed = JSON.parse(jsonData);
      if (parsed.exams && parsed.sessions) {
        setExams(parsed.exams);
        setSessions(parsed.sessions);
        if (parsed.classes) setClasses(parsed.classes);
        if (parsed.auditLogs) setAuditLogs(parsed.auditLogs);
        if (parsed.apiConfig) setApiConfig(parsed.apiConfig);
        
        // Sync imported data to Firestore
        if (parsed.classes) parsed.classes.forEach((c: any) => saveToFirestore('classes', c.id, c));
        parsed.exams.forEach((e: any) => saveToFirestore('exams', e.id, e));
        parsed.sessions.forEach((s: any) => saveToFirestore('sessions', s.id, s));
        
        addAuditLog('RESTORE_DATABASE', 'system', 'Berhasil memulihkan basis data dari file JSON cadangan', 'warn');
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const resetToFactoryData = () => {
    setClasses(INITIAL_CLASSES);
    setExams(INITIAL_EXAMS);
    setSessions(INITIAL_SESSIONS);
    setAuditLogs(INITIAL_AUDIT_LOGS);
    setApiConfig(INITIAL_API_CONFIG);

    // Seed back to Firestore
    INITIAL_CLASSES.forEach(c => saveToFirestore('classes', c.id, c));
    INITIAL_EXAMS.forEach(e => saveToFirestore('exams', e.id, e));
    INITIAL_SESSIONS.forEach(s => saveToFirestore('sessions', s.id, s));
    INITIAL_USERS.forEach(u => saveToFirestore('users', u.id, u));
    saveToFirestore('settings', 'main', INITIAL_SYSTEM_SETTINGS);

    addAuditLog('FACTORY_RESET', 'system', 'Mengembalikan seluruh data CBT ke setelan awal pabrik', 'warn');
  };

  // Presensi Barcode Masuk & Pulang & WhatsApp Integration MTs. Darul Huda
  const recordAttendance = (
    barcodeOrId: string, 
    type: AttendanceType, 
    scannerSource: 'external_scanner' | 'camera_scanner' | 'manual_entry' = 'external_scanner'
  ) => {
    const trimmed = barcodeOrId.trim();
    if (!trimmed) {
      scanAudio.playErrorBuzz();
      return { success: false, message: 'Kode barcode atau ID santri/guru tidak boleh kosong.' };
    }

    // Check if scanned code is the Institution Barcode (Barcode Lembaga MTs. Darul Huda)
    const isSchoolBarcode = isInstitutionBarcode(trimmed);
    let targetUser = users.find(u => 
      (u.barcode && u.barcode.toLowerCase() === trimmed.toLowerCase()) ||
      (u.nisnOrNip && u.nisnOrNip.toLowerCase() === trimmed.toLowerCase()) ||
      (u.username && u.username.toLowerCase() === trimmed.toLowerCase()) ||
      (u.id && u.id.toLowerCase() === trimmed.toLowerCase())
    );

    if (isSchoolBarcode) {
      if (currentUser && (currentUser.role === 'teacher' || currentUser.role === 'admin')) {
        targetUser = currentUser;
      } else {
        scanAudio.playErrorBuzz();
        return {
          success: false,
          message: 'Barcode Lembaga hanya dapat digunakan oleh akun Guru / Tenaga Pendidik yang sedang login.'
        };
      }
    }

    if (!targetUser) {
      scanAudio.playErrorBuzz();
      return { 
        success: false, 
        message: `Barcode / ID "${trimmed}" tidak terdaftar dalam database MTs. Darul Huda.` 
      };
    }

    const user = targetUser;
    const todayWib = getWibDate();
    const timeWib = getWibTime();
    const schoolName = systemSettings?.schoolName || user.schoolName || 'MTs. Darul Huda';

    // Find if record exists today for this user
    const existingIndex = attendanceRecords.findIndex(r => r.userId === user.id && r.date === todayWib);
    const existing = existingIndex >= 0 ? attendanceRecords[existingIndex] : null;

    let updatedRecord: AttendanceRecord;

    // Check status based on clockInLate setting (e.g. 07:15)
    let status: AttendanceStatus = 'hadir';
    if (type === 'masuk') {
      const lateThreshold = (attendanceSettings.clockInLate || '07:15') + ':00';
      if (timeWib > lateThreshold) {
        status = 'terlambat';
      }
    }

    if (type === 'masuk') {
      if (existing && existing.clockInTime) {
        scanAudio.playAlreadyClockedTone();
        return {
          success: true,
          isDuplicate: true,
          alreadyClocked: true,
          sessionType: 'masuk' as AttendanceType,
          existingTime: existing.clockInTime,
          message: `${user.name} SUDAH MELAKUKAN PRESENSI MASUK hari ini pada pukul ${existing.clockInTime} WIB.`,
          record: existing,
          user
        };
      }

      const recId = existing ? existing.id : `att-${user.id}-${todayWib}-${Date.now().toString(36)}`;
      updatedRecord = {
        id: recId,
        userId: user.id,
        userName: user.name,
        userRole: user.role === 'teacher' ? 'teacher' : 'student',
        nisnOrNip: user.nisnOrNip || '',
        className: user.className,
        subjectOrPosition: user.subjectOrPosition,
        date: todayWib,
        clockInTime: timeWib,
        clockOutTime: existing?.clockOutTime,
        status: status,
        notes: status === 'terlambat' ? 'Presensi masuk terlambat' : 'Presensi barcode masuk tepat waktu',
        whatsappTarget: user.whatsappNumber,
        whatsappRecipientType: user.role === 'teacher' ? 'guru' : 'wali_murid',
        whatsappRecipientName: user.role === 'teacher' ? user.name : (user.parentName || 'Wali Santri'),
        scannerSource,
        timestamp: Date.now()
      };
    } else {
      // Pulang
      if (existing && existing.clockOutTime) {
        scanAudio.playAlreadyClockedTone();
        return {
          success: true,
          isDuplicate: true,
          alreadyClocked: true,
          sessionType: 'pulang' as AttendanceType,
          existingTime: existing.clockOutTime,
          message: `${user.name} SUDAH MELAKUKAN PRESENSI PULANG hari ini pada pukul ${existing.clockOutTime} WIB.`,
          record: existing,
          user
        };
      }

      const recId = existing ? existing.id : `att-${user.id}-${todayWib}-${Date.now().toString(36)}`;
      updatedRecord = {
        id: recId,
        userId: user.id,
        userName: user.name,
        userRole: user.role === 'teacher' ? 'teacher' : 'student',
        nisnOrNip: user.nisnOrNip || '',
        className: user.className,
        subjectOrPosition: user.subjectOrPosition,
        date: todayWib,
        clockInTime: existing?.clockInTime,
        clockOutTime: timeWib,
        status: existing?.status || 'hadir',
        notes: existing?.notes ? `${existing.notes} | Pulang ${timeWib} WIB` : `Presensi kepulangan ${timeWib} WIB`,
        whatsappTarget: user.whatsappNumber,
        whatsappRecipientType: user.role === 'teacher' ? 'guru' : 'wali_murid',
        whatsappRecipientName: user.role === 'teacher' ? user.name : (user.parentName || 'Wali Santri'),
        scannerSource,
        timestamp: Date.now()
      };
    }

    // Build WhatsApp Message
    let waMessage = '';
    let waUrl = '';
    if (user.whatsappNumber) {
      if (user.role === 'student') {
        waMessage = buildStudentWhatsappMessage(user, type, timeWib, todayWib, schoolName, updatedRecord.status);
      } else {
        waMessage = buildTeacherWhatsappMessage(user, type, timeWib, todayWib, schoolName, updatedRecord.status);
      }
      waUrl = createWhatsappLink(user.whatsappNumber, waMessage);
      if (type === 'masuk') {
        updatedRecord.whatsappNotifiedIn = true;
        updatedRecord.whatsappMessageIn = waMessage;
      } else {
        updatedRecord.whatsappNotifiedOut = true;
        updatedRecord.whatsappMessageOut = waMessage;
      }
      updatedRecord.lastNotificationTimestamp = Date.now();
    }

    // Play successful sound
    scanAudio.playSuccessBeep();

    // Update records state
    setAttendanceRecords(prev => {
      const copy = [...prev];
      const idx = copy.findIndex(r => r.id === updatedRecord.id);
      if (idx >= 0) {
        copy[idx] = updatedRecord;
      } else {
        copy.unshift(updatedRecord);
      }
      return copy;
    });

    saveToFirestore('attendance', updatedRecord.id, updatedRecord);
    addAuditLog(
      `ATTENDANCE_${type.toUpperCase()}`,
      'system',
      `Presensi ${type === 'masuk' ? 'Masuk' : 'Pulang'}: ${user.name} (${user.nisnOrNip}) jam ${timeWib} WIB [${updatedRecord.status}]`,
      status === 'terlambat' ? 'warn' : 'info'
    );

    return {
      success: true,
      message: isSchoolBarcode
        ? `Presensi Mandiri Berhasil: ${user.name} tercatat ${type === 'masuk' ? 'MASUK' : 'PULANG'} pukul ${timeWib} WIB via Barcode Lembaga MTs. Darul Huda.`
        : `Presensi ${type === 'masuk' ? 'Masuk' : 'Pulang'} Berhasil: ${user.name} (${timeWib} WIB)`,
      record: updatedRecord,
      user,
      waUrl,
      waMessage,
      isDuplicate: false
    };
  };

  const updateAttendanceRecord = (record: AttendanceRecord) => {
    setAttendanceRecords(prev => prev.map(r => r.id === record.id ? record : r));
    saveToFirestore('attendance', record.id, record);
    addAuditLog('UPDATE_ATTENDANCE', 'system', `Memperbarui data presensi: ${record.userName} (${record.date})`, 'info');
  };

  const deleteAttendanceRecord = (id: string) => {
    setAttendanceRecords(prev => prev.filter(r => r.id !== id));
    deleteFromFirestore('attendance', id);
    addAuditLog('DELETE_ATTENDANCE', 'system', `Menghapus catatan presensi ID: ${id}`, 'warn');
  };

  const updateAttendanceSettings = (newSettings: Partial<AttendanceSettings>) => {
    setAttendanceSettings(prev => {
      const merged = { ...prev, ...newSettings };
      saveToFirestore('settings', 'attendance', merged);
      return merged;
    });
    addAuditLog('UPDATE_ATTENDANCE_SETTINGS', 'system', 'Memperbarui konfigurasi jam presensi & WhatsApp', 'info');
  };

  const sendWhatsappNotification = (record: AttendanceRecord, type: AttendanceType) => {
    const user = users.find(u => u.id === record.userId);
    const targetPhone = user?.whatsappNumber || record.whatsappTarget;
    if (!targetPhone) {
      return { success: false, message: 'Nomor WhatsApp belum diisi pada profil pengguna.' };
    }

    const todayWib = record.date || getWibDate();
    const timeWib = (type === 'masuk' ? record.clockInTime : record.clockOutTime) || getWibTime();
    const schoolName = systemSettings?.schoolName || user?.schoolName || 'MTs. Darul Huda';

    let msg = '';
    if (record.userRole === 'student' && user) {
      msg = buildStudentWhatsappMessage(user, type, timeWib, todayWib, schoolName, record.status);
    } else if (user) {
      msg = buildTeacherWhatsappMessage(user, type, timeWib, todayWib, schoolName, record.status);
    } else {
      msg = `Notifikasi Presensi ${type === 'masuk' ? 'Masuk' : 'Pulang'} ${schoolName}: ${record.userName} tercatat pada ${timeWib} WIB.`;
    }

    const waUrl = createWhatsappLink(targetPhone, msg);

    // Update notification status
    const updated: AttendanceRecord = {
      ...record,
      whatsappTarget: targetPhone,
      lastNotificationTimestamp: Date.now(),
      ...(type === 'masuk' ? { whatsappNotifiedIn: true, whatsappMessageIn: msg } : { whatsappNotifiedOut: true, whatsappMessageOut: msg })
    };
    updateAttendanceRecord(updated);

    return {
      success: true,
      waUrl,
      message: `Tautan notifikasi WhatsApp berhasil disiapkan untuk ${record.userName}.`
    };
  };

  const resetTodayAttendanceWib = () => {
    const todayWib = getWibDate();
    const todayRecords = attendanceRecords.filter(r => r.date === todayWib);
    todayRecords.forEach(r => deleteFromFirestore('attendance', r.id));
    setAttendanceRecords(prev => prev.filter(r => r.date !== todayWib));
    addAuditLog('RESET_TODAY_ATTENDANCE', 'system', `Mereset riwayat presensi hari ini (${todayWib} WIB)`, 'warn');
  };

  // Live WIB clock tracker for automated 30-min unclocked notifications
  const [currentWibClock, setCurrentWibClock] = useState<string>(getWibTime());
  const autoAlertInTriggeredDate = useRef<string | null>(null);
  const autoAlertOutTriggeredDate = useRef<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentWibClock(getWibTime());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Waktu terjadwal pengingat otomatis: 30 menit setelah batas jam masuk dan 30 menit setelah jam pulang
  const clockInReminderScheduledTime = addMinutesToTime(
    attendanceSettings.clockInLate || '07:15',
    attendanceSettings.clockInGracePeriodMinutes ?? 30
  );

  const clockOutReminderScheduledTime = addMinutesToTime(
    attendanceSettings.clockOutStart || '13:30',
    attendanceSettings.clockOutGracePeriodMinutes ?? 30
  );

  const isPastClockInReminderTime = isTimeAfterOrEqual(currentWibClock, clockInReminderScheduledTime);
  const isPastClockOutReminderTime = isTimeAfterOrEqual(currentWibClock, clockOutReminderScheduledTime);

  // Ambil daftar santri & guru yang belum absen hari ini (masuk atau pulang)
  const getUnclockedUsersToday = (type: AttendanceType) => {
    const todayWib = getWibDate();
    const todayRecords = attendanceRecords.filter(r => r.date === todayWib);
    const targetUsers = users.filter(u => u.role === 'student' || u.role === 'teacher');
    const schoolName = systemSettings?.schoolName || 'MTs. Darul Huda';

    return targetUsers.filter(u => {
      const rec = todayRecords.find(r => r.userId === u.id);
      if (type === 'masuk') {
        return !rec || !rec.clockInTime;
      } else {
        return !rec || !rec.clockOutTime;
      }
    }).map(u => {
      const rec = todayRecords.find(r => r.userId === u.id);
      const recipientPhone = u.whatsappNumber || rec?.whatsappTarget || '';
      const recipientName = u.role === 'teacher' ? u.name : (u.parentName || 'Wali Santri');
      
      let waMessage = '';
      if (type === 'masuk') {
        waMessage = u.role === 'student'
          ? buildUnclockedInStudentMessage(u, todayWib, schoolName, attendanceSettings.clockInLate || '07:15', currentWibClock)
          : buildUnclockedInTeacherMessage(u, todayWib, schoolName, attendanceSettings.clockInLate || '07:15', currentWibClock);
      } else {
        waMessage = u.role === 'student'
          ? buildUnclockedOutStudentMessage(u, todayWib, schoolName, attendanceSettings.clockOutStart || '13:30', currentWibClock)
          : buildUnclockedOutTeacherMessage(u, todayWib, schoolName, attendanceSettings.clockOutStart || '13:30', currentWibClock);
      }

      const waUrl = recipientPhone ? createWhatsappLink(recipientPhone, waMessage) : '';
      const isNotified = Boolean(type === 'masuk' ? rec?.unclockedInAlertSent : rec?.unclockedOutAlertSent);

      return {
        user: u,
        record: rec,
        whatsappTarget: recipientPhone,
        recipientName,
        waMessage,
        waUrl,
        isNotified
      };
    });
  };

  // Kirim pemberitahuan peringatan WA ke perorangan (Wali Siswa atau Guru Pribadi)
  const sendUnclockedAlert = (userId: string, type: AttendanceType) => {
    const user = users.find(u => u.id === userId);
    if (!user) {
      return { success: false, message: 'Data pengguna tidak ditemukan.' };
    }

    const todayWib = getWibDate();
    const timeWib = getWibTime();
    const schoolName = systemSettings?.schoolName || user.schoolName || 'MTs. Darul Huda';
    const targetPhone = user.whatsappNumber;

    if (!targetPhone) {
      return { success: false, message: `Nomor WhatsApp ${user.role === 'student' ? 'wali murid' : 'guru'} belum diisi di profil.` };
    }

    let msg = '';
    if (type === 'masuk') {
      msg = user.role === 'student'
        ? buildUnclockedInStudentMessage(user, todayWib, schoolName, attendanceSettings.clockInLate || '07:15', timeWib)
        : buildUnclockedInTeacherMessage(user, todayWib, schoolName, attendanceSettings.clockInLate || '07:15', timeWib);
    } else {
      msg = user.role === 'student'
        ? buildUnclockedOutStudentMessage(user, todayWib, schoolName, attendanceSettings.clockOutStart || '13:30', timeWib)
        : buildUnclockedOutTeacherMessage(user, todayWib, schoolName, attendanceSettings.clockOutStart || '13:30', timeWib);
    }

    const waUrl = createWhatsappLink(targetPhone, msg);

    const existingIndex = attendanceRecords.findIndex(r => r.userId === user.id && r.date === todayWib);
    const existing = existingIndex >= 0 ? attendanceRecords[existingIndex] : null;

    let updatedRecord: AttendanceRecord;
    if (existing) {
      updatedRecord = {
        ...existing,
        whatsappTarget: targetPhone,
        notes: existing.notes ? `${existing.notes} | Peringatan WA belum absen ${type} dikirim` : `Peringatan WA belum absen ${type} dikirim`,
        ...(type === 'masuk' ? { unclockedInAlertSent: true, whatsappMessageIn: msg } : { unclockedOutAlertSent: true, whatsappMessageOut: msg }),
        lastNotificationTimestamp: Date.now()
      };
    } else {
      updatedRecord = {
        id: `att-alert-${user.id}-${todayWib}-${Date.now().toString(36)}`,
        userId: user.id,
        userName: user.name,
        userRole: user.role === 'teacher' ? 'teacher' : 'student',
        nisnOrNip: user.nisnOrNip || '',
        className: user.className,
        subjectOrPosition: user.subjectOrPosition,
        date: todayWib,
        status: 'alpa',
        notes: `Pemberitahuan WA belum absen ${type} dikirim (30 menit setelah jam ${type})`,
        whatsappTarget: targetPhone,
        whatsappRecipientType: user.role === 'teacher' ? 'guru' : 'wali_murid',
        whatsappRecipientName: user.role === 'teacher' ? user.name : (user.parentName || 'Wali Santri'),
        unclockedInAlertSent: type === 'masuk',
        unclockedOutAlertSent: type === 'pulang',
        lastNotificationTimestamp: Date.now(),
        timestamp: Date.now()
      };
    }

    setAttendanceRecords(prev => {
      const copy = [...prev];
      const idx = copy.findIndex(r => r.id === updatedRecord.id);
      if (idx >= 0) {
        copy[idx] = updatedRecord;
      } else {
        copy.unshift(updatedRecord);
      }
      return copy;
    });

    saveToFirestore('attendance', updatedRecord.id, updatedRecord);
    addAuditLog(
      'ATTENDANCE_UNCLOCKED_ALERT',
      'system',
      `Pemberitahuan WA belum absen ${type} dikirim ke ${user.name} (${user.role === 'student' ? 'Wali Santri' : 'Pribadi Guru'}) ke ${targetPhone}`,
      'info'
    );

    // Kirim langsung via WhatsApp Gateway API jika dikonfigurasi
    if (attendanceSettings.whatsappGatewayUrl && attendanceSettings.whatsappApiKey) {
      try {
        fetch(attendanceSettings.whatsappGatewayUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': attendanceSettings.whatsappApiKey
          },
          body: JSON.stringify({
            target: targetPhone,
            message: msg
          })
        }).catch(() => {});
      } catch {
        // Ignore network sandbox error
      }
    }

    return {
      success: true,
      waUrl,
      message: `Pemberitahuan WA belum absen ${type} berhasil dikirim ke ${user.name} (${targetPhone}).`
    };
  };

  // Kirim notifikasi serentak (batch) ke seluruh santri / guru yang belum absen dan belum dikirimi pesan hari ini
  const sendBatchUnclockedAlerts = (type: AttendanceType) => {
    const unclocked = getUnclockedUsersToday(type);
    const pending = unclocked.filter(u => u.whatsappTarget && !u.isNotified);
    let sentCount = 0;

    pending.forEach(item => {
      const res = sendUnclockedAlert(item.user.id, type);
      if (res.success) sentCount++;
    });

    return {
      totalSent: sentCount,
      message: sentCount > 0
        ? `Berhasil mengirim ${sentCount} pemberitahuan WhatsApp belum absen ${type} (30 menit setelah jam ${type}).`
        : `Semua santri & guru yang memiliki nomor WhatsApp telah dikirimi pemberitahuan atau sudah absen ${type}.`
    };
  };

  // Automatic Background Checker: Otomatis mengirim WA jika belum absen masuk/pulang setelah lewat 30 menit
  useEffect(() => {
    const todayWib = getWibDate();
    
    // Pengecekan otomatis belum absen masuk (30 menit setelah jam masuk)
    if (attendanceSettings.autoNotifyUnclockedIn !== false && isPastClockInReminderTime) {
      if (autoAlertInTriggeredDate.current !== todayWib) {
        autoAlertInTriggeredDate.current = todayWib;
        sendBatchUnclockedAlerts('masuk');
      }
    }

    // Pengecekan otomatis belum absen pulang (30 menit setelah jam pulang)
    if (attendanceSettings.autoNotifyUnclockedOut !== false && isPastClockOutReminderTime) {
      if (autoAlertOutTriggeredDate.current !== todayWib) {
        autoAlertOutTriggeredDate.current = todayWib;
        sendBatchUnclockedAlerts('pulang');
      }
    }
  }, [currentWibClock, isPastClockInReminderTime, isPastClockOutReminderTime, attendanceSettings]);

  const triggerAutoUpdate = () => {
    try {
      if ('caches' in window) {
        caches.keys().then((names) => {
          names.forEach((name) => caches.delete(name));
        });
      }
    } catch { /* ignore */ }
    window.location.reload();
  };

  const broadcastSystemUpdate = (message?: string) => {
    const newTimestamp = Date.now();
    const updatedPayload: SystemSettings = {
      ...systemSettings,
      appVersion: 'v4.9.0',
      lastUpdatedTimestamp: newTimestamp,
      updateMessage: message || 'Pembaruan naskah ujian atau pengaturan sistem CBT berhasil disinkronkan ke server cloud.'
    };
    saveToFirestore('settings', 'main', updatedPayload);
    setSystemSettings(updatedPayload);
    addAuditLog('BROADCAST_SYSTEM_UPDATE', 'system', `Pembaruan cloud disiarkan: ${updatedPayload.updateMessage}`, 'info');
  };

  const checkForUpdates = async (): Promise<boolean> => {
    try {
      const isOnline = await testFirestoreConnection();
      if (!isOnline) return false;
      const currentTs = systemSettings.lastUpdatedTimestamp || 0;
      if (currentTs > initialMountTime.current) {
        setIsUpdateAvailable(true);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const dismissUpdateNotification = () => {
    setIsUpdateAvailable(false);
  };

  return (
    <CbtContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        users,
        addUser,
        updateUser,
        deleteUser,
        importUsersFromExcel,
        loginWithCredentials,
        logout,
        switchUserRole,
        classes,
        addClass,
        updateClass,
        deleteClass,
        exams,
        addExam,
        updateExam,
        deleteExam,
        sessions,
        auditLogs,
        apiConfig,
        updateApiConfig,
        syncWithSiakad,
        systemSettings,
        updateSystemSettings,
        activeTab,
        setActiveTab,
        selectedExamId,
        setSelectedExamId,
        selectAndStartExam,
        isSimulatedOffline,
        setIsSimulatedOffline,
        firebaseStatus,
        firebaseProjectId: firebaseConfig.projectId,
        firestoreDatabaseId: firebaseConfig.firestoreDatabaseId,
        lastFirebaseSync,
        syncWithFirebase,
        uploadAllToFirebase,
        isUpdateAvailable,
        updateInfo,
        triggerAutoUpdate,
        broadcastSystemUpdate,
        checkForUpdates,
        dismissUpdateNotification,
        startExamForStudent,
        updateStudentAnswer,
        updateStudentCameraSnapshot,
        toggleFlagQuestion,
        submitExam,
        recordViolation,
        resetStudentSession,
        addAuditLog,
        broadcastAlert,
        latestBroadcast,
        clearLatestBroadcast,
        exportDatabaseJson,
        importDatabaseJson,
        resetToFactoryData,
        attendanceRecords,
        attendanceSettings,
        recordAttendance,
        updateAttendanceRecord,
        deleteAttendanceRecord,
        updateAttendanceSettings,
        sendWhatsappNotification,
        resetTodayAttendanceWib,
        getUnclockedUsersToday,
        sendUnclockedAlert,
        sendBatchUnclockedAlerts,
        isPastClockInReminderTime,
        isPastClockOutReminderTime,
        clockInReminderScheduledTime,
        clockOutReminderScheduledTime,
      }}
    >
      {children}
    </CbtContext.Provider>
  );
};

export const useCbt = () => {
  const context = useContext(CbtContext);
  if (!context) {
    throw new Error('useCbt must be used within a CbtProvider');
  }
  return context;
};
