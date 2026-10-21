import React, { useState, useMemo } from 'react';
import { useCbt } from '../../context/CbtContext';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  Radar, 
  Cell
} from 'recharts';
import { 
  BarChart3, 
  Award, 
  TrendingUp, 
  Percent, 
  FileSpreadsheet, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  Filter,
  Download,
  BookOpen,
  Calendar,
  Clock,
  UserCheck,
  Search,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import { ExportReportsModal } from '../reports/ExportReportsModal';

export const AnalyticsDashboard: React.FC = () => {
  const { classes, exams, sessions, systemSettings, currentUser } = useCbt();
  const isTeacher = currentUser?.role === 'teacher';

  // Exams scoped by role
  const availableExams = useMemo(() => {
    if (!exams) return [];
    if (isTeacher && currentUser) {
      const ownExams = exams.filter(e => {
        if (!e) return false;
        if (e.authorId && currentUser.id) return e.authorId === currentUser.id;
        if (e.authorUsername && currentUser.username) return e.authorUsername.toLowerCase() === currentUser.username.toLowerCase();
        if (e.authorName && currentUser.name) return e.authorName.toLowerCase() === currentUser.name.toLowerCase();
        // Fallback for default demo teacher
        if (!e.authorId && !e.authorUsername && !e.authorName) {
          return (currentUser.id === 'usr-teacher-1' || currentUser.username === 'guru') && e.id === 'exm-001';
        }
        return false;
      });
      return ownExams.length > 0 ? ownExams : exams;
    }
    return exams;
  }, [exams, isTeacher, currentUser]);

  // Selected Exam State
  const [selectedExamId, setSelectedExamId] = useState<string>(
    availableExams[0]?.id || exams?.[0]?.id || ''
  );

  // Update selectedExamId if availableExams changes and current selection is invalid
  React.useEffect(() => {
    if (availableExams.length > 0 && (!selectedExamId || !availableExams.some(e => e.id === selectedExamId))) {
      setSelectedExamId(availableExams[0].id);
    }
  }, [availableExams, selectedExamId]);

  const activeExam = useMemo(() => {
    return availableExams.find(e => e.id === selectedExamId) || exams?.find(e => e.id === selectedExamId) || availableExams[0] || null;
  }, [availableExams, exams, selectedExamId]);

  // Filters
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [studentSearchQuery, setStudentSearchQuery] = useState<string>('');
  
  // Export modal state
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'excel'>('excel');

  const kkmStandard = activeExam?.passingGrade ?? systemSettings?.defaultPassingGrade ?? 75;

  // Filter completed sessions strictly for the selected exam
  const examCompletedSessions = useMemo(() => {
    if (!activeExam) return [];
    return (sessions || []).filter(s => s && s.examId === activeExam.id && (s.status === 'completed' || s.status === 'locked'));
  }, [sessions, activeExam]);

  // Filter completed sessions by class
  const displayedSessions = useMemo(() => {
    return selectedClassId === 'all'
      ? examCompletedSessions
      : examCompletedSessions.filter(s => s && s.classId === selectedClassId);
  }, [examCompletedSessions, selectedClassId]);

  // Student table search filter
  const searchedSessions = useMemo(() => {
    if (!studentSearchQuery.trim()) return displayedSessions;
    const q = studentSearchQuery.toLowerCase();
    return displayedSessions.filter(s => 
      s.studentName.toLowerCase().includes(q) || 
      s.nisn.includes(q) || 
      s.className.toLowerCase().includes(q)
    );
  }, [displayedSessions, studentSearchQuery]);

  // Calculate High-level KPIs
  const totalCompleted = displayedSessions.length;
  const scores = displayedSessions.map(s => s?.score ?? 0);
  const avgScore = scores.length > 0 ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : 0;
  const highestScore = scores.length > 0 ? Math.max(...scores) : 0;
  const lowestScore = scores.length > 0 ? Math.min(...scores) : 0;
  const passedCount = displayedSessions.filter(s => (s?.score ?? 0) >= kkmStandard).length;
  const remedialCount = totalCompleted - passedCount;
  const passRate = totalCompleted > 0 ? Math.round((passedCount / totalCompleted) * 100) : 0;

  // Chart 1: Average score per class for this exam
  const classAvgData = useMemo(() => {
    return (classes || []).map(cls => {
      if (!cls) return { className: 'Rombel', avgScore: 0, studentCount: 0 };
      const clsSessions = examCompletedSessions.filter(s => s && s.classId === cls.id);
      const clsScores = clsSessions.map(s => s?.score ?? 0);
      const avg = clsScores.length > 0 
        ? Math.round(clsScores.reduce((a, b) => a + b, 0) / clsScores.length) 
        : 0;
      return {
        className: cls.name || 'Rombel',
        avgScore: avg,
        studentCount: clsSessions.length,
      };
    }).filter(c => c.studentCount > 0 || selectedClassId === 'all');
  }, [classes, examCompletedSessions, selectedClassId]);

  // Chart 2: Score distribution histogram
  const scoreRanges = useMemo(() => {
    const ranges = [
      { range: '0 - 50 (Sangat Kurang)', count: 0, color: '#f43f5e' },
      { range: '51 - 74 (Di Bawah KKM)', count: 0, color: '#f59e0b' },
      { range: '75 - 89 (Tuntas Baik)', count: 0, color: '#3b82f6' },
      { range: '90 - 100 (Sangat Memuaskan)', count: 0, color: '#10b981' },
    ];

    displayedSessions.forEach(s => {
      const sc = s?.score ?? 0;
      if (sc <= 50) ranges[0].count++;
      else if (sc < 75) ranges[1].count++;
      else if (sc < 90) ranges[2].count++;
      else ranges[3].count++;
    });

    return ranges;
  }, [displayedSessions]);

  // Chart 3: Category Mastery Radar
  const radarData = useMemo(() => {
    if (!activeExam || !Array.isArray(activeExam.questions)) return [];
    const categoryStats: Record<string, { total: number; correct: number }> = {};
    const examQuestions = activeExam.questions;
    
    examQuestions.forEach(q => {
      if (!q) return;
      const cat = q.category || 'Umum';
      if (!categoryStats[cat]) {
        categoryStats[cat] = { total: 0, correct: 0 };
      }
      categoryStats[cat].total++;
      
      displayedSessions.forEach(ses => {
        if (ses && ses.answers) {
          const ans = ses.answers[q.id];
          if (q.type === 'multiple_choice' && ans === q.correctOptionId) {
            categoryStats[cat].correct++;
          } else if (q.type === 'multiple_choice_complex' && Array.isArray(ans) && Array.isArray(q.correctOptionIds)) {
            const isMatch = ans.length === q.correctOptionIds.length && ans.every(id => q.correctOptionIds?.includes(id));
            if (isMatch) categoryStats[cat].correct++;
          } else if (q.type === 'matching' && typeof ans === 'object' && ans !== null) {
            categoryStats[cat].correct += 0.8; // partial estimate
          } else if (q.type === 'essay' && typeof ans === 'string' && ans.trim().length > 15) {
            categoryStats[cat].correct += 0.9;
          }
        }
      });
    });

    return Object.entries(categoryStats).map(([cat, stat]) => {
      const maxPoss = stat.total * Math.max(1, displayedSessions.length);
      const masteryPercent = maxPoss > 0 ? Math.min(100, Math.round((stat.correct / maxPoss) * 100)) : 0;
      return {
        category: cat,
        mastery: masteryPercent,
      };
    });
  }, [activeExam, displayedSessions]);

  // Question item analysis (Difficulty index & correct answer rate)
  const itemAnalysis = useMemo(() => {
    if (!activeExam || !Array.isArray(activeExam.questions)) return [];
    return activeExam.questions.map((q, idx) => {
      const totalAnswered = displayedSessions.filter(s => s && s.answers && s.answers[q.id] !== undefined).length;
      const correctAnswers = displayedSessions.filter(s => {
        if (!s || !s.answers) return false;
        const ans = s.answers[q.id];
        if (q.type === 'multiple_choice') return ans === q.correctOptionId;
        if (q.type === 'multiple_choice_complex' && Array.isArray(ans) && Array.isArray(q.correctOptionIds)) {
          return ans.length === q.correctOptionIds.length && ans.every(id => q.correctOptionIds?.includes(id));
        }
        return false;
      }).length;

      const pValue = totalAnswered > 0 ? (correctAnswers / totalAnswered) : 0; // Tingkat kesukaran (0 - 1)
      
      let difficultyCategory = 'Sedang';
      if (pValue >= 0.7) difficultyCategory = 'Mudah';
      else if (pValue < 0.3) difficultyCategory = 'Sukar';

      return {
        num: idx + 1,
        id: q.id,
        category: q.category || 'Umum',
        type: q.type,
        correctPercent: Math.round(pValue * 100),
        difficulty: difficultyCategory,
        totalAnswered,
        correctAnswers,
      };
    });
  }, [activeExam, displayedSessions]);

  return (
    <div className="space-y-6">
      
      {/* 1. TOP HEADER & MAPEL EXPORT CONTROL BAR */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 flex flex-col xl:flex-row xl:items-center justify-between gap-5">
        <div>
          <div className="flex items-center gap-2 text-indigo-700 font-extrabold text-xs uppercase tracking-wider mb-1">
            <BarChart3 className="w-4 h-4" />
            <span>Rekapitulasi Nilai & Analisis Performa CBT</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Hasil Ujian Siswa per Mata Pelajaran
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Pilih mata pelajaran untuk melihat statistik nilai, ketuntasan KKM, dan ekspor data langsung ke format Excel (.xlsx) atau PDF Resmi.
          </p>
        </div>

        {/* Action Controls & Filters */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Mapel / Exam Dropdown Filter */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-300 px-3.5 py-2 rounded-2xl text-xs font-bold text-slate-800 shadow-2xs">
            <BookOpen className="w-4 h-4 text-emerald-600 shrink-0" />
            <select
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              className="bg-transparent focus:outline-hidden cursor-pointer max-w-xs truncate font-semibold"
            >
              {availableExams.map(ex => (
                <option key={ex.id} value={ex.id}>
                  {ex.subject} — {ex.title} ({ex.code})
                </option>
              ))}
            </select>
          </div>

          {/* Rombel / Class Filter */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-300 px-3.5 py-2 rounded-2xl text-xs font-bold text-slate-800 shadow-2xs">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="bg-transparent focus:outline-hidden cursor-pointer font-semibold"
            >
              <option value="all">Semua Rombel</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Export Excel Button */}
          <button
            onClick={() => {
              setExportFormat('excel');
              setShowExportModal(true);
            }}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold rounded-2xl text-xs flex items-center gap-2 shadow-sm shadow-emerald-200 cursor-pointer transition"
            title="Ekspor Rekap Nilai ke Format Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Ekspor Excel (.xlsx)</span>
          </button>

          {/* Export PDF Button */}
          <button
            onClick={() => {
              setExportFormat('pdf');
              setShowExportModal(true);
            }}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-extrabold rounded-2xl text-xs flex items-center gap-2 shadow-sm shadow-rose-200 cursor-pointer transition"
            title="Cetak Berita Acara & Nilai Resmi ke PDF"
          >
            <FileText className="w-4 h-4" />
            <span>Ekspor PDF Resmi</span>
          </button>
        </div>
      </div>

      {/* Selected Mapel Metadata Banner */}
      {activeExam && (
        <div className="bg-gradient-to-r from-emerald-800 to-teal-900 rounded-2xl p-4 sm:p-5 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-emerald-200 text-xs font-semibold">
              <span className="px-2 py-0.5 bg-white/15 rounded-md font-mono">{activeExam.code}</span>
              <span>•</span>
              <span>{activeExam.subject}</span>
              <span>•</span>
              <span>KKM: {activeExam.passingGrade}</span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-white">
              {activeExam.title}
            </h2>
            <div className="text-xs text-emerald-100/90 flex flex-wrap items-center gap-4 pt-1">
              <span>Pembuat Soal: <strong>{activeExam.authorName || (isTeacher ? currentUser?.name : 'Guru Mapel')}</strong></span>
              <span>•</span>
              <span>Durasi: <strong>{activeExam.durationMinutes} Menit</strong></span>
              <span>•</span>
              <span>Total Soal: <strong>{activeExam.questions?.length || 0} Butir</strong></span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="px-3.5 py-2 bg-white/10 backdrop-blur-xs rounded-xl border border-white/20 text-center">
              <div className="text-[10px] text-emerald-200 uppercase font-bold">Total Selesai</div>
              <div className="text-lg font-black">{totalCompleted} Siswa</div>
            </div>
            <div className="px-3.5 py-2 bg-white/10 backdrop-blur-xs rounded-xl border border-white/20 text-center">
              <div className="text-[10px] text-emerald-200 uppercase font-bold">Kelulusan KKM</div>
              <div className="text-lg font-black text-emerald-300">{passRate}%</div>
            </div>
          </div>
        </div>
      )}

      {/* 2. KPI METRIC CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between text-indigo-600 mb-1">
            <span className="text-xs font-bold uppercase">Rata-Rata Nilai</span>
            <TrendingUp className="w-4 h-4" />
          </div>
          <div className="text-3xl font-black text-slate-900">{avgScore}</div>
          <div className="text-[11px] text-slate-400 mt-1">Standar KKM: {kkmStandard}</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between text-emerald-600 mb-1">
            <span className="text-xs font-bold uppercase">Tingkat Ketuntasan</span>
            <Percent className="w-4 h-4" />
          </div>
          <div className="text-3xl font-black text-emerald-600">{passRate}%</div>
          <div className="text-[11px] text-slate-400 mt-1">{passedCount} Tuntas, {remedialCount} Remedial</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between text-blue-600 mb-1">
            <span className="text-xs font-bold uppercase">Nilai Tertinggi</span>
            <Award className="w-4 h-4" />
          </div>
          <div className="text-3xl font-black text-slate-900">{highestScore}</div>
          <div className="text-[11px] text-slate-400 mt-1">Pencapaian maksimum santri</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between text-amber-600 mb-1">
            <span className="text-xs font-bold uppercase">Nilai Terendah</span>
            <XCircle className="w-4 h-4" />
          </div>
          <div className="text-3xl font-black text-slate-900">{lowestScore}</div>
          <div className="text-[11px] text-slate-400 mt-1">Perlu program tindak lanjut</div>
        </div>
      </div>

      {/* 3. VISUAL CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Chart 1: Average Score per Class */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <h3 className="font-bold text-slate-800 text-sm mb-1">Perbandingan Nilai Rata-rata per Kelas</h3>
          <p className="text-xs text-slate-400 mb-6">Distribusi capaian hasil ujian mapel {activeExam?.subject} antar rombel.</p>
          <div className="h-64">
            {classAvgData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={classAvgData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="className" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip 
                    formatter={(val: any) => [`${val ?? 0} Poin`, 'Rata-rata']}
                    contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                  />
                  <Bar dataKey="avgScore" fill="#4f46e5" radius={[6, 6, 0, 0]}>
                    {classAvgData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.avgScore >= kkmStandard ? '#059669' : '#f59e0b'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Belum ada data nilai per rombel untuk mapel ini.
              </div>
            )}
          </div>
        </div>

        {/* Chart 2: Score Distribution Histogram */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <h3 className="font-bold text-slate-800 text-sm mb-1">Distribusi Rentang Nilai Siswa</h3>
          <p className="text-xs text-slate-400 mb-6">Frekuensi perolehan skor ujian dalam 4 kuadran performa.</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={scoreRanges} layout="vertical" margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis dataKey="range" type="category" tick={{ fontSize: 10, fill: '#475569' }} width={120} axisLine={false} tickLine={false} />
                <Tooltip 
                  formatter={(val: any) => [`${val ?? 0} Siswa`, 'Jumlah']}
                  contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                />
                <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                  {scoreRanges.map((entry, index) => (
                    <Cell key={`cell-range-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Category Mastery Radar */}
        {radarData.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs lg:col-span-2">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Radar Penguasaan Kompetensi Materi</h3>
                <p className="text-xs text-slate-400">Persentase ketepatan jawaban siswa berdasarkan kategori materi pokok pada {activeExam?.subject}.</p>
              </div>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} outerRadius="75%">
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="category" tick={{ fontSize: 11, fill: '#334155' }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <Radar name="Penguasaan (%)" dataKey="mastery" stroke="#059669" fill="#10b981" fillOpacity={0.4} />
                  <Tooltip 
                    formatter={(val: any) => [`${val ?? 0}%`, 'Tingkat Ketepatan']}
                    contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* 4. STUDENT RESULTS TABLE PER MAPEL */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-extrabold text-slate-900">
              Daftar Nilai Siswa: {activeExam?.subject}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Menampilkan {searchedSessions.length} siswa yang telah menyelesaikan paket ujian ini.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari nama / NISN..."
                value={studentSearchQuery}
                onChange={(e) => setStudentSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 focus:border-emerald-500 rounded-xl text-xs focus:bg-white focus:outline-hidden transition w-48 sm:w-60"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto mt-4">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-extrabold border-b border-slate-200 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-center">No</th>
                <th className="px-4 py-3">NISN</th>
                <th className="px-4 py-3">Nama Lengkap</th>
                <th className="px-4 py-3">Kelas</th>
                <th className="px-4 py-3 text-center">Nilai</th>
                <th className="px-4 py-3 text-center">Status KKM</th>
                <th className="px-4 py-3 text-center">Benar</th>
                <th className="px-4 py-3 text-center">Salah</th>
                <th className="px-4 py-3 text-center">Integritas</th>
                <th className="px-4 py-3">Waktu Selesai</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {searchedSessions.length > 0 ? (
                searchedSessions.map((s, idx) => (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-4 py-3 text-center text-slate-400 font-medium">{idx + 1}</td>
                    <td className="px-4 py-3 font-mono text-slate-600">{s.nisn}</td>
                    <td className="px-4 py-3 font-bold text-slate-900">{s.studentName}</td>
                    <td className="px-4 py-3 text-slate-600">{s.className}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-sm font-black ${(s.score ?? 0) >= kkmStandard ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {s.score ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                        (s.score ?? 0) >= kkmStandard
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {(s.score ?? 0) >= kkmStandard ? 'TUNTAS' : 'REMEDIAL'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-emerald-600 font-bold">{s.correctCount ?? 0}</td>
                    <td className="px-4 py-3 text-center text-rose-500 font-bold">{s.wrongCount ?? 0}</td>
                    <td className="px-4 py-3 text-center">
                      {s.violationsCount === 0 ? (
                        <span className="text-emerald-600 font-semibold text-[11px] flex items-center justify-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Bersih</span>
                        </span>
                      ) : (
                        <span className="text-amber-700 font-semibold text-[11px]">
                          {s.violationsCount} Teguran
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-[11px]">
                      {s.submittedAt ? new Date(s.submittedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-slate-400">
                    <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600">Belum ada hasil ujian yang sesuai dengan filter ini</p>
                    <p className="text-xs text-slate-400 mt-1">Siswa yang menyelesaikan ujian akan otomatis muncul di tabel ini.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. ITEM ANALYSIS (TINGKAT KESUKARAN BUTIR SOAL) */}
      {itemAnalysis.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">
                Analisis Butir Soal: {activeExam?.subject}
              </h3>
              <p className="text-xs text-slate-400">
                Mengevaluasi tingkat kesukaran dan daya serap materi per butir soal ujian.
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-500">
              Total: {itemAnalysis.length} Butir Soal
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-extrabold border-b border-slate-200 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">No. Soal</th>
                  <th className="px-4 py-3">Kategori Materi</th>
                  <th className="px-4 py-3">Dijawab Benar</th>
                  <th className="px-4 py-3">Indeks Ketepatan (%)</th>
                  <th className="px-4 py-3">Klasifikasi Kesukaran</th>
                  <th className="px-4 py-3">Rekomendasi Tindak Lanjut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {itemAnalysis.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-4 py-3 font-bold text-slate-800">Soal #{item.num}</td>
                    <td className="px-4 py-3 text-slate-600">{item.category}</td>
                    <td className="px-4 py-3 font-semibold text-slate-700">
                      {item.correctAnswers} / {item.totalAnswered} siswa
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className={`h-1.5 rounded-full ${
                              item.correctPercent >= 70 ? 'bg-emerald-500' : item.correctPercent >= 40 ? 'bg-indigo-500' : 'bg-rose-500'
                            }`}
                            style={{ width: `${item.correctPercent}%` }}
                          ></div>
                        </div>
                        <span className="font-bold">{item.correctPercent}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        item.difficulty === 'Mudah'
                          ? 'bg-emerald-100 text-emerald-800'
                          : item.difficulty === 'Sedang'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {item.difficulty}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-[11px]">
                      {item.difficulty === 'Sukar'
                        ? 'Perlu penguatan konsep dasar pada sesi remedial'
                        : item.difficulty === 'Sedang'
                        ? 'Kualitas butir soal optimal dan seimbang'
                        : 'Dapat ditingkatkan dengan variasi soal HOTS'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Export Reports Modal */}
      {showExportModal && activeExam && (
        <ExportReportsModal
          isOpen={showExportModal}
          initialFormat={exportFormat}
          onClose={() => setShowExportModal(false)}
          sessions={sessions || []}
          exam={activeExam}
          availableExams={availableExams}
        />
      )}
    </div>
  );
};
