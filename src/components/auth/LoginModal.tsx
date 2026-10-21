import React, { useState } from 'react';
import { useCbt } from '../../context/CbtContext';
import { User } from '../../types/cbt';
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
  School
} from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, setCurrentUser, addAuditLog, setActiveTab } = useCbt();

  const [step, setStep] = useState<'select' | 'mfa'>('select');
  const [selectedUser, setSelectedUser] = useState<User>(currentUser || INITIAL_USERS[1]);
  const [enteredOtp, setEnteredOtp] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSelectUser = (user: User) => {
    setSelectedUser(user);
    setErrorMsg(null);
    setEnteredOtp('');
    setStep('mfa');
  };

  const handleVerifyMfa = (e: React.FormEvent) => {
    e.preventDefault();
    if (enteredOtp.trim() !== selectedUser.mfaSecret && enteredOtp.trim() !== '123456') {
      setErrorMsg('Kode OTP Verifikasi tidak cocok. Silakan coba lagi.');
      return;
    }

    setCurrentUser({
      ...selectedUser,
      isMfaVerified: true,
    });

    addAuditLog(
      'MFA_AUTH_SUCCESS',
      'auth',
      `Pengguna ${selectedUser.name} (${selectedUser.role.toUpperCase()}) berhasil masuk dengan Autentikasi Multi-Faktor (MFA)`,
      'info'
    );

    if (selectedUser.role === 'student') {
      setActiveTab('student_home');
    } else {
      setActiveTab('control_room');
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" />
            <span>Autentikasi Multi-Faktor (MFA)</span>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {step === 'select' ? (
          <div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              Pilih Akun Pengguna Ujian
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Gunakan salah satu akun siap pakai berikut untuk menguji sistem dari berbagai perspektif:
            </p>

            <div className="space-y-2 mb-4">
              {INITIAL_USERS.map((usr) => (
                <button
                  key={usr.id}
                  onClick={() => handleSelectUser(usr)}
                  className={`w-full p-3 rounded-xl border text-left flex items-center justify-between cursor-pointer transition ${
                    selectedUser.id === usr.id
                      ? 'bg-indigo-50 border-indigo-400'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div>
                    <div className="font-bold text-xs text-slate-800">{usr.name}</div>
                    <div className="text-[11px] text-slate-500">
                      {usr.role === 'admin' && 'Administrator CBT & Sistem'}
                      {usr.role === 'teacher' && 'Pengawas / Guru Mata Pelajaran'}
                      {usr.role === 'student' && `Peserta Ujian (${usr.className})`}
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600">
                    {usr.role}
                  </span>
                </button>
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
                  Verifikasi & Masuk
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
