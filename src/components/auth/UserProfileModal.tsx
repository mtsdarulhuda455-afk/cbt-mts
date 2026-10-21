import React, { useState } from 'react';
import { useCbt } from '../../context/CbtContext';
import { 
  User as UserIcon, 
  X, 
  School, 
  ShieldCheck, 
  CheckCircle2, 
  Hash, 
  BookOpen, 
  Clock,
  Sparkles,
  Phone,
  MessageSquare,
  QrCode,
  Edit2,
  Check,
  Send,
  ExternalLink,
  Info,
  Printer,
  Barcode
} from 'lucide-react';
import { createWhatsappLink, getWibDate, getWibTime, getWibDateIndonesian } from '../../services/attendanceUtils';
import { BarcodeBatang } from '../common/BarcodeBatang';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogoutClick?: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  onLogoutClick,
}) => {
  const { currentUser, systemSettings, updateUser } = useCbt();

  const [isEditingWa, setIsEditingWa] = useState(false);
  const [waNumberInput, setWaNumberInput] = useState(currentUser?.whatsappNumber || '');
  const [parentNameInput, setParentNameInput] = useState(currentUser?.parentName || '');
  const [subjectInput, setSubjectInput] = useState(currentUser?.subjectOrPosition || '');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [showBarcodeCard, setShowBarcodeCard] = useState(false);

  if (!isOpen || !currentUser) return null;

  const isStudent = currentUser.role === 'student';
  const isTeacher = currentUser.role === 'teacher';
  const isAdmin = currentUser.role === 'admin';

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return {
          label: 'Administrator Sistem',
          desc: 'Hak akses penuh pengelolaan CBT, database, profil madrasah & akun pengguna',
          color: 'bg-indigo-100 text-indigo-800 border-indigo-200',
          dot: 'bg-indigo-600',
        };
      case 'teacher':
        return {
          label: 'Guru & Pengawas MTs',
          desc: 'Pengawasan pengerjaan ujian, presensi barcode & rekap bulanan tenaga pendidik',
          color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          dot: 'bg-emerald-600',
        };
      case 'student':
      default:
        return {
          label: 'Peserta Ujian & Santri',
          desc: 'Akses pengerjaan asesmen CBT & presensi barcode terintegrasi WA wali murid',
          color: 'bg-teal-100 text-teal-800 border-teal-200',
          dot: 'bg-teal-600',
        };
    }
  };

  const roleInfo = getRoleBadge(currentUser.role);

  const handleSaveWa = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentUser) return;

    const updated = {
      ...currentUser,
      whatsappNumber: waNumberInput.trim(),
      ...(isStudent ? { parentName: parentNameInput.trim() } : {}),
      ...(isTeacher ? { subjectOrPosition: subjectInput.trim() } : {}),
    };

    updateUser(updated);
    setIsEditingWa(false);
    setSaveSuccessMsg('Data WhatsApp & profil berhasil disimpan!');
    setTimeout(() => setSaveSuccessMsg(null), 3500);
  };

  const handleTestWhatsapp = () => {
    const targetWa = waNumberInput.trim() || currentUser.whatsappNumber;
    if (!targetWa) {
      alert('Silakan masukkan nomor WhatsApp terlebih dahulu.');
      return;
    }
    const today = getWibDate();
    const time = getWibTime();
    const sName = systemSettings?.schoolName || 'MTs. Darul Huda';

    let testMsg = '';
    if (isStudent) {
      testMsg = `*TES INTEGRASI NOTIFIKASI WA PRESENSI*\n*${sName.toUpperCase()}*\n\n` +
        `Assalamu'alaikum Wr. Wb.\n` +
        `Yth. ${parentNameInput || currentUser.parentName || 'Bapak/Ibu Wali Murid'}\n\n` +
        `Ini adalah pesan uji coba integrasi notifikasi presensi barcode MTs. Darul Huda.\n` +
        `👤 *Santri:* ${currentUser.name}\n` +
        `💳 *NISN:* ${currentUser.nisnOrNip}\n` +
        `🏫 *Kelas:* ${currentUser.className || 'VII'}\n` +
        `⏰ *Waktu Tes:* ${time} WIB (${getWibDateIndonesian(today)})\n\n` +
        `Nomor WhatsApp Anda telah *BERHASIL TERHUBUNG* dengan sistem presensi masuk & pulang madrasah.\n` +
        `_Wassalamu'alaikum Wr. Wb._`;
    } else {
      testMsg = `*TES INTEGRASI NOTIFIKASI WA GURU*\n*${sName.toUpperCase()}*\n\n` +
        `Assalamu'alaikum Wr. Wb.\n` +
        `Yth. ${currentUser.name}\n` +
        `🆔 *NIP / ID:* ${currentUser.nisnOrNip}\n` +
        `⏰ *Waktu Tes:* ${time} WIB (${getWibDateIndonesian(today)})\n\n` +
        `Nomor WhatsApp pribadi Anda telah *BERHASIL TERHUBUNG* dengan sistem absensi barcode & rekap bulanan MTs. Darul Huda.\n` +
        `_Wassalamu'alaikum Wr. Wb._`;
    }

    const link = createWhatsappLink(targetWa, testMsg);
    window.open(link, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200 my-auto">
        
        {/* Header with decorative banner */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-700 to-slate-900 p-5 sm:p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition cursor-pointer"
            aria-label="Tutup Profil"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center text-2xl font-black text-white shadow-inner shrink-0">
              {currentUser.name.charAt(0)}
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-emerald-100 border border-white/20 mb-1">
                <span className={`w-1.5 h-1.5 rounded-full ${roleInfo.dot}`}></span>
                <span>{roleInfo.label}</span>
              </div>
              <h3 className="text-lg font-black text-white leading-tight">
                {currentUser.name}
              </h3>
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-emerald-100/90 mt-1">
                <span className="font-mono">@{currentUser.username}</span>
                <span>•</span>
                <span className="font-semibold text-emerald-200 truncate max-w-[200px]" title={systemSettings.schoolName}>
                  {systemSettings.schoolName || currentUser.schoolName}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-4 max-h-[78vh] overflow-y-auto">
          {saveSuccessMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in slide-in-from-top-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{saveSuccessMsg}</span>
            </div>
          )}

          {/* Sesi & Waktu Reset WIB */}
          <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-2xl text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-700 shrink-0" />
              <div>
                <span className="font-bold text-emerald-900">Siklus Presensi: Waktu Indonesia Barat (WIB)</span>
                <p className="text-[11px] text-emerald-700">Direset otomatis setiap pukul 00:00 WIB (UTC+7)</p>
              </div>
            </div>
            <span className="px-2 py-0.5 bg-emerald-600 text-white text-[10px] font-extrabold rounded-md uppercase">
              WIB UTC+7
            </span>
          </div>

          {/* SECTION INTEGRASI WHATSAPP OTOMATIS */}
          <div className="p-4 bg-gradient-to-br from-emerald-50/90 via-teal-50/50 to-white border-2 border-emerald-300 rounded-2xl shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-2xs">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-black text-xs text-slate-900">
                    {isStudent ? 'Integrasi WA Wali Murid' : 'Integrasi WA Pribadi Guru'}
                  </h4>
                  <p className="text-[10px] text-slate-500">
                    Otomatis menerima notifikasi saat scan barcode masuk & pulang
                  </p>
                </div>
              </div>

              {!isEditingWa ? (
                <button
                  type="button"
                  onClick={() => setIsEditingWa(true)}
                  className="px-2.5 py-1 bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition shadow-2xs"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>Ubah WA</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditingWa(false)}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[11px] font-bold cursor-pointer transition"
                >
                  Batal
                </button>
              )}
            </div>

            {isEditingWa ? (
              <form onSubmit={handleSaveWa} className="space-y-2.5 pt-1">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    {isStudent ? 'Nomor WhatsApp Wali Murid (Aktif)' : 'Nomor WhatsApp Pribadi Guru (Aktif)'}
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      value={waNumberInput}
                      onChange={(e) => setWaNumberInput(e.target.value)}
                      placeholder="Contoh: 081234567890 atau 6281234567890"
                      className="w-full px-3 py-2 text-xs bg-white border border-emerald-300 rounded-xl font-mono text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    Gunakan format 08... atau 628... Nomor ini akan menerima pemberitahuan otomatis saat presensi.
                  </span>
                </div>

                {isStudent && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Nama Lengkap Wali Santri / Orang Tua
                    </label>
                    <input
                      type="text"
                      value={parentNameInput}
                      onChange={(e) => setParentNameInput(e.target.value)}
                      placeholder="Contoh: H. Abdullah Rahman (Ayah)"
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                )}

                {isTeacher && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Tugas / Mata Pelajaran Diampu
                    </label>
                    <input
                      type="text"
                      value={subjectInput}
                      onChange={(e) => setSubjectInput(e.target.value)}
                      placeholder="Contoh: Guru Fikih & Qur'an Hadits"
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Simpan Nomor WhatsApp</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleTestWhatsapp}
                    className="py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition"
                    title="Buka WhatsApp untuk menguji kirim pesan"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Uji Kirim</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-emerald-200 text-xs">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{isStudent ? 'WA Wali Santri:' : 'WA Pribadi:'}</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      {currentUser.whatsappNumber || 'Belum diisi'}
                    </span>
                    {currentUser.whatsappNumber && (
                      <button
                        type="button"
                        onClick={handleTestWhatsapp}
                        className="p-1 text-emerald-700 hover:text-emerald-900 hover:bg-emerald-100 rounded-md transition cursor-pointer"
                        title="Tes Kirim Notifikasi WhatsApp"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {isStudent && currentUser.parentName && (
                  <div className="flex items-center justify-between p-2 bg-white/70 rounded-xl border border-slate-200 text-xs">
                    <span className="text-slate-500">Nama Wali:</span>
                    <span className="font-bold text-slate-800">{currentUser.parentName}</span>
                  </div>
                )}

                {isTeacher && currentUser.subjectOrPosition && (
                  <div className="flex items-center justify-between p-2 bg-white/70 rounded-xl border border-slate-200 text-xs">
                    <span className="text-slate-500">Mapel / Tugas:</span>
                    <span className="font-bold text-slate-800">{currentUser.subjectOrPosition}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* INFORMASI AKADEMIK & IDENTITAS */}
          <div className="space-y-2">
            {/* NISN / NIP */}
            <div className="flex items-center justify-between p-3 bg-slate-50/70 border border-slate-200/80 rounded-2xl text-xs">
              <span className="text-slate-500 flex items-center gap-2">
                <Hash className="w-4 h-4 text-slate-400" />
                <span>{isStudent ? 'NISN Siswa' : 'NIP / ID Pendidik'}:</span>
              </span>
              <span className="font-mono font-bold text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                {currentUser.nisnOrNip || '-'}
              </span>
            </div>

            {/* Class / Rombel if student */}
            {isStudent && (
              <div className="flex items-center justify-between p-3 bg-slate-50/70 border border-slate-200/80 rounded-2xl text-xs">
                <span className="text-slate-500 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-emerald-600" />
                  <span>Kelas / Rombel:</span>
                </span>
                <span className="font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                  {currentUser.className || 'VII-A (Tahfidz)'}
                </span>
              </div>
            )}

            {/* School / Madrasah */}
            <div className="flex items-center justify-between p-3 bg-slate-50/70 border border-slate-200/80 rounded-2xl text-xs">
              <span className="text-slate-500 flex items-center gap-2">
                <School className="w-4 h-4 text-teal-600 shrink-0" />
                <span>Madrasah / Lembaga:</span>
              </span>
              <span className="font-bold text-slate-900 text-right max-w-[220px] truncate" title={systemSettings.schoolName}>
                {systemSettings.schoolName || currentUser.schoolName}
              </span>
            </div>

            {/* MFA Security Status */}
            <div className="flex items-center justify-between p-3 bg-slate-50/70 border border-slate-200/80 rounded-2xl text-xs">
              <span className="text-slate-500 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                <span>Autentikasi Dua Faktor (MFA):</span>
              </span>
              <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Aktif & Terverifikasi</span>
              </span>
            </div>
          </div>

          {/* KARTU BARCODE PRESENSI PREVIEW (BARCODE BATANG) */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                <Barcode className="w-4 h-4 text-emerald-600" />
                <span>Barcode Batang Presensi Digital</span>
              </span>
              <button
                type="button"
                onClick={() => setShowBarcodeCard(!showBarcodeCard)}
                className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 cursor-pointer"
              >
                {showBarcodeCard ? 'Sembunyikan' : 'Tampilkan Kartu'}
              </button>
            </div>

            {showBarcodeCard && (
              <div className="p-4 bg-white border border-slate-300 rounded-xl shadow-xs space-y-2 animate-in zoom-in-95 duration-150">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  {systemSettings?.schoolName || 'MTs. Darul Huda'}
                </div>
                <div className="font-extrabold text-sm text-slate-900">{currentUser.name}</div>
                <div className="text-[11px] text-slate-600 font-mono">
                  {isStudent ? `NISN: ${currentUser.nisnOrNip}` : `NIP: ${currentUser.nisnOrNip}`}
                </div>
                
                {/* Visual Barcode Batang (Linear 1D Code 128) */}
                <div className="py-3 px-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col items-center">
                  <BarcodeBatang 
                    value={currentUser.barcode || currentUser.nisnOrNip} 
                    width={1.8}
                    height={52}
                    fontSize={13}
                  />
                  <span className="text-[10px] text-emerald-700 font-bold mt-2 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    Barcode Batang Presensi Aktif (Code 128)
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 pt-1 text-left">
                  <p className="text-[10px] text-slate-400">
                    Dapat dipindai scanner barcode eksternal USB atau kamera gawai
                  </p>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[10px] font-bold flex items-center gap-1.5 cursor-pointer shrink-0 transition"
                  >
                    <Printer className="w-3 h-3" />
                    <span>Cetak Kartu Saya</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Quick Actions Footer */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
            {onLogoutClick && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onLogoutClick();
                }}
                className="py-2.5 px-4 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer border border-rose-200"
              >
                <span>Keluar Akun</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs transition cursor-pointer shadow-xs text-center"
            >
              Tutup Profil
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
