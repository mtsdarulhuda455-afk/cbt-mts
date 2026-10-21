import React, { useState, useEffect, useRef } from 'react';
import { useCbt } from '../../context/CbtContext';
import { 
  QrCode, 
  ScanLine, 
  Clock, 
  Calendar, 
  Send, 
  CheckCircle2, 
  AlertTriangle, 
  FileSpreadsheet, 
  Printer, 
  UserCheck, 
  Users, 
  GraduationCap, 
  School, 
  Search, 
  RefreshCw, 
  Settings, 
  ChevronRight, 
  ArrowRight, 
  Check, 
  X, 
  Copy,
  ExternalLink, 
  Sparkles, 
  Sliders, 
  Camera, 
  Keyboard, 
  Info,
  Phone,
  MessageSquare,
  FileText,
  Filter,
  Download,
  CheckSquare,
  Square,
  Building2,
  Smartphone,
  Apple,
  Bell,
  BellRing,
  AlertCircle,
  ShieldCheck,
  Barcode
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { SquareBarcode } from '../common/SquareBarcode';
import { BarcodeBatang } from '../common/BarcodeBatang';
import { MobileBarcodeScanner } from '../common/MobileBarcodeScanner';
import { 
  AttendanceRecord, 
  AttendanceType, 
  AttendanceStatus, 
  User 
} from '../../types/cbt';
import { 
  getWibDate, 
  getWibTime, 
  getWibDateIndonesian, 
  getMonthNameIndonesian,
  cleanWhatsappNumber,
  createWhatsappLink,
  scanAudio,
  INSTITUTION_BARCODE_DEFAULT,
  isInstitutionBarcode,
  addMinutesToTime
} from '../../services/attendanceUtils';

export const AttendanceView: React.FC = () => {
  const { 
    currentUser, 
    users, 
    classes, 
    systemSettings, 
    attendanceRecords, 
    attendanceSettings, 
    recordAttendance, 
    updateAttendanceSettings,
    sendWhatsappNotification,
    resetTodayAttendanceWib,
    addAuditLog,
    setActiveTab,
    getUnclockedUsersToday,
    sendUnclockedAlert,
    sendBatchUnclockedAlerts,
    isPastClockInReminderTime,
    isPastClockOutReminderTime,
    clockInReminderScheduledTime,
    clockOutReminderScheduledTime
  } = useCbt();

  // Current active sub-tab
  const [activeSubTab, setActiveSubTab] = useState<'scanner' | 'barcode_lembaga' | 'rekap_siswa' | 'rekap_guru' | 'id_cards' | 'settings'>('scanner');

  // Scanner State
  const [scanMode, setScanMode] = useState<AttendanceType>(() => {
    // Auto-detect based on current WIB hour: before 12:00 -> masuk, after 12:00 -> pulang
    const hour = parseInt(getWibTime().split(':')[0], 10);
    return hour < 12 ? 'masuk' : 'pulang';
  });
  const [barcodeInput, setBarcodeInput] = useState('');
  const [lastScannedResult, setLastScannedResult] = useState<{
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
    time: string;
  } | null>(null);

  // Anti-Spam & Dedicated "Sudah Absen" States
  const recentScansRef = useRef<Map<string, number>>(new Map());
  const isScanningBusyRef = useRef<boolean>(false);
  const [spamNotice, setSpamNotice] = useState<string | null>(null);
  const [alreadyScannedAlert, setAlreadyScannedAlert] = useState<{
    user: User;
    record: AttendanceRecord;
    sessionType: AttendanceType;
    existingTime: string;
    message: string;
  } | null>(null);

  // Auto-dismiss "Sudah Absen" notification popup after 8 seconds
  useEffect(() => {
    if (alreadyScannedAlert) {
      const timer = setTimeout(() => {
        setAlreadyScannedAlert(null);
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [alreadyScannedAlert]);

  // Live WIB Clock
  const [liveWibTime, setLiveWibTime] = useState(getWibTime());
  const [liveWibDate, setLiveWibDate] = useState(getWibDate());

  // External scanner input reference
  const scannerInputRef = useRef<HTMLInputElement>(null);
  const [showMobileScanner, setShowMobileScanner] = useState(false);

  // Rekap filters
  const [selectedMonth, setSelectedMonth] = useState<number>(9); // 0-indexed (9 = Oktober)
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Print Modal Rekapitulasi
  const [showPrintModal, setShowPrintModal] = useState<'siswa' | 'guru' | null>(null);

  // Print Kartu Barcode Kotak & Selection State
  const [selectedCardUserIds, setSelectedCardUserIds] = useState<string[]>([]);
  const [cardRoleFilter, setCardRoleFilter] = useState<'all' | 'student' | 'teacher'>('all');
  const [cardClassFilter, setCardClassFilter] = useState<string>('all');
  const [cardSearchQuery, setCardSearchQuery] = useState('');
  const [showPrintCardsModal, setShowPrintCardsModal] = useState(false);

  // Modal Cetak Poster / Standee Barcode Lembaga
  const [showPrintInstitutionModal, setShowPrintInstitutionModal] = useState(false);

  // Modal & Panel Pemberitahuan Otomatis WA Belum Absen (30 Menit)
  const [showUnclockedModal, setShowUnclockedModal] = useState(false);
  const [unclockedModalTab, setUnclockedModalTab] = useState<'masuk' | 'pulang'>('masuk');
  const [unclockedRoleFilter, setUnclockedRoleFilter] = useState<'all' | 'student' | 'teacher'>('all');
  const [unclockedSearch, setUnclockedSearch] = useState('');
  const [unclockedAlertBannerResult, setUnclockedAlertBannerResult] = useState<string | null>(null);
  const [previewMessageUserId, setPreviewMessageUserId] = useState<string | null>(null);
  const [copiedAlertId, setCopiedAlertId] = useState<string | null>(null);

  const copyAlertMessage = (text: string, id: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedAlertId(id);
      setTimeout(() => setCopiedAlertId(null), 2000);
    } catch {
      // fallback
    }
  };

  // Ambil data santri & guru yang belum absen hari ini
  const unclockedInUsers = getUnclockedUsersToday('masuk');
  const unclockedOutUsers = getUnclockedUsersToday('pulang');
  const unclockedInPending = unclockedInUsers.filter(u => !u.isNotified);
  const unclockedOutPending = unclockedOutUsers.filter(u => !u.isNotified);

  // Cek apakah guru yang login belum absen
  const currentTeacherUnclockedIn = currentUser?.role === 'teacher' && unclockedInUsers.some(u => u.user.id === currentUser.id);
  const currentTeacherUnclockedOut = currentUser?.role === 'teacher' && unclockedOutUsers.some(u => u.user.id === currentUser.id);

  const isAdmin = currentUser?.role === 'admin';

  // Role Guard: Akun Guru HANYA memiliki menu scan barcode masuk & pulang.
  // Fitur selebihnya (rekapitulasi siswa, rekap guru, cetak kartu, aturan jam) hanya ada di akun admin.
  useEffect(() => {
    if (!isAdmin && activeSubTab !== 'scanner') {
      setActiveSubTab('scanner');
    }
  }, [isAdmin, activeSubTab]);

  // Update live WIB clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setLiveWibTime(getWibTime());
      setLiveWibDate(getWibDate());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Keep scanner input focused for external USB / Bluetooth barcode hardware guns
  useEffect(() => {
    if (activeSubTab === 'scanner') {
      const focusTimeout = setTimeout(() => {
        scannerInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(focusTimeout);
    }
  }, [activeSubTab, scanMode]);

  // Global barcode wedge listener for external scanners
  useEffect(() => {
    let buffer = '';
    let lastKeyTime = Date.now();

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in regular textarea or modal inputs
      const target = e.target as HTMLElement;
      if (target && target.tagName === 'TEXTAREA') return;
      if (target && target.tagName === 'INPUT' && target !== scannerInputRef.current) return;

      const now = Date.now();
      const diff = now - lastKeyTime;
      lastKeyTime = now;

      if (e.key === 'Enter') {
        if (buffer.length >= 3) {
          e.preventDefault();
          processBarcode(buffer.trim(), 'external_scanner');
          buffer = '';
        }
      } else if (e.key.length === 1) {
        // Fast typing buffer from barcode gun
        if (diff > 150) {
          buffer = e.key;
        } else {
          buffer += e.key;
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [scanMode, users, attendanceRecords, attendanceSettings]);

  // Process barcode input with anti-spam protection & duplicate notification
  const processBarcode = (code: string, source: 'external_scanner' | 'camera_scanner' | 'manual_entry' = 'external_scanner') => {
    const trimmed = code.trim();
    if (!trimmed) return;

    const now = Date.now();
    // Anti-spam debounce: avoid processing identical barcode if scanned within 2.5 seconds
    const lastScanTime = recentScansRef.current.get(trimmed);
    if (lastScanTime && (now - lastScanTime) < 2500) {
      setSpamNotice(`🛡️ Sistem Anti-Spam: Barcode "${trimmed}" baru saja diproses. Mohon tunggu beberapa detik.`);
      setTimeout(() => setSpamNotice(null), 3500);
      setBarcodeInput('');
      return;
    }

    recentScansRef.current.set(trimmed, now);

    // Concurrency lock for rapid scanner gun / keyboard wedge events
    if (isScanningBusyRef.current) return;
    isScanningBusyRef.current = true;

    try {
      const res = recordAttendance(trimmed, scanMode, source);
      const currentTimeWib = getWibTime();

      setLastScannedResult({
        ...res,
        time: currentTimeWib,
      });

      if (res.alreadyClocked && res.user && res.record) {
        setAlreadyScannedAlert({
          user: res.user,
          record: res.record,
          sessionType: res.sessionType || scanMode,
          existingTime: res.existingTime || (scanMode === 'masuk' ? res.record.clockInTime : res.record.clockOutTime) || currentTimeWib,
          message: res.message
        });
      } else if (res.success && !res.alreadyClocked) {
        setAlreadyScannedAlert(null);
      }
    } finally {
      setTimeout(() => {
        isScanningBusyRef.current = false;
      }, 300);
    }

    setBarcodeInput('');
    scannerInputRef.current?.focus();
  };

  const handleManualScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    processBarcode(barcodeInput, 'manual_entry');
  };

  // Open Mobile Barcode Camera Scanner (supports Android, Apple iOS Safari WebKit, and Laptops)
  const openMobileScanner = () => {
    setShowMobileScanner(true);
  };

  // Today's attendance list
  const todayWib = getWibDate();
  const todayRecords = attendanceRecords.filter(r => r.date === todayWib);
  const todayMasukCount = todayRecords.filter(r => r.clockInTime).length;
  const todayPulangCount = todayRecords.filter(r => r.clockOutTime).length;
  const todayLateCount = todayRecords.filter(r => r.status === 'terlambat').length;

  // Filtered month records
  const monthStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;
  const monthRecords = attendanceRecords.filter(r => r.date.startsWith(monthStr));

  // -------------------------------------------------------------
  // REKAPITULASI SISWA / SANTRI (Format Siswa)
  // -------------------------------------------------------------
  const allStudents = users.filter(u => u.role === 'student');
  const filteredStudents = allStudents.filter(s => {
    const matchClass = selectedClassFilter === 'all' || s.classId === selectedClassFilter || s.className === selectedClassFilter;
    const matchSearch = !searchQuery || 
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      s.nisnOrNip.includes(searchQuery);
    return matchClass && matchSearch;
  });

  const studentRecapData = filteredStudents.map(student => {
    const studentRecords = monthRecords.filter(r => r.userId === student.id);
    const hadirCount = studentRecords.filter(r => r.status === 'hadir').length;
    const terlambatCount = studentRecords.filter(r => r.status === 'terlambat').length;
    const izinCount = studentRecords.filter(r => r.status === 'izin').length;
    const sakitCount = studentRecords.filter(r => r.status === 'sakit').length;
    const alpaCount = studentRecords.filter(r => r.status === 'alpa').length;
    const totalEffectiveDays = 22; // Hari efektif sebulan standar madrasah
    const totalHadir = hadirCount + terlambatCount;
    const percentage = totalEffectiveDays > 0 ? Math.min(100, Math.round((totalHadir / totalEffectiveDays) * 100)) : 0;

    // Rata-rata jam masuk
    const clockedInRecords = studentRecords.filter(r => r.clockInTime);
    let avgClockIn = '-';
    if (clockedInRecords.length > 0) {
      const totalSeconds = clockedInRecords.reduce((acc, curr) => {
        const [h, m, s] = (curr.clockInTime || '07:00:00').split(':').map(Number);
        return acc + (h * 3600 + m * 60 + s);
      }, 0);
      const avgSec = Math.round(totalSeconds / clockedInRecords.length);
      const avgH = String(Math.floor(avgSec / 3600)).padStart(2, '0');
      const avgM = String(Math.floor((avgSec % 3600) / 60)).padStart(2, '0');
      avgClockIn = `${avgH}:${avgM} WIB`;
    }

    return {
      student,
      hadirCount,
      terlambatCount,
      izinCount,
      sakitCount,
      alpaCount,
      totalHadir,
      totalEffectiveDays,
      percentage,
      avgClockIn,
      disciplineStatus: percentage >= 90 ? 'Sangat Baik' : percentage >= 75 ? 'Cukup' : 'Perlu Pembinaan',
    };
  });

  // -------------------------------------------------------------
  // REKAPITULASI GURU & TENAGA KEPENDIDIKAN (Format Guru)
  // -------------------------------------------------------------
  const allTeachers = users.filter(u => u.role === 'teacher' || u.role === 'admin');
  const filteredTeachers = allTeachers.filter(t => {
    return !searchQuery || 
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      t.nisnOrNip.includes(searchQuery) ||
      (t.subjectOrPosition && t.subjectOrPosition.toLowerCase().includes(searchQuery.toLowerCase()));
  });

  const teacherRecapData = filteredTeachers.map(teacher => {
    const teacherRecords = monthRecords.filter(r => r.userId === teacher.id);
    const ontimeCount = teacherRecords.filter(r => r.status === 'hadir').length;
    const lateCount = teacherRecords.filter(r => r.status === 'terlambat').length;
    const totalDaysPresent = teacherRecords.filter(r => r.clockInTime).length;
    const totalEffectiveDays = 22;
    const disciplineScore = totalEffectiveDays > 0 ? Math.min(100, Math.round((totalDaysPresent / totalEffectiveDays) * 100)) : 0;

    // Rata-rata jam masuk & pulang
    const clockIns = teacherRecords.filter(r => r.clockInTime);
    const clockOuts = teacherRecords.filter(r => r.clockOutTime);

    let avgIn = '-';
    let avgOut = '-';
    if (clockIns.length > 0) {
      const sumIn = clockIns.reduce((acc, c) => {
        const [h, m, s] = (c.clockInTime || '06:30:00').split(':').map(Number);
        return acc + (h * 3600 + m * 60 + s);
      }, 0);
      const avgSec = Math.round(sumIn / clockIns.length);
      avgIn = `${String(Math.floor(avgSec / 3600)).padStart(2, '0')}:${String(Math.floor((avgSec % 3600) / 60)).padStart(2, '0')} WIB`;
    }

    if (clockOuts.length > 0) {
      const sumOut = clockOuts.reduce((acc, c) => {
        const [h, m, s] = (c.clockOutTime || '14:30:00').split(':').map(Number);
        return acc + (h * 3600 + m * 60 + s);
      }, 0);
      const avgSec = Math.round(sumOut / clockOuts.length);
      avgOut = `${String(Math.floor(avgSec / 3600)).padStart(2, '0')}:${String(Math.floor((avgSec % 3600) / 60)).padStart(2, '0')} WIB`;
    }

    return {
      teacher,
      ontimeCount,
      lateCount,
      totalDaysPresent,
      totalEffectiveDays,
      disciplineScore,
      avgIn,
      avgOut,
      dutyHours: totalDaysPresent * 7.5, // 7.5 jam kerja per hari standar Kemenag
      performanceRating: disciplineScore >= 95 ? 'Amat Baik' : disciplineScore >= 80 ? 'Baik' : 'Cukup'
    };
  });

  // -------------------------------------------------------------
  // SELEKSI & FILTER KARTU BARCODE KOTAK (KTA SANTRI & GURU)
  // -------------------------------------------------------------
  const filteredCardUsers = users.filter((u) => {
    const matchRole = cardRoleFilter === 'all' || u.role === cardRoleFilter;
    const matchClass = cardClassFilter === 'all' || u.classId === cardClassFilter || u.className === cardClassFilter;
    const q = cardSearchQuery.toLowerCase().trim();
    const matchSearch = !q || 
      u.name.toLowerCase().includes(q) || 
      (u.nisnOrNip || '').toLowerCase().includes(q) ||
      (u.username || '').toLowerCase().includes(q) ||
      (u.barcode || '').toLowerCase().includes(q);
    return matchRole && matchClass && matchSearch;
  });

  const toggleSelectCardUser = (userId: string) => {
    setSelectedCardUserIds((prev) => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const selectAllFilteredCardUsers = () => {
    const ids = filteredCardUsers.map(u => u.id);
    setSelectedCardUserIds(ids);
  };

  const clearSelectedCardUsers = () => {
    setSelectedCardUserIds([]);
  };

  const selectOnlyRoleCards = (role: 'student' | 'teacher') => {
    const ids = users.filter(u => u.role === role).map(u => u.id);
    setSelectedCardUserIds(ids);
  };

  const handlePrintSingleCard = (userId: string) => {
    setSelectedCardUserIds([userId]);
    setShowPrintCardsModal(true);
  };

  const handlePrintSelectedCards = () => {
    if (selectedCardUserIds.length === 0) {
      setSelectedCardUserIds(filteredCardUsers.map(u => u.id));
    }
    setShowPrintCardsModal(true);
  };

  // Kartu yang akan dicetak dalam modal
  const cardsToPrint = users.filter(u => selectedCardUserIds.includes(u.id));
  const finalPrintCards = cardsToPrint.length > 0 ? cardsToPrint : filteredCardUsers;

  // -------------------------------------------------------------
  // EXPORT EXCEL REKAP BULANAN SISWA
  // -------------------------------------------------------------
  const exportStudentRecapExcel = () => {
    const sName = systemSettings?.schoolName || 'MTs. Darul Huda';
    const monthName = getMonthNameIndonesian(selectedMonth);

    const rows: (string | number)[][] = [
      [sName.toUpperCase()],
      [`REKAPITULASI PRESENSI & KEHADIRAN SISWA / SANTRI`],
      [`BULAN: ${monthName.toUpperCase()} ${selectedYear} - SIKLUS WAKTU INDONESIA BARAT (WIB)`],
      [`Filter Rombel: ${selectedClassFilter === 'all' ? 'Semua Kelas' : selectedClassFilter}`],
      [],
      [
        'No',
        'NISN',
        'Nama Lengkap Siswa / Santri',
        'Kelas / Rombel',
        'Hadir Tepat Waktu (H)',
        'Terlambat (T)',
        'Izin (I)',
        'Sakit (S)',
        'Alpa (A)',
        'Total Hadir',
        'Hari Efektif',
        '% Kehadiran',
        'Rata-rata Masuk (WIB)',
        'Nomor WA Wali Santri',
        'Nama Wali Santri',
        'Status Kedisiplinan'
      ]
    ];

    studentRecapData.forEach((row, idx) => {
      rows.push([
        idx + 1,
        row.student.nisnOrNip || '-',
        row.student.name,
        row.student.className || '-',
        row.hadirCount,
        row.terlambatCount,
        row.izinCount,
        row.sakitCount,
        row.alpaCount,
        row.totalHadir,
        row.totalEffectiveDays,
        `${row.percentage}%`,
        row.avgClockIn,
        row.student.whatsappNumber || '-',
        row.student.parentName || '-',
        row.disciplineStatus
      ]);
    });

    rows.push([]);
    rows.push(['', '', '', '', '', '', '', '', '', '', '', '', '', '', 'Mengetahui,', '']);
    rows.push(['', '', '', '', '', '', '', '', '', '', '', '', '', '', 'Kepala Madrasah,', '']);
    rows.push([]);
    rows.push([]);
    rows.push(['', '', '', '', '', '', '', '', '', '', '', '', '', '', systemSettings?.headmasterName || 'Drs. H. Ahmad Marzuki, M.Pd.I', '']);
    rows.push(['', '', '', '', '', '', '', '', '', '', '', '', '', '', `NIP. ${systemSettings?.headmasterNip || '197605142000031002'}`, '']);

    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Rekap Siswa ${monthName}`);
    XLSX.writeFile(wb, `Rekap_Presensi_Siswa_${sName.replace(/\s+/g, '_')}_${monthName}_${selectedYear}.xlsx`);
  };

  // -------------------------------------------------------------
  // EXPORT EXCEL REKAP BULANAN GURU
  // -------------------------------------------------------------
  const exportTeacherRecapExcel = () => {
    const sName = systemSettings?.schoolName || 'MTs. Darul Huda';
    const monthName = getMonthNameIndonesian(selectedMonth);

    const rows: (string | number)[][] = [
      [sName.toUpperCase()],
      [`REKAPITULASI PRESENSI & KEDISIPLINAN PENDIDIK & TENAGA KEPENDIDIKAN`],
      [`BULAN: ${monthName.toUpperCase()} ${selectedYear} - SIKLUS WAKTU INDONESIA BARAT (WIB)`],
      [],
      [
        'No',
        'NIP / ID Pendidik',
        'Nama Guru & Gelar',
        'Tugas / Mata Pelajaran Diampu',
        'Tepat Waktu',
        'Terlambat',
        'Total Hari Hadir',
        'Hari Efektif KBM',
        'Akumulasi Jam Kerja (Jam)',
        'Rata-rata Masuk (WIB)',
        'Rata-rata Pulang (WIB)',
        '% Kedisiplinan',
        'Nomor WA Pribadi Guru',
        'Predikat Kinerja'
      ]
    ];

    teacherRecapData.forEach((row, idx) => {
      rows.push([
        idx + 1,
        row.teacher.nisnOrNip || '-',
        row.teacher.name,
        row.teacher.subjectOrPosition || 'Guru Pengampu',
        row.ontimeCount,
        row.lateCount,
        row.totalDaysPresent,
        row.totalEffectiveDays,
        `${row.dutyHours} Jam`,
        row.avgIn,
        row.avgOut,
        `${row.disciplineScore}%`,
        row.teacher.whatsappNumber || '-',
        row.performanceRating
      ]);
    });

    rows.push([]);
    rows.push(['', '', '', '', '', '', '', '', '', '', 'Mengetahui,', '']);
    rows.push(['', '', '', '', '', '', '', '', '', '', 'Kepala Madrasah,', '']);
    rows.push([]);
    rows.push([]);
    rows.push(['', '', '', '', '', '', '', '', '', '', systemSettings?.headmasterName || 'Drs. H. Ahmad Marzuki, M.Pd.I', '']);
    rows.push(['', '', '', '', '', '', '', '', '', '', `NIP. ${systemSettings?.headmasterNip || '197605142000031002'}`, '']);

    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Rekap Guru ${monthName}`);
    XLSX.writeFile(wb, `Rekap_Presensi_Guru_${sName.replace(/\s+/g, '_')}_${monthName}_${selectedYear}.xlsx`);
  };

  // Role Guard: Menu scan absensi & rekapitulasi hanya dapat diakses akun Admin dan Guru
  if (currentUser?.role === 'student') {
    return (
      <div className="max-w-xl mx-auto p-8 text-center bg-white rounded-3xl border border-slate-200 shadow-md space-y-4 my-12 animate-in zoom-in-95">
        <div className="w-16 h-16 bg-amber-100 text-amber-800 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <div>
          <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-black uppercase tracking-wider">
            Akses Terbatas: Khusus Guru & Admin
          </span>
          <h2 className="text-xl font-black text-slate-900 mt-2">
            Menu Scan Absensi Khusus Pendidik & Administrator
          </h2>
          <p className="text-xs text-slate-600 max-w-md mx-auto mt-2 leading-relaxed">
            Presensi santri dilakukan melalui pemindaian kartu barcode batang oleh tim pengawas atau guru piket madrasah. Kartu barcode Anda dapat dilihat dan dicetak melalui menu profil pengguna.
          </p>
        </div>
        <div className="pt-2">
          <button
            onClick={() => setActiveTab('student_home')}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer transition"
          >
            Kembali ke Beranda Ujian Santri
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* TOP HERO: School Branding & Live WIB Clock */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-emerald-300 border border-white/20 mb-3">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span>Sistem Presensi Barcode & Notifikasi WhatsApp</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              <ScanLine className="w-7 h-7 sm:w-8 sm:h-8 text-emerald-400" />
              <span>Presensi Digital {systemSettings?.schoolName || 'MTs. Darul Huda'}</span>
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100/90 max-w-2xl mt-2 leading-relaxed">
              Mendukung scan barcode masuk & pulang dengan <strong>scanner eksternal USB / Bluetooth</strong> maupun kamera, integrasi otomatis notifikasi ke WhatsApp wali murid & guru, serta rekapitulasi bulanan resmi.
            </p>
          </div>

          {/* Live WIB Clock Card */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 sm:p-5 flex flex-col items-center justify-center min-w-[240px] text-center shadow-inner">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-300 uppercase tracking-widest mb-1">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span>Waktu Indonesia Barat</span>
            </div>
            <div className="font-mono text-3xl sm:text-4xl font-black text-white tracking-wider">
              {liveWibTime} <span className="text-xs text-emerald-300 font-sans">WIB</span>
            </div>
            <div className="text-xs text-emerald-100 font-semibold mt-1">
              {getWibDateIndonesian(liveWibDate)}
            </div>
            <div className="text-[10px] text-emerald-300/80 mt-2 bg-black/20 px-2.5 py-0.5 rounded-full">
              Siklus Reset Harian: 00:00 WIB
            </div>
          </div>
        </div>

        {/* Sub-Tabs Navigation: Hanya ditampilkan untuk Admin. Akun Guru HANYA memiliki menu scan barcode masuk & pulang */}
        {isAdmin ? (
          <div className="flex flex-wrap items-center gap-2 mt-6 pt-6 border-t border-white/15 relative z-10">
            <button
              onClick={() => setActiveSubTab('scanner')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                activeSubTab === 'scanner'
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-900/40'
                  : 'bg-white/10 text-white/90 hover:bg-white/20'
              }`}
            >
              <ScanLine className="w-4 h-4" />
              <span>Scan Barcode Masuk & Pulang</span>
            </button>

            <button
              onClick={() => setActiveSubTab('barcode_lembaga')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                activeSubTab === 'barcode_lembaga'
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-900/40'
                  : 'bg-white/10 text-white/90 hover:bg-white/20'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Barcode Lembaga (Kelola & Cetak)</span>
              <span className="px-1.5 py-0.5 bg-teal-300 text-teal-950 rounded text-[9px] font-black uppercase tracking-wider">Admin</span>
            </button>

            <button
              onClick={() => setActiveSubTab('rekap_siswa')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                activeSubTab === 'rekap_siswa'
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-900/40'
                  : 'bg-white/10 text-white/90 hover:bg-white/20'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span>Rekap Bulanan Murid / Santri</span>
              <span className="px-1.5 py-0.5 bg-amber-300 text-amber-950 rounded text-[9px] font-black uppercase tracking-wider">Admin</span>
            </button>

            <button
              onClick={() => setActiveSubTab('rekap_guru')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                activeSubTab === 'rekap_guru'
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-900/40'
                  : 'bg-white/10 text-white/90 hover:bg-white/20'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Rekap Bulanan Guru & Tendik</span>
              <span className="px-1.5 py-0.5 bg-amber-300 text-amber-950 rounded text-[9px] font-black uppercase tracking-wider">Admin</span>
            </button>

            <button
              onClick={() => setActiveSubTab('id_cards')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                activeSubTab === 'id_cards'
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-900/40'
                  : 'bg-white/10 text-white/90 hover:bg-white/20'
              }`}
            >
              <Barcode className="w-4 h-4" />
              <span>Kartu Barcode Batang Santri & Guru</span>
              <span className="px-1.5 py-0.5 bg-amber-300 text-amber-950 rounded text-[9px] font-black uppercase tracking-wider">Admin</span>
            </button>

            <button
              onClick={() => setActiveSubTab('settings')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                activeSubTab === 'settings'
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-900/40'
                  : 'bg-white/10 text-white/90 hover:bg-white/20'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Aturan Jam & WA Gateway</span>
              <span className="px-1.5 py-0.5 bg-amber-300 text-amber-950 rounded text-[9px] font-black uppercase tracking-wider">Admin</span>
            </button>
          </div>
        ) : (
          <div className="mt-5 pt-4 border-t border-white/15 flex flex-wrap items-center justify-between gap-3 text-xs text-emerald-100 relative z-10">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="font-bold text-white">Menu Presensi Barcode: Scan Masuk & Pulang</span>
              <span className="text-[10px] text-emerald-200 bg-white/10 px-2 py-0.5 rounded-md font-semibold">Akun Pendidik</span>
            </div>
            <div className="text-[11px] text-emerald-200 font-mono">
              Waktu Indonesia Barat (WIB)
            </div>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* TAB 1: SCANNER BARCODE MASUK & PULANG                   */}
      {/* ======================================================== */}
      {activeSubTab === 'scanner' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Scanner Station (Cols 7) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Mode Switcher: Masuk vs Pulang */}
            <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-2">
              <button
                type="button"
                onClick={() => setScanMode('masuk')}
                className={`flex-1 py-3 px-4 rounded-xl font-black text-sm flex items-center justify-center gap-2.5 transition cursor-pointer ${
                  scanMode === 'masuk'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-300 animate-pulse"></div>
                <span>SCAN MASUK (CLOCK IN)</span>
              </button>

              <button
                type="button"
                onClick={() => setScanMode('pulang')}
                className={`flex-1 py-3 px-4 rounded-xl font-black text-sm flex items-center justify-center gap-2.5 transition cursor-pointer ${
                  scanMode === 'pulang'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="w-2.5 h-2.5 rounded-full bg-indigo-300 animate-pulse"></div>
                <span>SCAN PULANG (CLOCK OUT)</span>
              </button>
            </div>

            {/* DEDICATED NOTIFICATION: SUDAH ABSEN HARI INI (ANTI-SPAM) */}
            {alreadyScannedAlert && (
              <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 rounded-3xl p-5 text-white shadow-xl border-2 border-amber-300 animate-in slide-in-from-top-3 duration-200 space-y-3 relative overflow-hidden">
                <div className="flex items-start justify-between gap-4 relative z-10">
                  <div className="flex items-start gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-white text-amber-600 flex items-center justify-center shrink-0 shadow-md">
                      <ShieldCheck className="w-7 h-7" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-black/25 text-white border border-white/20">
                          STATUS: SUDAH ABSEN HARI INI
                        </span>
                        <span className="text-xs text-amber-100 font-mono font-bold">
                          Anti-Spam & Duplikasi Aktif
                        </span>
                      </div>
                      <h3 className="text-base sm:text-lg font-black text-white mt-1">
                        {alreadyScannedAlert.user.name} Sudah Melakukan Presensi {alreadyScannedAlert.sessionType === 'masuk' ? 'MASUK' : 'PULANG'}
                      </h3>
                      <p className="text-xs text-amber-50 leading-relaxed mt-0.5 max-w-xl">
                        Presensi Anda hari ini telah tersimpan resmi pada pukul <strong>{alreadyScannedAlert.existingTime} WIB</strong>. Data Anda sudah tercatat di sistem madrasah, <strong>kartu tidak perlu di-scan berulang kali</strong>.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setAlreadyScannedAlert(null)}
                    className="p-2 bg-black/20 hover:bg-black/35 rounded-xl text-white transition cursor-pointer shrink-0"
                    title="Tutup Notifikasi"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="bg-black/20 backdrop-blur-xs rounded-2xl p-3 flex flex-wrap items-center justify-between gap-2 text-xs text-amber-100 relative z-10">
                  <div className="flex items-center gap-2">
                    <span>Identitas: <strong>{alreadyScannedAlert.user.role === 'teacher' ? 'Dewan Guru' : `Kelas ${alreadyScannedAlert.user.className || '-'}`}</strong></span>
                    <span>•</span>
                    <span>NISN/NIP: <strong>{alreadyScannedAlert.user.nisnOrNip}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 bg-white/20 rounded-lg font-bold text-[11px] text-white">
                      Status: {alreadyScannedAlert.record.status === 'terlambat' ? '⚠️ Terlambat' : '✅ Tepat Waktu'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setAlreadyScannedAlert(null)}
                      className="px-3 py-1 bg-white hover:bg-amber-100 text-amber-950 rounded-lg text-xs font-black transition cursor-pointer shadow-xs"
                    >
                      Mengerti (Tutup)
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Anti-Spam Rapid Alert Notice */}
            {spamNotice && (
              <div className="p-3 bg-amber-100/90 text-amber-950 border border-amber-300 rounded-2xl text-xs flex items-center justify-between gap-2 shadow-xs animate-in fade-in">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
                  <span className="font-semibold">{spamNotice}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSpamNotice(null)}
                  className="p-1 text-amber-700 hover:text-amber-950 font-bold cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Alert Banner: Pemberitahuan Otomatis WA 30 Menit Belum Absen */}
            {isAdmin ? (
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-3xl p-4 shadow-sm space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md">
                      <BellRing className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs font-black text-amber-950 uppercase tracking-tight">
                          Notifikasi Otomatis WA: Belum Absen (30 Menit)
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                          (scanMode === 'masuk' ? isPastClockInReminderTime : isPastClockOutReminderTime)
                            ? 'bg-rose-100 text-rose-800 border border-rose-300 animate-pulse'
                            : 'bg-amber-200 text-amber-900'
                        }`}>
                          {(scanMode === 'masuk' ? isPastClockInReminderTime : isPastClockOutReminderTime) ? 'Waktu Pengingat Aktif' : 'Menunggu Jadwal'}
                        </span>
                      </div>
                      <p className="text-[11px] text-amber-800 mt-0.5">
                        {scanMode === 'masuk' ? (
                          <>
                            Batas Masuk: <strong>{attendanceSettings.clockInLate || '07:15'} WIB</strong> • Jadwal Pengingat: <strong>{clockInReminderScheduledTime} WIB</strong> ({unclockedInUsers.length} belum absen masuk)
                          </>
                        ) : (
                          <>
                            Jam Pulang: <strong>{attendanceSettings.clockOutStart || '13:30'} WIB</strong> • Jadwal Pengingat: <strong>{clockOutReminderScheduledTime} WIB</strong> ({unclockedOutUsers.length} belum absen pulang)
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setUnclockedModalTab(scanMode);
                        setShowUnclockedModal(true);
                      }}
                      className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition shadow-xs hover:scale-[1.02]"
                    >
                      <Bell className="w-4 h-4" />
                      <span>Lihat & Kirim WA ({scanMode === 'masuk' ? unclockedInUsers.length : unclockedOutUsers.length})</span>
                    </button>
                  </div>
                </div>

                {unclockedAlertBannerResult && (
                  <div className="p-2.5 bg-emerald-100 text-emerald-950 border border-emerald-300 rounded-xl text-xs flex items-center justify-between animate-in fade-in">
                    <span>{unclockedAlertBannerResult}</span>
                    <button 
                      type="button"
                      onClick={() => setUnclockedAlertBannerResult(null)} 
                      className="text-emerald-700 hover:text-emerald-950 font-bold p-1 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Guru View: Peringatan jika akun guru yang sedang login belum absen lewat 30 menit */
              <>
                {currentTeacherUnclockedIn && isPastClockInReminderTime && (
                  <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-2xl flex items-center gap-3 text-xs text-rose-950 animate-in fade-in">
                    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                    <div>
                      <div className="font-bold text-rose-900">Peringatan: Belum Absen Masuk Hari Ini</div>
                      <div className="text-[11px] text-rose-700 mt-0.5">
                        Waktu telah melewati 30 menit dari batas jam masuk ({attendanceSettings.clockInLate || '07:15'} WIB). Silakan scan kartu atau Barcode Lembaga untuk mencatat presensi masuk.
                      </div>
                    </div>
                  </div>
                )}
                {currentTeacherUnclockedOut && isPastClockOutReminderTime && (
                  <div className="p-4 bg-indigo-50 border-2 border-indigo-300 rounded-2xl flex items-center gap-3 text-xs text-indigo-950 animate-in fade-in">
                    <Bell className="w-5 h-5 text-indigo-600 shrink-0" />
                    <div>
                      <div className="font-bold text-indigo-900">Pengingat: Belum Absen Pulang Hari Ini</div>
                      <div className="text-[11px] text-indigo-700 mt-0.5">
                        Waktu telah melewati 30 menit dari jam kepulangan ({attendanceSettings.clockOutStart || '13:30'} WIB). Silakan scan kartu atau Barcode Lembaga sebelum meninggalkan madrasah.
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Mobile Camera Barcode Scanner Banner (Android & Apple iOS) */}
            <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-slate-900 rounded-3xl p-5 text-white shadow-md space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/20 text-white flex items-center gap-1">
                      <Smartphone className="w-3 h-3" />
                      <span>Android</span>
                      <span>•</span>
                      <Apple className="w-3 h-3" />
                      <span>Apple iOS</span>
                    </span>
                    <span className="text-[10px] text-emerald-200 font-bold">Kamera HP Universal</span>
                  </div>
                  <h3 className="text-base font-black text-white">
                    Pindai Barcode via Kamera HP (Android & iPhone)
                  </h3>
                  <p className="text-xs text-emerald-100 max-w-md leading-relaxed">
                    Arahkan kamera smartphone ke kartu barcode santri/guru, atau scan <strong>Barcode Lembaga</strong> langsung dari HP Anda.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={openMobileScanner}
                  className="px-5 py-3 bg-white hover:bg-emerald-50 text-emerald-900 font-black text-xs rounded-2xl flex items-center justify-center gap-2 cursor-pointer transition shadow-lg shrink-0 group hover:scale-[1.02] active:scale-95"
                >
                  <Camera className="w-4 h-4 text-emerald-700 group-hover:rotate-12 transition" />
                  <span>Buka Kamera HP Sekarang</span>
                </button>
              </div>
            </div>

            {/* Quick Action: Presensi Guru via Barcode Lembaga */}
            <div className="bg-teal-50/90 border border-teal-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="w-10 h-10 rounded-xl bg-teal-700 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-black text-teal-950 flex items-center gap-2">
                    <span>Barcode Lembaga (Presensi Guru)</span>
                    <span className="px-1.5 py-0.2 rounded bg-teal-200/80 text-teal-900 text-[9px] font-black uppercase">
                      Mandiri
                    </span>
                  </div>
                  <div className="text-[11px] text-teal-800">
                    Guru dapat presensi masuk/pulang lewat Barcode Lembaga yang terpasang di madrasah
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setActiveSubTab('barcode_lembaga')}
                    className="flex-1 sm:flex-none px-3 py-2 bg-white hover:bg-teal-100/50 text-teal-900 border border-teal-300 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    Lihat & Cetak Poster
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => processBarcode(INSTITUTION_BARCODE_DEFAULT, 'camera_scanner')}
                  className="flex-1 sm:flex-none px-3.5 py-2 bg-teal-800 hover:bg-teal-900 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
                  title="Presensi mandiri untuk akun yang sedang login saat ini"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Absen Akun Saya ({currentUser?.role === 'teacher' ? 'Guru' : 'Admin'})</span>
                </button>
              </div>
            </div>

            {/* Hardware Scanner Wedge & Keyboard Form */}
            <div className="bg-white rounded-3xl border-2 border-emerald-300 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping"></span>
                  <span className="text-xs font-black text-emerald-950 uppercase tracking-wider">
                    Scanner Eksternal Siap (USB / Bluetooth Auto-Detect)
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 font-semibold bg-slate-100 px-2.5 py-1 rounded-lg">
                  Ketik manual atau scan gun
                </span>
              </div>

              {/* Input for Barcode Scanner Gun */}
              <form onSubmit={handleManualScanSubmit} className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  Arahkan Scanner Barcode ke Kartu atau Ketik NISN / NIP:
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-3 text-slate-400">
                    <Keyboard className="w-5 h-5 text-emerald-600" />
                  </div>
                  <input
                    ref={scannerInputRef}
                    type="text"
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    placeholder="Scan barcode kartu atau ketik NISN / NIP lalu tekan Enter..."
                    className="w-full pl-11 pr-24 py-3.5 bg-slate-50 border-2 border-slate-200 focus:border-emerald-500 focus:bg-white rounded-2xl text-sm font-mono font-bold text-slate-900 transition focus:outline-hidden"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="absolute right-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl cursor-pointer transition shadow-xs"
                  >
                    Proses
                  </button>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>*Scanner hardware (gun) otomatis mengirim tombol Enter setelah membaca barcode.</span>
                  <span className="font-bold text-emerald-700">Mode: {scanMode === 'masuk' ? 'Presensi Masuk' : 'Presensi Pulang'}</span>
                </div>
              </form>

              {/* Scan Result Feedback Card */}
              {lastScannedResult && (
                <div className={`p-4 rounded-2xl border-2 animate-in zoom-in-95 duration-150 ${
                  (lastScannedResult.alreadyClocked || lastScannedResult.isDuplicate)
                    ? 'bg-amber-50/95 border-amber-400 text-amber-950 shadow-sm'
                    : lastScannedResult.success 
                      ? 'bg-emerald-50/90 border-emerald-400 text-emerald-950 shadow-sm'
                      : 'bg-rose-50 border-rose-300 text-rose-950'
                }`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      {(lastScannedResult.alreadyClocked || lastScannedResult.isDuplicate) ? (
                        <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md">
                          <ShieldCheck className="w-6 h-6" />
                        </div>
                      ) : lastScannedResult.success ? (
                        <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md">
                          <CheckCircle2 className="w-6 h-6" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-md">
                          <AlertTriangle className="w-6 h-6" />
                        </div>
                      )}

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          {(lastScannedResult.alreadyClocked || lastScannedResult.isDuplicate) ? (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-200 text-amber-950 border border-amber-300">
                              Sudah Absen Hari Ini (Tidak Perlu Scan Ulang)
                            </span>
                          ) : lastScannedResult.success ? (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-200 text-emerald-950 border border-emerald-300">
                              Presensi Berhasil Dicatat
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-rose-200 text-rose-950 border border-rose-300">
                              Barcode Tidak Terdaftar
                            </span>
                          )}
                        </div>

                        <div className="font-black text-sm">{lastScannedResult.message}</div>

                        {lastScannedResult.user && (
                          <div className="text-xs text-slate-700 mt-1 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span><strong>Nama:</strong> {lastScannedResult.user.name} ({lastScannedResult.user.role === 'teacher' ? 'Dewan Guru' : `Kelas ${lastScannedResult.user.className || '-'}`})</span>
                              <span>•</span>
                              <span><strong>ID/NISN:</strong> {lastScannedResult.user.nisnOrNip}</span>
                              <span>•</span>
                              <span><strong>Waktu:</strong> {lastScannedResult.existingTime || lastScannedResult.time} WIB</span>
                            </div>

                            {(lastScannedResult.alreadyClocked || lastScannedResult.isDuplicate) && (
                              <div className="p-2 bg-amber-100/70 border border-amber-300 rounded-xl text-[11px] text-amber-900">
                                ℹ️ <strong>Catatan Anti-Spam:</strong> Presensi {lastScannedResult.sessionType || scanMode} telah tersimpan sebelumnya. Anda tidak perlu mengulang scan barcode.
                              </div>
                            )}

                            {lastScannedResult.user.whatsappNumber && (
                              <div className="flex items-center gap-1.5 text-emerald-800 font-semibold pt-0.5">
                                <Check className="w-3.5 h-3.5" />
                                <span>WA Terdaftar: {lastScannedResult.user.whatsappNumber} ({lastScannedResult.user.role === 'student' ? 'Wali Santri' : 'Pribadi Guru'})</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {lastScannedResult.waUrl && (
                      <a
                        href={lastScannedResult.waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm shrink-0"
                        title="Buka notifikasi WhatsApp langsung"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Kirim WA</span>
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Demo Scan Buttons for Testing (Khusus Akun Admin untuk Simulasi) */}
            {isAdmin && (
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-700 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>Uji Cepat Presensi (Simulasi Scan Admin)</span>
                  </div>
                  <span className="text-[10px] text-slate-400">Database Siswa & Guru Aktif</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {users.slice(0, 6).map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => processBarcode(u.barcode || u.nisnOrNip, 'manual_entry')}
                      className="p-2.5 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 text-left transition flex items-center justify-between group cursor-pointer"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="text-xs font-bold text-slate-900 group-hover:text-emerald-800 truncate">
                          {u.name}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {u.role === 'teacher' ? 'Guru' : 'Siswa'} • {u.nisnOrNip}
                        </div>
                      </div>
                      <span className="px-2 py-1 bg-slate-100 group-hover:bg-emerald-600 group-hover:text-white rounded-lg text-[10px] font-bold transition">
                        Scan
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* Right Column: Live Feed Today's Attendance (Cols 5) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Quick Stats Today */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-4 bg-white rounded-2xl border border-slate-200 text-center shadow-xs">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Masuk Hari Ini</div>
                <div className="text-2xl font-black text-emerald-600 mt-1">{todayMasukCount}</div>
                <div className="text-[10px] text-emerald-700 mt-0.5">Santri & Guru</div>
              </div>

              <div className="p-4 bg-white rounded-2xl border border-slate-200 text-center shadow-xs">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pulang Hari Ini</div>
                <div className="text-2xl font-black text-indigo-600 mt-1">{todayPulangCount}</div>
                <div className="text-[10px] text-indigo-700 mt-0.5">Selesai KBM</div>
              </div>

              <div className="p-4 bg-white rounded-2xl border border-slate-200 text-center shadow-xs">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Terlambat</div>
                <div className="text-2xl font-black text-amber-600 mt-1">{todayLateCount}</div>
                <div className="text-[10px] text-amber-700 mt-0.5">&gt; {attendanceSettings.clockInLate} WIB</div>
              </div>
            </div>

            {/* Today's Log Feed */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-5 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                  <h3 className="font-black text-xs text-slate-900">
                    Aktivitas Presensi Hari Ini ({todayWib} WIB)
                  </h3>
                </div>
                {currentUser?.role === 'admin' && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Reset seluruh riwayat presensi hari ini untuk simulasi baru?')) {
                        resetTodayAttendanceWib();
                      }
                    }}
                    className="text-[10px] font-bold text-rose-600 hover:text-rose-800 transition cursor-pointer"
                  >
                    Reset Hari Ini
                  </button>
                )}
              </div>

              <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                {todayRecords.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    Belum ada presensi yang tercatat hari ini ({todayWib} WIB).
                  </div>
                ) : (
                  todayRecords.map((rec) => (
                    <div 
                      key={rec.id}
                      className="p-3 bg-slate-50 hover:bg-emerald-50/40 rounded-xl border border-slate-200 text-xs flex items-center justify-between transition"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900 truncate">{rec.userName}</span>
                          <span className={`px-1.5 py-0.2 rounded-md text-[9px] font-bold uppercase ${
                            rec.userRole === 'teacher' ? 'bg-indigo-100 text-indigo-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {rec.userRole === 'teacher' ? 'Guru' : 'Siswa'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          {rec.className || rec.subjectOrPosition || rec.nisnOrNip}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1">
                          {rec.clockInTime && <span>Masuk: <strong className="text-emerald-700">{rec.clockInTime} WIB</strong></span>}
                          {rec.clockOutTime && <span>• Pulang: <strong className="text-indigo-700">{rec.clockOutTime} WIB</strong></span>}
                        </div>
                      </div>

                      <div className="text-right shrink-0 space-y-1">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                          rec.status === 'terlambat' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {rec.status === 'terlambat' ? 'Terlambat' : 'Tepat Waktu'}
                        </span>

                        {rec.whatsappTarget && (
                          <div className="text-[10px] text-emerald-600 font-bold flex items-center justify-end gap-1">
                            <Check className="w-3 h-3" />
                            <span>WA Terkirim</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* TAB: BARCODE LEMBAGA (PRESENSI MANDIRI GURU & TENDIK)    */}
      {/* ======================================================== */}
      {isAdmin && activeSubTab === 'barcode_lembaga' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-teal-800 via-emerald-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1 bg-white/20 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-wider rounded-full flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-teal-300" />
                    <span>Barcode Khusus Lembaga</span>
                  </span>
                  <span className="px-3 py-1 bg-teal-400/20 text-teal-200 border border-teal-400/30 text-[10px] font-extrabold rounded-full flex items-center gap-1">
                    <Smartphone className="w-3 h-3" />
                    <span>Android</span>
                    <span>•</span>
                    <Apple className="w-3 h-3" />
                    <span>Apple iOS</span>
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white">
                  Barcode Lembaga MTs. Darul Huda (Presensi Guru)
                </h2>
                <p className="text-xs sm:text-sm text-teal-100 max-w-2xl leading-relaxed">
                  Barcode kotak resmi lembaga untuk presensi kedatangan (masuk) dan kepulangan guru / ustaz-ustadzah. Cukup dicetak dan ditempelkan pada meja piket atau pintu masuk kantor madrasah.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowPrintInstitutionModal(true)}
                  className="px-4 py-2.5 bg-white hover:bg-teal-50 text-teal-950 font-black text-xs rounded-xl flex items-center gap-2 cursor-pointer transition shadow-md hover:scale-[1.02] active:scale-95"
                >
                  <Printer className="w-4 h-4 text-teal-700" />
                  <span>Cetak Poster / Standee</span>
                </button>
                <button
                  type="button"
                  onClick={openMobileScanner}
                  className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 cursor-pointer transition shadow-md"
                >
                  <Camera className="w-4 h-4" />
                  <span>Buka Kamera HP</span>
                </button>
              </div>
            </div>
          </div>

          {/* Main Grid: Standee Display + Instant Attendance + Guide */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left: Interactive Institution Standee Placard (Cols 6) */}
            <div className="lg:col-span-6 bg-white rounded-3xl border-2 border-teal-200 p-6 sm:p-8 shadow-md flex flex-col items-center text-center space-y-5 relative">
              {/* Kop Lembaga */}
              <div className="border-b-2 border-slate-900 pb-3 w-full">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  KEMENTERIAN AGAMA REPUBLIK INDONESIA
                </div>
                <div className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-tight mt-0.5">
                  {systemSettings?.schoolName || 'MTs. Darul Huda'}
                </div>
                <div className="text-[11px] text-teal-800 font-extrabold uppercase mt-0.5">
                  POS PRESENSI DIGITAL GURU & TENAGA KEPENDIDIKAN
                </div>
              </div>

              {/* Square QR Barcode */}
              <div className="p-4 bg-slate-50 rounded-3xl border-2 border-slate-200 shadow-inner flex flex-col items-center">
                <SquareBarcode
                  value={INSTITUTION_BARCODE_DEFAULT}
                  size={200}
                  label={INSTITUTION_BARCODE_DEFAULT}
                  showCodeText={true}
                />
                <span className="text-[11px] font-black text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full mt-3 border border-emerald-300">
                  KODE BARCODE RESMI LEMBAGA
                </span>
              </div>

              {/* Instructions on Standee */}
              <div className="space-y-1.5 max-w-sm">
                <p className="text-xs font-bold text-slate-800 leading-snug">
                  Arahkan Kamera HP (Android & Apple iOS) atau Scanner Barcode ke Kotak Barcode di Atas
                </p>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Presensi otomatis tercatat sesuai Waktu Indonesia Barat (WIB) & notifikasi terkirim otomatis ke WhatsApp pribadi guru.
                </p>
              </div>

              {/* Action Buttons for Placard */}
              <div className="pt-2 flex flex-wrap items-center justify-center gap-2 w-full">
                <button
                  type="button"
                  onClick={() => setShowPrintInstitutionModal(true)}
                  className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak Standee Meja / Poster Dinding</span>
                </button>
                <button
                  type="button"
                  onClick={openMobileScanner}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-xs"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Pindai Barcode via Kamera HP</span>
                </button>
              </div>
            </div>

            {/* Right: Quick Attendance for Currently Logged-in Teacher / Admin & Guide (Cols 6) */}
            <div className="lg:col-span-6 space-y-6">
              
              {/* Quick Self-Attendance Box */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-teal-600" />
                    <div>
                      <h3 className="font-black text-sm text-slate-900">
                        Presensi Cepat Akun Saya ({currentUser?.role === 'teacher' ? 'Guru' : 'Admin'})
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Presensi mandiri secara instan menggunakan Barcode Lembaga
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-black text-teal-800 bg-teal-100 px-2 py-0.5 rounded-full uppercase">
                    {getWibTime()} WIB
                  </span>
                </div>

                {/* Profile Snapshot */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/90 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-teal-700 text-white flex items-center justify-center font-black text-lg shrink-0 shadow-xs">
                    {currentUser?.name?.charAt(0) || 'G'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-black text-sm text-slate-900 truncate">{currentUser?.name}</div>
                    <div className="text-xs text-slate-500 font-mono">
                      NIP/ID: {currentUser?.nisnOrNip || '-'}
                    </div>
                    <div className="text-[11px] text-teal-800 font-bold truncate">
                      {currentUser?.subjectOrPosition || (currentUser?.role === 'teacher' ? 'Dewan Guru' : 'Administrator')}
                    </div>
                  </div>
                </div>

                {/* Action Buttons: Masuk & Pulang */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setScanMode('masuk');
                      processBarcode(INSTITUTION_BARCODE_DEFAULT, 'camera_scanner');
                    }}
                    className="p-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black flex flex-col items-center justify-center gap-1 cursor-pointer transition shadow-md hover:scale-[1.02] active:scale-95"
                  >
                    <div className="flex items-center gap-1.5">
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>PRESENSI MASUK</span>
                    </div>
                    <span className="text-[10px] text-emerald-200 font-normal">
                      Jam Kerja: {attendanceSettings.clockInStart} - {attendanceSettings.clockInLate} WIB
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setScanMode('pulang');
                      processBarcode(INSTITUTION_BARCODE_DEFAULT, 'camera_scanner');
                    }}
                    className="p-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black flex flex-col items-center justify-center gap-1 cursor-pointer transition shadow-md hover:scale-[1.02] active:scale-95"
                  >
                    <div className="flex items-center gap-1.5">
                      <ArrowRight className="w-4 h-4 stroke-[3]" />
                      <span>PRESENSI PULANG</span>
                    </div>
                    <span className="text-[10px] text-indigo-200 font-normal">
                      Jam Kepulangan: Mulai {attendanceSettings.clockOutStart} WIB
                    </span>
                  </button>
                </div>

                {/* WhatsApp Info */}
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-[11px] text-emerald-900 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div className="min-w-0">
                    <span className="font-bold">Notifikasi WA Pribadi Guru: </span>
                    <span className="font-mono">{currentUser?.whatsappNumber || 'Belum diisi di profil'}</span>
                    {!currentUser?.whatsappNumber && (
                      <span className="text-amber-700 block font-bold mt-0.5">
                        *Lengkapi nomor WA Anda di menu profil kanan atas agar notifikasi masuk otomatis.
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* 5-Step Mobile Attendance Guide */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <Smartphone className="w-4 h-4 text-emerald-600" />
                  <h3 className="font-black text-xs text-slate-900 uppercase tracking-wider">
                    Tata Cara Presensi Guru Menggunakan HP (Android & Apple iOS)
                  </h3>
                </div>

                <div className="space-y-3 text-xs text-slate-700">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-black text-xs flex items-center justify-center shrink-0">
                      1
                    </div>
                    <div>
                      <strong className="text-slate-900">Buka Aplikasi di HP:</strong> Buka tautan CBT MTs. Darul Huda melalui browser gawai Anda (Chrome di Android atau Safari di iPhone/iPad Apple).
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-black text-xs flex items-center justify-center shrink-0">
                      2
                    </div>
                    <div>
                      <strong className="text-slate-900">Login Akun Guru:</strong> Masuk menggunakan Username dan Password guru masing-masing.
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-black text-xs flex items-center justify-center shrink-0">
                      3
                    </div>
                    <div>
                      <strong className="text-slate-900">Buka Menu Absensi:</strong> Ketuk tombol garis 3 di pojok kiri atas, pilih <strong>"Absensi Barcode & Rekap"</strong>.
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-black text-xs flex items-center justify-center shrink-0">
                      4
                    </div>
                    <div>
                      <strong className="text-slate-900">Nyalakan Kamera HP:</strong> Ketuk tombol hijau <strong>"Buka Kamera HP Sekarang"</strong> dan izinkan akses kamera jika browser meminta izin.
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-black text-xs flex items-center justify-center shrink-0">
                      5
                    </div>
                    <div>
                      <strong className="text-slate-900">Arahkan ke Barcode Lembaga:</strong> Arahkan kamera ke Barcode Lembaga yang tertempel di madrasah. Suara beep akan berbunyi dan notifikasi WhatsApp terkirim seketika!
                    </div>
                  </div>
                </div>
              </div>

            </div>

          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: REKAPITULASI BULANAN SISWA / MURID (Format Siswa) */}
      {/* ======================================================== */}
      {isAdmin && activeSubTab === 'rekap_siswa' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-6">
          
          {/* Header Controls: Filters & Export */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 mb-1">
                <span>Format Khusus Santri / Murid</span>
              </div>
              <h2 className="text-xl font-black text-slate-900">
                Rekapitulasi Presensi Murid Bulanan
              </h2>
              <p className="text-xs text-slate-500">
                Format resmi kehadiran santri, nomor kontak wali murid & persentase kedisiplinan per rombel.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Bulan Filter */}
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 cursor-pointer"
              >
                {Array.from({ length: 12 }).map((_, i) => (
                  <option key={i} value={i}>{getMonthNameIndonesian(i)} {selectedYear}</option>
                ))}
              </select>

              {/* Rombel Filter */}
              <select
                value={selectedClassFilter}
                onChange={(e) => setSelectedClassFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 cursor-pointer"
              >
                <option value="all">Semua Rombel / Kelas</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              {/* Export Buttons */}
              <button
                type="button"
                onClick={exportStudentRecapExcel}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Ekspor Excel (.xlsx)</span>
              </button>

              <button
                type="button"
                onClick={() => setShowPrintModal('siswa')}
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak / PDF Resmi</span>
              </button>
            </div>
          </div>

          {/* Summary Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl">
              <div className="text-[10px] font-bold text-emerald-800 uppercase">Total Santri</div>
              <div className="text-2xl font-black text-emerald-950 mt-1">{filteredStudents.length} Santri</div>
              <div className="text-[11px] text-emerald-700 mt-0.5">Terdaftar aktif</div>
            </div>

            <div className="p-4 bg-teal-50/70 border border-teal-200 rounded-2xl">
              <div className="text-[10px] font-bold text-teal-800 uppercase">Hari Efektif KBM</div>
              <div className="text-2xl font-black text-teal-950 mt-1">22 Hari</div>
              <div className="text-[11px] text-teal-700 mt-0.5">Bulan {getMonthNameIndonesian(selectedMonth)}</div>
            </div>

            <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-2xl">
              <div className="text-[10px] font-bold text-indigo-800 uppercase">Rata-rata Kehadiran</div>
              <div className="text-2xl font-black text-indigo-950 mt-1">
                {studentRecapData.length > 0 
                  ? Math.round(studentRecapData.reduce((acc, c) => acc + c.percentage, 0) / studentRecapData.length)
                  : 0}%
              </div>
              <div className="text-[11px] text-indigo-700 mt-0.5">Tingkat ketertiban santri</div>
            </div>

            <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl">
              <div className="text-[10px] font-bold text-amber-800 uppercase">Kontak WA Wali Murid</div>
              <div className="text-2xl font-black text-amber-950 mt-1">
                {studentRecapData.filter(s => s.student.whatsappNumber).length} / {studentRecapData.length}
              </div>
              <div className="text-[11px] text-amber-700 mt-0.5">Terhubung notifikasi</div>
            </div>
          </div>

          {/* Student Recap Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-2xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/80 text-slate-700 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3 text-center">No</th>
                  <th className="py-3 px-4">NISN</th>
                  <th className="py-3 px-4">Nama Siswa / Santri</th>
                  <th className="py-3 px-3">Kelas</th>
                  <th className="py-3 px-2 text-center text-emerald-700">Hadir (H)</th>
                  <th className="py-3 px-2 text-center text-amber-700">Terlambat (T)</th>
                  <th className="py-3 px-2 text-center text-blue-700">Izin (I)</th>
                  <th className="py-3 px-2 text-center text-purple-700">Sakit (S)</th>
                  <th className="py-3 px-2 text-center text-rose-700">Alpa (A)</th>
                  <th className="py-3 px-3 text-center font-black">% Kehadiran</th>
                  <th className="py-3 px-3">Rata-rata Masuk</th>
                  <th className="py-3 px-4">WA Wali Murid</th>
                  <th className="py-3 px-3 text-center">Status Disiplin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {studentRecapData.map((row, idx) => (
                  <tr key={row.student.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-3 text-center font-bold text-slate-400">{idx + 1}</td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">{row.student.nisnOrNip}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{row.student.name}</td>
                    <td className="py-3 px-3 text-slate-600">{row.student.className || '-'}</td>
                    <td className="py-3 px-2 text-center font-bold text-emerald-700">{row.hadirCount}</td>
                    <td className="py-3 px-2 text-center font-bold text-amber-700">{row.terlambatCount}</td>
                    <td className="py-3 px-2 text-center text-slate-600">{row.izinCount}</td>
                    <td className="py-3 px-2 text-center text-slate-600">{row.sakitCount}</td>
                    <td className="py-3 px-2 text-center text-rose-600">{row.alpaCount}</td>
                    <td className="py-3 px-3 text-center font-black text-slate-900">
                      <span className={`px-2 py-0.5 rounded-full ${
                        row.percentage >= 90 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {row.percentage}%
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-600">{row.avgClockIn}</td>
                    <td className="py-3 px-4 font-mono text-slate-700">
                      {row.student.whatsappNumber ? (
                        <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                          <Phone className="w-3 h-3" />
                          <span>{row.student.whatsappNumber}</span>
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Belum diisi</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-800">
                        {row.disciplineStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: REKAPITULASI BULANAN GURU & TENDIK (Format Guru)   */}
      {/* ======================================================== */}
      {isAdmin && activeSubTab === 'rekap_guru' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-6">
          
          {/* Header Controls: Filters & Export */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 mb-1">
                <span>Format Khusus Guru & Tenaga Kependidikan</span>
              </div>
              <h2 className="text-xl font-black text-slate-900">
                Rekapitulasi Presensi & Kinerja Guru Bulanan
              </h2>
              <p className="text-xs text-slate-500">
                Format kedisiplinan pendidik, jam tiba/pulang kerja, akumulasi jam bertugas & kontak WA pribadi.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Bulan Filter */}
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 cursor-pointer"
              >
                {Array.from({ length: 12 }).map((_, i) => (
                  <option key={i} value={i}>{getMonthNameIndonesian(i)} {selectedYear}</option>
                ))}
              </select>

              {/* Export Buttons */}
              <button
                type="button"
                onClick={exportTeacherRecapExcel}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Ekspor Excel Guru (.xlsx)</span>
              </button>

              <button
                type="button"
                onClick={() => setShowPrintModal('guru')}
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak / PDF Resmi</span>
              </button>
            </div>
          </div>

          {/* Summary Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-2xl">
              <div className="text-[10px] font-bold text-indigo-800 uppercase">Total Tenaga Pendidik</div>
              <div className="text-2xl font-black text-indigo-950 mt-1">{filteredTeachers.length} Guru</div>
              <div className="text-[11px] text-indigo-700 mt-0.5">Pendidik & Tenaga Kependidikan</div>
            </div>

            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl">
              <div className="text-[10px] font-bold text-emerald-800 uppercase">Ketepatan Waktu</div>
              <div className="text-2xl font-black text-emerald-950 mt-1">
                {teacherRecapData.reduce((acc, c) => acc + c.ontimeCount, 0)} Sesi
              </div>
              <div className="text-[11px] text-emerald-700 mt-0.5">Hadir sebelum jam toleransi</div>
            </div>

            <div className="p-4 bg-teal-50/70 border border-teal-200 rounded-2xl">
              <div className="text-[10px] font-bold text-teal-800 uppercase">Rata-rata Disiplin</div>
              <div className="text-2xl font-black text-teal-950 mt-1">
                {teacherRecapData.length > 0 
                  ? Math.round(teacherRecapData.reduce((acc, c) => acc + c.disciplineScore, 0) / teacherRecapData.length)
                  : 0}%
              </div>
              <div className="text-[11px] text-teal-700 mt-0.5">Sesuai standar Kemenag</div>
            </div>

            <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-2xl">
              <div className="text-[10px] font-bold text-purple-800 uppercase">Nomor WA Pribadi</div>
              <div className="text-2xl font-black text-purple-950 mt-1">
                {teacherRecapData.filter(t => t.teacher.whatsappNumber).length} / {teacherRecapData.length}
              </div>
              <div className="text-[11px] text-purple-700 mt-0.5">Terhubung notifikasi</div>
            </div>
          </div>

          {/* Teacher Recap Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-2xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/80 text-slate-700 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3 text-center">No</th>
                  <th className="py-3 px-4">NIP / ID Pendidik</th>
                  <th className="py-3 px-4">Nama Guru & Gelar</th>
                  <th className="py-3 px-3">Tugas / Mapel Diampu</th>
                  <th className="py-3 px-2 text-center text-emerald-700">Tepat Waktu</th>
                  <th className="py-3 px-2 text-center text-amber-700">Terlambat</th>
                  <th className="py-3 px-2 text-center font-bold">Total Hari</th>
                  <th className="py-3 px-3 text-center">Akumulasi Jam</th>
                  <th className="py-3 px-3">Rata-rata Masuk</th>
                  <th className="py-3 px-3">Rata-rata Pulang</th>
                  <th className="py-3 px-3 text-center font-black">% Disiplin</th>
                  <th className="py-3 px-4">WA Pribadi</th>
                  <th className="py-3 px-3 text-center">Predikat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {teacherRecapData.map((row, idx) => (
                  <tr key={row.teacher.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-3 text-center font-bold text-slate-400">{idx + 1}</td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">{row.teacher.nisnOrNip}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{row.teacher.name}</td>
                    <td className="py-3 px-3 text-slate-600">{row.teacher.subjectOrPosition || 'Guru Pengampu'}</td>
                    <td className="py-3 px-2 text-center font-bold text-emerald-700">{row.ontimeCount}</td>
                    <td className="py-3 px-2 text-center font-bold text-amber-700">{row.lateCount}</td>
                    <td className="py-3 px-2 text-center font-bold text-slate-900">{row.totalDaysPresent} Hari</td>
                    <td className="py-3 px-3 text-center font-semibold text-slate-700">{row.dutyHours} Jam</td>
                    <td className="py-3 px-3 text-slate-600">{row.avgIn}</td>
                    <td className="py-3 px-3 text-slate-600">{row.avgOut}</td>
                    <td className="py-3 px-3 text-center font-black text-slate-900">
                      <span className={`px-2 py-0.5 rounded-full ${
                        row.disciplineScore >= 90 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {row.disciplineScore}%
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-700">
                      {row.teacher.whatsappNumber ? (
                        <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                          <Phone className="w-3 h-3" />
                          <span>{row.teacher.whatsappNumber}</span>
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Belum diisi</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-100 text-indigo-800">
                        {row.performanceRating}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: CETAK KARTU BARCODE BATANG (KTA SANTRI & GURU)    */}
      {/* ======================================================== */}
      {isAdmin && activeSubTab === 'id_cards' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-6">
          {/* Header & Main Print Action */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded-full uppercase tracking-wider flex items-center gap-1">
                  <Barcode className="w-3.5 h-3.5" />
                  <span>Barcode Batang (1D Linear Code 128)</span>
                </span>
                <span className="text-xs text-slate-400 font-semibold">• Standar Resmi Madrasah</span>
              </div>
              <h2 className="text-xl font-black text-slate-900 mt-1">
                Cetak Kartu Barcode Batang Santri & Guru (KTA)
              </h2>
              <p className="text-xs text-slate-500">
                Pilih satu, beberapa, atau seluruh kartu yang ingin dicetak. Barcode dicetak dalam format garis batang (Code 128) beresolusi tinggi, tajam, dan mudah dipindai scanner eksternal maupun kamera.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {selectedCardUserIds.length > 0 && (
                <button
                  type="button"
                  onClick={clearSelectedCardUsers}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold cursor-pointer transition"
                >
                  Batal Pilih ({selectedCardUserIds.length})
                </button>
              )}
              <button
                type="button"
                onClick={handlePrintSelectedCards}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-md shadow-emerald-600/20 transition group"
              >
                <Printer className="w-4 h-4 group-hover:scale-110 transition" />
                <span>
                  {selectedCardUserIds.length > 0 
                    ? `Cetak ${selectedCardUserIds.length} Kartu Terpilih` 
                    : `Cetak Semua Kartu (${filteredCardUsers.length})`}
                </span>
              </button>
            </div>
          </div>

          {/* Filter & Selection Toolbar */}
          <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200 space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              {/* Search */}
              <div className="relative flex-1 min-w-[220px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Cari nama santri, guru, NISN, NIP..."
                  value={cardSearchQuery}
                  onChange={(e) => setCardSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Role Filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5" />
                  <span>Peran:</span>
                </span>
                <select
                  value={cardRoleFilter}
                  onChange={(e) => setCardRoleFilter(e.target.value as any)}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="all">Semua Peran ({users.length})</option>
                  <option value="student">Santri / Siswa ({users.filter(u => u.role === 'student').length})</option>
                  <option value="teacher">Guru & GTK ({users.filter(u => u.role === 'teacher' || u.role === 'admin').length})</option>
                </select>

                {/* Class Filter */}
                <select
                  value={cardClassFilter}
                  onChange={(e) => setCardClassFilter(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="all">Semua Rombel</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quick Multi-Select Buttons */}
            <div className="pt-2 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={selectAllFilteredCardUsers}
                  className="px-2.5 py-1 bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 rounded-lg font-bold flex items-center gap-1.5 cursor-pointer transition shadow-2xs"
                >
                  <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Pilih Semua Hasil Filter ({filteredCardUsers.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => selectOnlyRoleCards('student')}
                  className="px-2.5 py-1 bg-white hover:bg-teal-50 text-slate-700 hover:text-teal-800 border border-slate-200 rounded-lg font-bold cursor-pointer transition shadow-2xs"
                >
                  Pilih Semua Siswa
                </button>
                <button
                  type="button"
                  onClick={() => selectOnlyRoleCards('teacher')}
                  className="px-2.5 py-1 bg-white hover:bg-indigo-50 text-slate-700 hover:text-indigo-800 border border-slate-200 rounded-lg font-bold cursor-pointer transition shadow-2xs"
                >
                  Pilih Semua Guru
                </button>
                {selectedCardUserIds.length > 0 && (
                  <button
                    type="button"
                    onClick={clearSelectedCardUsers}
                    className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg font-bold cursor-pointer transition"
                  >
                    Kosongkan Pilihan
                  </button>
                )}
              </div>

              <div className="text-slate-500 font-semibold">
                Status: <strong className="text-emerald-700">{selectedCardUserIds.length}</strong> dari <strong>{filteredCardUsers.length}</strong> kartu terpilih
              </div>
            </div>
          </div>

          {/* Cards Grid */}
          {filteredCardUsers.length === 0 ? (
            <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <QrCode className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="font-bold text-sm">Tidak ada kartu yang sesuai dengan filter pencarian</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCardUsers.map((u) => {
                const isStd = u.role === 'student';
                const isSelected = selectedCardUserIds.includes(u.id);

                return (
                  <div 
                    key={u.id}
                    className={`rounded-3xl p-5 shadow-xs space-y-3 relative overflow-hidden transition-all duration-150 border-2 ${
                      isSelected 
                        ? 'bg-gradient-to-br from-emerald-50/50 to-white border-emerald-500 ring-4 ring-emerald-100 shadow-md' 
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {/* Top Row: Checkbox Selection + Brand + Role */}
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                      <button
                        type="button"
                        onClick={() => toggleSelectCardUser(u.id)}
                        className="flex items-center gap-2 cursor-pointer group text-left"
                        title={isSelected ? 'Batalkan pilihan kartu ini' : 'Pilih kartu ini untuk dicetak'}
                      >
                        <div className={`w-5 h-5 rounded-md flex items-center justify-center transition ${
                          isSelected 
                            ? 'bg-emerald-600 text-white' 
                            : 'border-2 border-slate-300 group-hover:border-emerald-500 bg-white'
                        }`}>
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                        <span className="font-bold text-xs text-slate-700">
                          {isSelected ? 'Terpilih' : 'Pilih Cetak'}
                        </span>
                      </button>

                      <div className="flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                          isStd ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                        }`}>
                          {isStd ? 'KTA Santri' : 'ID Pendidik'}
                        </span>
                      </div>
                    </div>

                    {/* School Identity */}
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-emerald-700 text-white flex items-center justify-center font-black text-[10px] shrink-0">
                        DH
                      </div>
                      <div className="min-w-0">
                        <div className="font-black text-[11px] text-slate-900 uppercase tracking-tight truncate">
                          {systemSettings?.schoolName || 'MTs. Darul Huda'}
                        </div>
                        <div className="text-[9px] text-slate-400">Presensi Digital Barcode Batang</div>
                      </div>
                    </div>

                    {/* User Info */}
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg text-white shrink-0 shadow-inner ${
                        isStd ? 'bg-gradient-to-tr from-emerald-600 to-teal-700' : 'bg-gradient-to-tr from-slate-800 to-indigo-900'
                      }`}>
                        {u.name.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-black text-xs text-slate-900 truncate" title={u.name}>{u.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {isStd ? `NISN: ${u.nisnOrNip}` : `NIP: ${u.nisnOrNip}`}
                        </div>
                        <div className="text-[10px] text-emerald-700 font-bold truncate">
                          {u.className || u.subjectOrPosition || 'MTs. Darul Huda'}
                        </div>
                      </div>
                    </div>

                    {/* Barcode Batang (Linear Barcode / 1D Code 128) */}
                    <div className="py-2.5 px-3 bg-slate-50/80 rounded-2xl border border-slate-200/90 flex flex-col items-center">
                      <BarcodeBatang 
                        value={u.barcode || u.nisnOrNip} 
                        width={1.4}
                        height={42}
                        fontSize={11}
                        className="w-full max-w-[240px]"
                      />
                      <span className="text-[9px] text-slate-500 mt-1">
                        Scan Masuk & Pulang (Scanner Barcode USB / HP)
                      </span>
                    </div>

                    {/* Card Footer: WhatsApp & Single Print Button */}
                    <div className="pt-1 flex items-center justify-between gap-2 text-[10px]">
                      <div className="min-w-0 truncate text-slate-500 font-mono">
                        {u.whatsappNumber ? `WA: ${u.whatsappNumber}` : 'WA: Belum diisi'}
                      </div>
                      <button
                        type="button"
                        onClick={() => handlePrintSingleCard(u.id)}
                        className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg font-bold flex items-center gap-1 cursor-pointer transition shrink-0 shadow-2xs"
                        title="Cetak khusus kartu santri/guru ini"
                      >
                        <Printer className="w-3 h-3 text-slate-500" />
                        <span>Cetak Ini</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 5: PENGATURAN JAM & WHATSAPP GATEWAY                 */}
      {/* ======================================================== */}
      {isAdmin && activeSubTab === 'settings' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-6 max-w-3xl">
          <div>
            <h2 className="text-xl font-black text-slate-900">
              Pengaturan Aturan Waktu Presensi & WhatsApp Gateway
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Konfigurasi jam masuk, batas keterlambatan, jam kepulangan (WIB), dan integrasi pengiriman pesan WhatsApp.
            </p>
          </div>

          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mulai Jam Presensi Masuk (WIB)
                </label>
                <input
                  type="time"
                  value={attendanceSettings.clockInStart}
                  onChange={(e) => updateAttendanceSettings({ clockInStart: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Batas Toleransi Tepat Waktu (Lewat dari ini = Terlambat)
                </label>
                <input
                  type="time"
                  value={attendanceSettings.clockInLate}
                  onChange={(e) => updateAttendanceSettings({ clockInLate: e.target.value })}
                  className="w-full px-3 py-2 bg-amber-50 border border-amber-300 rounded-xl text-xs font-bold text-amber-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mulai Jam Presensi Pulang (WIB)
                </label>
                <input
                  type="time"
                  value={attendanceSettings.clockOutStart}
                  onChange={(e) => updateAttendanceSettings({ clockOutStart: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Batas Akhir Presensi Pulang (WIB)
                </label>
                <input
                  type="time"
                  value={attendanceSettings.clockOutEnd}
                  onChange={(e) => updateAttendanceSettings({ clockOutEnd: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                />
              </div>
            </div>

            {/* WA Notification Options */}
            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-xs text-emerald-950">
                    Otomatis Buat Tautan Notifikasi WhatsApp
                  </div>
                  <div className="text-[11px] text-emerald-700">
                    Sistem akan menyusun pesan rapi dengan nama siswa, NISN/NIP, jam WIB, dan status kehadiran.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={attendanceSettings.autoSendWhatsapp}
                  onChange={(e) => updateAttendanceSettings({ autoSendWhatsapp: e.target.checked })}
                  className="w-5 h-5 accent-emerald-600 rounded cursor-pointer"
                />
              </div>
            </div>

            {/* Pemberitahuan Otomatis WA 30 Menit Belum Absen Masuk & Pulang */}
            <div className="p-4 bg-amber-50/80 border border-amber-300 rounded-2xl space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                  <BellRing className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h4 className="font-black text-xs text-amber-950 uppercase tracking-tight">
                    Pemberitahuan Otomatis WA: Belum Absen (30 Menit Setelah Jam Masuk & Pulang)
                  </h4>
                  <p className="text-[11px] text-amber-800 leading-relaxed mt-0.5">
                    Sistem otomatis memeriksa dan mengirimkan notifikasi peringatan ke WhatsApp wali murid (untuk santri) dan WhatsApp pribadi guru jika belum melakukan presensi masuk 30 menit setelah jam masuk, dan belum presensi pulang 30 menit setelah jam pulang.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-amber-200">
                {/* Pengingat Belum Absen Masuk */}
                <div className="p-3 bg-white rounded-xl border border-amber-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">
                      Pengingat Belum Absen Masuk
                    </span>
                    <input
                      type="checkbox"
                      checked={attendanceSettings.autoNotifyUnclockedIn !== false}
                      onChange={(e) => updateAttendanceSettings({ autoNotifyUnclockedIn: e.target.checked })}
                      className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-600">
                    <span>Toleransi Waktu:</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={5}
                        max={120}
                        value={attendanceSettings.clockInGracePeriodMinutes ?? 30}
                        onChange={(e) => updateAttendanceSettings({ clockInGracePeriodMinutes: parseInt(e.target.value) || 30 })}
                        className="w-14 px-2 py-0.5 bg-slate-50 border border-slate-300 rounded text-right font-bold text-slate-800 text-xs"
                      />
                      <span className="text-[10px] text-slate-500 font-bold">menit</span>
                    </div>
                  </div>
                  <div className="text-[10px] text-amber-900 bg-amber-50 p-1.5 rounded-lg border border-amber-200">
                    Jadwal pengingat masuk: <strong>{clockInReminderScheduledTime} WIB</strong> ({attendanceSettings.clockInLate || '07:15'} + {attendanceSettings.clockInGracePeriodMinutes ?? 30} menit)
                  </div>
                </div>

                {/* Pengingat Belum Absen Pulang */}
                <div className="p-3 bg-white rounded-xl border border-amber-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">
                      Pengingat Belum Absen Pulang
                    </span>
                    <input
                      type="checkbox"
                      checked={attendanceSettings.autoNotifyUnclockedOut !== false}
                      onChange={(e) => updateAttendanceSettings({ autoNotifyUnclockedOut: e.target.checked })}
                      className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-600">
                    <span>Toleransi Waktu:</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={5}
                        max={120}
                        value={attendanceSettings.clockOutGracePeriodMinutes ?? 30}
                        onChange={(e) => updateAttendanceSettings({ clockOutGracePeriodMinutes: parseInt(e.target.value) || 30 })}
                        className="w-14 px-2 py-0.5 bg-slate-50 border border-slate-300 rounded text-right font-bold text-slate-800 text-xs"
                      />
                      <span className="text-[10px] text-slate-500 font-bold">menit</span>
                    </div>
                  </div>
                  <div className="text-[10px] text-indigo-900 bg-indigo-50 p-1.5 rounded-lg border border-indigo-200">
                    Jadwal pengingat pulang: <strong>{clockOutReminderScheduledTime} WIB</strong> ({attendanceSettings.clockOutStart || '13:30'} + {attendanceSettings.clockOutGracePeriodMinutes ?? 30} menit)
                  </div>
                </div>
              </div>
            </div>

            {/* Gateway API Endpoint Optional */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  API Gateway WhatsApp (Opsional - Contoh: Fonnte / Wablas / Waha)
                </label>
                <input
                  type="text"
                  value={attendanceSettings.whatsappGatewayUrl || ''}
                  onChange={(e) => updateAttendanceSettings({ whatsappGatewayUrl: e.target.value })}
                  placeholder="https://api.fonnte.com/send"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  API Key Gateway WhatsApp (Opsional)
                </label>
                <input
                  type="password"
                  value={attendanceSettings.whatsappApiKey || ''}
                  onChange={(e) => updateAttendanceSettings({ whatsappApiKey: e.target.value })}
                  placeholder="Token API Gateway WhatsApp..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800"
                />
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 flex items-center gap-2">
              <Info className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Jika API Gateway tidak diatur, sistem secara cerdas membuka tautan langsung WhatsApp Web / WhatsApp App (wa.me) yang aman dan siap kirim ke wali santri / guru tanpa biaya server.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL PRINT RESMI KOP KEMENAG (SISWA / GURU)             */}
      {/* ======================================================== */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <span className="font-bold text-xs">
                Pratinjau Dokumen Cetak Rekapitulasi Presensi MTs. Darul Huda
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg cursor-pointer transition flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak Dokumen</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowPrintModal(null)}
                  className="p-1 text-slate-400 hover:text-white transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Dokumen Fisik Kemenag */}
            <div className="p-8 space-y-6 print:p-0 bg-white text-slate-900">
              {/* Kop Surat Kemenag MTs. Darul Huda */}
              <div className="border-b-4 border-double border-slate-900 pb-4 text-center">
                <div className="text-xs font-bold uppercase tracking-widest text-slate-600">
                  KEMENTERIAN AGAMA REPUBLIK INDONESIA
                </div>
                <div className="text-sm font-bold uppercase tracking-wider text-slate-700">
                  KANTOR KEMENTERIAN AGAMA KABUPATEN
                </div>
                <div className="text-xl font-black uppercase tracking-tight text-slate-950 mt-0.5">
                  MADRASAH TSANAWIYAH DARUL HUDA
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  {systemSettings?.address || 'Jl. Pesantren No. 45, Kecamatan Sukamaju, Kabupaten'} • NSM: {systemSettings?.nsm || '121132710001'} • NPSN: {systemSettings?.npsn || '20582910'}
                </div>
              </div>

              {/* Judul Laporan */}
              <div className="text-center">
                <h3 className="font-black text-sm uppercase underline decoration-2 underline-offset-4">
                  {showPrintModal === 'siswa' 
                    ? 'REKAPITULASI PRESENSI & KEDISIPLINAN SISWA / SANTRI' 
                    : 'REKAPITULASI PRESENSI PENDIDIK & TENAGA KEPENDIDIKAN'}
                </h3>
                <div className="text-xs text-slate-600 mt-1 font-semibold">
                  BULAN: {getMonthNameIndonesian(selectedMonth).toUpperCase()} {selectedYear} • SIKLUS WAKTU INDONESIA BARAT (WIB)
                </div>
              </div>

              {/* Table Data Preview */}
              <table className="w-full text-left text-[11px] border border-slate-300">
                <thead className="bg-slate-100 text-slate-900 font-bold border-b border-slate-300">
                  <tr>
                    <th className="py-2 px-2 text-center border-r border-slate-300">No</th>
                    <th className="py-2 px-3 border-r border-slate-300">{showPrintModal === 'siswa' ? 'NISN' : 'NIP / ID'}</th>
                    <th className="py-2 px-3 border-r border-slate-300">{showPrintModal === 'siswa' ? 'Nama Santri' : 'Nama Guru'}</th>
                    <th className="py-2 px-3 border-r border-slate-300">{showPrintModal === 'siswa' ? 'Kelas' : 'Tugas / Mapel'}</th>
                    <th className="py-2 px-2 text-center border-r border-slate-300">Hadir</th>
                    <th className="py-2 px-2 text-center border-r border-slate-300">Terlambat</th>
                    <th className="py-2 px-2 text-center border-r border-slate-300">% Kehadiran</th>
                    <th className="py-2 px-3 border-r border-slate-300">{showPrintModal === 'siswa' ? 'WA Wali Santri' : 'WA Pribadi'}</th>
                    <th className="py-2 px-3 text-center">Predikat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {showPrintModal === 'siswa' ? (
                    studentRecapData.map((row, i) => (
                      <tr key={row.student.id}>
                        <td className="py-2 px-2 text-center border-r border-slate-200">{i + 1}</td>
                        <td className="py-2 px-3 font-mono border-r border-slate-200">{row.student.nisnOrNip}</td>
                        <td className="py-2 px-3 font-bold border-r border-slate-200">{row.student.name}</td>
                        <td className="py-2 px-3 border-r border-slate-200">{row.student.className || '-'}</td>
                        <td className="py-2 px-2 text-center font-bold border-r border-slate-200">{row.hadirCount}</td>
                        <td className="py-2 px-2 text-center border-r border-slate-200">{row.terlambatCount}</td>
                        <td className="py-2 px-2 text-center font-bold border-r border-slate-200">{row.percentage}%</td>
                        <td className="py-2 px-3 font-mono border-r border-slate-200">{row.student.whatsappNumber || '-'}</td>
                        <td className="py-2 px-3 text-center">{row.disciplineStatus}</td>
                      </tr>
                    ))
                  ) : (
                    teacherRecapData.map((row, i) => (
                      <tr key={row.teacher.id}>
                        <td className="py-2 px-2 text-center border-r border-slate-200">{i + 1}</td>
                        <td className="py-2 px-3 font-mono border-r border-slate-200">{row.teacher.nisnOrNip}</td>
                        <td className="py-2 px-3 font-bold border-r border-slate-200">{row.teacher.name}</td>
                        <td className="py-2 px-3 border-r border-slate-200">{row.teacher.subjectOrPosition || 'Guru'}</td>
                        <td className="py-2 px-2 text-center font-bold border-r border-slate-200">{row.ontimeCount}</td>
                        <td className="py-2 px-2 text-center border-r border-slate-200">{row.lateCount}</td>
                        <td className="py-2 px-2 text-center font-bold border-r border-slate-200">{row.disciplineScore}%</td>
                        <td className="py-2 px-3 font-mono border-r border-slate-200">{row.teacher.whatsappNumber || '-'}</td>
                        <td className="py-2 px-3 text-center">{row.performanceRating}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {/* Tanda Tangan Resmi */}
              <div className="pt-8 grid grid-cols-2 gap-8 text-center text-xs">
                <div>
                  <div className="text-slate-500">Mengetahui,</div>
                  <div className="font-bold text-slate-800">
                    {showPrintModal === 'siswa' ? 'Wali Kelas / Koordinator Presensi' : 'Kepala Urusan Tata Usaha'}
                  </div>
                  <div className="h-16"></div>
                  <div className="font-bold text-slate-900 underline">
                    {showPrintModal === 'siswa' ? 'Siti Fatimah, S.Pd.I' : 'Dra. Hj. Nurul Hidayah, M.Pd'}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">NIP. 198604122010012015</div>
                </div>

                <div>
                  <div className="text-slate-500">
                    Ditetapkan di Madrasah, {getWibDateIndonesian(getWibDate())}
                  </div>
                  <div className="font-bold text-slate-800">Kepala Madrasah MTs. Darul Huda</div>
                  <div className="h-16"></div>
                  <div className="font-bold text-slate-900 underline">
                    {systemSettings?.headmasterName || 'Drs. H. Ahmad Marzuki, M.Pd.I'}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    NIP. {systemSettings?.headmasterNip || '197605142000031002'}
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL CETAK KARTU BARCODE KOTAK (HANYA YANG DIPILIH)     */}
      {/* ======================================================== */}
      {showPrintCardsModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-5xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6 animate-in zoom-in-95 duration-150">
            {/* Modal Top Control Bar */}
            <div className="p-4 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-black text-sm flex items-center gap-2">
                  <Printer className="w-4 h-4 text-emerald-400" />
                  <span>Pratinjau Cetak Kartu Barcode Batang (KTA)</span>
                </h3>
                <p className="text-[11px] text-slate-300">
                  Menampilkan <strong>{finalPrintCards.length} kartu terpilih</strong> siap cetak di kertas A4 (Ukuran KTA Standar Madrasah).
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl cursor-pointer transition flex items-center gap-2 shadow-xs"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak Sekarang ({finalPrintCards.length} Kartu)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowPrintCardsModal(false)}
                  className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
                  title="Tutup Pratinjau"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Cards Sheet */}
            <div id="printable-card-sheet" className="p-6 sm:p-8 bg-slate-100/50 print:bg-white print:p-0">
              <style>{`
                @media print {
                  body * {
                    visibility: hidden !important;
                  }
                  #printable-card-sheet, #printable-card-sheet * {
                    visibility: visible !important;
                  }
                  #printable-card-sheet {
                    position: absolute !important;
                    left: 0 !important;
                    top: 0 !important;
                    width: 100% !important;
                    padding: 0 !important;
                    background: white !important;
                  }
                }
              `}</style>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-2 print:gap-4 max-w-4xl mx-auto">
                {finalPrintCards.map((u) => {
                  const isStd = u.role === 'student';

                  return (
                    <div 
                      key={u.id}
                      className="bg-white border-2 border-dashed border-slate-400 rounded-3xl p-5 shadow-sm space-y-3 relative overflow-hidden print:border-slate-800 print:shadow-none print:break-inside-avoid"
                    >
                      {/* Kop Madrasah KTA */}
                      <div className="border-b-2 border-emerald-600 pb-2 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-black text-xs shrink-0">
                            DH
                          </div>
                          <div>
                            <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none">
                              KEMENTERIAN AGAMA RI
                            </div>
                            <div className="font-black text-xs text-slate-900 uppercase tracking-tight mt-0.5">
                              {systemSettings?.schoolName || 'MTs. Darul Huda'}
                            </div>
                            <div className="text-[8px] text-slate-400">
                              NSM: {systemSettings?.nsm || '121132710001'} • NPSN: {systemSettings?.npsn || '20582910'}
                            </div>
                          </div>
                        </div>

                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                          isStd ? 'bg-emerald-100 text-emerald-800' : 'bg-indigo-100 text-indigo-800'
                        }`}>
                          {isStd ? 'KTA Santri' : 'ID Pendidik'}
                        </span>
                      </div>

                      {/* Content: Info + Barcode Batang */}
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3 text-left">
                          {/* Nama */}
                          <div className="col-span-2">
                            <span className="text-[9px] font-bold text-slate-400 uppercase">Nama Lengkap</span>
                            <div className="font-black text-xs text-slate-900 truncate leading-snug">
                              {u.name}
                            </div>
                          </div>

                          {/* NISN / NIP */}
                          <div>
                            <span className="text-[9px] font-bold text-slate-400 uppercase">
                              {isStd ? 'NISN (Nomor Induk)' : 'NIP / NUPTK'}
                            </span>
                            <div className="font-mono font-bold text-[11px] text-slate-800">
                              {u.nisnOrNip}
                            </div>
                          </div>

                          {/* Kelas / Jabatan */}
                          <div>
                            <span className="text-[9px] font-bold text-slate-400 uppercase">
                              {isStd ? 'Rombel / Kelas' : 'Tugas / Jabatan'}
                            </span>
                            <div className="font-semibold text-[10px] text-emerald-800 truncate">
                              {u.className || u.subjectOrPosition || 'MTs. Darul Huda'}
                            </div>
                          </div>

                          {u.whatsappNumber && (
                            <div className="col-span-2">
                              <span className="text-[8px] font-bold text-slate-400 uppercase">
                                {isStd ? 'No. WhatsApp Wali Santri' : 'No. WhatsApp Pribadi'}
                              </span>
                              <div className="font-mono text-[9px] text-slate-600">
                                {u.whatsappNumber}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Barcode Batang (Code 128) Beresolusi Tinggi */}
                        <div className="py-2.5 px-3 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col items-center justify-center">
                          <BarcodeBatang 
                            value={u.barcode || u.nisnOrNip} 
                            width={1.6}
                            height={46}
                            fontSize={11}
                            className="w-full max-w-[280px]"
                          />
                          <span className="text-[8px] text-emerald-700 font-extrabold uppercase mt-1 tracking-wider">
                            Barcode Batang (Code 128) • Presensi Digital & CBT
                          </span>
                        </div>
                      </div>

                      {/* Footer KTA */}
                      <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[8px] text-slate-500">
                        <span>Kartu Presensi Masuk & Pulang Terpadu</span>
                        <span className="font-bold text-slate-700">MTs. Darul Huda • Anti-Cheat CBT</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Bottom Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-600">
                Gunakan gunting pada garis putus-putus setelah dicetak pada kertas karton/PVC.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowPrintCardsModal(false)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl cursor-pointer transition"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl cursor-pointer transition flex items-center gap-1.5 shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak {finalPrintCards.length} Kartu</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Universal Mobile Barcode & QR Scanner (Android & Apple iOS) */}
      <MobileBarcodeScanner
        isOpen={showMobileScanner}
        onClose={() => setShowMobileScanner(false)}
        onScan={(code) => {
          processBarcode(code, 'camera_scanner');
          setShowMobileScanner(false);
        }}
        title={`Scanner Barcode HP (${scanMode === 'masuk' ? 'Presensi Masuk' : 'Presensi Pulang'})`}
        subtitle="Dukungan Penuh: Android, Apple iPhone/iPad Safari, dan Barcode Lembaga"
      />

      {/* ======================================================== */}
      {/* MODAL CETAK RESMI POSTER / STANDEE BARCODE LEMBAGA       */}
      {/* ======================================================== */}
      {showPrintInstitutionModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in zoom-in-95">
            {/* Modal Top Actions */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <span className="font-bold text-xs flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-teal-400" />
                <span>Pratinjau Cetak Standee / Poster Barcode Lembaga MTs. Darul Huda</span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg cursor-pointer transition flex items-center gap-1.5 shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak Standee / Poster</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowPrintInstitutionModal(false)}
                  className="p-1 text-slate-400 hover:text-white transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Standee Content - Ready for A4 Print */}
            <div className="p-8 sm:p-12 bg-white text-slate-900 print:p-0 space-y-6 text-center">
              {/* Kop Madrasah */}
              <div className="border-b-4 border-double border-slate-900 pb-4 text-center">
                <div className="text-xs font-bold uppercase tracking-widest text-slate-600">
                  KEMENTERIAN AGAMA REPUBLIK INDONESIA
                </div>
                <div className="text-sm font-bold uppercase tracking-wider text-slate-700">
                  KANTOR KEMENTERIAN AGAMA KABUPATEN
                </div>
                <div className="text-2xl font-black uppercase tracking-tight text-slate-950 mt-0.5">
                  MADRASAH TSANAWIYAH DARUL HUDA
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  {systemSettings?.address || 'Jl. Pesantren No. 45, Kecamatan Sukamaju, Kabupaten'} • NSM: {systemSettings?.nsm || '121132710001'} • NPSN: {systemSettings?.npsn || '20582910'}
                </div>
              </div>

              {/* Poster Title */}
              <div>
                <span className="px-3 py-1 bg-slate-100 text-slate-800 text-[11px] font-black uppercase tracking-wider rounded-full border border-slate-300">
                  POS RESMI PRESENSI DIGITAL
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-slate-950 uppercase mt-2">
                  BARCODE LEMBAGA MTs. DARUL HUDA
                </h3>
                <p className="text-xs text-slate-600 font-semibold mt-1">
                  PRESENSI MASUK & PULANG DEWAN GURU DAN TENAGA KEPENDIDIKAN
                </p>
              </div>

              {/* Large Centered Square QR Barcode */}
              <div className="flex flex-col items-center justify-center p-6 bg-slate-50 border-2 border-slate-300 rounded-3xl max-w-sm mx-auto shadow-xs">
                <SquareBarcode
                  value={INSTITUTION_BARCODE_DEFAULT}
                  size={240}
                  label={INSTITUTION_BARCODE_DEFAULT}
                  showCodeText={true}
                />
                <span className="text-xs font-black text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full mt-3 border border-emerald-300">
                  KODE PRESENSI RESMI LEMBAGA
                </span>
              </div>

              {/* Instructions */}
              <div className="border-t border-b border-slate-200 py-4 max-w-md mx-auto space-y-1.5 text-xs text-slate-700 text-left">
                <div className="font-black text-center text-slate-900 uppercase text-[11px] mb-2">
                  PETUNJUK PRESENSI DENGAN HP (ANDROID & APPLE iOS):
                </div>
                <p>1. Buka aplikasi CBT MTs. Darul Huda di HP lalu login akun guru.</p>
                <p>2. Buka menu navigasi garis 3 pojok kiri atas &gt; pilih <strong>Absensi Barcode &amp; Rekap</strong>.</p>
                <p>3. Ketuk tombol <strong>Buka Scanner Kamera HP</strong> (Pilih mode Masuk atau Pulang).</p>
                <p>4. Arahkan kamera smartphone ke kode kotak di atas.</p>
                <p>5. Jam presensi tercatat otomatis (WIB) & notifikasi terkirim ke WhatsApp guru.</p>
              </div>

              {/* Signatures */}
              <div className="pt-6 grid grid-cols-2 gap-8 text-center text-xs">
                <div>
                  <div className="text-slate-500">Mengetahui,</div>
                  <div className="font-bold text-slate-800">Koordinator Presensi & IT</div>
                  <div className="h-14"></div>
                  <div className="font-bold text-slate-900 underline">Ahmad Zaky, S.Kom</div>
                </div>

                <div>
                  <div className="text-slate-500">Mengesahkan,</div>
                  <div className="font-bold text-slate-800">Kepala Madrasah</div>
                  <div className="h-14"></div>
                  <div className="font-bold text-slate-900 underline">
                    {systemSettings?.headmasterName || 'Drs. H. Ahmad Marzuki, M.Pd.I'}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    NIP. {systemSettings?.headmasterNip || '197605142000031002'}
                  </div>
                </div>
              </div>

            </div>

            {/* Modal Bottom Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-600">
                Cetak pada kertas tebal atau laminating lalu tempel di meja piket / kantor guru.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowPrintInstitutionModal(false)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl cursor-pointer transition"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl cursor-pointer transition flex items-center gap-1.5 shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak Standee</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL PEMBERITAHUAN OTOMATIS WA BELUM ABSEN (30 MENIT)   */}
      {/* ======================================================== */}
      {showUnclockedModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150">
            
            {/* Modal Top Header */}
            <div className="p-5 bg-gradient-to-r from-amber-700 via-orange-700 to-slate-900 text-white flex items-start justify-between gap-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/20 shadow-inner">
                  <BellRing className="w-6 h-6 text-amber-300 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400 text-amber-950">
                      Peringatan Otomatis WA
                    </span>
                    <span className="text-xs text-amber-200 font-mono">
                      Toleransi 30 Menit
                    </span>
                  </div>
                  <h3 className="font-black text-base sm:text-lg text-white mt-0.5">
                    Pemberitahuan WhatsApp Siswa & Guru Belum Absen
                  </h3>
                  <p className="text-xs text-amber-100 max-w-xl mt-0.5">
                    Kirim notifikasi ke WhatsApp wali murid & pribadi guru jika belum melakukan presensi 30 menit setelah jam masuk atau jam pulang.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowUnclockedModal(false)}
                className="p-2 text-white/70 hover:text-white rounded-xl hover:bg-white/10 transition cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sub-Header Tabs & Quick Rule Info */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-3 shrink-0">
              
              {/* Tab Selector: Masuk vs Pulang */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 bg-slate-200/80 p-1 rounded-2xl w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setUnclockedModalTab('masuk');
                      setPreviewMessageUserId(null);
                    }}
                    className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-2 ${
                      unclockedModalTab === 'masuk'
                        ? 'bg-amber-600 text-white shadow-md shadow-amber-900/20'
                        : 'text-slate-700 hover:text-slate-900'
                    }`}
                  >
                    <span>Belum Absen Masuk</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      unclockedModalTab === 'masuk' ? 'bg-amber-800 text-amber-100' : 'bg-slate-300 text-slate-800'
                    }`}>
                      {unclockedInUsers.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setUnclockedModalTab('pulang');
                      setPreviewMessageUserId(null);
                    }}
                    className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-2 ${
                      unclockedModalTab === 'pulang'
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/20'
                        : 'text-slate-700 hover:text-slate-900'
                    }`}
                  >
                    <span>Belum Absen Pulang</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      unclockedModalTab === 'pulang' ? 'bg-indigo-800 text-indigo-100' : 'bg-slate-300 text-slate-800'
                    }`}>
                      {unclockedOutUsers.length}
                    </span>
                  </button>
                </div>

                {/* Status Indicator */}
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
                    (unclockedModalTab === 'masuk' ? isPastClockInReminderTime : isPastClockOutReminderTime)
                      ? 'bg-rose-100 text-rose-800 border-rose-300'
                      : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${
                      (unclockedModalTab === 'masuk' ? isPastClockInReminderTime : isPastClockOutReminderTime)
                        ? 'bg-rose-500 animate-ping'
                        : 'bg-emerald-500'
                    }`}></span>
                    <span>
                      {(unclockedModalTab === 'masuk' ? isPastClockInReminderTime : isPastClockOutReminderTime)
                        ? 'Waktu Pengingat Aktif (> 30 Menit)'
                        : 'Menunggu Waktu Jadwal'}
                    </span>
                  </span>
                </div>
              </div>

              {/* Schedule detail reminder */}
              <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs text-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
                <div>
                  {unclockedModalTab === 'masuk' ? (
                    <div>
                      Batas Jam Masuk: <strong>{attendanceSettings.clockInLate || '07:15'} WIB</strong> • Jadwal Pengingat: <strong>{clockInReminderScheduledTime} WIB</strong> (Toleransi {attendanceSettings.clockInGracePeriodMinutes ?? 30} menit).
                    </div>
                  ) : (
                    <div>
                      Jam Kepulangan: <strong>{attendanceSettings.clockOutStart || '13:30'} WIB</strong> • Jadwal Pengingat: <strong>{clockOutReminderScheduledTime} WIB</strong> (Toleransi {attendanceSettings.clockOutGracePeriodMinutes ?? 30} menit).
                    </div>
                  )}
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Jam saat ini: <strong>{liveWibTime} WIB</strong> • Target: WhatsApp Wali Murid (Siswa) & WhatsApp Pribadi (Guru).
                  </div>
                </div>

                {/* Batch Broadcast Action */}
                <button
                  type="button"
                  onClick={() => {
                    const res = sendBatchUnclockedAlerts(unclockedModalTab);
                    setUnclockedAlertBannerResult(res.message);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition cursor-pointer flex items-center justify-center gap-2 shadow-sm shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Kirim Serentak ({unclockedModalTab === 'masuk' ? unclockedInPending.length : unclockedOutPending.length} Belum Dikirim)</span>
                </button>
              </div>

              {/* Banner Alert Feedback */}
              {unclockedAlertBannerResult && (
                <div className="p-2.5 bg-emerald-100 text-emerald-950 border border-emerald-300 rounded-xl text-xs flex items-center justify-between animate-in fade-in">
                  <span className="font-semibold">{unclockedAlertBannerResult}</span>
                  <button 
                    type="button"
                    onClick={() => setUnclockedAlertBannerResult(null)} 
                    className="text-emerald-700 hover:text-emerald-950 font-bold p-1 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Filters & Search */}
              <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                {/* Role Pill */}
                <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setUnclockedRoleFilter('all')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      unclockedRoleFilter === 'all' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Semua
                  </button>
                  <button
                    type="button"
                    onClick={() => setUnclockedRoleFilter('student')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      unclockedRoleFilter === 'student' ? 'bg-amber-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Santri / Siswa
                  </button>
                  <button
                    type="button"
                    onClick={() => setUnclockedRoleFilter('teacher')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      unclockedRoleFilter === 'teacher' ? 'bg-teal-700 text-white' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Dewan Guru
                  </button>
                </div>

                {/* Search */}
                <div className="relative flex-1 w-full">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={unclockedSearch}
                    onChange={(e) => setUnclockedSearch(e.target.value)}
                    placeholder="Cari nama santri, guru, NISN/NIP, kelas, atau nomor WA..."
                    className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-amber-500"
                  />
                </div>
              </div>

            </div>

            {/* List of Unclocked Users */}
            <div className="p-4 overflow-y-auto flex-1 space-y-3 bg-slate-100/60">
              {(() => {
                const list = (unclockedModalTab === 'masuk' ? unclockedInUsers : unclockedOutUsers).filter(item => {
                  const matchesRole = unclockedRoleFilter === 'all' || item.user.role === unclockedRoleFilter;
                  const q = unclockedSearch.toLowerCase().trim();
                  const matchesSearch = !q || 
                    item.user.name.toLowerCase().includes(q) || 
                    (item.user.nisnOrNip && item.user.nisnOrNip.toLowerCase().includes(q)) || 
                    (item.user.className && item.user.className.toLowerCase().includes(q)) ||
                    (item.whatsappTarget && item.whatsappTarget.includes(q));
                  return matchesRole && matchesSearch;
                });

                if (list.length === 0) {
                  return (
                    <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-2">
                      <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                      <div className="font-black text-sm text-slate-800">
                        Alhamdulillah! Tidak Ada Santri atau Guru yang Belum Absen {unclockedModalTab === 'masuk' ? 'Masuk' : 'Pulang'}
                      </div>
                      <p className="text-xs text-slate-500 max-w-md mx-auto">
                        Semua data presensi hari ini telah lengkap atau sesuai kriteria filter yang Anda pilih.
                      </p>
                    </div>
                  );
                }

                return list.map(item => {
                  const isTeacher = item.user.role === 'teacher';
                  const isPreview = previewMessageUserId === item.user.id;

                  return (
                    <div 
                      key={item.user.id} 
                      className={`bg-white rounded-2xl border p-4 shadow-xs transition space-y-3 ${
                        item.isNotified ? 'border-slate-200' : 'border-amber-300 ring-1 ring-amber-100'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        {/* User Identity */}
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                            isTeacher ? 'bg-teal-700 text-white' : 'bg-amber-600 text-white'
                          }`}>
                            {item.user.name.slice(0, 2).toUpperCase()}
                          </div>

                          <div>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-black text-xs text-slate-900">{item.user.name}</span>
                              <span className={`px-2 py-0.2 rounded text-[10px] font-bold ${
                                isTeacher ? 'bg-teal-100 text-teal-800' : 'bg-amber-100 text-amber-800'
                              }`}>
                                {isTeacher ? 'Guru' : `Kelas ${item.user.className || '-'}`}
                              </span>
                              <span className="text-[10px] font-mono text-slate-500">
                                {item.user.nisnOrNip}
                              </span>
                            </div>

                            <div className="text-[11px] text-slate-600 mt-1 flex flex-wrap items-center gap-2">
                              {item.whatsappTarget ? (
                                <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                                  <Phone className="w-3 h-3" />
                                  <span>WA: {item.whatsappTarget} ({item.recipientName})</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded">
                                  <AlertCircle className="w-3 h-3" />
                                  <span>Nomor WA Belum Ada</span>
                                </span>
                              )}

                              <span className="text-slate-300">•</span>

                              {item.isNotified ? (
                                <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  <span>Peringatan WA Terkirim</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-amber-800 font-bold bg-amber-100 px-2 py-0.5 rounded">
                                  <Clock className="w-3 h-3 text-amber-600" />
                                  <span>Menunggu Pengiriman WA</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          <button
                            type="button"
                            onClick={() => setPreviewMessageUserId(isPreview ? null : item.user.id)}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>{isPreview ? 'Tutup Pesan' : 'Lihat Pesan WA'}</span>
                          </button>

                          {item.waUrl ? (
                            <a
                              href={item.waUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => {
                                sendUnclockedAlert(item.user.id, unclockedModalTab);
                                setUnclockedAlertBannerResult(`Notifikasi WA dikirim ke ${item.user.name} (${item.whatsappTarget})`);
                              }}
                              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-2xs ${
                                item.isNotified 
                                  ? 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                              }`}
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span>{item.isNotified ? 'Kirim Ulang WA' : 'Kirim WA Sekarang'}</span>
                            </a>
                          ) : (
                            <button
                              type="button"
                              disabled
                              className="px-3.5 py-1.5 bg-slate-200 text-slate-400 rounded-xl text-xs font-bold cursor-not-allowed"
                            >
                              WA Belum Ada
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Expandable Message Preview */}
                      {isPreview && (
                        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2 animate-in fade-in duration-100">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-700 flex items-center gap-1.5">
                              <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Pratinjau Pesan Resmi WhatsApp:</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => copyAlertMessage(item.waMessage, item.user.id)}
                              className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-[11px] font-bold rounded-lg cursor-pointer transition flex items-center gap-1"
                            >
                              {copiedAlertId === item.user.id ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  <span className="text-emerald-700">Tersalin!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Salin Teks</span>
                                </>
                              )}
                            </button>
                          </div>
                          <pre className="text-[11px] font-sans whitespace-pre-wrap text-slate-800 bg-white p-3 rounded-lg border border-slate-200 leading-relaxed font-normal">
                            {item.waMessage}
                          </pre>
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
              <div className="text-xs text-slate-600">
                Peringatan otomatis aktif di latar belakang (background checker) setiap siklus hari kerja madrasah.
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowUnclockedModal(false)}
                  className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl cursor-pointer transition"
                >
                  Tutup
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
