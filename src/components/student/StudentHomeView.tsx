import React, { useState, useEffect, useMemo } from 'react';
import { useCbt } from '../../context/CbtContext';
import { 
  GraduationCap, 
  BookOpen, 
  Clock, 
  CheckCircle2, 
  Lock, 
  Play, 
  AlertCircle, 
  HelpCircle, 
  Sparkles, 
  FileText, 
  Calendar, 
  ShieldCheck, 
  ArrowRight, 
  Award, 
  School,
  AlertTriangle,
  RotateCcw,
  Key,
  X,
  ShieldAlert
} from 'lucide-react';
import { Exam } from '../../types/cbt';

export const StudentHomeView: React.FC = () => {
  const { 
    currentUser, 
    exams, 
    sessions, 
    selectAndStartExam, 
    systemSettings,
    setActiveTab,
    setSelectedExamId
  } = useCbt();

  const [activeFilter, setActiveFilter] = useState<'all' | 'ready' | 'completed'>('all');
  const [dateFilter, setDateFilter] = useState<'today' | 'upcoming' | 'all'>('today');
  const [currentTimeStr, setCurrentTimeStr] = useState<string>('');

  // Token Verification Modal State (Siswa wajib memasukkan token)
  const [tokenModalExam, setTokenModalExam] = useState<Exam | null>(null);
  const [inputToken, setInputToken] = useState<string>('');
  const [tokenError, setTokenError] = useState<string | null>(null);

  const handleInitiateExam = (exam: Exam) => {
    // Check if token already verified in localStorage for this student & exam
    const storageKey = `cbt_token_${currentUser?.id}_${exam.id}`;
    const isAlreadyVerified = localStorage.getItem(storageKey) === 'verified';

    if (isAlreadyVerified) {
      selectAndStartExam(exam.id);
      return;
    }

    // Open token verification modal
    setTokenModalExam(exam);
    setInputToken('');
    setTokenError(null);
  };

  const handleVerifyTokenAndStart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenModalExam) return;

    const expectedToken = (tokenModalExam.token || 'AM2026').trim().toUpperCase();
    const entered = inputToken.trim().toUpperCase();

    if (entered !== expectedToken) {
      setTokenError(`Token "${entered}" salah! Silakan tanyakan token valid ke guru / pengawas ruang.`);
      return;
    }

    // Mark as verified for this student & exam
    if (currentUser?.id) {
      localStorage.setItem(`cbt_token_${currentUser.id}_${tokenModalExam.id}`, 'verified');
    }
    const examId = tokenModalExam.id;
    setTokenModalExam(null);
    setInputToken('');
    setTokenError(null);
    selectAndStartExam(examId);
  };

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTimeStr(now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WIB');
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const todayYmd = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  const todayDateFormatted = useMemo(() => {
    return new Date().toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }, []);

  // Filter exams that are allowed for this student's class
  const eligibleExams = useMemo(() => {
    return (exams || []).filter((e: Exam) => {
      if (!e || e.status !== 'active') return false;
      if (!currentUser?.classId && !currentUser?.className) return true;
      if (!e.classesAllowed || !Array.isArray(e.classesAllowed) || e.classesAllowed.length === 0) return true;
      return e.classesAllowed.some(clsId => {
        if (!clsId) return false;
        const strId = String(clsId).toLowerCase();
        const userClassId = (currentUser.classId || '').toLowerCase();
        const userClassName = (currentUser.className || '').toLowerCase();
        return (
          (userClassId && strId === userClassId) || 
          (userClassName && strId === userClassName) ||
          (userClassName && strId.includes(userClassName))
        );
      });
    });
  }, [exams, currentUser]);

  // Categorize exams by scheduled execution date (examDate)
  const todayExams = useMemo(() => {
    return eligibleExams.filter((e: Exam) => {
      const eDate = e.examDate || e.startTime?.split('T')[0] || todayYmd;
      return eDate === todayYmd;
    });
  }, [eligibleExams, todayYmd]);

  const upcomingExams = useMemo(() => {
    return eligibleExams.filter((e: Exam) => {
      const eDate = e.examDate || e.startTime?.split('T')[0] || todayYmd;
      return eDate > todayYmd;
    });
  }, [eligibleExams, todayYmd]);

  const pastExams = useMemo(() => {
    return eligibleExams.filter((e: Exam) => {
      const eDate = e.examDate || e.startTime?.split('T')[0] || todayYmd;
      return eDate < todayYmd;
    });
  }, [eligibleExams, todayYmd]);

  // Exams scoped by dateFilter: 'today' | 'upcoming' | 'all'
  const dateScopedExams = useMemo(() => {
    if (dateFilter === 'today') return todayExams;
    if (dateFilter === 'upcoming') return upcomingExams;
    return eligibleExams;
  }, [dateFilter, todayExams, upcomingExams, eligibleExams]);

  // Calculate status counts
  let completedCount = 0;
  let readyCount = 0;
  let inProgressCount = 0;

  eligibleExams.forEach((exam: Exam) => {
    const session = sessions.find(s => s.examId === exam.id && s.studentId === currentUser?.id);
    if (session?.status === 'completed' || session?.submittedAt) {
      completedCount++;
    } else if (session?.status === 'in_progress') {
      inProgressCount++;
    } else {
      readyCount++;
    }
  });

  // Calculate ready exams for today
  const readyTodayCount = useMemo(() => {
    return todayExams.filter((exam: Exam) => {
      const session = sessions.find(s => s.examId === exam.id && s.studentId === currentUser?.id);
      return session?.status !== 'completed' && !session?.submittedAt;
    }).length;
  }, [todayExams, sessions, currentUser?.id]);

  const filteredExams = useMemo(() => {
    return dateScopedExams.filter((exam: Exam) => {
      const session = sessions.find(s => s.examId === exam.id && s.studentId === currentUser?.id);
      const isCompleted = session?.status === 'completed' || !!session?.submittedAt;
      if (activeFilter === 'ready') return !isCompleted;
      if (activeFilter === 'completed') return isCompleted;
      return true;
    });
  }, [dateScopedExams, activeFilter, sessions, currentUser?.id]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Student Welcome Header Card */}
      <div className="bg-gradient-to-r from-emerald-700 via-teal-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        {/* Subtle background ornamentation */}
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>
        <div className="absolute right-12 bottom-0 w-48 h-48 bg-teal-400/10 rounded-full blur-xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center font-black text-2xl sm:text-3xl text-emerald-200 shadow-inner shrink-0">
              {currentUser?.name?.charAt(0) || 'S'}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="px-2.5 py-0.5 bg-emerald-400/20 text-emerald-200 border border-emerald-400/30 rounded-full text-[10px] font-black uppercase tracking-wider">
                  Peserta Ujian Asesmen Madrasah
                </span>
                <span className="px-2 py-0.5 bg-white/15 text-white/90 rounded-full text-[10px] font-bold">
                  {currentUser?.className || 'Kelas VII MTs'}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-white">
                {currentUser?.name || 'Siswa Madrasah'}
              </h1>
              <p className="text-xs sm:text-sm text-emerald-100/80 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                <span>NISN: <strong className="text-white font-mono">{currentUser?.nisnOrNip || '-'}</strong></span>
                <span>•</span>
                <span>Lembaga: <strong className="text-white">{systemSettings.schoolName}</strong></span>
              </p>
            </div>
          </div>

          {/* Live Date and Time Widget */}
          <div className="bg-black/25 backdrop-blur-md border border-white/15 rounded-2xl p-4 sm:p-5 flex flex-col items-start md:items-end justify-center shrink-0">
            <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold uppercase tracking-wider mb-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>{todayDateFormatted}</span>
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white">
              {currentTimeStr || '07:30:00 WIB'}
            </div>
            <div className="text-[11px] text-emerald-200/80 mt-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span>Server CBT Sinkron & Online</span>
            </div>
          </div>
        </div>
      </div>

      {/* Important Instruction & Rules Notice */}
      <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5 shadow-xs">
        <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-xs shrink-0 mt-0.5">
          <Sparkles className="w-5 h-5" />
        </div>
        <div className="text-xs text-emerald-950 space-y-1 leading-relaxed">
          <div className="font-extrabold text-sm text-emerald-900 flex items-center gap-2">
            <span>Petunjuk Pengerjaan Asesmen Madrasah (AM) Terpadu:</span>
          </div>
          <p>
            1. Pilihlah salah satu paket soal yang berstatus <strong>Aktif & Siap Dikerjakan</strong> di bawah ini untuk memulai ujian hari ini.
          </p>
          <p>
            2. <strong>Perhatian:</strong> Soal yang sudah selesai dikerjakan dan dikirimkan akan <strong>berubah menjadi warna abu-abu (terkunci)</strong> dan tidak dapat diakses kembali oleh santri kecuali telah dibuka / direset oleh Administrator atau Pengawas Ujian.
          </p>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Soal Hari Ini</div>
            <div className="text-xl sm:text-2xl font-black text-emerald-800">{todayExams.length} Paket</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-teal-50 border border-teal-100 text-teal-700 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Siap Dikerjakan</div>
            <div className="text-xl sm:text-2xl font-black text-teal-700">{readyTodayCount} Paket</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 text-blue-700 flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Akan Datang</div>
            <div className="text-xl sm:text-2xl font-black text-blue-700">{upcomingExams.length} Paket</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Sudah Selesai</div>
            <div className="text-xl sm:text-2xl font-black text-slate-700">{completedCount} Paket</div>
          </div>
        </div>
      </div>

      {/* Date Filter Bar & Status Filter */}
      <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-emerald-600" />
            <span>Pilih Jadwal Ujian:</span>
          </span>

          {/* Tab 1: Hari Ini */}
          <button
            type="button"
            onClick={() => setDateFilter('today')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition shadow-2xs ${
              dateFilter === 'today'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-md shadow-emerald-200 ring-2 ring-emerald-500/20'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
            <span>Hari Ini (Aktif)</span>
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${
              dateFilter === 'today' ? 'bg-white/20 text-white' : 'bg-white text-slate-700 border border-slate-200'
            }`}>
              {todayExams.length}
            </span>
          </button>

          {/* Tab 2: Akan Datang */}
          <button
            type="button"
            onClick={() => setDateFilter('upcoming')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition shadow-2xs ${
              dateFilter === 'upcoming'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-md shadow-blue-200 ring-2 ring-blue-500/20'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Akan Datang (Terjadwal)</span>
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${
              dateFilter === 'upcoming' ? 'bg-white/20 text-white' : 'bg-white text-slate-700 border border-slate-200'
            }`}>
              {upcomingExams.length}
            </span>
          </button>

          {/* Tab 3: Semua Jadwal */}
          <button
            type="button"
            onClick={() => setDateFilter('all')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition shadow-2xs ${
              dateFilter === 'all'
                ? 'bg-slate-900 text-white shadow-md shadow-slate-300'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <span>Semua Jadwal Ujian</span>
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${
              dateFilter === 'all' ? 'bg-white/20 text-white' : 'bg-white text-slate-700 border border-slate-200'
            }`}>
              {eligibleExams.length}
            </span>
          </button>
        </div>

        {/* Status sub-filter */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl self-start md:self-auto shrink-0">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Semua ({dateScopedExams.length})
          </button>
          <button
            onClick={() => setActiveFilter('ready')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeFilter === 'ready' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Belum Selesai
          </button>
          <button
            onClick={() => setActiveFilter('completed')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeFilter === 'completed' ? 'bg-white text-slate-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Sudah Selesai
          </button>
        </div>
      </div>

      {/* Filter Tabs & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-600" />
            <span>
              {dateFilter === 'today' && `Paket Soal Ujian Hari Ini (${todayDateFormatted})`}
              {dateFilter === 'upcoming' && 'Paket Soal Ujian Akan Datang (Terjadwal)'}
              {dateFilter === 'all' && 'Seluruh Jadwal Paket Ujian Asesmen'}
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {dateFilter === 'today' && 'Hanya soal yang sesuai tanggal pelaksanaan hari ini yang aktif dan siap dikerjakan.'}
            {dateFilter === 'upcoming' && 'Paket soal telah disiapkan dan akan aktif sesuai tanggal pelaksanaan masing-masing.'}
            {dateFilter === 'all' && 'Daftar seluruh jadwal asesmen madrasah yang dialokasikan untuk kelas Anda.'}
          </p>
        </div>
      </div>

      {/* Grid of Exams */}
      {filteredExams.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3">
          <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
            <BookOpen className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-800">Tidak Ada Paket Soal Pada Kategori Ini</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Silakan pilih filter "Semua" untuk melihat seluruh mata uji yang terdaftar pada kelas Anda.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredExams.map((exam: Exam) => {
            const session = sessions.find(s => s.examId === exam.id && s.studentId === currentUser?.id);
            const isCompleted = session?.status === 'completed' || !!session?.submittedAt;
            const isInProgress = session?.status === 'in_progress';
            const isLocked = session?.status === 'locked';

            const examDateStr = exam.examDate || exam.startTime?.split('T')[0] || todayYmd;
            const isToday = examDateStr === todayYmd;
            const isUpcoming = examDateStr > todayYmd;
            const isPast = examDateStr < todayYmd;
            const formattedDate = new Date(examDateStr + 'T00:00:00').toLocaleDateString('id-ID', {
              weekday: 'long',
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            });
            const formattedShortDate = new Date(examDateStr + 'T00:00:00').toLocaleDateString('id-ID', {
              weekday: 'short',
              day: 'numeric',
              month: 'short'
            });
            const dayName = new Date(examDateStr + 'T00:00:00').toLocaleDateString('id-ID', {
              weekday: 'long'
            });

            // CARD 1: COMPLETED (ABU-ABU / GRAYED OUT & NOT ACCESSIBLE)
            if (isCompleted) {
              return (
                <div
                  key={exam.id}
                  className="rounded-3xl border-2 border-slate-300 bg-slate-100/90 shadow-xs p-6 flex flex-col justify-between transition-all duration-200 opacity-70 relative select-none"
                >
                  <div>
                    {/* Top Status Header */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="px-2.5 py-0.5 bg-slate-200 text-slate-600 border border-slate-300 rounded-md text-[10px] font-extrabold uppercase font-mono">
                        {exam.code}
                      </span>
                      <span className="px-3 py-1 bg-slate-200 text-slate-700 border border-slate-300 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-2xs">
                        <Lock className="w-3.5 h-3.5 text-slate-500" />
                        <span>Sudah Dikerjakan</span>
                      </span>
                    </div>

                    {/* Subject and Title (Muted Gray) */}
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                      {exam.subject}
                    </div>
                    <h3 className="text-base font-extrabold text-slate-700 mt-1 line-clamp-2 leading-snug">
                      {exam.title}
                    </h3>

                    {/* Meta Specs */}
                    <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-200 text-center">
                      <div className="p-2 bg-slate-200/60 rounded-xl">
                        <div className="text-[10px] font-bold text-slate-500 uppercase">Waktu</div>
                        <div className="text-xs font-extrabold text-slate-700 mt-0.5">{exam.durationMinutes} mnt</div>
                      </div>
                      <div className="p-2 bg-slate-200/60 rounded-xl">
                        <div className="text-[10px] font-bold text-slate-500 uppercase">Jumlah</div>
                        <div className="text-xs font-extrabold text-slate-700 mt-0.5">{exam.totalQuestions} soal</div>
                      </div>
                      <div className="p-2 bg-slate-200/60 rounded-xl">
                        <div className="text-[10px] font-bold text-slate-500 uppercase">KKM</div>
                        <div className="text-xs font-extrabold text-slate-700 mt-0.5">{exam.passingGrade}</div>
                      </div>
                    </div>

                    {/* Submission Result Box */}
                    <div className="mt-4 p-3 bg-slate-200/80 rounded-2xl border border-slate-300 space-y-1.5 text-xs text-slate-600">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-600">Nilai Akhir:</span>
                        <span className="font-mono font-black text-slate-800 text-sm">
                          {session.score ?? '-'} / 100
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-600">Status KKM:</span>
                        <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                          session.isPassed 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {session.isPassed ? 'TUNTAS' : 'BELUM TUNTAS'}
                        </span>
                      </div>
                      {session.submittedAt && (
                        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-300">
                          <span>Dikirim pada:</span>
                          <span className="font-medium">
                            {new Date(session.submittedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Closed Access Notice */}
                    <div className="mt-3 p-2.5 bg-slate-200/50 rounded-xl border border-dashed border-slate-300 text-[11px] text-slate-600 flex items-start gap-2">
                      <Lock className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                      <p className="leading-tight">
                        Soal telah dikerjakan & diserahkan. Akses terkunci dan <strong>tidak dapat dibuka kembali</strong> sampai diizinkan/direset oleh Admin.
                      </p>
                    </div>
                  </div>

                  {/* Disabled Gray Action Button & View Result Button */}
                  <div className="mt-5 pt-3 border-t border-slate-200 space-y-2">
                    <button
                      disabled
                      type="button"
                      className="w-full py-2.5 bg-slate-300 text-slate-500 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 cursor-not-allowed border border-slate-300 shadow-inner"
                      title="Ujian telah selesai dikerjakan dan tidak dapat diakses kembali"
                    >
                      <Lock className="w-4 h-4" />
                      <span>Terkunci (Sudah Selesai)</span>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedExamId(exam.id);
                        setActiveTab('exam_taker');
                      }}
                      className="w-full py-2.5 bg-white hover:bg-slate-50 text-indigo-700 hover:text-indigo-900 border border-slate-300 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition shadow-2xs"
                    >
                      <Award className="w-4 h-4 text-indigo-600" />
                      <span>Lihat Skor & Cetak Bukti Nilai (PDF)</span>
                    </button>

                    <div className="text-[10px] text-center text-slate-400 mt-1 italic">
                      Memerlukan izin Admin untuk pengerjaan ulang
                    </div>
                  </div>
                </div>
              );
            }

            // CARD 2: IN PROGRESS (SEDANG DIKERJAKAN)
            if (isInProgress) {
              return (
                <div
                  key={exam.id}
                  className="rounded-3xl border-2 border-indigo-400 bg-white shadow-lg shadow-indigo-100/50 p-6 flex flex-col justify-between transition-all duration-200 relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-bl-full pointer-events-none -z-0"></div>
                  
                  <div className="relative z-10">
                    {/* Top Status Header */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md text-[10px] font-extrabold uppercase font-mono">
                        {exam.code}
                      </span>
                      <span className="px-3 py-1 bg-amber-100 text-amber-900 border border-amber-300 rounded-full text-xs font-bold flex items-center gap-1.5 animate-pulse">
                        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                        <span>Sedang Dikerjakan</span>
                      </span>
                    </div>

                    {/* Subject and Title */}
                    <div className="text-xs font-bold text-indigo-600 uppercase tracking-wide">
                      {exam.subject}
                    </div>
                    <h3 className="text-base font-extrabold text-slate-900 mt-1 line-clamp-2 leading-snug">
                      {exam.title}
                    </h3>

                    {/* Meta Specs */}
                    <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-100 text-center">
                      <div className="p-2 bg-indigo-50/60 rounded-xl">
                        <div className="text-[10px] font-bold text-indigo-600 uppercase">Waktu</div>
                        <div className="text-xs font-extrabold text-indigo-950 mt-0.5">{exam.durationMinutes} mnt</div>
                      </div>
                      <div className="p-2 bg-indigo-50/60 rounded-xl">
                        <div className="text-[10px] font-bold text-indigo-600 uppercase">Jumlah</div>
                        <div className="text-xs font-extrabold text-indigo-950 mt-0.5">{exam.totalQuestions} soal</div>
                      </div>
                      <div className="p-2 bg-indigo-50/60 rounded-xl">
                        <div className="text-[10px] font-bold text-indigo-600 uppercase">KKM</div>
                        <div className="text-xs font-extrabold text-indigo-950 mt-0.5">{exam.passingGrade}</div>
                      </div>
                    </div>

                    {/* Progress Info */}
                    <div className="mt-4 p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 space-y-1">
                      <div className="flex items-center justify-between font-bold">
                        <span>Sisa Waktu Ujian:</span>
                        <span className="font-mono text-sm text-amber-800">
                          {Math.floor((session.timeRemainingSeconds || 0) / 60)} Menit
                        </span>
                      </div>
                      <p className="text-[11px] text-amber-700">
                        Jawaban tersimpan otomatis. Klik tombol di bawah untuk melanjutkan pengisian soal.
                      </p>
                    </div>
                  </div>

                  {/* Active Action Button */}
                  <div className="mt-5 pt-3 border-t border-slate-100 relative z-10">
                    <button
                      type="button"
                      onClick={() => handleInitiateExam(exam)}
                      className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 shadow-md shadow-indigo-200 cursor-pointer transition"
                    >
                      <Play className="w-4 h-4 fill-white" />
                      <span>Lanjutkan Pengerjaan Soal →</span>
                    </button>
                  </div>
                </div>
              );
            }

            // CARD 3: LOCKED DUE TO VIOLATIONS
            if (isLocked) {
              return (
                <div
                  key={exam.id}
                  className="rounded-3xl border-2 border-rose-300 bg-rose-50/60 shadow-xs p-6 flex flex-col justify-between transition-all duration-200"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="px-2.5 py-0.5 bg-rose-100 text-rose-800 border border-rose-200 rounded-md text-[10px] font-extrabold uppercase font-mono">
                        {exam.code}
                      </span>
                      <span className="px-3 py-1 bg-rose-200 text-rose-900 border border-rose-300 rounded-full text-xs font-bold flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-700" />
                        <span>Sesi Terkunci</span>
                      </span>
                    </div>

                    <div className="text-xs font-bold text-rose-600 uppercase tracking-wide">
                      {exam.subject}
                    </div>
                    <h3 className="text-base font-extrabold text-slate-800 mt-1 line-clamp-2 leading-snug">
                      {exam.title}
                    </h3>

                    <div className="mt-4 p-3 bg-white rounded-2xl border border-rose-200 text-xs text-rose-800 space-y-1">
                      <div className="font-bold flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                        <span>Pelanggaran Anti-Cheat Melebihi Batas</span>
                      </div>
                      <p className="text-[11px] text-rose-700 leading-normal">
                        Sesi ujian Anda dibekukan oleh sistem pengawas. Silakan hubungi Pengawas Ujian di ruang Anda untuk meminta pembukaan kunci (*Unlock*).
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-rose-200">
                    <button
                      disabled
                      type="button"
                      className="w-full py-3 bg-rose-100 text-rose-700 border border-rose-300 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 cursor-not-allowed"
                    >
                      <Lock className="w-4 h-4" />
                      <span>Sesi Terkunci (Lapor Pengawas)</span>
                    </button>
                  </div>
                </div>
              );
            }

            // CARD 4: ACTIVE & READY TO TAKE (BELUM DIKERJAKAN)
            // CASE 4A: UPCOMING EXAM (TERJADWAL UNTUK TANGGAL LAIN / HARI H BELUM TIBA)
            if (isUpcoming) {
              return (
                <div
                  key={exam.id}
                  className="rounded-3xl border-2 border-blue-200 bg-white hover:border-blue-400 shadow-sm hover:shadow-md transition-all duration-200 p-6 flex flex-col justify-between group relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-bl from-blue-100/50 to-transparent rounded-bl-full pointer-events-none group-hover:scale-110 transition duration-300"></div>

                  <div className="relative z-10">
                    {/* Top Status Header */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="px-2.5 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 rounded-md text-[10px] font-extrabold uppercase font-mono">
                        {exam.code}
                      </span>
                      <span className="px-3 py-1 bg-blue-50 text-blue-900 border border-blue-300 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-2xs">
                        <Calendar className="w-3.5 h-3.5 text-blue-600" />
                        <span>Terjadwal ({formattedShortDate})</span>
                      </span>
                    </div>

                    {/* Subject and Title */}
                    <div className="text-xs font-bold text-blue-600 uppercase tracking-wide">
                      {exam.subject}
                    </div>
                    <h3 className="text-base font-extrabold text-slate-900 mt-1 line-clamp-2 leading-snug group-hover:text-blue-700 transition">
                      {exam.title}
                    </h3>

                    {/* Meta Specs */}
                    <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-100 text-center">
                      <div className="p-2 bg-blue-50/50 rounded-xl border border-blue-100">
                        <div className="text-[10px] font-bold text-blue-700 uppercase">Waktu</div>
                        <div className="text-xs font-extrabold text-slate-800 mt-0.5">{exam.durationMinutes} mnt</div>
                      </div>
                      <div className="p-2 bg-blue-50/50 rounded-xl border border-blue-100">
                        <div className="text-[10px] font-bold text-blue-700 uppercase">Jumlah</div>
                        <div className="text-xs font-extrabold text-slate-800 mt-0.5">{exam.totalQuestions} butir</div>
                      </div>
                      <div className="p-2 bg-blue-50/50 rounded-xl border border-blue-100">
                        <div className="text-[10px] font-bold text-blue-700 uppercase">KKM</div>
                        <div className="text-xs font-extrabold text-slate-800 mt-0.5">{exam.passingGrade}</div>
                      </div>
                    </div>

                    {/* Scheduled Notice Box */}
                    <div className="mt-4 p-3 bg-blue-50/80 rounded-2xl border border-blue-200 text-xs text-blue-950 space-y-1.5">
                      <div className="flex items-center justify-between text-blue-900 font-bold">
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-blue-600" />
                          Jadwal Pelaksanaan:
                        </span>
                        <span className="font-mono text-[11px] bg-white px-2 py-0.5 rounded-md border border-blue-200">
                          {exam.examStartTime || '07:30'} - {exam.examEndTime || '09:00'} WIB
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-blue-800">
                        <span>Hari & Tanggal:</span>
                        <span className="font-bold">{formattedDate}</span>
                      </div>
                      <p className="text-[11px] text-blue-700 leading-relaxed pt-1 border-t border-blue-200/60">
                        Paket soal dijadwalkan oleh dewan guru untuk aktif pada hari <strong>{dayName}</strong>. Akses pengerjaan soal akan otomatis dibuka pada tanggal pelaksanaan tersebut.
                      </p>
                    </div>
                  </div>

                  {/* Scheduled Action Button (Disabled) */}
                  <div className="mt-5 pt-3 border-t border-slate-100 relative z-10">
                    <button
                      disabled
                      type="button"
                      className="w-full py-3 bg-slate-100 text-slate-500 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 border border-slate-200 cursor-not-allowed shadow-inner"
                      title={`Ujian baru dapat dimulai pada tanggal pelaksanaan: ${formattedDate}`}
                    >
                      <Lock className="w-4 h-4 text-slate-400" />
                      <span>Belum Waktunya (Aktif {formattedShortDate})</span>
                    </button>
                  </div>
                </div>
              );
            }

            // CASE 4B: ACTIVE TODAY (HARI INI AKTIF & SIAP DIKERJAKAN)
            return (
              <div
                key={exam.id}
                className="rounded-3xl border-2 border-emerald-400 bg-white hover:border-emerald-500 shadow-md hover:shadow-xl transition-all duration-200 p-6 flex flex-col justify-between group relative overflow-hidden ring-1 ring-emerald-400/30"
              >
                <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-bl from-emerald-100/60 to-transparent rounded-bl-full pointer-events-none group-hover:scale-110 transition duration-300"></div>

                <div className="relative z-10">
                  {/* Top Status Header */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md text-[10px] font-extrabold uppercase font-mono">
                      {exam.code}
                    </span>
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-2xs">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Aktif Hari Ini</span>
                    </span>
                  </div>

                  {/* Subject and Title */}
                  <div className="text-xs font-bold text-emerald-700 uppercase tracking-wide">
                    {exam.subject}
                  </div>
                  <h3 className="text-base font-extrabold text-slate-900 mt-1 line-clamp-2 leading-snug group-hover:text-emerald-800 transition">
                    {exam.title}
                  </h3>

                  {/* Meta Specs */}
                  <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-100 text-center">
                    <div className="p-2 bg-emerald-50/60 rounded-xl border border-emerald-100/50">
                      <div className="text-[10px] font-bold text-emerald-700 uppercase">Waktu</div>
                      <div className="text-xs font-extrabold text-emerald-950 mt-0.5">{exam.durationMinutes} mnt</div>
                    </div>
                    <div className="p-2 bg-emerald-50/60 rounded-xl border border-emerald-100/50">
                      <div className="text-[10px] font-bold text-emerald-700 uppercase">Jumlah</div>
                      <div className="text-xs font-extrabold text-emerald-950 mt-0.5">{exam.totalQuestions} butir</div>
                    </div>
                    <div className="p-2 bg-emerald-50/60 rounded-xl border border-emerald-100/50">
                      <div className="text-[10px] font-bold text-emerald-700 uppercase">KKM</div>
                      <div className="text-xs font-extrabold text-emerald-950 mt-0.5">{exam.passingGrade}</div>
                    </div>
                  </div>

                  {/* Schedule Info */}
                  <div className="mt-4 p-3 bg-emerald-50/60 rounded-2xl border border-emerald-200/80 text-xs text-slate-700 space-y-1.5">
                    <div className="flex items-center justify-between text-slate-800 font-bold">
                      <span className="flex items-center gap-1.5 text-emerald-800">
                        <Clock className="w-3.5 h-3.5 text-emerald-600" />
                        Jadwal Ujian:
                      </span>
                      <span className="font-bold text-emerald-700 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Hari Ini (Aktif)
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-600 text-[11px]">
                      <span>Waktu Pelaksanaan:</span>
                      <span className="font-mono font-bold text-slate-800">{exam.examStartTime || '07:30'} - {exam.examEndTime || '09:00'} WIB</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-600 text-[11px]">
                      <span>Tanggal Pelaksanaan:</span>
                      <span className="font-semibold text-emerald-900">{formattedDate}</span>
                    </div>
                  </div>
                </div>

                {/* Primary Action Button */}
                <div className="mt-5 pt-3 border-t border-slate-100 relative z-10">
                  <button
                    type="button"
                    onClick={() => handleInitiateExam(exam)}
                    className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-200 group-hover:shadow-lg transition cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>Mulai Kerjakan Soal Ujian →</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL INPUT TOKEN UJIAN (WAJIB SISWA SEBELUM MASUK KE SOAL) */}
      {/* ========================================================================= */}
      {tokenModalExam && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Masukkan Token Ujian
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold truncate max-w-[240px]">
                    {tokenModalExam.title}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setTokenModalExam(null);
                  setInputToken('');
                  setTokenError(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleVerifyTokenAndStart} className="space-y-4 pt-4">
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-2xl text-xs text-amber-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-amber-800">
                  <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Autentikasi Akses Ujian Madrasah</span>
                </div>
                <p className="text-[11px] text-amber-800/90 leading-relaxed">
                  Mintalah token ujian kepada bapak/ibu guru pengawas ruang ujian. Naskah soal hanya dapat diakses dengan token yang valid.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 text-center">
                  TOKEN UJIAN (6 KARAKTER)
                </label>
                <input
                  type="text"
                  autoFocus
                  required
                  maxLength={10}
                  placeholder="Contoh: FIQ789"
                  value={inputToken}
                  onChange={(e) => {
                    setInputToken(e.target.value.toUpperCase());
                    if (tokenError) setTokenError(null);
                  }}
                  className="w-full py-3.5 px-4 text-center bg-slate-50 border-2 border-slate-300 focus:border-emerald-500 rounded-2xl text-2xl font-black font-mono tracking-widest text-slate-900 uppercase focus:bg-white focus:outline-hidden focus:ring-4 focus:ring-emerald-100 transition"
                />
              </div>

              {tokenError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 font-semibold flex items-start gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{tokenError}</span>
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setTokenModalExam(null);
                    setInputToken('');
                    setTokenError(null);
                  }}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer transition text-center"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={!inputToken.trim()}
                  className="flex-2 py-3 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 disabled:opacity-50 text-white font-extrabold rounded-xl text-xs shadow-md shadow-emerald-200 cursor-pointer transition text-center flex items-center justify-center gap-2"
                >
                  <Key className="w-4 h-4" />
                  <span>Verifikasi & Buka Soal →</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
