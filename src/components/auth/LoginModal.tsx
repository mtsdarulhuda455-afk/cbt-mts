import React, { useState, useMemo } from 'react';
import { useCbt } from '../../context/CbtContext';
import { User, UserRole } from '../../types/cbt';
import { INITIAL_USERS } from '../../data/mockCbtData';
import { 
  ShieldCheck, 
  KeyRound, 
  Lock, 
  User as UserIcon, 
  X, 
  Check, 
  AlertCircle,
  Smartphone,
  School,
  Zap,
  Search,
  Shield,
  Briefcase,
  GraduationCap
} from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, setCurrentUser, addAuditLog, setActiveTab, users, loginAsUser } = useCbt();

  const [step, setStep] = useState<'select' | 'mfa'>('select');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'teacher' | 'student'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const activeUsers = useMemo(() => {
    return users && users.length > 0 ? users : INITIAL_USERS;
  }, [users]);

  const [selectedUser, setSelectedUser] = useState<User>(currentUser || activeUsers[0] || INITIAL_USERS[0]);
  const [enteredOtp, setEnteredOtp] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const filteredUsers = useMemo(() => {
    return activeUsers
      .filter(u => {
        if (roleFilter !== 'all' && u.role !== roleFilter) return false;
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          (u.name && u.name.toLowerCase().includes(q)) ||
          (u.username && u.username.toLowerCase().includes(q)) ||
          (u.nisnOrNip && u.nisnOrNip.toLowerCase().includes(q)) ||
          (u.className && u.className.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => {
        const rank: Record<string, number> = { admin: 1, teacher: 2, student: 3 };
        return (rank[a.role] || 4) - (rank[b.role] || 4);
      });
  }, [activeUsers, roleFilter, searchQuery]);

  if (!isOpen) return null;

  const handleSelectUser = (user: User) => {
    setSelectedUser(user);
    setErrorMsg(null);
    setEnteredOtp('');
    setStep('mfa');
  };

  const handleDirectInstantLogin = (user: User) => {
    loginAsUser(user);
    onClose();
  };

  const handleVerifyMfa = (e: React.FormEvent) => {
    e.preventDefault();
    if (enteredOtp.trim() !== selectedUser.mfaSecret && enteredOtp.trim() !== '123456') {
      setErrorMsg('Kode OTP Verifikasi tidak cocok. Silakan coba lagi.');
      return;
    }

    loginAsUser(selectedUser);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" />
            <span>Pilihan Akun CBT &amp; Keamanan</span>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {step === 'select' ? (
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 mb-1">
              Pilih Akun Pengguna Ujian
            </h3>
            <p className="text-xs text-slate-500 mb-3">
              Pilih salah satu akun terdaftar dari database aktif untuk beralih atau masuk ke sistem:
            </p>

            {/* Filter Pills */}
            <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-xl mb-3 text-xs font-bold text-center">
              <button
                type="button"
                onClick={() => setRoleFilter('all')}
                className={`py-1.5 rounded-lg transition cursor-pointer ${
                  roleFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Semua
              </button>
              <button
                type="button"
                onClick={() => setRoleFilter('admin')}
                className={`py-1.5 rounded-lg transition cursor-pointer ${
                  roleFilter === 'admin' ? 'bg-rose-600 text-white shadow-2xs' : 'text-slate-600 hover:text-rose-700'
                }`}
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => setRoleFilter('teacher')}
                className={`py-1.5 rounded-lg transition cursor-pointer ${
                  roleFilter === 'teacher' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:text-indigo-700'
                }`}
              >
                Guru
              </button>
              <button
                type="button"
                onClick={() => setRoleFilter('student')}
                className={`py-1.5 rounded-lg transition cursor-pointer ${
                  roleFilter === 'student' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-600 hover:text-emerald-700'
                }`}
              >
                Siswa
              </button>
            </div>

            {/* Search */}
            <div className="relative mb-3">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama atau username..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>

            {/* User List */}
            <div className="space-y-2 mb-4 max-h-60 overflow-y-auto pr-1">
              {filteredUsers.map((usr) => (
                <div
                  key={usr.id}
                  className={`p-3 rounded-2xl border text-left flex items-center justify-between transition ${
                    usr.role === 'admin'
                      ? 'border-rose-200 bg-rose-50/30 hover:bg-rose-50'
                      : usr.role === 'teacher'
                      ? 'border-indigo-200 bg-indigo-50/30 hover:bg-indigo-50'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-xs text-slate-800 truncate">{usr.name}</span>
                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase ${
                        usr.role === 'admin' ? 'bg-rose-100 text-rose-800' : usr.role === 'teacher' ? 'bg-indigo-100 text-indigo-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {usr.role}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                      User: <strong>{usr.username}</strong>
                      {usr.className && <span> • {usr.className}</span>}
                      {usr.subjectOrPosition && <span> • {usr.subjectOrPosition}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {usr.role === 'student' ? (
                      <button
                        type="button"
                        onClick={() => handleDirectInstantLogin(usr)}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold cursor-pointer transition flex items-center gap-1 shadow-2xs"
                        title="Langsung login masuk"
                      >
                        <Zap className="w-3 h-3" />
                        <span>Pilih Siswa</span>
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-500 bg-slate-100 border border-slate-200 px-2 py-1 rounded-lg flex items-center gap-1 font-medium">
                        <Lock className="w-3 h-3 text-amber-600" />
                        <span>Ketik Manual</span>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <div className="text-center mb-5">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <Smartphone className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Verifikasi 2 Langkah (MFA)</h3>
              <p className="text-xs text-slate-500 mt-1">
                Masukkan 6 digit kode token keamanan untuk akun <strong>{selectedUser.name}</strong>.
              </p>
            </div>

            <form onSubmit={handleVerifyMfa} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">Kode Token OTP</label>
                  <button
                    type="button"
                    onClick={() => setEnteredOtp(selectedUser.mfaSecret || '123456')}
                    className="text-[11px] text-indigo-600 hover:underline font-semibold cursor-pointer"
                  >
                    Isi Otomatis ({selectedUser.mfaSecret || '123456'})
                  </button>
                </div>
                <input
                  type="text"
                  maxLength={6}
                  required
                  autoFocus
                  placeholder="6 digit kode token..."
                  value={enteredOtp}
                  onChange={(e) => setEnteredOtp(e.target.value.replace(/\D/g, ''))}
                  className="w-full text-center tracking-widest text-lg font-mono font-bold py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep('select')}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs cursor-pointer transition"
                >
                  Ganti Akun
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow cursor-pointer transition flex items-center justify-center gap-1.5"
                >
                  <KeyRound className="w-4 h-4" />
                  Verifikasi &amp; Masuk
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
