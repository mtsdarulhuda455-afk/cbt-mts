import React, { useState } from 'react';
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
  KeyRound
} from 'lucide-react';

interface LoginPageProps {
  onSuccess?: () => void;
  isModal?: boolean;
  onClose?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSuccess, isModal = false, onClose }) => {
  const { loginWithCredentials, apiConfig, systemSettings, users } = useCbt();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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
    }, 400);
  };

  const handleQuickFill = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setErrorMsg(null);
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
        <div className="flex items-center gap-2 pb-4 mb-5 border-b border-slate-100 text-slate-700 text-xs font-bold">
          <Lock className="w-4 h-4 text-emerald-600" />
          <span>Autentikasi Pengguna & Peserta Ujian</span>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-semibold text-rose-700 flex items-start gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
            <div>{errorMsg}</div>
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
        <div className="mt-6 pt-5 border-t border-slate-100">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5 text-center">
            Pilihan Cepat Akun Demo (MTs. Darul Huda)
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

      <div className="mt-4 text-center text-xs text-slate-400">
        Sistem Ujian Daring Terpadu MTs. Darul Huda • Anti-Cheat Engine v4.8
      </div>
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
