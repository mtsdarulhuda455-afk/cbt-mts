import React, { useState, useEffect } from 'react';
import { useCbt } from '../../context/CbtContext';
import { 
  Menu,
  X,
  ShieldCheck, 
  Wifi, 
  WifiOff, 
  Activity, 
  BarChart3, 
  Database, 
  User as UserIcon, 
  GraduationCap, 
  Layers,
  Lock,
  ArrowRightLeft,
  ChevronRight,
  School,
  Sparkles,
  LogOut,
  LogIn,
  FileSpreadsheet,
  AlertTriangle,
  Settings,
  FileEdit,
  Home,
  Terminal,
  RefreshCw,
  ScanLine
} from 'lucide-react';
import { LoginPage } from '../auth/LoginPage';
import { UserProfileModal } from '../auth/UserProfileModal';

export const Header: React.FC = () => {
  const { 
    currentUser, 
    activeTab, 
    setActiveTab, 
    switchUserRole,
    isSimulatedOffline, 
    setIsSimulatedOffline,
    sessions,
    apiConfig,
    systemSettings,
    logout,
    firebaseStatus,
    firebaseProjectId,
    lastFirebaseSync,
    syncWithFirebase,
    isUpdateAvailable,
    triggerAutoUpdate,
    checkForUpdates
  } = useCbt();

  const [isSyncingHeader, setIsSyncingHeader] = useState<boolean>(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [showLogoutModal, setShowLogoutModal] = useState<boolean>(false);

  const lockedCount = sessions.filter(s => s.status === 'locked').length;

  // Close drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleNavClick = (tab: string) => {
    setActiveTab(tab);
    setIsDrawerOpen(false);
  };

  const handleConfirmLogout = () => {
    logout();
    setShowLogoutModal(false);
    setIsDrawerOpen(false);
  };

  const navItems = [
    // Menu Siswa: Beranda & Jadwal Ujian
    {
      id: 'student_home',
      label: 'Beranda & Jadwal Ujian',
      shortLabel: 'Jadwal Ujian',
      desc: 'Daftar jadwal ujian aktif, token & status pengerjaan santri',
      icon: Home,
      roles: ['student'],
    },
    // Menu Absensi & Presensi Barcode (Masuk, Pulang, Notif WA, Rekap Bulanan)
    {
      id: 'attendance',
      label: currentUser?.role === 'teacher' ? 'Scan Absensi Barcode' : 'Absensi Barcode & Rekap',
      shortLabel: currentUser?.role === 'teacher' ? 'Scan Absensi' : 'Presensi Barcode',
      desc: currentUser?.role === 'teacher'
        ? 'Scan barcode masuk & pulang (support kamera HP & scanner eksternal)'
        : 'Scan barcode masuk & pulang, cetak kartu & rekapitulasi bulanan',
      icon: ScanLine,
      badge: 'Baru',
      badgeColor: 'bg-emerald-100 text-emerald-800 border border-emerald-300',
      roles: ['admin', 'teacher'],
    },
    // Menu Guru & Admin: Ruang Pengawas & Monitoring Peserta
    {
      id: 'control_room',
      label: 'Ruang Kontrol Pengawas',
      shortLabel: 'Ruang Pengawas',
      desc: 'Live monitoring pengerjaan, status online & reset kunci santri',
      icon: Activity,
      badge: lockedCount > 0 ? `${lockedCount} Terkunci` : undefined,
      badgeColor: 'bg-rose-600 text-white',
      roles: ['admin', 'teacher'],
    },
    // Menu Guru & Admin: Pembuatan & Bank Soal
    {
      id: 'teacher_exams',
      label: 'Pembuatan & Bank Soal',
      shortLabel: 'Bank Soal',
      desc: 'Susun 4 jenis soal (PG, PG-K, Jodoh, Esai) & impor Word (.docx)',
      icon: FileEdit,
      roles: ['admin', 'teacher'],
    },
    // Menu Admin: Data Kelas & Rombel Siswa
    {
      id: 'classes',
      label: 'Data Rombel & Kelas',
      shortLabel: 'Data Rombel',
      desc: 'Kelola rombel kelas VII, VIII, IX & wali kelas madrasah',
      icon: School,
      badge: 'Admin',
      badgeColor: 'bg-emerald-100 text-emerald-800',
      roles: ['admin'],
    },
    // Menu Admin: Database Master Siswa & Guru
    {
      id: 'database',
      label: 'Database Santri & Guru',
      shortLabel: 'Database Master',
      desc: 'Master data akun pengguna, cetak kartu & impor file Excel',
      icon: Database,
      badge: 'Admin',
      badgeColor: 'bg-amber-100 text-amber-800',
      roles: ['admin'],
    },
    // Menu Guru & Admin: Rekap Nilai & Analitik KKM
    {
      id: 'analytics',
      label: 'Rekap & Analitik Nilai',
      shortLabel: 'Rekap Nilai',
      desc: 'Grafik ketuntasan KKM, analisis butir soal & ekspor Excel/PDF',
      icon: BarChart3,
      roles: ['admin', 'teacher'],
    },
    // Menu Admin: Pengaturan Lembaga & Sistem CBT
    {
      id: 'settings',
      label: 'Pengaturan Sistem CBT',
      shortLabel: 'Pengaturan CBT',
      desc: 'Profil madrasah, anti-cheat, audio pengawas & sinkron cloud',
      icon: Settings,
      badge: 'Admin',
      badgeColor: 'bg-indigo-100 text-indigo-800',
      roles: ['admin'],
    },
    // Menu Admin: Konsol Khusus Super Admin
    {
      id: 'admin_special',
      label: 'Konsol Super Admin',
      shortLabel: 'Super Admin',
      desc: 'Bypass darurat, reset serentak & uji integritas performa server',
      icon: Terminal,
      badge: 'Super Admin',
      badgeColor: 'bg-rose-100 text-rose-800 border border-rose-200',
      roles: ['admin'],
    },
    // Menu Khusus Siswa: Lembar Soal Ujian CBT (Hanya untuk Akun Siswa)
    {
      id: 'student_exam',
      label: 'Lembar Soal Ujian',
      shortLabel: 'Lembar Ujian',
      desc: 'Pengerjaan soal CBT MTs dengan sistem anti-cheat terintegrasi',
      icon: Layers,
      roles: ['student'],
    },
  ];

  const visibleNavItems = navItems.filter(
    item => !item.roles || item.roles.includes(currentUser?.role || 'student')
  );

  return (
    <>
      {/* Top Header: Brand, Navigation Bar, Connection & User Status */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
        {/* Row 1: Brand & User Controls */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-3">
            
            {/* Left: Hamburger Button + School & App Branding */}
            <div className="flex items-center gap-2.5">
              {/* Tombol Garis 3 (Hamburger Menu) */}
              <button
                onClick={() => setIsDrawerOpen(true)}
                aria-label="Buka Menu Lengkap"
                title="Buka Menu Lengkap (Garis 3)"
                className="p-2 -ml-1 text-slate-700 hover:text-emerald-700 hover:bg-emerald-50 active:bg-emerald-100 rounded-xl cursor-pointer transition flex items-center justify-center relative focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              >
                <Menu className="w-5.5 h-5.5 stroke-[2.3]" />
                {lockedCount > 0 && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-600 rounded-full ring-2 ring-white"></span>
                )}
              </button>

              {/* School & App Branding */}
              <button
                type="button"
                onClick={() => setActiveTab(currentUser?.role === 'student' ? 'student_home' : 'control_room')}
                className="flex items-center gap-2.5 text-left cursor-pointer group"
                title="Buka Beranda CBT"
              >
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-700 text-white flex items-center justify-center shadow-xs font-black group-hover:scale-105 transition">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 leading-none">
                    <span className="font-black text-slate-900 text-base tracking-tight group-hover:text-emerald-700 transition">EduExam CBT</span>
                    <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold rounded-md uppercase">MTS</span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium mt-1 line-clamp-1">{systemSettings.schoolName}</div>
                </div>
              </button>
            </div>

            {/* Right: Quick Account & Connection Indicators */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Role Badge */}
              {currentUser && (
                <span className={`hidden sm:inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider border ${
                  currentUser.role === 'admin' 
                    ? 'bg-rose-50 text-rose-800 border-rose-200' 
                    : currentUser.role === 'teacher'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-blue-50 text-blue-800 border-blue-200'
                }`}>
                  {currentUser.role === 'admin' ? 'Administrator' : currentUser.role === 'teacher' ? 'Guru / Pengawas' : 'Santri / Siswa'}
                </span>
              )}

              {/* Auto-Update Ready Notification Pill */}
              {isUpdateAvailable && (
                <button
                  onClick={triggerAutoUpdate}
                  title="Pembaruan sistem CBT siap! Klik untuk menerapkan data & soal terbaru tanpa republish."
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-amber-500 to-emerald-600 hover:from-amber-600 hover:to-emerald-700 text-white rounded-xl text-xs font-black shadow-md cursor-pointer transition animate-pulse"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Pembaruan Siap</span>
                  <span>Segarkan</span>
                </button>
              )}

              {/* Firebase Cloud Realtime Status & Manual Sync Button */}
              <button 
                onClick={async () => {
                  if (isSimulatedOffline) return;
                  setIsSyncingHeader(true);
                  await syncWithFirebase();
                  setIsSyncingHeader(false);
                }}
                disabled={isSyncingHeader || isSimulatedOffline}
                className={`flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                  isSimulatedOffline 
                    ? 'bg-amber-50 text-amber-800 border-amber-300 opacity-80 cursor-not-allowed' 
                    : firebaseStatus === 'connected'
                    ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                    : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border-indigo-200'
                }`}
                title={`Database Firebase Cloud: ${firebaseProjectId} • Klik untuk sinkronkan data sekarang • Terakhir: ${lastFirebaseSync || 'Baru saja'}`}
              >
                {isSimulatedOffline ? (
                  <WifiOff className="w-3.5 h-3.5 text-amber-600" />
                ) : (
                  <Database className={`w-3.5 h-3.5 text-emerald-600 ${isSyncingHeader ? 'animate-spin' : ''}`} />
                )}
                <span className="hidden md:inline">
                  {isSimulatedOffline ? 'Mode Offline' : isSyncingHeader ? 'Menyinkronkan...' : 'Firebase Cloud'}
                </span>
                {!isSimulatedOffline && !isSyncingHeader && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse hidden lg:inline-block"></span>
                )}
              </button>

              {/* User Profile Capsule */}
              {currentUser ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowProfileModal(true)}
                    title={`Klik untuk melihat profil akun pengguna (${systemSettings.schoolName})`}
                    className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 border border-slate-200 rounded-xl cursor-pointer transition text-left group"
                  >
                    <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs group-hover:scale-105 transition">
                      {currentUser?.name?.charAt(0) || 'U'}
                    </div>
                    <div className="hidden lg:block text-left">
                      <div className="text-xs font-bold text-slate-800 line-clamp-1 group-hover:text-emerald-850">{currentUser?.name}</div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1 leading-tight mt-0.5">
                        <span className="capitalize">{currentUser?.role === 'teacher' ? 'Pengawas' : currentUser?.role === 'student' ? 'Siswa' : 'Admin'}</span>
                        <span>•</span>
                        <span className="text-emerald-700 font-semibold truncate max-w-[120px]" title={systemSettings.schoolName}>
                          {systemSettings.schoolName}
                        </span>
                      </div>
                    </div>
                    <UserIcon className="w-3.5 h-3.5 text-slate-400 ml-0.5 hidden sm:inline" />
                  </button>

                  {/* Direct Logout Icon Button */}
                  <button
                    onClick={() => setShowLogoutModal(true)}
                    title="Keluar / Logout Akun"
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl cursor-pointer transition hidden sm:flex items-center justify-center border border-slate-200 hover:border-rose-200"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowLoginModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Menu Login</span>
                </button>
              )}
            </div>

          </div>
        </div>

        {/* Row 2: Visible Menu Tab Bar (Active Views Bar) */}
        {currentUser && (
          <nav className="bg-slate-50/90 border-t border-slate-200/80 px-2 sm:px-6 lg:px-8 py-1.5 overflow-x-auto scrollbar-none flex items-center gap-1.5">
            <div className="flex items-center gap-1 sm:gap-1.5 min-w-max">
              {visibleNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer select-none whitespace-nowrap ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                    <span>{item.shortLabel || item.label}</span>
                    {item.badge && (
                      <span className={`px-1.5 py-0.2 rounded-md text-[9px] font-black uppercase ${
                        isActive ? 'bg-white/20 text-white' : item.badgeColor
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </nav>
        )}
      </header>

      {/* Slide-out Navigation Drawer from Left */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div 
            onClick={() => setIsDrawerOpen(false)}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
          />

          {/* Drawer Panel */}
          <div className="fixed inset-y-0 left-0 max-w-xs sm:max-w-sm w-full h-full max-h-screen bg-white shadow-2xl flex flex-col z-50 animate-in slide-in-from-left duration-250 border-r border-slate-200">
            
            {/* Drawer Top Header (Fixed at top) */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-700 text-white flex items-center justify-center shadow-xs">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-sm">EduExam CBT MTs</h3>
                  <p className="text-[11px] text-slate-500 font-medium">{systemSettings.schoolName}</p>
                </div>
              </div>

              <button
                onClick={() => setIsDrawerOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl cursor-pointer transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Middle Container with smooth overflow scrolling */}
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain py-3 px-3 space-y-3">
              {/* Active User Card inside Drawer */}
              {currentUser ? (
                <div 
                  onClick={() => {
                    setIsDrawerOpen(false);
                    setShowProfileModal(true);
                  }}
                  className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50/80 to-slate-50 border border-emerald-100 hover:border-emerald-300 transition cursor-pointer group"
                  title="Klik untuk melihat detail profil pengguna"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold rounded-md uppercase tracking-wider">
                      {currentUser?.role === 'teacher' ? 'Pengawas Ujian MTs' : currentUser?.role === 'admin' ? 'Administrator CBT' : 'Santri / Siswa MTs'}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      <ShieldCheck className="w-3 h-3" />
                      MFA Aktif
                    </span>
                  </div>
                  <div className="font-bold text-slate-900 text-sm line-clamp-1 group-hover:text-emerald-800 transition">{currentUser?.name}</div>
                  <div className="text-xs text-slate-500 font-mono mt-0.5 flex items-center justify-between">
                    <span>{currentUser?.nisnOrNip} {currentUser?.className ? `• ${currentUser.className}` : ''}</span>
                    <span className="text-[10px] text-emerald-600 font-semibold group-hover:underline underline-offset-2">Lihat Profil →</span>
                  </div>
                  <div className="text-[11px] text-emerald-700 font-semibold mt-1 truncate">
                    {systemSettings.schoolName}
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                  <p className="text-xs text-slate-500 font-medium">Belum ada akun yang aktif</p>
                </div>
              )}

              {/* Mode Uji Peran Cepat (Jika Admin ingin melihat tampilan Guru / Siswa) */}
              {currentUser?.role === 'admin' && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <ArrowRightLeft className="w-3 h-3 text-slate-400" />
                    <span>Uji Coba Tampilan Peran:</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => {
                        switchUserRole('teacher');
                        setIsDrawerOpen(false);
                      }}
                      className="py-1.5 px-2 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-[11px] font-bold text-center cursor-pointer transition shadow-2xs"
                    >
                      Mode Guru
                    </button>
                    <button
                      onClick={() => {
                        switchUserRole('student');
                        setIsDrawerOpen(false);
                      }}
                      className="py-1.5 px-2 bg-white hover:bg-blue-50 text-blue-800 border border-blue-200 rounded-lg text-[11px] font-bold text-center cursor-pointer transition shadow-2xs"
                    >
                      Mode Santri
                    </button>
                  </div>
                </div>
              )}

              {/* Mode Simulasi Peran: Tombol kembali ke Admin jika sedang simulasi */}
              {currentUser && currentUser.role !== 'admin' && (
                <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-bold text-indigo-950">Mode Uji Tampilan</div>
                    <div className="text-[10px] text-indigo-600">Sedang simulasi peran: {currentUser.role === 'teacher' ? 'Guru' : 'Siswa'}</div>
                  </div>
                  <button
                    onClick={() => {
                      switchUserRole('admin');
                      setIsDrawerOpen(false);
                    }}
                    className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold rounded-lg cursor-pointer transition shadow-2xs"
                  >
                    Kembali Admin
                  </button>
                </div>
              )}

              {/* Navigation Items List */}
              <div className="space-y-1.5">
                <div className="px-3 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Menu Utama Sistem
                </div>

                {visibleNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id)}
                      className={`w-full p-3 rounded-xl text-left flex items-center justify-between transition cursor-pointer ${
                        isActive
                          ? 'bg-emerald-600 text-white shadow-md shadow-emerald-100 font-bold'
                          : 'hover:bg-slate-100 text-slate-700 font-semibold'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          isActive ? 'bg-white/20 text-white' : 'bg-emerald-50 text-emerald-700'
                        }`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs">{item.label}</div>
                          <div className={`text-[10px] ${isActive ? 'text-emerald-100' : 'text-slate-400'}`}>
                            {item.desc}
                          </div>
                        </div>
                      </div>

                      {item.badge ? (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isActive ? 'bg-white text-emerald-800' : item.badgeColor
                        }`}>
                          {item.badge}
                        </span>
                      ) : (
                        <ChevronRight className={`w-4 h-4 ${isActive ? 'text-white/70' : 'text-slate-300'}`} />
                      )}
                    </button>
                  );
                })}

                {/* Hanya 1 Menu: Logout jika sudah login, atau Login jika belum login */}
                {currentUser ? (
                  <button
                    onClick={() => {
                      setIsDrawerOpen(false);
                      setShowLogoutModal(true);
                    }}
                    className="w-full p-3 rounded-xl text-left flex items-center justify-between hover:bg-rose-50 text-rose-700 font-bold transition cursor-pointer border border-transparent hover:border-rose-200 mt-2"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                        <LogOut className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs">Keluar Akun (Logout)</div>
                        <div className="text-[10px] text-rose-500">Keluar dari akun {currentUser.name}</div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-rose-300" />
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setIsDrawerOpen(false);
                      setShowLoginModal(true);
                    }}
                    className="w-full p-3 rounded-xl text-left flex items-center justify-between hover:bg-emerald-50 text-emerald-800 font-bold transition cursor-pointer border border-transparent hover:border-emerald-200 mt-2"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                        <LogIn className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs">Masuk Akun (Login)</div>
                        <div className="text-[10px] text-emerald-600">Masuk dengan username & password</div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-emerald-300" />
                  </button>
                )}
              </div>
            </div>

            {/* Drawer Bottom Controls & Status (Fixed at bottom) */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/70 space-y-2.5 shrink-0">
              {/* Auto-Update Feature Card */}
              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Auto-Update Cloud</span>
                  </div>
                  <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                    Aktif
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  Pembaruan naskah soal atau pengaturan langsung tersinkron. Cukup segarkan (refresh) tanpa perlu republish.
                </p>
                <button
                  type="button"
                  onClick={triggerAutoUpdate}
                  className="w-full py-1.5 px-2 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-800 text-slate-700 rounded-lg text-[11px] font-bold cursor-pointer transition flex items-center justify-center gap-1.5 border border-slate-200 hover:border-emerald-200"
                >
                  <RefreshCw className="w-3 h-3 text-slate-500" />
                  <span>Segarkan Halaman (Refresh)</span>
                </button>
              </div>

              {/* Offline Switcher inside drawer */}
              <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-800">Simulasi Jaringan</div>
                  <div className="text-[10px] text-slate-400">
                    {isSimulatedOffline ? 'Mode Offline (Lokal)' : 'Online (Tersambung)'}
                  </div>
                </div>
                <button
                  onClick={() => setIsSimulatedOffline(!isSimulatedOffline)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition flex items-center gap-1.5 ${
                    isSimulatedOffline
                      ? 'bg-amber-500 text-white'
                      : 'bg-emerald-600 text-white'
                  }`}
                >
                  {isSimulatedOffline ? <WifiOff className="w-3.5 h-3.5" /> : <Wifi className="w-3.5 h-3.5" />}
                  <span>{isSimulatedOffline ? 'Offline' : 'Online'}</span>
                </button>
              </div>

              <div className="text-[11px] text-slate-400 text-center font-medium">
                EduExam CBT MTs v4.8 • {systemSettings.schoolName}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* User Profile Modal */}
      {showProfileModal && (
        <UserProfileModal
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          onLogoutClick={() => setShowLogoutModal(true)}
        />
      )}

      {/* Login Modal */}
      {showLoginModal && (
        <LoginPage
          isModal={true}
          onClose={() => setShowLoginModal(false)}
          onSuccess={() => setShowLoginModal(false)}
        />
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <LogOut className="w-6 h-6" />
            </div>

            <h3 className="text-base font-extrabold text-slate-900 text-center mb-1.5">
              Konfirmasi Logout CBT
            </h3>

            <p className="text-xs text-slate-500 text-center leading-relaxed mb-5">
              Apakah Anda yakin ingin keluar dari akun <strong className="text-slate-800">{currentUser?.name}</strong>? Seluruh data pengerjaan ujian dan rekap nilai telah tersimpan secara aman di database.
            </p>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer transition text-center"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmLogout}
                className="py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs cursor-pointer transition shadow-xs text-center flex items-center justify-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Ya, Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
