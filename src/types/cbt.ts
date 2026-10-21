export type UserRole = 'student' | 'teacher' | 'admin';

export interface User {
  id: string;
  name: string;
  username: string;
  password?: string;
  role: UserRole;
  nisnOrNip: string;
  classId?: string;
  className?: string;
  schoolName: string;
  mfaSecret?: string;
  isMfaVerified?: boolean;
  avatarUrl?: string;
  whatsappNumber?: string; // Untuk Siswa: Nomor WA Wali Murid; Untuk Guru: Nomor WA Pribadi Guru
  parentName?: string;     // Nama Wali Murid (khusus siswa)
  subjectOrPosition?: string; // Mapel / Tugas (khusus guru)
  barcode?: string;        // ID Barcode kartu (default ke NISN/NIP jika tidak diatur)
}

export interface ClassGroup {
  id: string;
  name: string;
  grade: string;
  totalStudents: number;
  academicYear: string;
  homeroomTeacher?: string;
  majorOrTrack?: string;
  roomLocation?: string;
}

export interface QuestionOption {
  id: string;
  text: string;
  isCorrect?: boolean;
  image?: string;
}

export interface MatchingPair {
  id: string;
  leftPrompt: string;
  rightAnswer: string;
}

export type QuestionDifficulty = 'mudah' | 'sedang' | 'sukar';
export type QuestionType = 
  | 'multiple_choice' 
  | 'multiple_choice_complex' 
  | 'matching' 
  | 'essay';

export interface Question {
  id: string;
  number: number;
  type: QuestionType;
  text: string;
  image?: string;
  options: QuestionOption[];
  correctOptionId?: string; // For single choice
  correctOptionIds?: string[]; // For multiple_choice_complex (lebih dari satu jawaban)
  matchingPairs?: MatchingPair[]; // For matching (menjodohkan)
  matchingDistractors?: string[]; // For extra wrong options in matching
  sampleAnswer?: string; // For essay reference / rubric
  keywords?: string[]; // For essay key phrases
  points: number;
  category: string;
  difficulty: QuestionDifficulty;
  examDate?: string; // Tanggal khusus untuk butir soal (YYYY-MM-DD)
}

export interface Exam {
  id: string;
  code: string;
  title: string;
  subject: string;
  academicYear: string;
  semester: string;
  durationMinutes: number;
  passingGrade: number; // KKM e.g. 75
  totalQuestions: number;
  classesAllowed: string[]; // Class IDs
  randomizeQuestions: boolean;
  randomizeOptions: boolean;
  maxViolationsAllowed: number;
  status: 'draft' | 'active' | 'completed';
  startTime: string;
  endTime: string;
  examDate?: string; // Tanggal pelaksanaan ujian (YYYY-MM-DD), misal: '2026-10-19'
  examStartTime?: string; // Jam mulai pelaksanaan ujian, misal: '07:30'
  examEndTime?: string; // Jam selesai pelaksanaan ujian, misal: '09:00'
  questions: Question[];
  token?: string; // Token rahasia ujian yang wajib dimasukkan siswa
  authorId?: string; // ID Akun Guru pembuat soal (misal: 'usr-teacher-1')
  authorName?: string; // Nama Guru pembuat soal (misal: 'Siti Fatimah, S.Pd.I')
  authorUsername?: string; // Username akun guru (misal: 'guru')
}

export type ViolationType = 
  | 'tab_switch' 
  | 'split_screen' 
  | 'right_click' 
  | 'clipboard_attempt' 
  | 'fullscreen_exit'
  | 'devtools_attempt';

export interface ViolationLog {
  id: string;
  sessionId: string;
  studentId: string;
  studentName: string;
  className: string;
  type: ViolationType;
  timestamp: string;
  detail: string;
  severity: 'low' | 'medium' | 'high';
}

export type SessionStatus = 'not_started' | 'in_progress' | 'completed' | 'locked' | 'disqualified';
export type ProctorResetAction = 'unlock' | 'reset_violations' | 'reset_exam' | 'add_10_mins' | 'force_submit' | 'reopen_exam';

export interface StudentExamSession {
  id: string;
  examId: string;
  studentId: string;
  studentName: string;
  nisn: string;
  classId: string;
  className: string;
  status: SessionStatus;
  randomizedQuestions: Question[];
  answers: Record<string, any>; // questionId -> selectedOptionId, array of optionIds, matching pairs map, or essay text
  flaggedQuestionIds: string[]; // Ragu-ragu
  currentQuestionIndex: number;
  startTime?: number;
  endTime?: number;
  submittedAt?: string;
  timeRemainingSeconds: number;
  score?: number;
  correctCount?: number;
  wrongCount?: number;
  unansweredCount?: number;
  isPassed?: boolean;
  tokenVerified?: boolean;
  violationsCount: number;
  violationLogs: ViolationLog[];
  isOnline: boolean;
  lastSyncTimestamp: number;
  ipAddress?: string;
  deviceInfo?: string;
  cameraSnapshot?: string; // Base64 JPEG data URL snapshot wajah siswa dari kamera HP/laptop
  cameraActive?: boolean;  // Status apakah kamera siswa aktif & memancarkan video
  lastCameraUpdate?: number; // Waktu timestamp update snapshot kamera terakhir
}

export interface SystemAuditLog {
  id: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  category: 'auth' | 'exam' | 'anti_cheat' | 'proctor' | 'system' | 'api';
  details: string;
  level: 'info' | 'warn' | 'error';
}

export interface AcademicApiConfig {
  endpointUrl: string;
  apiKey: string;
  schoolId: string;
  schoolName: string;
  autoPushGrades: boolean;
  lastSyncTime?: string;
  syncStatus: 'connected' | 'idle' | 'syncing' | 'error';
  totalSyncedStudents: number;
}

export type DatabaseProviderType = 'local' | 'firebase' | 'supabase' | 'custom_rest';

export interface FirebaseManualConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
  firestoreCollectionPrefix?: string;
}

export interface SupabaseManualConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey?: string;
  tablePrefix?: string;
}

export interface CustomRestConfig {
  apiBaseUrl: string;
  authTokenOrKey?: string;
  headerName?: string;
  syncIntervalMinutes?: number;
}

export interface DatabaseStorageConfig {
  activeProvider: DatabaseProviderType;
  autoSync: boolean;
  syncIntervalMinutes: number;
  lastConnectedAt?: string;
  connectionStatus: 'connected' | 'disconnected' | 'testing' | 'error';
  lastError?: string;
  firebase: FirebaseManualConfig;
  supabase: SupabaseManualConfig;
  customRest: CustomRestConfig;
}

export interface SystemSettings {
  // Profil Lembaga
  schoolName: string;
  schoolLevel: string;
  nsm: string;
  npsn: string;
  address: string;
  subdistrict: string;
  city: string;
  province: string;
  headmasterName: string;
  headmasterNip: string;
  leadProctorName: string;
  techSupportName: string;
  academicYear: string;
  activeSemester: 'Ganjil' | 'Genap';
  
  // Konfigurasi Anti-Cheat & Aturan Ujian
  maxViolationsAllowed: number;
  enableTabSwitchDetection: boolean;
  enableSplitScreenDetection: boolean;
  enableDisableRightClick: boolean;
  enableDisableClipboard: boolean;
  enableDevtoolsBlock: boolean;
  defaultPassingGrade: number;
  randomizeQuestions: boolean;
  randomizeOptions: boolean;
  
  // Keamanan & Sesi
  examTokenRequired: boolean;
  currentExamToken: string;
  allowStudentReviewAnswers: boolean;
  showScoreImmediately: boolean;
  
  // Audio & Notifikasi
  alertSoundEnabled: boolean;
  emergencyBroadcastAlerts: boolean;

  // Auto-Update & Sinkronisasi Tanpa Republish
  appVersion?: string;
  lastUpdatedTimestamp?: number;
  updateMessage?: string;

  // Penyimpanan Database Manual & Eksternal (Firebase / Supabase / REST)
  databaseStorage?: DatabaseStorageConfig;
}

export type AttendanceStatus = 'hadir' | 'terlambat' | 'izin' | 'sakit' | 'alpa';
export type AttendanceType = 'masuk' | 'pulang';

export interface AttendanceRecord {
  id: string;
  userId: string;
  userName: string;
  userRole: 'student' | 'teacher';
  nisnOrNip: string;
  className?: string;          // Khusus siswa
  subjectOrPosition?: string;  // Khusus guru
  date: string;                // YYYY-MM-DD dalam format WIB (Waktu Indonesia Barat)
  clockInTime?: string;        // HH:mm:ss WIB
  clockOutTime?: string;       // HH:mm:ss WIB
  status: AttendanceStatus;    // hadir / terlambat / dsb
  notes?: string;
  // WhatsApp notification integration
  whatsappTarget?: string;     // Nomor WA tujuan (wali murid / guru)
  whatsappRecipientType?: 'wali_murid' | 'guru';
  whatsappRecipientName?: string;
  whatsappNotifiedIn?: boolean;
  whatsappNotifiedOut?: boolean;
  whatsappMessageIn?: string;
  whatsappMessageOut?: string;
  unclockedInAlertSent?: boolean;  // Penanda peringatan WA belum absen masuk (30 menit)
  unclockedOutAlertSent?: boolean; // Penanda peringatan WA belum absen pulang (30 menit)
  lastNotificationTimestamp?: number;
  scannerSource?: 'external_scanner' | 'camera_scanner' | 'manual_entry';
  timestamp: number;
}

export interface AttendanceSettings {
  clockInStart: string;   // e.g. "06:00"
  clockInLate: string;    // e.g. "07:15" (lewat jam ini = Terlambat)
  clockInEnd: string;     // e.g. "09:00"
  clockOutStart: string;  // e.g. "13:30"
  clockOutEnd: string;    // e.g. "17:00"
  autoSendWhatsapp: boolean;
  whatsappGatewayUrl?: string; // e.g. webhook atau API gateway Fonnte / Wablas
  whatsappApiKey?: string;
  // Pemberitahuan Otomatis WA 30 Menit Setelah Jam Masuk & Pulang
  autoNotifyUnclockedIn?: boolean;       // Otomatis kirim WA jika belum absen masuk (default: true)
  clockInGracePeriodMinutes?: number;    // Menit setelah jam masuk (default: 30)
  autoNotifyUnclockedOut?: boolean;      // Otomatis kirim WA jika belum absen pulang (default: true)
  clockOutGracePeriodMinutes?: number;   // Menit setelah jam pulang (default: 30)
}

