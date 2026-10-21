import React, { useState, useRef } from 'react';
import { useCbt } from '../../context/CbtContext';
import { User, UserRole } from '../../types/cbt';
import * as XLSX from 'xlsx';
import { 
  Database, 
  History, 
  Download, 
  Upload, 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  ShieldCheck, 
  HardDrive,
  Users,
  UserPlus,
  FileSpreadsheet,
  Search,
  Eye,
  EyeOff,
  Copy,
  Check,
  Trash2,
  Filter,
  X,
  Lock,
  School,
  Pencil,
  RefreshCw,
  Phone,
  MessageSquare,
  ExternalLink,
  QrCode,
  Printer,
  Barcode
} from 'lucide-react';

export const CentralDatabaseView: React.FC = () => {
  const { 
    currentUser,
    users,
    addUser,
    updateUser,
    deleteUser,
    importUsersFromExcel,
    sessions, 
    auditLogs, 
    exams, 
    classes, 
    systemSettings,
    exportDatabaseJson, 
    importDatabaseJson, 
    resetToFactoryData,
    firebaseStatus,
    firebaseProjectId,
    firestoreDatabaseId,
    lastFirebaseSync,
    syncWithFirebase,
    setActiveTab
  } = useCbt();

  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'users' | 'submissions' | 'audit_trail'>('users');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // New User Form State
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('student');
  const [newNisnOrNip, setNewNisnOrNip] = useState('');
  const [newClassName, setNewClassName] = useState('VII-A (Tahfidz)');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newMfaToken, setNewMfaToken] = useState('123456');
  const [newWhatsapp, setNewWhatsapp] = useState('');
  const [newParentName, setNewParentName] = useState('');
  const [newSubjectOrPosition, setNewSubjectOrPosition] = useState('');

  // Edit User Form State
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('student');
  const [editNisnOrNip, setEditNisnOrNip] = useState('');
  const [editClassName, setEditClassName] = useState('VII-A (Tahfidz)');
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editMfaToken, setEditMfaToken] = useState('123456');
  const [editSchoolName, setEditSchoolName] = useState('');
  const [editWhatsapp, setEditWhatsapp] = useState('');
  const [editParentName, setEditParentName] = useState('');
  const [editSubjectOrPosition, setEditSubjectOrPosition] = useState('');
  const [showEditPassword, setShowEditPassword] = useState(false);

  // Excel file ref & JSON backup ref
  const excelInputRef = useRef<HTMLInputElement>(null);
  const jsonBackupInputRef = useRef<HTMLInputElement>(null);

  // Filtered Users
  const filteredUsers = (users || []).filter(u => {
    if (!u) return false;
    const q = (searchQuery || '').toLowerCase().trim();
    const matchesSearch = 
      !q ||
      (u.name || '').toLowerCase().includes(q) ||
      (u.username || '').toLowerCase().includes(q) ||
      (u.nisnOrNip || '').toLowerCase().includes(q);

    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    const matchesClass = classFilter === 'all' || (u.className && u.className.includes(classFilter));

    return matchesSearch && matchesRole && matchesClass;
  });

  const filteredLogs = (auditLogs || []).filter(log => {
    if (!log) return false;
    const q = (searchQuery || '').toLowerCase().trim();
    if (!q) return true;
    return (
      (log.action || '').toLowerCase().includes(q) ||
      (log.actorName || '').toLowerCase().includes(q) ||
      (log.details || '').toLowerCase().includes(q) ||
      (log.category || '').toLowerCase().includes(q)
    );
  });

  const filteredSessions = (sessions || []).filter(ses => {
    if (!ses) return false;
    const q = (searchQuery || '').toLowerCase().trim();
    if (!q) return true;
    return (
      (ses.studentName || '').toLowerCase().includes(q) ||
      (ses.nisn || '').toLowerCase().includes(q) ||
      (ses.className || '').toLowerCase().includes(q)
    );
  });

  // Toggle password visibility for row
  const togglePasswordVisibility = (userId: string) => {
    setVisiblePasswords(prev => ({ ...prev, [userId]: !prev[userId] }));
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Handle Excel Upload & Parse
  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const rawData: any[] = XLSX.utils.sheet_to_json(ws);

        if (!rawData || rawData.length === 0) {
          setImportStatus('Gagal impor: File Excel tidak memiliki data baris.');
          setTimeout(() => setImportStatus(null), 4000);
          return;
        }

        // Map excel columns to User interface
        const parsedUsers: User[] = rawData.map((row, idx) => {
          const roleStr = String(row.Peran || row.Role || row.peran || 'student').toLowerCase();
          const role: UserRole = roleStr.includes('guru') || roleStr.includes('teacher') 
            ? 'teacher' 
            : roleStr.includes('admin') 
              ? 'admin' 
              : 'student';

          const name = String(row.Nama_Lengkap || row.Nama || row['Nama Lengkap'] || `Pengguna ${idx + 1}`);
          const nisnOrNip = String(row.NISN_atau_NIP || row.NISN || row.NIP || row['NISN/NIP'] || `100000000${idx}`);
          const className = row.Kelas || row.Rombel || (role === 'student' ? 'VII-A (Tahfidz)' : undefined);
          const username = String(row.Username || row.User || row.username || `user_${Date.now()}_${idx}`).toLowerCase().trim();
          const password = String(row.Password || row.Kata_Sandi || row.password || 'mts123');
          const mfaSecret = String(row.Token_MFA || row.MFA || row.Token || '123456');
          const whatsappNumber = String(row.WhatsApp || row.No_WA || row.Nomor_WA || row.whatsappNumber || row.wa || '').trim();
          const parentName = row.Nama_Wali || row.Wali_Murid || row.parentName ? String(row.Nama_Wali || row.Wali_Murid || row.parentName).trim() : undefined;
          const subjectOrPosition = row.Mata_Pelajaran || row.Mapel || row.Jabatan || row.subjectOrPosition ? String(row.Mata_Pelajaran || row.Mapel || row.Jabatan || row.subjectOrPosition).trim() : undefined;
          const barcode = String(row.Barcode || row.Kode_Barcode || row.barcode || nisnOrNip).trim();

          return {
            id: `usr-excel-${Date.now()}-${idx}`,
            name,
            username,
            password,
            role,
            nisnOrNip,
            className,
            schoolName: systemSettings?.schoolName || 'MTs. Darul Huda',
            mfaSecret,
            isMfaVerified: true,
            whatsappNumber: whatsappNumber || undefined,
            parentName,
            subjectOrPosition,
            barcode,
          };
        });

        const res = importUsersFromExcel(parsedUsers);
        setImportStatus(`Berhasil mengimpor data dari Excel! ${res.added} akun baru dibuat, ${res.updated} diperbarui.`);
        setTimeout(() => setImportStatus(null), 5000);
      } catch (err) {
        setImportStatus('Terjadi kesalahan saat memproses file Excel. Pastikan format tabel sesuai template.');
        setTimeout(() => setImportStatus(null), 5000);
      }
    };
    reader.readAsBinaryString(file);
    if (e.target) e.target.value = '';
  };

  // Download Official Excel Template
  const handleDownloadExcelTemplate = () => {
    const templateData = [
      {
        'Peran': 'Guru',
        'Nama_Lengkap': 'Ustadz Ridwan Hakim, M.Pd.I',
        'NISN_atau_NIP': '198703152011011008',
        'Kelas': '-',
        'Username': 'ridwan_guru',
        'Password': 'password123',
        'Token_MFA': '123456',
        'WhatsApp': '081234567891',
        'Mata_Pelajaran': 'Fikih & Ushul Fikih',
        'Nama_Wali': '-',
      },
      {
        'Peran': 'Siswa',
        'Nama_Lengkap': 'Muhammad Danial Al-Ghazali',
        'NISN_atau_NIP': '0098741001',
        'Kelas': 'VII-A (Tahfidz)',
        'Username': 'danial_7a',
        'Password': 'siswa123',
        'Token_MFA': '123456',
        'WhatsApp': '081234567894',
        'Mata_Pelajaran': '-',
        'Nama_Wali': 'H. Abdullah Rahman',
      },
      {
        'Peran': 'Siswa',
        'Nama_Lengkap': 'Fatimah Zahra Azzahidi',
        'NISN_atau_NIP': '0098741002',
        'Kelas': 'VII-B (Reguler)',
        'Username': 'fatimah_7b',
        'Password': 'siswa123',
        'Token_MFA': '123456',
        'WhatsApp': '081234567895',
        'Mata_Pelajaran': '-',
        'Nama_Wali': 'Hj. Siti Aminah',
      },
      {
        'Peran': 'Siswa',
        'Nama_Lengkap': 'Rizky Pratama Ramadhan',
        'NISN_atau_NIP': '0087652003',
        'Kelas': 'VIII-A (Bilingual Sains)',
        'Username': 'rizky_8a',
        'Password': 'siswa123',
        'Token_MFA': '123456',
        'WhatsApp': '081234567896',
        'Mata_Pelajaran': '-',
        'Nama_Wali': 'Drs. Bambang Sudarsono',
      },
      {
        'Peran': 'Siswa',
        'Nama_Lengkap': 'Salwa Nur Azizah',
        'NISN_atau_NIP': '0076543004',
        'Kelas': 'IX-A (Riset & Olimpiade)',
        'Username': 'salwa_9a',
        'Password': 'siswa123',
        'Token_MFA': '123456',
        'WhatsApp': '081234567897',
        'Mata_Pelajaran': '-',
        'Nama_Wali': 'Hj. Nurul Hidayati',
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data_Siswa_Guru_MTs');
    XLSX.writeFile(wb, 'Template_Data_Siswa_Guru_MTs.xlsx');
  };

  // Export Current Users to Excel
  const handleExportUsersExcel = () => {
    const exportData = users.map((u, i) => ({
      'No': i + 1,
      'Peran': u.role === 'teacher' ? 'Guru' : u.role === 'admin' ? 'Admin' : 'Siswa',
      'Nama_Lengkap': u.name,
      'NISN_atau_NIP': u.nisnOrNip,
      'Kelas': u.className || '-',
      'Username': u.username,
      'Password': u.password || 'siswa123',
      'Token_MFA': u.mfaSecret || '123456',
      'WhatsApp': u.whatsappNumber || '-',
      'Wali_Murid_atau_Mapel': u.role === 'student' ? (u.parentName || '-') : (u.subjectOrPosition || '-'),
      'Madrasah': u.schoolName,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Daftar_Pengguna_CBT');
    XLSX.writeFile(wb, `Daftar_Akun_Siswa_Guru_MTs_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Handle Manual User Addition
  const handleSaveManualUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newUsername.trim() || !newPassword.trim()) return;

    const newUser: User = {
      id: `usr-manual-${Date.now()}`,
      name: newName.trim(),
      username: newUsername.trim().toLowerCase(),
      password: newPassword.trim(),
      role: newRole,
      nisnOrNip: newNisnOrNip.trim(),
      className: newRole === 'student' ? newClassName : undefined,
      schoolName: systemSettings?.schoolName || 'MTs. Darul Huda',
      mfaSecret: newMfaToken.trim() || '123456',
      isMfaVerified: true,
      whatsappNumber: newWhatsapp.trim() || undefined,
      parentName: newRole === 'student' && newParentName.trim() ? newParentName.trim() : undefined,
      subjectOrPosition: newRole === 'teacher' && newSubjectOrPosition.trim() ? newSubjectOrPosition.trim() : undefined,
      barcode: newNisnOrNip.trim() || undefined,
    };

    addUser(newUser);
    setShowAddUserModal(false);
    setNewName('');
    setNewUsername('');
    setNewPassword('');
    setNewNisnOrNip('');
    setNewWhatsapp('');
    setNewParentName('');
    setNewSubjectOrPosition('');
    setImportStatus(`Berhasil menambahkan akun ${newUser.name} (${newUser.role.toUpperCase()}) ke database.`);
    setTimeout(() => setImportStatus(null), 4000);
  };

  // Open Edit User Modal
  const handleStartEditUser = (user: User) => {
    setEditingUser(user);
    setEditName(user.name);
    setEditRole(user.role);
    setEditNisnOrNip(user.nisnOrNip || '');
    setEditClassName(user.className || (classes[0]?.name ?? 'VII-A (Tahfidz)'));
    setEditUsername(user.username);
    setEditPassword(user.password || 'siswa123');
    setEditMfaToken(user.mfaSecret || '123456');
    setEditSchoolName(user.schoolName || systemSettings?.schoolName || 'MTs. Darul Huda');
    setEditWhatsapp(user.whatsappNumber || '');
    setEditParentName(user.parentName || '');
    setEditSubjectOrPosition(user.subjectOrPosition || '');
    setShowEditPassword(false);
  };

  // Save Edited User
  const handleSaveEditUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    if (!editName.trim() || !editUsername.trim() || !editPassword.trim()) {
      alert('Nama lengkap, username login, dan kata sandi tidak boleh kosong!');
      return;
    }

    const updated: User = {
      ...editingUser,
      name: editName.trim(),
      role: editRole,
      nisnOrNip: editNisnOrNip.trim(),
      className: editRole === 'student' ? editClassName : undefined,
      username: editUsername.trim().toLowerCase(),
      password: editPassword.trim(),
      mfaSecret: editMfaToken.trim() || '123456',
      schoolName: editSchoolName.trim() || editingUser.schoolName,
      whatsappNumber: editWhatsapp.trim() || undefined,
      parentName: editRole === 'student' && editParentName.trim() ? editParentName.trim() : undefined,
      subjectOrPosition: editRole === 'teacher' && editSubjectOrPosition.trim() ? editSubjectOrPosition.trim() : undefined,
      barcode: editingUser.barcode || editNisnOrNip.trim() || undefined,
    };

    updateUser(updated);
    setEditingUser(null);
    setImportStatus(`Data akun ${updated.name} (${updated.role.toUpperCase()}) berhasil diperbarui.`);
    setTimeout(() => setImportStatus(null), 4000);
  };

  const handleGenerateEditPassword = () => {
    const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
    let pwd = '';
    for (let i = 0; i < 8; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setEditPassword(pwd);
  };

  const handleGenerateEditMfa = () => {
    const token = Math.floor(100000 + Math.random() * 900000).toString();
    setEditMfaToken(token);
  };

  const handleJsonRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const success = importDatabaseJson(content);
      if (success) {
        setImportStatus('Basis data CBT berhasil dipulihkan dari file JSON!');
      } else {
        setImportStatus('Gagal memulihkan: Format file JSON tidak valid.');
      }
      setTimeout(() => setImportStatus(null), 4000);
    };
    reader.readAsText(file);
    if (e.target) e.target.value = '';
  };

  if (currentUser?.role !== 'admin') {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center animate-in fade-in">
        <div className="w-16 h-16 rounded-3xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-slate-900 mb-2">Akses Terbatas: Khusus Administrator CBT MTs</h2>
        <p className="text-xs text-slate-600 mb-6 leading-relaxed max-w-md mx-auto">
          Fitur input database, manajemen data siswa/guru, dan impor akun via Excel hanya dapat diakses oleh akun dengan wewenang <strong>Administrator CBT</strong>.
        </p>
        <div className="p-4 bg-slate-100 rounded-2xl text-xs text-slate-600 max-w-md mx-auto border border-slate-200">
          Akun Anda saat ini: <strong className="text-slate-800">{currentUser?.name}</strong> ({currentUser?.role === 'teacher' ? 'Pengawas / Guru MTs' : 'Santri'}).
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-wider mb-1">
            <Database className="w-4 h-4" />
            <span>Pusat Data Madrasah & Manajemen Pengguna CBT</span>
          </div>
          <h1 className="text-xl font-extrabold text-slate-900">
            Database Terpusat & Pengelolaan Siswa / Guru MTs
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola data akun siswa dan guru via Excel, simpan arsip lembar ujian terpusat, dan pantau riwayat audit sistem.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Backup Database JSON */}
          <button
            onClick={exportDatabaseJson}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition"
          >
            <Download className="w-4 h-4" />
            Cadangkan DB (JSON)
          </button>

          {/* Restore Database Button */}
          <input
            type="file"
            ref={jsonBackupInputRef}
            onChange={handleJsonRestoreFile}
            accept=".json"
            className="hidden"
          />
          <button
            onClick={() => jsonBackupInputRef.current?.click()}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition"
          >
            <Upload className="w-4 h-4" />
            Pulihkan DB
          </button>

          {/* Reset Factory */}
          <button
            onClick={() => {
              if (confirm('Kembalikan seluruh basis data CBT ke data bawaan MTs awal?')) {
                resetToFactoryData();
              }
            }}
            className="px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-semibold cursor-pointer transition flex items-center gap-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Data Awal
          </button>
        </div>
      </div>

      {importStatus && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs font-semibold flex items-center gap-2.5 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{importStatus}</span>
        </div>
      )}

      {/* Firebase Cloud Live Banner */}
      <div className="p-4 bg-gradient-to-r from-emerald-900 via-teal-950 to-slate-900 rounded-3xl border border-emerald-500/30 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shrink-0">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-300">
                Database Firebase Firestore Terhubung Langsung
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Auto Real-Time Sync Aktif</span>
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              Project ID: <strong className="text-white font-mono">{firebaseProjectId}</strong> • Database: <span className="font-mono text-emerald-300">{firestoreDatabaseId || 'default'}</span>. Seluruh data santri, rombel, bank soal, dan hasil ujian tersinkronisasi langsung dengan Firebase Firestore.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 border-t md:border-t-0 border-white/10 pt-2 md:pt-0">
          {lastFirebaseSync && (
            <div className="text-left md:text-right text-[11px] text-slate-400 shrink-0">
              <span>Sinkronisasi Terakhir:</span>
              <div className="font-mono text-white font-bold">{lastFirebaseSync} WIB</div>
            </div>
          )}
          <button
            onClick={async () => {
              setIsManualSyncing(true);
              const res = await syncWithFirebase();
              setIsManualSyncing(false);
              setImportStatus(res.message);
              setTimeout(() => setImportStatus(null), 5000);
            }}
            disabled={isManualSyncing}
            className="flex items-center gap-2 px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 disabled:opacity-50 text-slate-950 font-black text-xs rounded-xl shadow-sm transition cursor-pointer shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isManualSyncing ? 'animate-spin' : ''}`} />
            <span>{isManualSyncing ? 'Menyinkronkan...' : 'Sinkronkan Sekarang'}</span>
          </button>
        </div>
      </div>

      {/* Main Sub-Tabs & Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 p-1 bg-slate-200/70 rounded-2xl">
          <button
            onClick={() => setActiveSubTab('users')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
              activeSubTab === 'users'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4 text-emerald-600" />
            <span>Data Siswa & Guru MTs ({users.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('submissions')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
              activeSubTab === 'submissions'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <HardDrive className="w-4 h-4" />
            <span>Hasil Ujian Siswa ({sessions.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('audit_trail')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
              activeSubTab === 'audit_trail'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Riwayat Tindakan ({auditLogs.length})</span>
          </button>
        </div>

        {/* Global Search */}
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Cari nama, username, NISN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* SUB-TAB 1: USERS & EXCEL IMPORT */}
      {activeSubTab === 'users' && (
        <div className="space-y-4">
          {/* Action Header Card for Excel Import/Export */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>Input & Ekspor Data Siswa/Guru via Excel</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Unggah file Excel (.xlsx / .csv) berisi nama, kelas, NISN/NIP, username, dan password untuk membuat akun secara massal.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Hidden Excel File Input */}
                <input
                  type="file"
                  ref={excelInputRef}
                  onChange={handleExcelUpload}
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                />

                {/* Import Excel Button */}
                <button
                  onClick={() => excelInputRef.current?.click()}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition"
                >
                  <Upload className="w-4 h-4" />
                  <span>Import dari Excel (.xlsx)</span>
                </button>

                {/* Download Template Button */}
                <button
                  onClick={handleDownloadExcelTemplate}
                  className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition"
                >
                  <Download className="w-4 h-4 text-emerald-600" />
                  <span>Unduh Template Excel</span>
                </button>

                {/* Export Current Users Button */}
                <button
                  onClick={handleExportUsersExcel}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition"
                >
                  <FileSpreadsheet className="w-4 h-4 text-slate-500" />
                  <span>Ekspor Semua Akun</span>
                </button>

                {/* Cetak Kartu Barcode Batang (KTA) */}
                <button
                  onClick={() => setActiveTab('attendance')}
                  className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition shadow-2xs"
                  title="Buka menu cetak kartu barcode batang santri & guru (KTA)"
                >
                  <Barcode className="w-4 h-4 text-emerald-700" />
                  <span>Cetak Kartu Barcode Batang (KTA)</span>
                </button>

                {/* Add User Manually */}
                <button
                  onClick={() => setShowAddUserModal(true)}
                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>+ Tambah Manual</span>
                </button>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1 text-xs font-semibold text-slate-500">
                <Filter className="w-3.5 h-3.5" />
                <span>Filter:</span>
              </div>

              {/* Role Filter */}
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
              >
                <option value="all">Semua Peran ({users.length})</option>
                <option value="student">Siswa ({users.filter(u => u.role === 'student').length})</option>
                <option value="teacher">Guru / Pengawas ({users.filter(u => u.role === 'teacher').length})</option>
                <option value="admin">Administrator ({users.filter(u => u.role === 'admin').length})</option>
              </select>

              {/* Class Filter */}
              <select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
              >
                <option value="all">Semua Rombel MTs</option>
                {classes.map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>

              <div className="ml-auto text-xs text-slate-400">
                Menampilkan <strong className="text-slate-700">{filteredUsers.length}</strong> pengguna
              </div>
            </div>
          </div>

          {/* User Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5">Nama Lengkap & Identitas</th>
                    <th className="px-4 py-3.5">Peran</th>
                    <th className="px-4 py-3.5">Kelas / Rombel</th>
                    <th className="px-4 py-3.5">Username Login</th>
                    <th className="px-4 py-3.5">Password</th>
                    <th className="px-4 py-3.5">Token MFA</th>
                    <th className="px-4 py-3.5">WhatsApp (Wali / Guru)</th>
                    <th className="px-4 py-3.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-slate-400">
                        Tidak ada data pengguna yang sesuai dengan filter pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((usr) => {
                      const isVisible = !!visiblePasswords[usr.id];
                      return (
                        <tr key={usr.id} className="hover:bg-slate-50/70 transition">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                                usr.role === 'student' ? 'bg-emerald-100 text-emerald-800' :
                                usr.role === 'teacher' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                              }`}>
                                {usr.name?.charAt(0) || 'U'}
                              </div>
                              <div>
                                <div className="font-bold text-slate-900">{usr.name}</div>
                                <div className="text-[11px] text-slate-400 font-mono">
                                  {usr.role === 'teacher' ? 'NIP' : 'NISN'}: {usr.nisnOrNip || '-'}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-3.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              usr.role === 'student' ? 'bg-emerald-100 text-emerald-800' :
                              usr.role === 'teacher' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                            }`}>
                              {usr.role === 'student' ? 'Siswa MTs' : usr.role === 'teacher' ? 'Guru' : 'Admin'}
                            </span>
                          </td>

                          <td className="px-4 py-3.5">
                            <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                              {usr.className || '-'}
                            </span>
                          </td>

                          <td className="px-4 py-3.5">
                            <div className="font-mono font-bold text-slate-800 bg-slate-50 px-2 py-1 rounded border border-slate-200 inline-block">
                              {usr.username}
                            </div>
                          </td>

                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono bg-slate-50 px-2 py-1 rounded border border-slate-200 text-slate-700 min-w-[70px] inline-block">
                                {isVisible ? (usr.password || 'siswa123') : '••••••••'}
                              </span>
                              <button
                                onClick={() => togglePasswordVisibility(usr.id)}
                                title={isVisible ? 'Sembunyikan password' : 'Lihat password'}
                                className="p-1 text-slate-400 hover:text-slate-700 rounded cursor-pointer"
                              >
                                {isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                onClick={() => copyToClipboard(usr.password || 'siswa123', usr.id)}
                                title="Salin password"
                                className="p-1 text-slate-400 hover:text-slate-700 rounded cursor-pointer"
                              >
                                {copiedId === usr.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </td>

                          <td className="px-4 py-3.5 font-mono text-slate-600 font-bold">
                            {usr.mfaSecret || '123456'}
                          </td>

                          <td className="px-4 py-3.5">
                            {usr.whatsappNumber ? (
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono text-[11px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                    {usr.whatsappNumber}
                                  </span>
                                  <a
                                    href={`https://wa.me/${usr.whatsappNumber.replace(/^0/, '62').replace(/\D/g, '')}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    title="Buka WhatsApp Langsung"
                                    className="p-1 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-100 rounded transition"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                </div>
                                <div className="text-[10px] text-slate-500 truncate max-w-[140px]">
                                  {usr.role === 'student' 
                                    ? (usr.parentName ? `Wali: ${usr.parentName}` : 'Wali Murid')
                                    : (usr.subjectOrPosition ? usr.subjectOrPosition : 'Guru Pribadi')}
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-300 italic text-[11px]">Belum diisi</span>
                            )}
                          </td>

                          <td className="px-4 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleStartEditUser(usr)}
                                title={`Edit data ${usr.name}`}
                                className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 hover:text-emerald-900 border border-emerald-200/80 rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-2xs group"
                              >
                                <Pencil className="w-3.5 h-3.5 text-emerald-600 group-hover:scale-110 transition" />
                                <span>Edit</span>
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`Hapus pengguna ${usr.name}?`)) {
                                    deleteUser(usr.id);
                                  }
                                }}
                                title="Hapus pengguna"
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl cursor-pointer transition border border-transparent hover:border-rose-200"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: SUBMISSIONS ARCHIVE */}
      {activeSubTab === 'submissions' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">ID Sesi & Tanggal</th>
                  <th className="px-4 py-3.5">Nama Santri/Siswa</th>
                  <th className="px-4 py-3.5">Kelas MTs</th>
                  <th className="px-4 py-3.5">Nilai Akhir</th>
                  <th className="px-4 py-3.5">Status KKM</th>
                  <th className="px-4 py-3.5">Integritas Anti-Cheat</th>
                  <th className="px-4 py-3.5">Perangkat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSessions.map((ses) => (
                  <tr key={ses.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-5 py-3.5">
                      <div className="font-mono font-bold text-slate-800">{ses.id}</div>
                      <div className="text-[11px] text-slate-400">
                        {ses.submittedAt ? new Date(ses.submittedAt).toLocaleString('id-ID') : 'Sedang berjalan'}
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="font-bold text-slate-900">{ses.studentName}</div>
                      <div className="text-[11px] text-slate-400">NISN: {ses.nisn}</div>
                    </td>

                    <td className="px-4 py-3.5">
                      <span className="px-2 py-0.5 bg-slate-100 font-semibold text-slate-700 rounded text-[11px]">
                        {ses.className}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 font-bold">
                      {ses.score !== undefined ? (
                        <span className={`text-sm ${ses.score >= (exams[0]?.passingGrade ?? 75) ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {ses.score}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Belum selesai</span>
                      )}
                    </td>

                    <td className="px-4 py-3.5">
                      {ses.score !== undefined ? (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          ses.isPassed ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {ses.isPassed ? 'TUNTAS' : 'REMEDIAL'}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>

                    <td className="px-4 py-3.5">
                      {ses.violationsCount === 0 ? (
                        <span className="text-emerald-600 font-semibold text-[11px] flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Terverifikasi
                        </span>
                      ) : (
                        <span className="text-rose-600 font-bold text-[11px] flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          {ses.violationsCount} Anomali
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3.5 text-slate-400 text-[11px] font-mono">
                      {ses.ipAddress || '192.168.1.10x'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: AUDIT TRAIL LOG */}
      {activeSubTab === 'audit_trail' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Waktu (WIB)</th>
                  <th className="px-4 py-3.5">Aktor / Pengguna</th>
                  <th className="px-4 py-3.5">Peran</th>
                  <th className="px-4 py-3.5">Kategori Tindakan</th>
                  <th className="px-5 py-3.5">Rincian Peristiwa / Log</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map((log) => {
                  let badgeColor = 'bg-slate-100 text-slate-700';
                  if (log.level === 'warn') badgeColor = 'bg-amber-100 text-amber-800';
                  if (log.level === 'error') badgeColor = 'bg-rose-100 text-rose-800';

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-5 py-3.5 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString('id-ID')}
                      </td>

                      <td className="px-4 py-3.5 font-bold text-slate-900">
                        {log.actorName}
                      </td>

                      <td className="px-4 py-3.5">
                        <span className="capitalize px-2 py-0.5 bg-slate-100 rounded text-slate-600 font-semibold text-[10px]">
                          {log.actorRole}
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${badgeColor}`}>
                          {log.action}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 text-slate-700 leading-relaxed">
                        {log.details}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: ADD MANUAL USER */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-wider">
                <UserPlus className="w-4 h-4" />
                <span>Tambah Pengguna CBT MTs</span>
              </div>
              <button
                onClick={() => setShowAddUserModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveManualUser} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Peran Akun</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium"
                >
                  <option value="student">Siswa / Santri Peserta</option>
                  <option value="teacher">Guru / Pengawas</option>
                  <option value="admin">Administrator / Proktor</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Muhammad Danial"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                />
              </div>

              {newRole === 'student' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Rombel Kelas MTs</label>
                  <select
                    value={newClassName}
                    onChange={(e) => setNewClassName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium"
                  >
                    {classes.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {newRole === 'teacher' ? 'NIP (Nomor Induk Pegawai)' : 'NISN (Nomor Induk Siswa Nasional)'}
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: 0098471201"
                  value={newNisnOrNip}
                  onChange={(e) => setNewNisnOrNip(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Username Login</label>
                  <input
                    type="text"
                    required
                    placeholder="danial_7a"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kata Sandi</label>
                  <input
                    type="text"
                    required
                    placeholder="siswa123"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Token Keamanan MFA</label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="123456"
                  value={newMfaToken}
                  onChange={(e) => setNewMfaToken(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-mono"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {newRole === 'student' ? 'WhatsApp Wali Santri' : 'WhatsApp Pribadi Guru'}
                  </label>
                  <input
                    type="tel"
                    placeholder="Contoh: 081234567890"
                    value={newWhatsapp}
                    onChange={(e) => setNewWhatsapp(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-emerald-300 rounded-xl text-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {newRole === 'student' ? 'Nama Wali Murid' : 'Mata Pelajaran / Tugas'}
                  </label>
                  <input
                    type="text"
                    placeholder={newRole === 'student' ? 'Nama Orang Tua / Wali' : 'Contoh: Guru Matematika'}
                    value={newRole === 'student' ? newParentName : newSubjectOrPosition}
                    onChange={(e) => newRole === 'student' ? setNewParentName(e.target.value) : setNewSubjectOrPosition(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  Simpan Akun
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL: EDIT USER */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 my-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 leading-tight">Edit Data Siswa & Guru MTs</h3>
                  <p className="text-[11px] text-slate-500">Perbarui identitas, kredensial login, dan kelas rombel</p>
                </div>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditUser} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Peran Akun</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                >
                  <option value="student">Siswa / Santri Peserta</option>
                  <option value="teacher">Guru / Pengawas Ujian</option>
                  <option value="admin">Administrator / Proktor Utama</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Muhammad Danial"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              {editRole === 'student' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Rombongan Belajar / Kelas MTs</label>
                  <select
                    value={editClassName}
                    onChange={(e) => setEditClassName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  >
                    {classes.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {editRole === 'teacher' ? 'NIP / NUPTK Pendidik' : editRole === 'admin' ? 'NIP / ID Administrator' : 'NISN (Nomor Induk Siswa Nasional)'}
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: 0098471201"
                  value={editNisnOrNip}
                  onChange={(e) => setEditNisnOrNip(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Username Login</label>
                  <input
                    type="text"
                    required
                    placeholder="danial_7a"
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-mono font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700">Kata Sandi</label>
                    <button
                      type="button"
                      onClick={handleGenerateEditPassword}
                      className="text-[10px] text-emerald-600 hover:text-emerald-800 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Acak Sandi</span>
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showEditPassword ? 'text' : 'password'}
                      required
                      placeholder="siswa123"
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-mono pr-10 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={() => setShowEditPassword(!showEditPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                    >
                      {showEditPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700">Token Keamanan MFA</label>
                    <button
                      type="button"
                      onClick={handleGenerateEditMfa}
                      className="text-[10px] text-teal-600 hover:text-teal-800 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Acak Token</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="123456"
                    value={editMfaToken}
                    onChange={(e) => setEditMfaToken(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-mono font-bold tracking-wider focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nama Madrasah / Lembaga</label>
                  <input
                    type="text"
                    placeholder="MTs. Darul Huda"
                    value={editSchoolName}
                    onChange={(e) => setEditSchoolName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {editRole === 'student' ? 'WhatsApp Wali Santri (Notifikasi Presensi)' : 'WhatsApp Pribadi Guru (Notifikasi Presensi)'}
                  </label>
                  <input
                    type="tel"
                    placeholder="Contoh: 081234567890"
                    value={editWhatsapp}
                    onChange={(e) => setEditWhatsapp(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-emerald-300 rounded-xl text-slate-800 font-mono font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Format: 08... atau 628...</span>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {editRole === 'student' ? 'Nama Wali Murid / Orang Tua' : 'Mata Pelajaran / Tugas Diampu'}
                  </label>
                  <input
                    type="text"
                    placeholder={editRole === 'student' ? 'Contoh: H. Abdullah Rahman' : 'Contoh: Guru Fikih MTs'}
                    value={editRole === 'student' ? editParentName : editSubjectOrPosition}
                    onChange={(e) => editRole === 'student' ? setEditParentName(e.target.value) : setEditSubjectOrPosition(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs cursor-pointer transition flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Simpan Perubahan Data</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
