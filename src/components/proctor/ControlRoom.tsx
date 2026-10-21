import React, { useState, useMemo, useEffect } from 'react';
import { useCbt } from '../../context/CbtContext';
import { 
  ShieldAlert, 
  Users, 
  RotateCcw, 
  Lock, 
  Unlock, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Megaphone, 
  Filter, 
  Search, 
  Send, 
  MoreVertical, 
  Activity, 
  ExternalLink,
  ArrowLeft,
  Calendar,
  RefreshCw,
  BookOpen,
  Sparkles,
  School,
  Key,
  Award,
  Camera,
  CameraOff,
  Video,
  Eye,
  LayoutGrid,
  List,
  Maximize2,
  ShieldCheck,
  X
} from 'lucide-react';
import { SessionStatus, StudentExamSession } from '../../types/cbt';

interface ControlRoomProps {
  initialExamId?: string;
  isStandalone?: boolean;
}

export const ControlRoom: React.FC<ControlRoomProps> = ({ initialExamId, isStandalone }) => {
  const { 
    classes, 
    exams, 
    sessions, 
    users,
    resetStudentSession, 
    broadcastAlert,
    auditLogs,
    systemSettings,
    selectedExamId,
    setSelectedExamId,
    setActiveTab,
    currentUser
  } = useCbt();

  // Read URL query params if any
  const urlExamId = useMemo(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const q = params.get('examId');
      if (q) return q;
      const hash = window.location.hash;
      const match = hash.match(/[?&#]examId=([^&]+)/);
      if (match) return decodeURIComponent(match[1]);
    } catch { /* ignore */ }
    return null;
  }, []);

  // Determine active exam filter: initial prop > url param > context selectedExamId > 'all'
  const [currentExamFilter, setCurrentExamFilter] = useState<string>(() => {
    if (initialExamId) return initialExamId;
    if (urlExamId) return urlExamId;
    if (selectedExamId) return selectedExamId;
    return 'all';
  });

  // Sync state if context selectedExamId or urlExamId changes
  useEffect(() => {
    if (initialExamId) {
      setCurrentExamFilter(initialExamId);
    } else if (urlExamId) {
      setCurrentExamFilter(urlExamId);
    } else if (selectedExamId) {
      setCurrentExamFilter(selectedExamId);
    }
  }, [initialExamId, urlExamId, selectedExamId]);

  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [broadcastMessage, setBroadcastMessage] = useState<string>('');
  const [showBroadcastModal, setShowBroadcastModal] = useState<boolean>(false);
  const [activeActionSessionId, setActiveActionSessionId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'gallery' | 'table'>('gallery');
  const [inspectedSession, setInspectedSession] = useState<StudentExamSession | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Find active exam object if a specific exam is chosen
  const activeExam = useMemo(() => {
    if (currentExamFilter === 'all') return null;
    return (exams || []).find(e => e.id === currentExamFilter) || null;
  }, [exams, currentExamFilter]);

  // Allowed classes objects for this active exam
  const activeExamClasses = useMemo(() => {
    if (!activeExam) return classes;
    if (!activeExam.classesAllowed || activeExam.classesAllowed.length === 0) return classes;
    return classes.filter(c => activeExam.classesAllowed.includes(c.id));
  }, [activeExam, classes]);

  // Today in YYYY-MM-DD
  const todayYmd = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  // Format Indonesian Date helper
  const formatIndonesianDate = (dateStr?: string) => {
    if (!dateStr) return 'Hari Ini';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        return d.toLocaleDateString('id-ID', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });
      }
    } catch { /* ignore */ }
    return dateStr;
  };

  // Calculate session data scoped to current exam (or all)
  const relevantSessions = useMemo(() => {
    if (currentExamFilter === 'all') {
      return sessions || [];
    }
    return (sessions || []).filter(s => s && s.examId === currentExamFilter);
  }, [sessions, currentExamFilter]);

  // Enrolled students who haven't started yet (if a specific exam is active)
  const unstartedStudents: StudentExamSession[] = useMemo(() => {
    if (!activeExam) return [];
    const allowedClassIds = activeExam.classesAllowed && activeExam.classesAllowed.length > 0
      ? activeExam.classesAllowed
      : classes.map(c => c.id);

    // Students in the target classes
    const targetStudents = (users || []).filter(u => u.role === 'student' && u.classId && allowedClassIds.includes(u.classId));
    const startedStudentIds = new Set(relevantSessions.map(s => s.studentId));

    return targetStudents
      .filter(s => !startedStudentIds.has(s.id))
      .map(student => ({
        id: `unstarted-${student.id}`,
        examId: activeExam.id,
        studentId: student.id,
        studentName: student.name,
        nisn: student.nisnOrNip || '-',
        classId: student.classId || '',
        className: student.className || classes.find(c => c.id === student.classId)?.name || 'Kelas',
        status: 'not_started' as SessionStatus,
        randomizedQuestions: [],
        answers: {},
        flaggedQuestionIds: [],
        currentQuestionIndex: 0,
        startTime: 0,
        timeRemainingSeconds: (activeExam.durationMinutes || 60) * 60,
        score: undefined,
        correctCount: undefined,
        wrongCount: undefined,
        unansweredCount: undefined,
        isPassed: undefined,
        submittedAt: undefined,
        violationsCount: 0,
        violationLogs: [],
        isOnline: false,
        lastSyncTimestamp: Date.now(),
        deviceInfo: 'Belum Login / Masuk Ujian'
      }));
  }, [activeExam, classes, users, relevantSessions]);

  // Combine relevant sessions and optionally unstarted students
  const allProctorRows = useMemo(() => {
    if (!activeExam) return relevantSessions;
    return [...relevantSessions, ...unstartedStudents];
  }, [activeExam, relevantSessions, unstartedStudents]);

  // Filter proctor rows safely
  const filteredRows = useMemo(() => {
    return allProctorRows.filter(row => {
      if (!row) return false;
      if (selectedClassId !== 'all' && row.classId !== selectedClassId) return false;
      if (selectedStatus !== 'all' && row.status !== selectedStatus) return false;
      const q = (searchQuery || '').toLowerCase().trim();
      if (q) {
        return (
          (row.studentName || '').toLowerCase().includes(q) ||
          (row.nisn || '').toLowerCase().includes(q) ||
          (row.className || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [allProctorRows, selectedClassId, selectedStatus, searchQuery]);

  // Live Metrics for this view
  const totalCount = allProctorRows.length;
  const inProgressCount = allProctorRows.filter(s => s.status === 'in_progress').length;
  const completedCount = allProctorRows.filter(s => s.status === 'completed').length;
  const lockedCount = allProctorRows.filter(s => s.status === 'locked').length;
  const notStartedCount = allProctorRows.filter(s => s.status === 'not_started').length;
  const violationLogsTotal = relevantSessions.reduce((acc, s) => acc + (s?.violationLogs?.length || 0), 0);
  const activeCameraCount = useMemo(() => {
    return allProctorRows.filter(s => s.cameraActive && s.status === 'in_progress').length;
  }, [allProctorRows]);

  // Switch exam handler
  const handleExamChange = (examId: string) => {
    setCurrentExamFilter(examId);
    setSelectedExamId(examId === 'all' ? null : examId);
    // Sync URL without full reload
    try {
      const url = new URL(window.location.href);
      if (examId === 'all') {
        url.searchParams.delete('examId');
      } else {
        url.searchParams.set('examId', examId);
      }
      url.searchParams.set('tab', 'control_room');
      window.history.replaceState({}, '', url.toString());
    } catch { /* ignore */ }
  };

  // Open this proctor room in a new tab
  const handleOpenNewTab = (targetExamId?: string) => {
    const examToOpen = targetExamId || currentExamFilter;
    const url = `${window.location.origin}${window.location.pathname}?tab=control_room${examToOpen && examToOpen !== 'all' ? `&examId=${examToOpen}` : ''}`;
    window.open(url, '_blank');
  };

  // Broadcast message handler
  const handleBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastMessage.trim()) return;
    const targetLabel = activeExam ? `[${activeExam.subject}]: ` : '';
    broadcastAlert(`${targetLabel}${broadcastMessage.trim()}`);
    setBroadcastMessage('');
    setShowBroadcastModal(false);
    triggerToast('Pesan siaran darurat berhasil dikirim ke seluruh layar siswa!');
  };

  // Bulk unlock all locked sessions
  const handleBulkUnlock = () => {
    const lockedSessions = relevantSessions.filter(s => s.status === 'locked');
    if (lockedSessions.length === 0) return;
    if (confirm(`Buka kunci untuk seluruh ${lockedSessions.length} siswa yang terkunci saat ini?`)) {
      lockedSessions.forEach(s => {
        resetStudentSession(s.id, 'unlock');
      });
      triggerToast(`${lockedSessions.length} siswa berhasil dibuka kuncinya secara serentak.`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-900 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-emerald-700 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}

      {/* Top Banner: Exam Scoped Hero or Central Header */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 relative overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-72 h-72 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>

        {/* Back navigation & standalone indicator */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 mb-5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('teacher_exams')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Kembali ke Bank Soal</span>
            </button>

            <span className="text-slate-300">/</span>

            <div className="flex items-center gap-1.5 text-xs font-extrabold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-xl border border-indigo-100">
              <Activity className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
              <span>Ruang Pengawas CBT (Proctor Room)</span>
            </div>
          </div>

          {/* Sync indicator & New Tab Button */}
          <div className="flex items-center gap-2">
            <div 
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-[11px] font-bold"
              title="Perubahan data siswa dan reset otomatis sinkron antar-tab dan dashboard secara real-time"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              <span>Sinkron Real-Time Dashboard & Tab Baru</span>
            </div>

            <button
              type="button"
              onClick={() => handleOpenNewTab()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 hover:text-indigo-600 border border-slate-200 hover:border-indigo-300 rounded-xl text-xs font-bold cursor-pointer transition shadow-2xs"
              title="Buka Ruang Pengawas ini di browser Tab Baru / Full-Screen Monitor"
            >
              <ExternalLink className="w-3.5 h-3.5 text-indigo-600" />
              <span>Buka di Tab Baru</span>
            </button>
          </div>
        </div>

        {/* Hero Title & Exam Details */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-2">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {activeExam ? (
                <>
                  <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-md text-[11px] font-extrabold">
                    {activeExam.code}
                  </span>
                  <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-md text-[11px] font-extrabold flex items-center gap-1">
                    <BookOpen className="w-3 h-3 text-emerald-600" />
                    {activeExam.subject}
                  </span>
                  {activeExam.examDate && (
                    <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-extrabold flex items-center gap-1 ${
                      activeExam.examDate === todayYmd
                        ? 'bg-emerald-500 text-white'
                        : activeExam.examDate > todayYmd
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : 'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}>
                      <Calendar className="w-3 h-3" />
                      {activeExam.examDate === todayYmd
                        ? '🟢 Ujian Aktif Hari Ini'
                        : activeExam.examDate > todayYmd
                        ? '⏳ Ujian Terjadwal'
                        : '✅ Selesai Dilaksanakan'}
                    </span>
                  )}
                </>
              ) : (
                <span className="px-3 py-0.5 bg-indigo-100 text-indigo-800 rounded-full text-[11px] font-bold">
                  Monitoring Semua Paket Ujian Simultan
                </span>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
              {activeExam ? activeExam.title : 'Pengawasan Terpusat Multi-Ujian & Multi-Kelas'}
            </h1>

            {/* Badges row: Date, Time, Token, KKM */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 mt-2.5">
              {activeExam ? (
                <>
                  <span className="flex items-center gap-1.5 font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg">
                    <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Jadwal: {formatIndonesianDate(activeExam.examDate)}</span>
                  </span>

                  <span className="flex items-center gap-1 font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>{activeExam.examStartTime || '07:30'} - {activeExam.examEndTime || '09:00'} WIB ({activeExam.durationMinutes || 90} Menit)</span>
                  </span>

                  <span className="flex items-center gap-1 font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                    <Key className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Token: {activeExam.token || systemSettings?.currentExamToken || 'MTS-2026'}</span>
                  </span>

                  <span className="flex items-center gap-1 font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
                    <Award className="w-3.5 h-3.5 text-purple-600" />
                    <span>KKM: {activeExam.passingGrade || 75}</span>
                  </span>

                  <span className="flex items-center gap-1 text-slate-500">
                    <span>Soal: <strong>{activeExam.questions?.length || 20} Butir</strong></span>
                  </span>
                </>
              ) : (
                <>
                  <span className="font-bold text-slate-700">{systemSettings?.schoolName || 'MTs'}</span>
                  <span>•</span>
                  <span>T.A. {systemSettings?.academicYear || '2026/2027'} ({systemSettings?.activeSemester || 'Genap'})</span>
                  <span>•</span>
                  <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    Token Sistem: {systemSettings?.currentExamToken || 'MTS-2026'}
                  </span>
                  <span>•</span>
                  <span>Total {exams.length} Paket Soal Terdaftar</span>
                </>
              )}
            </div>
          </div>

          {/* Quick Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {lockedCount > 0 && (
              <button
                type="button"
                onClick={handleBulkUnlock}
                className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm cursor-pointer transition animate-pulse"
                title="Buka kunci seluruh peserta yang terkena suspensi anti-cheat"
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>Buka Kunci Semua ({lockedCount})</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowBroadcastModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-sm cursor-pointer transition active:scale-95"
            >
              <Megaphone className="w-4 h-4" />
              <span>Kirim Pengumuman Darurat</span>
            </button>
          </div>
        </div>

        {/* 4 Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100">
            <div className="flex items-center justify-between text-indigo-600 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider">Total Sasaran</span>
              <Users className="w-4 h-4" />
            </div>
            <div className="text-2xl font-black text-indigo-950">{totalCount}</div>
            <span className="text-[11px] text-indigo-700 font-medium">
              {activeExam 
                ? `${activeExamClasses.length} Rombel Sasaran`
                : `${classes.length} Rombel Terdaftar`}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-100">
            <div className="flex items-center justify-between text-amber-600 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider">Sedang Mengerjakan</span>
              <Clock className="w-4 h-4" />
            </div>
            <div className="text-2xl font-black text-amber-950">{inProgressCount}</div>
            <span className="text-[11px] text-amber-800 font-medium">Aktif di lembar soal</span>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-100">
            <div className="flex items-center justify-between text-emerald-600 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider">Telah Selesai</span>
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="text-2xl font-black text-emerald-950">{completedCount}</div>
            <span className="text-[11px] text-emerald-800 font-medium">
              {totalCount > 0 ? `${Math.round((completedCount / totalCount) * 100)}% tuntas` : 'Belum ada'}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-100">
            <div className="flex items-center justify-between text-rose-600 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider">Terkunci / Curang</span>
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div className="text-2xl font-black text-rose-950">{lockedCount}</div>
            <span className="text-[11px] text-rose-800 font-medium">{violationLogsTotal} Log Anomali</span>
          </div>
        </div>
      </div>

      {/* Live Anomaly Feed Banner if any locked or violations */}
      {lockedCount > 0 && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 animate-bounce" />
            <div>
              <h4 className="text-xs font-bold text-rose-900 uppercase tracking-wide">Pemberitahuan Sistem Anti-Cheat Aktif</h4>
              <p className="text-xs text-rose-700 mt-0.5">
                Terdapat <strong>{lockedCount} peserta</strong> yang sesinya terkunci otomatis akibat anomali (Pindah Tab / Split-screen). Gunakan tombol <strong>Buka Kunci</strong> untuk memberi dispensasi.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleBulkUnlock}
            className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shrink-0 cursor-pointer transition shadow-xs"
          >
            Buka Kunci Seluruhnya
          </button>
        </div>
      )}

      {/* Filter, Exam Selector, and Search Bar */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Exam Selector Dropdown */}
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-600 shrink-0" />
            <select
              value={currentExamFilter}
              onChange={(e) => handleExamChange(e.target.value)}
              className="px-3 py-2 bg-indigo-50/60 border border-indigo-200 text-indigo-950 font-bold rounded-xl text-xs cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-indigo-500 max-w-xs truncate"
              title="Pilih Paket Soal Ujian untuk dipantau secara khusus"
            >
              <option value="all">Semua Paket Soal ({exams.length} Paket)</option>
              {exams.map(ex => (
                <option key={ex.id} value={ex.id}>
                  [{ex.code}] {ex.title} ({ex.subject}) - 📅 {ex.examDate || 'Hari Ini'}
                </option>
              ))}
            </select>
          </div>

          {/* Class Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Semua Rombel ({activeExamClasses.length})</option>
              {activeExamClasses.map(cls => (
                <option key={cls.id} value={cls.id}>{cls.name}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Semua Status Peserta</option>
              <option value="in_progress">Sedang Mengerjakan ({inProgressCount})</option>
              <option value="completed">Telah Selesai ({completedCount})</option>
              <option value="locked">Terkunci / Curang ({lockedCount})</option>
              {activeExam && <option value="not_started">Belum Masuk ({notStartedCount})</option>}
            </select>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Cari siswa, NISN, atau kelas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* View Switcher: CCTV Camera Grid vs Detail Table */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode('gallery')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition ${
                viewMode === 'gallery'
                  ? 'bg-white text-indigo-700 shadow-xs ring-1 ring-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5 text-indigo-600" />
              <span>Galeri Kamera Siswa (CCTV Grid)</span>
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-black">
                {activeCameraCount} Kamera Aktif
              </span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition ${
                viewMode === 'table'
                  ? 'bg-white text-indigo-700 shadow-xs ring-1 ring-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5 text-indigo-600" />
              <span>Tabel Detail & Kontrol</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-semibold text-slate-700">
            <Video className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
            <span>Kamera Siswa Terhubung: <strong className="text-emerald-700 font-bold">{activeCameraCount} Siswa</strong></span>
          </span>
          <button
            type="button"
            onClick={() => triggerToast('Pratinjau snapshot kamera seluruh siswa diperbarui.')}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition cursor-pointer"
            title="Muat Ulang Gambar Kamera Siswa"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODE 1: CCTV CAMERA GALLERY (LIVE PROCTORING GRID)                        */}
      {/* Menampilkan visual kamera HP/Laptop seluruh siswa yang sedang mengerjakan */}
      {/* ========================================================================= */}
      {viewMode === 'gallery' ? (
        <div className="space-y-4">
          {/* Banner Galeri */}
          <div className="p-4 bg-indigo-50/70 border border-indigo-200/80 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-indigo-900">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                <Video className="w-4 h-4" />
              </div>
              <div>
                <span className="font-extrabold text-indigo-950 block">Ruang Pemantauan Kamera Pengawas (Proctoring Visual CCTV)</span>
                <span className="text-[11px] text-indigo-700">
                  Menampilkan foto langsung dari kamera perangkat siswa (laptop/ponsel) yang sedang mengerjakan ujian. Klik kartu untuk memperbesar dan membuka kontrol siswa.
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="px-2.5 py-1 bg-white border border-indigo-200 text-indigo-900 rounded-lg text-[10px] font-bold">
                Auto-Sync Snapshot 4 Detik
              </span>
            </div>
          </div>

          {filteredRows.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-sm text-slate-400">
              <CameraOff className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="font-bold text-slate-600">Tidak ada siswa ditemukan</p>
              <p className="text-xs text-slate-400 mt-1">Coba sesuaikan filter rombel atau status di atas.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredRows.map((session) => {
                const examOfSession = (exams || []).find(e => e.id === session.examId) || activeExam;
                const answeredCount = session.answers ? Object.keys(session.answers).length : 0;
                const totalQ = examOfSession?.totalQuestions || examOfSession?.questions?.length || 10;
                const percentDone = session.status === 'not_started' 
                  ? 0 
                  : Math.min(100, Math.round((answeredCount / (totalQ || 1)) * 100));

                return (
                  <div 
                    key={session.id}
                    className={`bg-white rounded-2xl border transition-all shadow-sm overflow-hidden flex flex-col justify-between hover:shadow-md ${
                      session.status === 'locked' 
                        ? 'border-rose-400 ring-2 ring-rose-200' 
                        : (session.violationsCount || 0) > 0 
                        ? 'border-amber-300' 
                        : 'border-slate-200 hover:border-indigo-300'
                    }`}
                  >
                    {/* Card Top: Student Name & Class */}
                    <div className="p-3 border-b border-slate-100 flex items-start justify-between gap-2 bg-slate-50/50">
                      <div className="min-w-0">
                        <div className="font-bold text-slate-800 text-xs truncate" title={session.studentName}>
                          {session.studentName || 'Peserta'}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                          <span>{session.nisn || '-'}</span>
                          <span>•</span>
                          <span className="px-1.5 py-0.2 bg-slate-200/70 text-slate-700 font-bold rounded">
                            {session.className}
                          </span>
                        </div>
                      </div>

                      {/* Camera Live Indicator */}
                      <div className="shrink-0 flex items-center gap-1">
                        {session.cameraActive && session.status === 'in_progress' ? (
                          <span className="flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[9px] font-bold" title="Kamera siswa aktif & tersinkron">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                            <span>LIVE</span>
                          </span>
                        ) : session.status === 'completed' ? (
                          <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[9px] font-bold">
                            SELESAI
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 bg-slate-100 text-slate-400 rounded text-[9px] font-medium">
                            STANDBY
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Camera Feed Viewport */}
                    <div 
                      onClick={() => setInspectedSession(session)}
                      className="relative aspect-4/3 w-full bg-slate-950 overflow-hidden cursor-pointer group"
                      title="Klik untuk memperbesar pratinjau kamera siswa"
                    >
                      {session.cameraSnapshot ? (
                        <>
                          <img 
                            src={session.cameraSnapshot} 
                            alt={`Kamera ${session.studentName}`} 
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                          />
                          {/* Dark overlay on hover with Maximize icon */}
                          <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-bold gap-1.5">
                            <Maximize2 className="w-4 h-4" />
                            <span>Perbesar Kamera</span>
                          </div>
                        </>
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center text-slate-400 bg-slate-900">
                          <CameraOff className="w-8 h-8 text-slate-600 mb-1" />
                          <span className="text-[10px] font-semibold text-slate-300">
                            {session.status === 'not_started' ? 'Belum Masuk Ujian' : 'Kamera Belum Memancar'}
                          </span>
                          <span className="text-[9px] text-slate-500 mt-0.5">
                            {session.deviceInfo?.split('/')[0] || 'Menunggu Perangkat Siswa'}
                          </span>
                        </div>
                      )}

                      {/* Overlay: Status badge top-right */}
                      <div className="absolute top-2 right-2 pointer-events-none">
                        {session.status === 'in_progress' && (
                          <span className="px-2 py-0.5 bg-amber-500/90 text-white backdrop-blur-xs rounded text-[9px] font-bold shadow">
                            Mengerjakan
                          </span>
                        )}
                        {session.status === 'locked' && (
                          <span className="px-2 py-0.5 bg-rose-600 text-white backdrop-blur-xs rounded text-[9px] font-bold shadow animate-pulse">
                            TERKUNCI
                          </span>
                        )}
                        {session.status === 'completed' && (
                          <span className="px-2 py-0.5 bg-emerald-600 text-white backdrop-blur-xs rounded text-[9px] font-bold shadow">
                            Selesai (Nilai: {session.score ?? '-'})
                          </span>
                        )}
                        {session.status === 'not_started' && (
                          <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded text-[9px] font-bold shadow">
                            Belum Mulai
                          </span>
                        )}
                      </div>

                      {/* Overlay: Watermark bottom */}
                      {session.cameraSnapshot && (
                        <div className="absolute bottom-1.5 left-2 right-2 flex items-center justify-between text-[8px] font-mono text-white/90 bg-black/60 backdrop-blur-xs px-1.5 py-0.5 rounded pointer-events-none">
                          <span className="truncate max-w-[120px]">{session.studentName}</span>
                          <span>{session.lastCameraUpdate ? new Date(session.lastCameraUpdate).toLocaleTimeString('id-ID') : 'Live'} WIB</span>
                        </div>
                      )}
                    </div>

                    {/* Card Footer: Progress & Quick Action */}
                    <div className="p-3 space-y-2 text-xs">
                      {/* Progress bar */}
                      <div>
                        <div className="flex items-center justify-between text-[10px] font-semibold text-slate-600 mb-1">
                          <span>{answeredCount} / {totalQ} Soal</span>
                          <span>{percentDone}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className={`h-1.5 rounded-full transition-all duration-300 ${
                              session.status === 'completed' ? 'bg-emerald-500' : 'bg-indigo-600'
                            }`}
                            style={{ width: `${percentDone}%` }}
                          />
                        </div>
                      </div>

                      {/* Violations & Action row */}
                      <div className="flex items-center justify-between gap-1 pt-1 border-t border-slate-100 text-[11px]">
                        <div>
                          {(session.violationsCount || 0) === 0 ? (
                            <span className="text-emerald-700 font-bold flex items-center gap-1 text-[10px]">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Tertib</span>
                            </span>
                          ) : (
                            <span className="text-rose-700 font-bold flex items-center gap-1 text-[10px] bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                              <span>{session.violationsCount} Pelanggaran</span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          {session.status === 'locked' && (
                            <button
                              type="button"
                              onClick={() => {
                                resetStudentSession(session.id, 'unlock');
                                triggerToast(`Kunci sesi ${session.studentName} berhasil dibuka.`);
                              }}
                              className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-bold cursor-pointer transition flex items-center gap-1 shadow-xs"
                            >
                              <Unlock className="w-3 h-3" />
                              <span>Buka Kunci</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => setInspectedSession(session)}
                            className="px-2 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 rounded-lg text-[10px] font-bold cursor-pointer transition flex items-center gap-1"
                            title="Buka Pratinjau & Kontrol"
                          >
                            <Eye className="w-3 h-3 text-indigo-600" />
                            <span>Detail</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* ========================================================================= */
        /* MODE 2: DETAIL TABLE (WITH CAMERA SNAPSHOT THUMBNAIL)                     */
        /* ========================================================================= */
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-4 text-center">Foto Kamera</th>
                  <th className="px-5 py-4">Nama Siswa / NISN</th>
                  <th className="px-4 py-4">Kelas</th>
                  {currentExamFilter === 'all' && <th className="px-4 py-4">Paket Soal Ujian</th>}
                  <th className="px-4 py-4">Status Ujian</th>
                  <th className="px-4 py-4">Progres Pengerjaan</th>
                  <th className="px-4 py-4">Nilai Sementara</th>
                  <th className="px-4 py-4">Teguran Anti-Cheat</th>
                  <th className="px-5 py-4 text-right">Aksi Kontrol / Reset</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={currentExamFilter === 'all' ? 9 : 8} className="text-center py-12 text-slate-400">
                      <div className="max-w-xs mx-auto text-center space-y-2">
                        <Users className="w-8 h-8 text-slate-300 mx-auto" />
                        <p className="font-bold text-slate-600">Tidak ada data siswa</p>
                        <p className="text-[11px] text-slate-400">
                          Tidak ditemukan siswa yang cocok dengan filter kelas atau status yang dipilih.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((session) => {
                    const examOfSession = (exams || []).find(e => e.id === session.examId) || activeExam;
                    const answeredCount = session.answers ? Object.keys(session.answers).length : 0;
                    const totalQ = examOfSession?.totalQuestions || examOfSession?.questions?.length || 10;
                    const percentDone = session.status === 'not_started' 
                      ? 0 
                      : Math.min(100, Math.round((answeredCount / (totalQ || 1)) * 100));

                    return (
                      <tr key={session.id} className="hover:bg-slate-50/80 transition">
                        {/* Live Camera Snapshot Thumbnail */}
                        <td className="px-4 py-3.5 text-center">
                          <button
                            type="button"
                            onClick={() => setInspectedSession(session)}
                            className="relative inline-block group cursor-pointer"
                            title="Klik untuk memperbesar kamera siswa"
                          >
                            {session.cameraSnapshot ? (
                              <div className="relative w-12 h-9 rounded-lg overflow-hidden border border-slate-300 shadow-2xs group-hover:ring-2 group-hover:ring-indigo-500 transition">
                                <img 
                                  src={session.cameraSnapshot} 
                                  alt={session.studentName} 
                                  className="w-full h-full object-cover"
                                />
                                {session.cameraActive && session.status === 'in_progress' && (
                                  <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-emerald-500 border border-white"></span>
                                )}
                              </div>
                            ) : (
                              <div className="w-12 h-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                                <CameraOff className="w-4 h-4" />
                              </div>
                            )}
                          </button>
                        </td>

                        {/* Name & NISN */}
                        <td className="px-5 py-3.5">
                          <div className="font-bold text-slate-800">{session.studentName || 'Peserta'}</div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                            <span>{session.nisn || '-'}</span>
                            <span>•</span>
                            <span className="truncate max-w-[120px]">{session.deviceInfo?.split('/')[0] || 'Browser Web'}</span>
                          </div>
                        </td>

                        {/* Class */}
                        <td className="px-4 py-3.5">
                          <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg font-bold text-[11px]">
                            {session.className || '-'}
                          </span>
                        </td>

                        {/* Exam Title (when in 'all' view) */}
                        {currentExamFilter === 'all' && (
                          <td className="px-4 py-3.5">
                            <button
                              type="button"
                              onClick={() => handleExamChange(session.examId)}
                              className="font-bold text-indigo-600 hover:text-indigo-800 hover:underline text-[11px] text-left block"
                              title="Klik untuk memantau paket soal ini secara khusus"
                            >
                              {examOfSession?.title || session.examId}
                            </button>
                            <span className="text-[10px] text-slate-400">{examOfSession?.subject || '-'}</span>
                          </td>
                        )}

                        {/* Status */}
                        <td className="px-4 py-3.5">
                          {session.status === 'in_progress' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full font-bold text-[11px]">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                              Sedang Mengerjakan
                            </span>
                          )}
                          {session.status === 'completed' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-bold text-[11px]">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Selesai
                            </span>
                          )}
                          {session.status === 'locked' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-100 text-rose-800 border border-rose-300 rounded-full font-bold text-[11px] animate-pulse">
                              <Lock className="w-3.5 h-3.5" />
                              Terkunci (Curang)
                            </span>
                          )}
                          {session.status === 'not_started' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-500 border border-slate-200 rounded-full font-medium text-[11px]">
                              Belum Memulai
                            </span>
                          )}
                        </td>

                        {/* Progress bar */}
                        <td className="px-4 py-3.5 min-w-[140px]">
                          {session.status === 'not_started' ? (
                            <span className="text-[11px] text-slate-400 italic">Belum buka soal</span>
                          ) : (
                            <>
                              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 mb-1">
                                <span>{answeredCount} / {totalQ} Soal</span>
                                <span>{percentDone}%</span>
                              </div>
                              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className={`h-1.5 rounded-full transition-all duration-500 ${
                                    session.status === 'completed' ? 'bg-emerald-500' : 'bg-indigo-600'
                                  }`}
                                  style={{ width: `${percentDone}%` }}
                                ></div>
                              </div>
                            </>
                          )}
                        </td>

                        {/* Score */}
                        <td className="px-4 py-3.5 font-bold">
                          {session.score !== undefined ? (
                            <span className={`text-sm ${session.score >= (examOfSession?.passingGrade ?? 75) ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {session.score}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-normal italic">-</span>
                          )}
                        </td>

                        {/* Violations / Anti-cheat */}
                        <td className="px-4 py-3.5">
                          {session.status === 'not_started' ? (
                            <span className="text-slate-400 text-[11px]">-</span>
                          ) : (session.violationsCount || 0) === 0 ? (
                            <span className="text-emerald-600 font-semibold text-[11px] flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Tertib
                            </span>
                          ) : (
                            <div className="group relative cursor-pointer inline-block">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded font-bold text-[11px]">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                {session.violationsCount} Pelanggaran
                              </span>
                              {/* Tooltip on hover */}
                              <div className="hidden group-hover:block absolute left-0 bottom-full mb-2 w-64 p-3 bg-slate-900 text-white text-[10px] rounded-xl shadow-xl z-20 pointer-events-none">
                                <p className="font-bold border-b border-slate-700 pb-1 mb-1 text-slate-300">Rincian Anomali:</p>
                                {(session.violationLogs || []).map((v, i) => (
                                  <div key={i} className="mb-1 text-rose-300">
                                    • {v.detail} ({v.timestamp ? new Date(v.timestamp).toLocaleTimeString('id-ID') : '-'})
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </td>

                        {/* Action Menu (RESET / UNLOCK) */}
                        <td className="px-5 py-3.5 text-right">
                          {session.status === 'not_started' ? (
                            <span className="text-[11px] text-slate-400 italic">Menunggu Login</span>
                          ) : (
                            <div className="relative inline-block text-left">
                              <div className="flex items-center justify-end gap-1.5">
                                {session.status === 'locked' && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      resetStudentSession(session.id, 'unlock');
                                      triggerToast(`Kunci ujian ${session.studentName} berhasil dibuka.`);
                                    }}
                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer transition flex items-center gap-1 active:scale-95"
                                    title="Buka kunci agar siswa dapat melanjutkan ujian"
                                  >
                                    <Unlock className="w-3.5 h-3.5" />
                                    <span>Buka Kunci</span>
                                  </button>
                                )}

                                {session.status === 'completed' && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (confirm(`Buka akses ujian untuk ${session.studentName}? Siswa akan dapat mengerjakan kembali soal ini.`)) {
                                        resetStudentSession(session.id, 'reopen_exam');
                                        triggerToast(`Akses ujian ${session.studentName} dibuka kembali.`);
                                      }
                                    }}
                                    className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer transition flex items-center gap-1 active:scale-95"
                                    title="Buka akses agar siswa dapat mengerjakan kembali"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                    <span>Buka Akses</span>
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => setActiveActionSessionId(activeActionSessionId === session.id ? null : session.id)}
                                  className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer transition"
                                  title="Menu Kontrol Siswa"
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </button>
                              </div>

                              {/* Action Dropdown Menu */}
                              {activeActionSessionId === session.id && (
                                <div className="absolute right-0 mt-1 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-30 text-left text-xs animate-in fade-in zoom-in-95">
                                  <div className="px-3 py-1.5 font-bold text-[10px] uppercase text-slate-400 border-b border-slate-100">
                                    Menu Kontrol & Reset
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setInspectedSession(session);
                                      setActiveActionSessionId(null);
                                    }}
                                    className="w-full px-3 py-2 text-indigo-700 hover:bg-indigo-50 rounded-xl font-bold flex items-center gap-2 cursor-pointer mb-1"
                                  >
                                    <Maximize2 className="w-3.5 h-3.5 text-indigo-600" />
                                    <span>Lihat Pratinjau Kamera</span>
                                  </button>

                                  {session.status === 'completed' && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        resetStudentSession(session.id, 'reopen_exam');
                                        setActiveActionSessionId(null);
                                        triggerToast(`Akses pengerjaan dibuka kembali untuk ${session.studentName}.`);
                                      }}
                                      className="w-full px-3 py-2 text-amber-800 hover:bg-amber-50 rounded-xl font-bold flex items-center gap-2 cursor-pointer border-b border-amber-100 mb-1"
                                    >
                                      <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                                      <span>Buka Akses Pengerjaan Kembali</span>
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => {
                                      resetStudentSession(session.id, 'unlock');
                                      setActiveActionSessionId(null);
                                      triggerToast(`Kunci sesi ${session.studentName} dibuka.`);
                                    }}
                                    className="w-full px-3 py-2 text-slate-700 hover:bg-slate-50 rounded-xl font-medium flex items-center gap-2 cursor-pointer"
                                  >
                                    <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>Buka Kunci Sesi</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      resetStudentSession(session.id, 'reset_violations');
                                      setActiveActionSessionId(null);
                                      triggerToast(`Poin pelanggaran ${session.studentName} direset ke 0.`);
                                    }}
                                    className="w-full px-3 py-2 text-slate-700 hover:bg-slate-50 rounded-xl font-medium flex items-center gap-2 cursor-pointer"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5 text-indigo-600" />
                                    <span>Reset Poin Pelanggaran (0)</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      resetStudentSession(session.id, 'add_10_mins');
                                      setActiveActionSessionId(null);
                                      triggerToast(`Waktu pengerjaan ${session.studentName} ditambah +10 menit.`);
                                    }}
                                    className="w-full px-3 py-2 text-slate-700 hover:bg-slate-50 rounded-xl font-medium flex items-center gap-2 cursor-pointer"
                                  >
                                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                                    <span>Tambah Waktu (+10 Menit)</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (confirm(`Kumpulkan paksa lembar ujian untuk ${session.studentName}? Jawaban yang sudah terisi akan otomatis dinilai.`)) {
                                        resetStudentSession(session.id, 'force_submit');
                                        setActiveActionSessionId(null);
                                        triggerToast(`Ujian ${session.studentName} dikumpulkan paksa.`);
                                      }
                                    }}
                                    className="w-full px-3 py-2 text-slate-700 hover:bg-slate-50 rounded-xl font-medium flex items-center gap-2 cursor-pointer"
                                  >
                                    <Send className="w-3.5 h-3.5 text-sky-600" />
                                    <span>Kumpulkan Paksa (Force Submit)</span>
                                  </button>

                                  <div className="border-t border-slate-100 my-1"></div>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (confirm(`Yakin ingin mereset ujian ${session.studentName} dari awal? Seluruh jawaban sebelumnya akan dihapus.`)) {
                                        resetStudentSession(session.id, 'reset_exam');
                                        setActiveActionSessionId(null);
                                        triggerToast(`Ujian ${session.studentName} direset total.`);
                                      }
                                    }}
                                    className="w-full px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-xl font-medium flex items-center gap-2 cursor-pointer"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
                                    <span>Reset Total & Mulai Ulang</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DETAILED STUDENT CAMERA & SESSION INSPECTOR MODAL                          */}
      {/* ========================================================================= */}
      {inspectedSession && (
        <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
                  <Video className="w-5 h-5 text-indigo-200" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-white">{inspectedSession.studentName}</h3>
                    <span className="px-2 py-0.5 bg-indigo-500/30 text-indigo-300 border border-indigo-400/30 rounded text-[10px] font-bold">
                      {inspectedSession.className}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                    <span>NISN: {inspectedSession.nisn || '-'}</span>
                    <span>•</span>
                    <span>{inspectedSession.deviceInfo || 'Browser Siswa'}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setInspectedSession(null)}
                className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 sm:p-6 space-y-5 overflow-y-auto">
              {/* Big Camera Snapshot View */}
              <div className="bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 relative shadow-inner aspect-16/9 flex items-center justify-center">
                {inspectedSession.cameraSnapshot ? (
                  <img 
                    src={inspectedSession.cameraSnapshot} 
                    alt={`Live Cam ${inspectedSession.studentName}`} 
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="text-center p-6 text-slate-400 space-y-2">
                    <CameraOff className="w-12 h-12 text-slate-600 mx-auto" />
                    <p className="font-bold text-slate-300 text-sm">Tidak Ada Sinyal Kamera</p>
                    <p className="text-xs text-slate-500">Siswa belum mengaktifkan izin kamera pada peramban perangkatnya.</p>
                  </div>
                )}

                {/* Overlays */}
                <div className="absolute top-3 left-3 px-2.5 py-1 bg-black/75 backdrop-blur-xs text-emerald-400 border border-emerald-500/40 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 shadow">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>KAMERA PENGAWAS TERHUBUNG</span>
                </div>

                <div className="absolute bottom-3 right-3 px-2.5 py-1 bg-black/75 backdrop-blur-xs text-slate-200 rounded-lg text-xs font-mono shadow">
                  {inspectedSession.lastCameraUpdate ? new Date(inspectedSession.lastCameraUpdate).toLocaleTimeString('id-ID') : 'Live'} WIB
                </div>
              </div>

              {/* Status and Progress Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Status Ujian</span>
                  <span className={`text-xs font-extrabold mt-1 inline-block ${
                    inspectedSession.status === 'in_progress' ? 'text-amber-600' :
                    inspectedSession.status === 'locked' ? 'text-rose-600' :
                    inspectedSession.status === 'completed' ? 'text-emerald-600' : 'text-slate-500'
                  }`}>
                    {inspectedSession.status === 'in_progress' ? 'Sedang Mengerjakan' :
                     inspectedSession.status === 'locked' ? 'Terkunci (Curang)' :
                     inspectedSession.status === 'completed' ? 'Telah Selesai' : 'Belum Masuk'}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Jawaban Terisi</span>
                  <span className="text-sm font-black text-indigo-600 mt-1 block">
                    {inspectedSession.answers ? Object.keys(inspectedSession.answers).length : 0} Soal
                  </span>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Sisa Waktu</span>
                  <span className="text-xs font-mono font-bold text-slate-800 mt-1 block">
                    {Math.floor(inspectedSession.timeRemainingSeconds / 60)} Menit
                  </span>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Poin Teguran</span>
                  <span className={`text-xs font-bold mt-1 block ${
                    inspectedSession.violationsCount === 0 ? 'text-emerald-600' : 'text-rose-600'
                  }`}>
                    {inspectedSession.violationsCount || 0} Teguran
                  </span>
                </div>
              </div>

              {/* Anomaly & Violation Log */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  <span>Riwayat Anomali Anti-Cheat ({inspectedSession.violationLogs?.length || 0})</span>
                </h4>
                {(!inspectedSession.violationLogs || inspectedSession.violationLogs.length === 0) ? (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Tidak ada anomali atau upaya kecurangan tercatat. Siswa mengerjakan ujian secara tertib.</span>
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto p-2 bg-slate-50 border border-slate-200 rounded-xl">
                    {inspectedSession.violationLogs.map((log) => (
                      <div key={log.id} className="p-2 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-start gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold">{log.detail}</span>
                          <span className="block text-[10px] text-slate-400 mt-0.5">
                            {log.timestamp ? new Date(log.timestamp).toLocaleTimeString('id-ID') : '-'} WIB
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  {inspectedSession.status === 'locked' && (
                    <button
                      type="button"
                      onClick={() => {
                        resetStudentSession(inspectedSession.id, 'unlock');
                        setInspectedSession(prev => prev ? { ...prev, status: 'in_progress' } : null);
                        triggerToast(`Kunci ujian ${inspectedSession.studentName} dibuka.`);
                      }}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition"
                    >
                      <Unlock className="w-3.5 h-3.5" />
                      <span>Buka Kunci Sesi</span>
                    </button>
                  )}

                  {inspectedSession.status === 'completed' && (
                    <button
                      type="button"
                      onClick={() => {
                        resetStudentSession(inspectedSession.id, 'reopen_exam');
                        setInspectedSession(prev => prev ? { ...prev, status: 'in_progress' } : null);
                        triggerToast(`Akses ujian ${inspectedSession.studentName} dibuka kembali.`);
                      }}
                      className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Buka Akses Pengerjaan</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      resetStudentSession(inspectedSession.id, 'add_10_mins');
                      triggerToast(`Waktu ujian ${inspectedSession.studentName} ditambah +10 menit.`);
                    }}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition"
                  >
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>+10 Menit</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      resetStudentSession(inspectedSession.id, 'reset_violations');
                      setInspectedSession(prev => prev ? { ...prev, violationsCount: 0, violationLogs: [] } : null);
                      triggerToast(`Teguran ${inspectedSession.studentName} direset ke 0.`);
                    }}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Reset Pelanggaran</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setInspectedSession(null)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs cursor-pointer transition"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Broadcast Message Modal */}
      {showBroadcastModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200">
            <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider mb-2">
              <Megaphone className="w-4 h-4" />
              <span>Siaran Pengawas Ujian (Broadcast Alert)</span>
            </div>
            <h3 className="text-lg font-black text-slate-900 mb-1">
              {activeExam 
                ? `Kirim Notifikasi ke Siswa Ujian ${activeExam.subject}`
                : 'Kirim Notifikasi Instan ke Seluruh Siswa'}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Pesan ini akan langsung muncul di bagian atas layar seluruh siswa secara real-time dan tersinkron ke semua tab browser.
            </p>

            <form onSubmit={handleBroadcast} className="space-y-4">
              <textarea
                required
                rows={3}
                placeholder="Contoh: Waktu pengerjaan tersisa 10 menit lagi. Harap periksa kembali nomor yang masih bertanda ragu-ragu."
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-medium"
              />

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowBroadcastModal(false)}
                  className="px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold cursor-pointer transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md cursor-pointer transition flex items-center gap-1.5 active:scale-95"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Kirim Pesan Sekarang</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
