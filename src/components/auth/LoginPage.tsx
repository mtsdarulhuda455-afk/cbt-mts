import React, { useState, useRef, useMemo } from 'react';
import { useCbt } from '../../context/CbtContext';
import { User } from '../../types/cbt';
import { INITIAL_USERS } from '../../data/mockCbtData';
import { 
  GraduationCap, 
  Lock, 
  User as UserIcon, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  School,
  Sparkles,
  KeyRound,
  Database,
  Upload,
  RefreshCw,
  FileText,
  Users,
  Info,
  RotateCcw,
  Check,
  X,
  Search,
  Zap,
  Briefcase,
  ChevronRight,
  Shield
} from 'lucide-react';

interface LoginPageProps {
  onSuccess?: () => void;
  isModal?: boolean;
  onClose?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSuccess, isModal = false, onClose }) => {
  const { 
    loginWithCredentials, 
    loginAsUser,
    apiConfig, 
    systemSettings, 
    users, 
    classes, 
    exams,
    firebaseStatus,
    importDatabaseJson,
    syncWithFirebase,
    resetToFactoryData
  } = useCbt();

  // Role Tab State: 'student' | 'teacher' | 'admin'
  const [activeRoleTab, setActiveRoleTab] = useState<'student' | 'teacher' | 'admin'>('student');
  
  // Form input state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Deployment & Database Hub States
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);
  const [dbNotice, setDbNotice] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [showAccountsListModal, setShowAccountsListModal] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [restoredStats, setRestoredStats] = useState<any>(null);

  // Modal filters
  const [modalRoleFilter, setModalRoleFilter] = useState<'all' | 'admin' | 'teacher' | 'student'>('all');
  const [modalSearchQuery, setModalSearchQuery] = useState('');
  
  // Student tab filters
  const [studentClassFilter, setStudentClassFilter] = useState<string>('all');
  const [studentSearchQuery, setStudentSearchQuery] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Separate users by role from the current active database
  const activeUsers = useMemo(() => {
    return users && users.length > 0 ? users : INITIAL_USERS;
  }, [users]);

  const adminUsers = useMemo(() => {
    const list = activeUsers.filter(u => u.role === 'admin');
    return list.length > 0 ? list : INITIAL_USERS.filter(u => u.role === 'admin');
  }, [activeUsers]);

  const teacherUsers = useMemo(() => {
    const list = activeUsers.filter(u => u.role === 'teacher');
    return list.length > 0 ? list : INITIAL_USERS.filter(u => u.role === 'teacher');
  }, [activeUsers]);

  const studentUsers = useMemo(() => {
    const list = activeUsers.filter(u => u.role === 'student');
    return list.length > 0 ? list : INITIAL_USERS.filter(u => u.role === 'student');
  }, [activeUsers]);

  // 1-Click Direct Authentication without manual typing
  const handleDirectLogin = (user: User) => {
    setIsLoading(true);
    setErrorMsg(null);
    setTimeout(() => {
      loginAsUser(user);
      setIsLoading(false);
      if (onSuccess) onSuccess();
      if (onClose) onClose();
    }, 200);
  };

  // Submit via traditional form credentials
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    setTimeout(() => {
      const res = loginWithCredentials(username, password);
      setIsLoading(false);
      if (res.success) {
        if (onSuccess) onSuccess();
        if (onClose) onClose();
      } else {
        setErrorMsg(res.error || 'Gagal masuk. Periksa kembali username dan kata sandi Anda.');
      }
    }, 350);
  };

  const handleQuickFill = (u: string, p: string, role: 'student' | 'teacher' | 'admin' = 'student') => {
    setUsername(u);
    setPassword(p);
    setErrorMsg(null);
    setActiveRoleTab(role);
  };

  // Handle Restore Database from JSON Backup File directly from Login Page
  const handleFileRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setDbNotice({
      type: 'info',
      text: 'Membaca file cadangan dan menyinkronkan data ke Cloud Firestore agar semua perangkat terhubung...'
    });

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const res = await importDatabaseJson(content);
        if (res.success) {
          setRestoredStats(res.counts);
          setShowRestoreModal(true);
          setDbNotice({
            type: 'success',
            text: res.message || `Berhasil memulihkan basis data! Ditemukan ${res.counts?.users || 0} akun pengguna, ${res.counts?.classes || 0} rombel, dan ${res.counts?.exams || 0} ujian. Seluruh perangkat otomatis tersinkron!`
          });
        } else {
          setDbNotice({
            type: 'error',
            text: res.message || 'Gagal memulihkan database dari file JSON.'
          });
        }
      } catch (err: any) {
        setDbNotice({
          type: 'error',
          text: `Kesalahan saat membaca file: ${err.message || 'Format tidak valid'}`
        });
      }
    };
    reader.readAsText(file);
    if (e.target) e.target.value = '';
  };

  // Pull latest database from Firebase Cloud Firestore
  const handleCloudSync = async () => {
    setIsSyncingCloud(true);
    setDbNotice(null);
    try {
      const res = await syncWithFirebase('pull');
      setIsSyncingCloud(false);
      if (res.success) {
        setDbNotice({
          type: 'success',
          text: `Berhasil menarik data dari Cloud Firebase! Sekarang ada ${res.counts?.users || users.length} akun terdaftar di peramban ini.`
        });
      } else {
        setDbNotice({
          type: 'info',
          text: res.message || 'Tidak ada data baru di Firebase Cloud.'
        });
      }
    } catch {
      setIsSyncingCloud(false);
      setDbNotice({
        type: 'error',
        text: 'Gagal terhubung ke Cloud Firebase. Periksa koneksi internet Anda atau gunakan file backup (.json).'
      });
    }
  };

  // Emergency reset to factory default accounts
  const handleEmergencyReset = () => {
    if (window.confirm('Reset database ke akun bawaan standar (Admin: admin123, Guru: guru123, Siswa: siswa123)?')) {
      resetToFactoryData();
      handleQuickFill('admin', 'admin123');
      setDbNotice({
        type: 'success',
        text: 'Database berhasil direset ke akun bawaan standar. Silakan masuk sebagai Admin atau Guru.'
      });
    }
  };

  // Modal filtered accounts list
  const filteredModalUsers = useMemo(() => {
    return activeUsers
      .filter(u => {
        if (modalRoleFilter !== 'all' && u.role !== modalRoleFilter) return false;
        if (!modalSearchQuery.trim()) return true;
        const q = modalSearchQuery.toLowerCase();
        return (
          (u.name && u.name.toLowerCase().includes(q)) ||
          (u.username && u.username.toLowerCase().includes(q)) ||
          (u.nisnOrNip && u.nisnOrNip.toLowerCase().includes(q)) ||
          (u.className && u.className.toLowerCase().includes(q)) ||
          (u.subjectOrPosition && u.subjectOrPosition.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => {
        // Sort priority: Admin first, then Teacher, then Student
        const rank = { admin: 1, teacher: 2, student: 3 };
        return (rank[a.role] || 4) - (rank[b.role] || 4);
      });
  }, [activeUsers, modalRoleFilter, modalSearchQuery]);

  // Student list filtered for quick picker
  const filteredStudentsForPicker = useMemo(() => {
    return studentUsers.filter(s => {
      if (studentClassFilter !== 'all' && s.className !== studentClassFilter) return false;
      if (!studentSearchQuery.trim()) return true;
      const q = studentSearchQuery.toLowerCase();
      return (
        (s.name && s.name.toLowerCase().includes(q)) ||
        (s.nisnOrNip && s.nisnOrNip.toLowerCase().includes(q)) ||
        (s.username && s.username.toLowerCase().includes(q))
      );
    });
  }, [studentUsers, studentClassFilter, studentSearchQuery]);

  const schoolNameDisplay = systemSettings?.schoolName || apiConfig?.schoolName || 'MTs. Darul Huda';

  const content = (
    <div className="w-full max-w-lg mx-auto">
      {/* Header Logo */}
      <div className="text-center mb-5">
        <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-700 text-white shadow-lg shadow-emerald-200 mb-2.5">
          <GraduationCap className="w-8 h-8 sm:w-9 sm:h-9" />
        </div>
        <div className="inline-block px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10.5px] font-extrabold rounded-full uppercase tracking-wider mb-1">
          KEMENTERIAN AGAMA RI
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          Portal CBT Madrasah
        </h2>
        <p className="text-xs sm:text-sm font-bold text-emerald-800 mt-0.5">
          {schoolNameDisplay}
        </p>
      </div>

      {/* Main Login Card */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 shadow-xl border border-slate-100">
        
        {/* Header bar */}
        <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-slate-100 text-slate-700 text-xs font-bold">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-600" />
            <span>Pilih Peran &amp; Masuk CBT</span>
          </div>
          <div className="flex items-center gap-2">
            <div 
              className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition ${
                firebaseStatus === 'connected' 
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                  : firebaseStatus === 'syncing'
                  ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
              title="Status sinkronisasi data antar perangkat via Cloud Firebase"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${
                firebaseStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : firebaseStatus === 'syncing' ? 'bg-indigo-500 animate-spin' : 'bg-slate-400'
              }`}></span>
              <span>{firebaseStatus === 'connected' ? 'Cloud Terhubung' : firebaseStatus === 'syncing' ? 'Menyinkronkan...' : 'Offline-First'}</span>
            </div>
            <button
              type="button"
              onClick={() => setShowAccountsListModal(true)}
              className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-800 transition flex items-center gap-1 cursor-pointer"
              title="Lihat semua akun yang tersimpan di database"
            >
              <Users className="w-3.5 h-3.5 text-emerald-600" />
              <span>{activeUsers.length} Akun</span>
            </button>
          </div>
        </div>

        {/* Database notice banner */}
        {dbNotice && (
          <div className={`mb-4 p-3.5 rounded-2xl text-xs font-semibold flex items-start gap-2.5 animate-in fade-in ${
            dbNotice.type === 'success' 
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' 
              : dbNotice.type === 'error'
              ? 'bg-rose-50 border border-rose-200 text-rose-700'
              : 'bg-indigo-50 border border-indigo-200 text-indigo-800'
          }`}>
            {dbNotice.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
            ) : dbNotice.type === 'error' ? (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
            ) : (
              <Info className="w-4 h-4 shrink-0 text-indigo-600 mt-0.5" />
            )}
            <div className="flex-1 text-[11.5px] leading-relaxed">{dbNotice.text}</div>
            <button onClick={() => setDbNotice(null)} className="text-slate-400 hover:text-slate-600">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {errorMsg && (
          <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-semibold text-rose-700 flex items-start gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
            <div className="flex-1 text-[11.5px] leading-relaxed">{errorMsg}</div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ROLE SELECTOR TABS: SISWA (DENGAN SCROLL), GURU & ADMIN (KETIK MANUAL)   */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-3 gap-1.5 p-1.5 bg-slate-100 rounded-2xl mb-5 text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setActiveRoleTab('student');
              setErrorMsg(null);
            }}
            className={`py-2 px-2 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeRoleTab === 'student'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>Siswa</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
              activeRoleTab === 'student' ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {studentUsers.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveRoleTab('teacher');
              setErrorMsg(null);
            }}
            className={`py-2 px-2 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeRoleTab === 'teacher'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            <span>Guru (Ketik)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveRoleTab('admin');
              setErrorMsg(null);
            }}
            className={`py-2 px-2 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeRoleTab === 'admin'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Admin (Ketik)</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: AKUN SISWA / SANTRI PESERTA UJIAN (FORM + SCROLL PILIHAN NAMA)    */}
        {/* ========================================================================= */}
        {activeRoleTab === 'student' && (
          <div className="space-y-4 animate-in fade-in">
            {/* Quick Student Login Form */}
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  NISN / Username Siswa
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Ketik NISN atau pilih dari daftar di bawah..."
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Kata Sandi Siswa
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Ketik kata sandi (default: siswa123)..."
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-1 text-slate-400 hover:text-slate-600 absolute right-3 top-2.5 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-1">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-200 cursor-pointer transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isLoading ? (
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <>
                      <span>Masuk Ujian Siswa</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Quick Student Picker by Class - TETAP DITAMPILKAN UNTUK SISWA */}
            <div className="pt-3.5 border-t border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4 text-emerald-600" />
                  <span className="text-[11.5px] font-bold text-slate-700">
                    Scroll Pilihan Siswa ({filteredStudentsForPicker.length} Terdaftar)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setModalRoleFilter('student');
                    setShowAccountsListModal(true);
                  }}
                  className="text-[11px] text-emerald-700 hover:underline font-bold cursor-pointer"
                >
                  Semua Siswa
                </button>
              </div>

              <div className="flex items-center gap-2 mb-2.5">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={studentSearchQuery}
                    onChange={(e) => setStudentSearchQuery(e.target.value)}
                    placeholder="Cari nama santri atau NISN..."
                    className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                {classes.length > 0 && (
                  <select
                    value={studentClassFilter}
                    onChange={(e) => setStudentClassFilter(e.target.value)}
                    className="py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
                  >
                    <option value="all">Semua Rombel</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Scrollable list of students */}
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {filteredStudentsForPicker.length === 0 ? (
                  <div className="text-center py-4 text-slate-400 text-xs">
                    Tidak ada siswa yang cocok dengan pencarian.
                  </div>
                ) : (
                  filteredStudentsForPicker.map(st => (
                    <div
                      key={st.id}
                      className="p-2.5 bg-slate-50 hover:bg-emerald-50/70 border border-slate-200 hover:border-emerald-300 rounded-xl flex items-center justify-between text-xs transition"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="font-extrabold text-slate-800 truncate">{st.name}</div>
                        <div className="text-[10.5px] text-slate-500 font-mono mt-0.5">
                          <span className="text-emerald-700 font-bold">{st.className || 'Peserta'}</span> • NISN: {st.nisnOrNip || st.username}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleDirectLogin(st)}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold cursor-pointer transition shadow-2xs flex items-center gap-1"
                          title="Langsung masuk sebagai siswa ini"
                        >
                          <Zap className="w-3 h-3" />
                          <span>Pilih</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setUsername(st.username);
                            setPassword(st.password || 'siswa123');
                          }}
                          className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold cursor-pointer"
                          title="Isi NISN dan kata sandi ke formulir"
                        >
                          Isi
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: AKUN GURU (WAJIB KETIK MANUAL, TIDAK ADA SCROLL PILIHAN GURU)     */}
        {/* ========================================================================= */}
        {activeRoleTab === 'teacher' && (
          <form onSubmit={handleSubmit} className="space-y-4 animate-in fade-in">
            <div className="bg-indigo-50/80 border border-indigo-200 rounded-2xl p-3.5 text-xs text-indigo-950">
              <div className="flex items-center gap-2 font-bold mb-1 text-indigo-900">
                <Briefcase className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>Login Akun Guru / Pengawas (Ketik Manual)</span>
              </div>
              <p className="text-[11.5px] text-indigo-800/90 leading-relaxed">
                Untuk keamanan ujian, data akun guru tidak ditampilkan dalam daftar pilihan. Silakan <strong>ketik manual username dan password</strong> Anda.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Username / NIP Guru
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  autoFocus
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ketik username atau NIP guru..."
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Kata Sandi Guru
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ketik kata sandi guru..."
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1 text-slate-400 hover:text-slate-600 absolute right-3 top-2.5 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-1">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md shadow-indigo-200 cursor-pointer transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <>
                    <Briefcase className="w-4 h-4" />
                    <span>Masuk sebagai Guru</span>
                  </>
                )}
              </button>
            </div>

            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-500 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-500 shrink-0" />
              <span>Daftar pilihan nama guru ditiadakan demi menjaga keamanan naskah soal dan ruang pengawas.</span>
            </div>
          </form>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: AKUN ADMIN (WAJIB KETIK MANUAL, TIDAK ADA SCROLL PILIHAN ADMIN)   */}
        {/* ========================================================================= */}
        {activeRoleTab === 'admin' && (
          <form onSubmit={handleSubmit} className="space-y-4 animate-in fade-in">
            <div className="bg-rose-50/80 border border-rose-200 rounded-2xl p-3.5 text-xs text-rose-950">
              <div className="flex items-center gap-2 font-bold mb-1 text-rose-900">
                <Shield className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Login Administrator CBT (Ketik Manual)</span>
              </div>
              <p className="text-[11.5px] text-rose-800/90 leading-relaxed">
                Untuk keamanan sistem madrasah, akun admin tidak dimunculkan di daftar pilihan. Silakan <strong>ketik manual username dan password</strong> Administrator.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Username Administrator
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  autoFocus
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ketik username admin..."
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-rose-500 focus:bg-white transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Kata Sandi Administrator
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ketik kata sandi admin..."
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-rose-500 focus:bg-white transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1 text-slate-400 hover:text-slate-600 absolute right-3 top-2.5 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-1">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-md shadow-rose-200 cursor-pointer transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <>
                    <Shield className="w-4 h-4" />
                    <span>Masuk sebagai Admin</span>
                  </>
                )}
              </button>
            </div>

            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-500 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-rose-500 shrink-0" />
              <span>Daftar pilihan nama admin ditiadakan demi melindungi data induk ujian dan konfigurasi madrasah.</span>
            </div>
          </form>
        )}

        {/* Info Keamanan Login */}
        <div className="mt-5 pt-3.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5 text-slate-600 font-medium">
            <Lock className="w-3.5 h-3.5 text-amber-600" />
            <span>Akun Guru &amp; Admin wajib diketik manual</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">
            {activeRoleTab === 'student' ? 'Scroll nama siswa aktif' : 'Mode ketik manual aktif'}
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* DEPLOYMENT & DATABASE RECOVERY HUB (KHUSUS NETLIFY & HOSTING PIHAK KEDUA) */}
      {/* ========================================================================= */}
      <div className="mt-4 bg-white/95 backdrop-blur-xs rounded-2xl p-4 border border-slate-200 shadow-sm text-xs">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 font-bold text-slate-800">
            <Database className="w-4 h-4 text-emerald-600" />
            <span>Pusat Database &amp; Deployment</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10.5px]">
            <span className={`w-2 h-2 rounded-full ${firebaseStatus === 'connected' ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
            <span className="text-slate-500">
              {firebaseStatus === 'connected' ? 'Cloud Terhubung' : 'Offline-First'}
            </span>
          </div>
        </div>

        <p className="text-[11px] text-slate-500 leading-relaxed mb-3">
          Jika baru dideploy ke Netlify/hosting baru, muat database akun Anda di bawah ini agar seluruh akun Admin, Guru, dan Siswa aktif:
        </p>

        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileRestore}
          accept=".json"
          className="hidden"
        />

        <div className="grid grid-cols-2 gap-2">
          {/* Tombol Pulihkan File Backup */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-xl text-emerald-900 font-bold flex items-center justify-center gap-1.5 cursor-pointer transition text-left"
            title="Muat file cadangan JSON yang Anda ekspor sebelumnya"
          >
            <Upload className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="truncate">Pulihkan Database (.json)</span>
          </button>

          {/* Tombol Sinkronisasi Server / Cloud */}
          <button
            type="button"
            onClick={handleCloudSync}
            disabled={isSyncingCloud}
            className="p-2.5 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-xl text-slate-800 hover:text-indigo-900 font-bold flex items-center justify-center gap-1.5 cursor-pointer transition text-left disabled:opacity-50"
            title="Tarik data santri, guru, dan ujian yang telah tersimpan di Server Pusat atau Firebase Firestore"
          >
            <RefreshCw className={`w-4 h-4 text-indigo-600 shrink-0 ${isSyncingCloud ? 'animate-spin' : ''}`} />
            <span className="truncate">{isSyncingCloud ? 'Menyinkronkan...' : 'Tarik dari Server/Cloud'}</span>
          </button>
        </div>

        {/* Secondary options: Cek Akun Terdaftar & Reset Darurat */}
        <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
          <button
            type="button"
            onClick={() => setShowAccountsListModal(true)}
            className="text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-1 cursor-pointer"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Lihat Semua Akun ({activeUsers.length})</span>
          </button>

          <button
            type="button"
            onClick={handleEmergencyReset}
            className="text-slate-400 hover:text-rose-600 flex items-center gap-1 cursor-pointer"
            title="Kembalikan akun ke setelan default"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Akun</span>
          </button>
        </div>
      </div>

      <div className="mt-4 text-center text-xs text-slate-400">
        Sistem Ujian Daring Terpadu MTs. Darul Huda • Anti-Cheat Engine v4.8
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: DAFTAR AKUN TERDAFTAR DI DATABASE LENGKAP DENGAN TAB PERAN & CARI */}
      {/* ========================================================================= */}
      {showAccountsListModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[88vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-600" />
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">
                    Daftar Akun Terdaftar di Database ({activeUsers.length})
                  </h3>
                  <div className="text-[10px] text-slate-500">
                    Admin: {adminUsers.length} • Guru: {teacherUsers.length} • Siswa: {studentUsers.length}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowAccountsListModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Role Filter Tabs & Search Bar */}
            <div className="p-3 border-b border-slate-100 bg-white space-y-2.5">
              <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-xl text-xs font-bold text-center">
                <button
                  type="button"
                  onClick={() => setModalRoleFilter('all')}
                  className={`py-1.5 rounded-lg transition cursor-pointer ${
                    modalRoleFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Semua ({activeUsers.length})
                </button>
                <button
                  type="button"
                  onClick={() => setModalRoleFilter('admin')}
                  className={`py-1.5 rounded-lg transition cursor-pointer ${
                    modalRoleFilter === 'admin' ? 'bg-rose-600 text-white shadow-2xs' : 'text-slate-600 hover:text-rose-700'
                  }`}
                >
                  Admin ({adminUsers.length})
                </button>
                <button
                  type="button"
                  onClick={() => setModalRoleFilter('teacher')}
                  className={`py-1.5 rounded-lg transition cursor-pointer ${
                    modalRoleFilter === 'teacher' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:text-indigo-700'
                  }`}
                >
                  Guru ({teacherUsers.length})
                </button>
                <button
                  type="button"
                  onClick={() => setModalRoleFilter('student')}
                  className={`py-1.5 rounded-lg transition cursor-pointer ${
                    modalRoleFilter === 'student' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-600 hover:text-emerald-700'
                  }`}
                >
                  Siswa ({studentUsers.length})
                </button>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={modalSearchQuery}
                  onChange={(e) => setModalSearchQuery(e.target.value)}
                  placeholder="Cari berdasarkan nama, username, NIP, NISN, atau kelas..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                />
              </div>
            </div>

            {/* Accounts List */}
            <div className="p-3 overflow-y-auto flex-1 space-y-2 text-xs">
              {filteredModalUsers.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p>Tidak ada akun yang sesuai dengan filter pencarian.</p>
                </div>
              ) : (
                filteredModalUsers.map((u) => (
                  <div
                    key={u.id}
                    className={`p-3 rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                      u.role === 'admin'
                        ? 'border-rose-200 bg-rose-50/40 hover:bg-rose-50'
                        : u.role === 'teacher'
                        ? 'border-indigo-200 bg-indigo-50/40 hover:bg-indigo-50'
                        : 'border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/40'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-slate-900 truncate">{u.name}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                          u.role === 'admin' 
                            ? 'bg-rose-100 text-rose-800' 
                            : u.role === 'teacher' 
                            ? 'bg-indigo-100 text-indigo-800' 
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {u.role === 'admin' ? 'ADMIN' : u.role === 'teacher' ? 'GURU' : 'SISWA'}
                        </span>
                      </div>
                      
                      <div className="text-[11px] text-slate-500 font-mono flex flex-wrap items-center gap-2 mt-1">
                        <span>User: <strong className="text-slate-800">{u.username}</strong></span>
                        {u.password && u.role === 'student' && (
                          <span>• Sandi: <strong className="text-slate-700">{u.password}</strong></span>
                        )}
                        {u.nisnOrNip && <span>• {u.role === 'student' ? 'NISN' : 'NIP'}: {u.nisnOrNip}</span>}
                        {u.className && <span className="text-emerald-700 font-bold">• {u.className}</span>}
                        {u.subjectOrPosition && <span className="text-indigo-700 font-bold">• {u.subjectOrPosition}</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {u.role === 'student' ? (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              handleDirectLogin(u);
                              setShowAccountsListModal(false);
                            }}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs cursor-pointer shrink-0 transition flex items-center gap-1 shadow-2xs"
                            title="Langsung masuk sebagai siswa ini"
                          >
                            <Zap className="w-3.5 h-3.5" />
                            <span>Pilih Siswa</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              handleQuickFill(u.username, u.password || 'siswa123', 'student');
                              setShowAccountsListModal(false);
                            }}
                            className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl font-semibold text-xs cursor-pointer shrink-0 transition"
                            title="Isi NISN ke formulir login"
                          >
                            Isi
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveRoleTab(u.role === 'admin' ? 'admin' : 'teacher');
                            setShowAccountsListModal(false);
                            setErrorMsg(null);
                          }}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl font-semibold text-xs cursor-pointer shrink-0 transition flex items-center gap-1.5"
                          title="Buka tab untuk mengetik username dan kata sandi manual"
                        >
                          <Lock className="w-3.5 h-3.5 text-amber-600" />
                          <span>Ketik Manual di Tab {u.role === 'admin' ? 'Admin' : 'Guru'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 text-right">
              <button
                type="button"
                onClick={() => setShowAccountsListModal(false)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: NOTIFIKASI SUKSES PEMULIHAN DATABASE DENGAN PILIHAN AKUN ADMIN & GURU */}
      {/* ========================================================================= */}
      {showRestoreModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 text-center shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <h3 className="text-base font-black text-slate-900 mb-1">
              Pemulihan Database Berhasil!
            </h3>
            <p className="text-xs text-slate-500 mb-2">
              Seluruh data CBT berhasil dimuat dan disinkronkan ke Cloud Firebase.
            </p>
            <div className="mb-3.5 p-2 bg-emerald-50 border border-emerald-200 rounded-xl text-[10.5px] text-emerald-800 font-semibold flex items-center justify-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
              <span>Semua perangkat lain yang membuka link ini langsung tersinkron tanpa perlu upload lagi!</span>
            </div>

            {/* Summary statistics */}
            <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs mb-4">
              <div className="text-center">
                <div className="font-black text-emerald-700 text-sm">{restoredStats?.users || activeUsers.length}</div>
                <div className="text-[10px] text-slate-500 font-semibold">Total Pengguna</div>
              </div>
              <div className="text-center">
                <div className="font-black text-indigo-700 text-sm">{restoredStats?.classes || classes.length}</div>
                <div className="text-[10px] text-slate-500 font-semibold">Rombel</div>
              </div>
              <div className="text-center">
                <div className="font-black text-amber-700 text-sm">{restoredStats?.exams || exams.length}</div>
                <div className="text-[10px] text-slate-500 font-semibold">Ujian</div>
              </div>
            </div>

            {/* Direct 1-Click Login options right after restore */}
            <div className="space-y-2 mb-4 text-left">
              {/* Detected Admin Account */}
              {adminUsers.length > 0 && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-[10px] font-black uppercase text-rose-800 bg-rose-100 px-1.5 py-0.5 rounded">
                      AKUN ADMIN TERDETEKSI
                    </span>
                    <div className="font-bold text-xs text-slate-900 truncate mt-1">
                      {adminUsers[0].name}
                    </div>
                    <div className="text-[10.5px] text-slate-500 font-mono">
                      User: <strong>{adminUsers[0].username}</strong>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowRestoreModal(false);
                      handleDirectLogin(adminUsers[0]);
                    }}
                    className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0 transition"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Masuk Admin</span>
                  </button>
                </div>
              )}

              {/* Detected Teacher Account */}
              {teacherUsers.length > 0 && (
                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-2xl flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-[10px] font-black uppercase text-indigo-800 bg-indigo-100 px-1.5 py-0.5 rounded">
                      AKUN GURU TERDETEKSI
                    </span>
                    <div className="font-bold text-xs text-slate-900 truncate mt-1">
                      {teacherUsers[0].name}
                    </div>
                    <div className="text-[10.5px] text-slate-500 font-mono">
                      User: <strong>{teacherUsers[0].username}</strong>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowRestoreModal(false);
                      handleDirectLogin(teacherUsers[0]);
                    }}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0 transition"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Masuk Guru</span>
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowRestoreModal(false);
                  setShowAccountsListModal(true);
                }}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer transition"
              >
                Lihat Semua Akun
              </button>

              <button
                type="button"
                onClick={() => setShowRestoreModal(false)}
                className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs cursor-pointer transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
        <div className="relative w-full max-w-md">
          {onClose && (
            <button
              onClick={onClose}
              className="absolute -top-3 -right-3 z-10 w-8 h-8 rounded-full bg-white shadow-md border border-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center cursor-pointer transition"
            >
              ✕
            </button>
          )}
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      {content}
    </div>
  );
};
