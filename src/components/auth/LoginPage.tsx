import React, { useState, useRef } from 'react';
import { useCbt } from '../../context/CbtContext';
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
  X
} from 'lucide-react';

interface LoginPageProps {
  onSuccess?: () => void;
  isModal?: boolean;
  onClose?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSuccess, isModal = false, onClose }) => {
  const { 
    loginWithCredentials, 
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

  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleQuickFill = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setErrorMsg(null);
  };

  // Handle Restore Database from JSON Backup File directly from Login Page
  const handleFileRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const res = importDatabaseJson(content);
        if (res.success) {
          setRestoredStats(res.counts);
          setShowRestoreModal(true);
          setDbNotice({
            type: 'success',
            text: `Berhasil memulihkan basis data! Ditemukan ${res.counts?.users || 0} akun pengguna, ${res.counts?.classes || 0} rombel, dan ${res.counts?.exams || 0} ujian.`
          });
          // Auto-fill admin credentials if available
          handleQuickFill('admin', 'admin123');
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

  const schoolNameDisplay = systemSettings?.schoolName || apiConfig?.schoolName || 'MTs. Darul Huda';

  const content = (
    <div className="w-full max-w-md mx-auto">
      {/* Header Logo */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-700 text-white shadow-lg shadow-emerald-200 mb-3">
          <GraduationCap className="w-9 h-9" />
        </div>
        <div className="inline-block px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[11px] font-extrabold rounded-full uppercase tracking-wider mb-1">
          KEMENTERIAN AGAMA RI
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          Portal CBT Madrasah
        </h2>
        <p className="text-sm font-bold text-emerald-800 mt-1">
          {schoolNameDisplay}
        </p>
      </div>

      {/* Main Login Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-100">
        <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100 text-slate-700 text-xs font-bold">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-600" />
            <span>Autentikasi Pengguna &amp; Peserta Ujian</span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
            {users.length} Akun
          </span>
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
            <div className="text-[11.5px] leading-relaxed">{errorMsg}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Username / NISN / NIP
            </label>
            <div className="relative">
              <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Masukkan username atau NISN/NIP..."
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Kata Sandi / Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan kata sandi..."
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

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-200 cursor-pointer transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <>
                  <span>Masuk ke Sistem CBT</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Quick Demo Credentials */}
        <div className="mt-5 pt-4 border-t border-slate-100">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 text-center">
            Pilihan Cepat Akun Standar
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleQuickFill('guru', 'guru123')}
              className="p-2 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 border border-slate-200 rounded-xl text-center cursor-pointer transition"
            >
              <div className="text-[11px] font-bold text-slate-800">Guru/Pengawas</div>
              <div className="text-[10px] text-slate-400 font-mono">guru123</div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickFill('siswa', 'siswa123')}
              className="p-2 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 border border-slate-200 rounded-xl text-center cursor-pointer transition"
            >
              <div className="text-[11px] font-bold text-slate-800">Siswa VII-A</div>
              <div className="text-[10px] text-slate-400 font-mono">siswa123</div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickFill('admin', 'admin123')}
              className="p-2 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 border border-slate-200 rounded-xl text-center cursor-pointer transition"
            >
              <div className="text-[11px] font-bold text-slate-800">Admin MTs</div>
              <div className="text-[10px] text-slate-400 font-mono">admin123</div>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* DEPLOYMENT & DATABASE RECOVERY HUB (KHUSUS NETLIFY & HOSTING PIHAK KEDUA) */}
      {/* ========================================================================= */}
      <div className="mt-4 bg-white/90 backdrop-blur-xs rounded-2xl p-4 border border-slate-200 shadow-sm text-xs">
        <div className="flex items-center justify-between mb-2.5">
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
          Jika baru dideploy ke Netlify/hosting baru, muat database akun Anda di bawah ini agar dapat login:
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

          {/* Tombol Sinkronisasi Cloud */}
          <button
            type="button"
            onClick={handleCloudSync}
            disabled={isSyncingCloud}
            className="p-2.5 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-xl text-slate-800 hover:text-indigo-900 font-bold flex items-center justify-center gap-1.5 cursor-pointer transition text-left disabled:opacity-50"
            title="Tarik data santri dan ujian yang telah tersimpan di Firebase Firestore"
          >
            <RefreshCw className={`w-4 h-4 text-indigo-600 shrink-0 ${isSyncingCloud ? 'animate-spin' : ''}`} />
            <span className="truncate">{isSyncingCloud ? 'Menyinkronkan...' : 'Tarik dari Firebase'}</span>
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
            <span>Lihat {users.length} Akun Terdaftar</span>
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
      {/* MODAL 1: DAFTAR AKUN TERDAFTAR DI DATABASE */}
      {/* ========================================================================= */}
      {showAccountsListModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-600" />
                <h3 className="font-extrabold text-sm text-slate-900">
                  Daftar Akun Terdaftar di Database ({users.length})
                </h3>
              </div>
              <button
                onClick={() => setShowAccountsListModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 space-y-2 text-xs">
              <p className="text-[11px] text-slate-500 mb-2">
                Klik tombol <strong>"Gunakan"</strong> pada salah satu akun untuk langsung mengisi kolom username &amp; kata sandi login:
              </p>

              {users.map((u) => (
                <div
                  key={u.id}
                  className="p-2.5 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50 flex items-center justify-between gap-3 transition"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-900 truncate">{u.name}</span>
                      <span className={`px-1.5 py-0.2 rounded text-[10px] font-black uppercase ${
                        u.role === 'admin' ? 'bg-rose-100 text-rose-800' : u.role === 'teacher' ? 'bg-indigo-100 text-indigo-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {u.role}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono flex items-center gap-2 mt-0.5">
                      <span>User: <strong>{u.username}</strong></span>
                      {u.nisnOrNip && <span>• NISN/NIP: {u.nisnOrNip}</span>}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      handleQuickFill(u.username, u.password || '123456');
                      setShowAccountsListModal(false);
                    }}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs cursor-pointer shrink-0 transition"
                  >
                    Gunakan
                  </button>
                </div>
              ))}
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 text-right">
              <button
                type="button"
                onClick={() => setShowAccountsListModal(false)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg text-xs cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: NOTIFIKASI SUKSES PEMULIHAN DATABASE */}
      {/* ========================================================================= */}
      {showRestoreModal && restoredStats && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 text-center shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <h3 className="text-base font-black text-slate-900 mb-1">
              Pemulihan Database Berhasil!
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Seluruh database CBT Anda telah sukses dimuat ke peramban deployment ini.
            </p>

            <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs mb-5">
              <div className="text-center">
                <div className="font-black text-emerald-700 text-sm">{restoredStats.users || 0}</div>
                <div className="text-[10px] text-slate-500 font-semibold">Pengguna</div>
              </div>
              <div className="text-center">
                <div className="font-black text-indigo-700 text-sm">{restoredStats.classes || 0}</div>
                <div className="text-[10px] text-slate-500 font-semibold">Rombel</div>
              </div>
              <div className="text-center">
                <div className="font-black text-amber-700 text-sm">{restoredStats.exams || 0}</div>
                <div className="text-[10px] text-slate-500 font-semibold">Ujian</div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowRestoreModal(false);
                handleQuickFill('admin', 'admin123');
              }}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs cursor-pointer shadow-md shadow-emerald-200 transition"
            >
              Lanjutkan Login
            </button>
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
