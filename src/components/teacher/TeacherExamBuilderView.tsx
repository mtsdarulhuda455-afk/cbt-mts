import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  FileUp,
  Plus, 
  Search, 
  Filter, 
  UploadCloud, 
  BookOpen, 
  Clock, 
  Award, 
  Edit3, 
  Trash2, 
  Copy, 
  Eye, 
  Layers, 
  Sparkles, 
  School, 
  CheckCircle2, 
  CheckSquare, 
  ArrowRightLeft, 
  AlertCircle,
  HelpCircle,
  Users,
  User as UserIcon,
  ChevronRight,
  FileDown,
  X,
  Key,
  RotateCcw,
  Calendar,
  Printer,
  FileSpreadsheet,
  Activity,
  ExternalLink
} from 'lucide-react';
import { useCbt } from '../../context/CbtContext';
import { Exam, Question, QuestionType } from '../../types/cbt';
import { ExamQuestionBuilderModal } from './ExamQuestionBuilderModal';
import { WordExamImportModal } from '../admin/WordExamImportModal';
import { PrintExamModal } from './PrintExamModal';
import { ExportReportsModal } from '../reports/ExportReportsModal';
import { MathRenderer } from '../common/MathRenderer';

export const TeacherExamBuilderView: React.FC = () => {
  const { 
    exams, 
    classes, 
    systemSettings, 
    addExam, 
    updateExam, 
    deleteExam, 
    sessions,
    currentUser,
    addAuditLog,
    setActiveTab,
    setSelectedExamId
  } = useCbt();

  // Current user role & teacher flag
  const isTeacher = currentUser?.role === 'teacher';

  // State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('all');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('all');
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('all');
  const [selectedTeacherFilter, setSelectedTeacherFilter] = useState<string>('all'); // Admin filter by author

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
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }, []);
  
  // Modals
  const [showBuilderModal, setShowBuilderModal] = useState<boolean>(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [showWordImportModal, setShowWordImportModal] = useState<boolean>(false);
  const [previewExam, setPreviewExam] = useState<Exam | null>(null);
  const [printExam, setPrintExam] = useState<Exam | null>(null);
  const [exportExam, setExportExam] = useState<Exam | null>(null);
  const [exportInitialFormat, setExportInitialFormat] = useState<'pdf' | 'excel'>('excel');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // List of distinct teachers/authors from all exams (for Admin filter)
  const authorsList = useMemo(() => {
    const map = new Map<string, string>();
    (exams || []).forEach(e => {
      if (!e) return;
      if (e.authorId && e.authorName) {
        map.set(e.authorId, e.authorName);
      } else if (e.authorName) {
        map.set(e.authorName, e.authorName);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [exams]);

  // Author-scoped exams:
  // IF USER IS TEACHER: Strictly filter to ONLY exams created by this teacher!
  // IF USER IS ADMIN: Can see all exams, or optionally filter by teacher author.
  const authorScopedExams = useMemo(() => {
    if (!exams) return [];
    
    if (isTeacher && currentUser) {
      return exams.filter(exam => {
        if (!exam) return false;
        // Check by authorId
        if (exam.authorId && currentUser.id) {
          return exam.authorId === currentUser.id;
        }
        // Check by authorUsername
        if (exam.authorUsername && currentUser.username) {
          return exam.authorUsername.toLowerCase() === currentUser.username.toLowerCase();
        }
        // Check by authorName
        if (exam.authorName && currentUser.name) {
          return exam.authorName.toLowerCase() === currentUser.name.toLowerCase();
        }
        // Fallback for mock/legacy data where author was unassigned:
        // Default teacher 'usr-teacher-1' ('guru' - Siti Fatimah) owns exm-001
        if (!exam.authorId && !exam.authorUsername && !exam.authorName) {
          return (currentUser.id === 'usr-teacher-1' || currentUser.username === 'guru') && exam.id === 'exm-001';
        }
        return false;
      });
    }

    if (currentUser?.role === 'admin' && selectedTeacherFilter !== 'all') {
      return exams.filter(exam => 
        exam.authorId === selectedTeacherFilter || 
        exam.authorName === selectedTeacherFilter ||
        exam.authorUsername === selectedTeacherFilter
      );
    }

    return exams;
  }, [exams, currentUser, isTeacher, selectedTeacherFilter]);

  // Distinct subjects for filter based on authorScopedExams
  const subjectsList = useMemo(() => {
    const subs = new Set<string>();
    (authorScopedExams || []).forEach(e => {
      if (e?.subject) subs.add(e.subject);
    });
    return Array.from(subs);
  }, [authorScopedExams]);

  // Distinct exam execution dates
  const examDatesList = useMemo(() => {
    const dates = new Set<string>();
    (authorScopedExams || []).forEach(e => {
      const d = e.examDate || e.startTime?.split('T')[0];
      if (d) dates.add(d);
    });
    return Array.from(dates).sort();
  }, [authorScopedExams]);

  // Filtered Exams
  const filteredExams = useMemo(() => {
    return (authorScopedExams || []).filter(exam => {
      if (!exam) return false;
      const q = (searchQuery || '').toLowerCase();
      const matchSearch = 
        (exam.title || '').toLowerCase().includes(q) ||
        (exam.code || '').toLowerCase().includes(q) ||
        (exam.subject || '').toLowerCase().includes(q);
      
      const matchSubject = selectedSubjectFilter === 'all' || exam.subject === selectedSubjectFilter;
      
      const matchClass = selectedClassFilter === 'all' || 
        (exam.classesAllowed && exam.classesAllowed.includes(selectedClassFilter));

      const examDateStr = exam.examDate || exam.startTime?.split('T')[0] || '';
      let matchDate = true;
      if (selectedDateFilter === 'today') {
        matchDate = examDateStr === todayYmd;
      } else if (selectedDateFilter === 'upcoming') {
        matchDate = examDateStr > todayYmd;
      } else if (selectedDateFilter !== 'all') {
        matchDate = examDateStr === selectedDateFilter;
      }

      return matchSearch && matchSubject && matchClass && matchDate;
    });
  }, [authorScopedExams, searchQuery, selectedSubjectFilter, selectedClassFilter, selectedDateFilter, todayYmd]);

  // Overall Statistics based strictly on authorScopedExams
  const totalQuestionsAll = useMemo(() => {
    return (authorScopedExams || []).reduce((acc, e) => acc + (e?.questions?.length || 0), 0);
  }, [authorScopedExams]);

  const questionTypeStats = useMemo(() => {
    let pg = 0;
    let pgk = 0;
    let matching = 0;
    let essay = 0;

    (authorScopedExams || []).forEach(e => {
      e?.questions?.forEach(q => {
        if (!q) return;
        if (q.type === 'multiple_choice') pg++;
        else if (q.type === 'multiple_choice_complex') pgk++;
        else if (q.type === 'matching') matching++;
        else if (q.type === 'essay') essay++;
      });
    });

    return { pg, pgk, matching, essay };
  }, [authorScopedExams]);

  // Duplicate Exam
  const handleDuplicateExam = (sourceExam: Exam) => {
    const cloned: Exam = {
      ...sourceExam,
      id: `exm-${Date.now()}`,
      code: `${sourceExam.code || 'EXM'}-COPY`,
      title: `${sourceExam.title || 'Ujian'} (Salinan)`,
      authorId: currentUser?.id || sourceExam.authorId,
      authorName: currentUser?.name || sourceExam.authorName,
      authorUsername: currentUser?.username || sourceExam.authorUsername,
      questions: (sourceExam.questions || []).map(q => ({ ...q, id: `q-${Date.now()}-${Math.random().toString(36).substring(2, 5)}` }))
    };

    addExam(cloned);
    triggerToast(`Paket soal "${cloned.title}" berhasil diduplikasi ke bank soal Anda.`);
    addAuditLog('DUPLICATE_EXAM', 'exam', `Guru ${currentUser?.name || ''} menduplikasi paket ujian: ${sourceExam.title}`, 'info');
  };

  // Delete Exam
  const handleDeleteExam = (exam: Exam) => {
    if (confirm(`Apakah Anda yakin ingin menghapus paket soal "${exam.title}" (${exam.code})? Tindakan ini tidak dapat dibatalkan.`)) {
      deleteExam(exam.id);
      triggerToast(`Paket soal "${exam.title}" berhasil dihapus.`);
    }
  };

  // Word Import directly to new exam
  const handleDirectWordImport = (importedQuestions: Question[], _mode: 'append' | 'replace') => {
    const newExam: Exam = {
      id: `exm-${Date.now()}`,
      code: `AM-WORD-${Math.floor(100 + Math.random() * 900)}`,
      title: `Ujian Hasil Impor Word (${importedQuestions.length} Soal)`,
      subject: 'Fikih MTs',
      academicYear: systemSettings.academicYear,
      semester: systemSettings.activeSemester,
      durationMinutes: 60,
      passingGrade: systemSettings.defaultPassingGrade || 75,
      totalQuestions: importedQuestions.length,
      classesAllowed: classes.slice(0, 2).map(c => c.id),
      randomizeQuestions: true,
      randomizeOptions: true,
      maxViolationsAllowed: systemSettings.maxViolationsAllowed || 3,
      status: 'active',
      authorId: currentUser?.id,
      authorName: currentUser?.name,
      authorUsername: currentUser?.username,
      startTime: new Date().toISOString(),
      endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      questions: importedQuestions
    };

    addExam(newExam);
    setShowWordImportModal(false);
    triggerToast(`Berhasil membuat paket ujian "${newExam.title}" berisi ${importedQuestions.length} butir soal dari dokumen Word!`);
    addAuditLog('IMPORT_WORD_EXAM', 'exam', `Guru ${currentUser?.name || ''} mengimpor ${importedQuestions.length} butir soal Word untuk ${newExam.title}`, 'info');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}

      {/* Top Banner / Header */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-indigo-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold uppercase tracking-wider text-emerald-100 flex items-center gap-1.5">
                <Edit3 className="w-3.5 h-3.5" />
                Pusat Pembuatan Soal & Bank Soal Guru
              </span>
              <span className="px-2.5 py-0.5 bg-emerald-500/40 text-emerald-100 rounded-full text-[11px] font-semibold">
                {systemSettings.schoolName}
              </span>
              <span className="px-2.5 py-0.5 bg-white/20 text-white rounded-full text-[11px] font-semibold">
                T.A. {systemSettings.academicYear} ({systemSettings.activeSemester})
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Pembuatan Soal & Bank Soal Terintegrasi
            </h1>
            <p className="text-emerald-100 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
              Fasilitas bagi Bapak/Ibu Guru untuk membuat dan menyusun paket ujian dengan <strong>4 format soal lengkap</strong> (Pilihan Ganda, PG Kompleks, Menjodohkan Pasangan, dan Esai) serta fitur <strong>Upload dari Word (.docx)</strong> yang langsung tertaut ke rombel kelas sasaran.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto shrink-0">
            {/* Quick Export Exam Results */}
            <button
              onClick={() => {
                setExportExam(filteredExams[0] || authorScopedExams[0] || null);
                setExportInitialFormat('excel');
              }}
              className="px-3.5 py-2.5 bg-emerald-700/80 hover:bg-emerald-600 text-white border border-emerald-400/40 font-bold rounded-2xl text-xs flex items-center gap-1.5 cursor-pointer transition shadow-md active:scale-95"
              title="Ekspor Rekap Nilai Siswa (Excel / PDF) per Mata Pelajaran"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
              <span>Ekspor Hasil Ujian</span>
            </button>

            {/* Direct Upload Word */}
            <button
              onClick={() => setShowWordImportModal(true)}
              className="px-3.5 py-2.5 bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-600 hover:to-indigo-600 text-white border border-blue-400/40 font-bold rounded-2xl text-xs flex items-center gap-2 cursor-pointer transition shadow-md active:scale-95"
              title="Upload soal Word (.docx) dengan Equation, Gambar Langsung, dan Kunci Otomatis"
            >
              <FileUp className="w-4 h-4 text-blue-200" />
              <span>Upload Word</span>
              <span className="hidden lg:inline px-1.5 py-0.5 bg-white/20 text-white text-[9px] font-black rounded-md">
                Equation & Kunci Otomatis
              </span>
            </button>

            {/* Create Exam Button */}
            <button
              onClick={() => {
                setEditingExam(null);
                setShowBuilderModal(true);
              }}
              className="px-4 py-2.5 bg-white text-emerald-900 hover:bg-emerald-50 font-black rounded-2xl text-xs flex items-center gap-1.5 cursor-pointer transition shadow-lg active:scale-95"
            >
              <Plus className="w-4 h-4 text-emerald-600" />
              <span>+ Paket Baru</span>
            </button>
          </div>
        </div>

        {/* Quick Statistics Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/15">
          <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-3 border border-white/10">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-200 block">
              {isTeacher ? 'Paket Soal Anda' : 'Total Paket Ujian'}
            </span>
            <div className="text-xl sm:text-2xl font-black mt-0.5">{authorScopedExams.length} Paket</div>
            <span className="text-[10px] text-emerald-200/80">
              {isTeacher ? 'Dibuat oleh Anda' : 'Tersinkron ke Siswa'}
            </span>
          </div>
          <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-3 border border-white/10">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-200 block">
              {isTeacher ? 'Butir Soal Anda' : 'Total Butir Soal'}
            </span>
            <div className="text-xl sm:text-2xl font-black mt-0.5">{totalQuestionsAll} Butir</div>
            <span className="text-[10px] text-emerald-200/80">4 Jenis Soal Didukung</span>
          </div>
          <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-3 border border-white/10">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-200 block">Rombel Sasaran</span>
            <div className="text-xl sm:text-2xl font-black mt-0.5">{classes.length} Rombel</div>
            <span className="text-[10px] text-emerald-200/80">Tersinkron dari Admin</span>
          </div>
          <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-3 border border-white/10">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-200 block">Peserta Mengerjakan</span>
            <div className="text-xl sm:text-2xl font-black mt-0.5">{sessions.length} Sesi</div>
            <span className="text-[10px] text-emerald-200/80">Otomatis Terkoneksi</span>
          </div>
        </div>
      </div>

      {/* Teacher Author Privacy Banner */}
      {isTeacher && (
        <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-green-50 border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
              <UserIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black text-emerald-950">
                  Mode Bank Soal Pribadi: {currentUser?.name}
                </span>
                <span className="px-2 py-0.5 bg-emerald-200 text-emerald-800 rounded-full text-[10px] font-black uppercase tracking-wider">
                  Khusus Soal Buatan Sendiri
                </span>
              </div>
              <p className="text-[11px] text-emerald-700 mt-0.5 leading-relaxed">
                Sesuai kebijakan madrasah, Anda hanya dapat melihat dan mengelola paket ujian yang dibuat oleh akun Anda sendiri. Naskah soal milik rekan guru lain dirahasiakan.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <span className="px-3 py-1.5 bg-white border border-emerald-300 text-emerald-800 rounded-xl text-xs font-black shadow-2xs">
              {authorScopedExams.length} Paket Ujian Anda
            </span>
          </div>
        </div>
      )}

      {/* Format Question Showcase Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Tipe Soal 1</span>
            <span className="text-xs font-extrabold text-slate-800">Pilihan Ganda</span>
            <span className="text-[10px] text-blue-600 font-bold block">{questionTypeStats.pg} butir terdaftar</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-black shrink-0">
            <CheckSquare className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Tipe Soal 2</span>
            <span className="text-xs font-extrabold text-slate-800">PG Kompleks</span>
            <span className="text-[10px] text-teal-600 font-bold block">{questionTypeStats.pgk} butir (&gt;1 Benar)</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-black shrink-0">
            <ArrowRightLeft className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Tipe Soal 3</span>
            <span className="text-xs font-extrabold text-slate-800">Menjodohkan</span>
            <span className="text-[10px] text-purple-600 font-bold block">{questionTypeStats.matching} butir pasangan</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-black shrink-0">
            <Edit3 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Tipe Soal 4</span>
            <span className="text-xs font-extrabold text-slate-800">Esai / Uraian</span>
            <span className="text-[10px] text-amber-600 font-bold block">{questionTypeStats.essay} butir uraian</span>
          </div>
        </div>
      </div>

      {/* Control Bar: Filters & Search */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Filter Subject */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700">
            <BookOpen className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedSubjectFilter}
              onChange={(e) => setSelectedSubjectFilter(e.target.value)}
              className="bg-transparent focus:outline-hidden cursor-pointer"
            >
              <option value="all">Semua Mata Pelajaran</option>
              {subjectsList.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Filter Target Class */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700">
            <School className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedClassFilter}
              onChange={(e) => setSelectedClassFilter(e.target.value)}
              className="bg-transparent focus:outline-hidden cursor-pointer"
            >
              <option value="all">Semua Rombel Sasaran</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Filter Tanggal Pelaksanaan Ujian */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700">
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            <select
              value={selectedDateFilter}
              onChange={(e) => setSelectedDateFilter(e.target.value)}
              className="bg-transparent focus:outline-hidden cursor-pointer"
            >
              <option value="all">Semua Jadwal Ujian</option>
              <option value="today">Hari Ini: {todayDateFormatted}</option>
              <option value="upcoming">Akan Datang (Terjadwal)</option>
              {examDatesList.map(d => {
                const label = new Date(d + 'T00:00:00').toLocaleDateString('id-ID', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                });
                return (
                  <option key={d} value={d}>
                    {label} ({d})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Admin Filter: Teacher Author */}
          {!isTeacher && currentUser?.role === 'admin' && (
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700">
              <UserIcon className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedTeacherFilter}
                onChange={(e) => setSelectedTeacherFilter(e.target.value)}
                className="bg-transparent focus:outline-hidden cursor-pointer"
              >
                <option value="all">Semua Guru Pembuat ({exams.length} Paket)</option>
                {authorsList.map(a => (
                  <option key={a.id} value={a.id}>Guru: {a.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari judul soal, kode paket, mapel..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition"
          />
        </div>
      </div>

      {/* Exam Packages Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(filteredExams || []).filter(Boolean).map(exam => {
          // Count types in this exam safely
          const qList = Array.isArray(exam.questions) ? exam.questions : [];
          const pgCount = qList.filter(q => q && q.type === 'multiple_choice').length;
          const pgkCount = qList.filter(q => q && q.type === 'multiple_choice_complex').length;
          const matchingCount = qList.filter(q => q && q.type === 'matching').length;
          const essayCount = qList.filter(q => q && q.type === 'essay').length;
          const totalQ = qList.length;

          // Target classes names
          const allowedClassesObjects = (classes || []).filter(c => c && Array.isArray(exam.classesAllowed) && exam.classesAllowed.includes(c.id));

          return (
            <div
              key={exam.id || Math.random().toString()}
              className="bg-white rounded-3xl border border-slate-200 shadow-xs hover:shadow-md transition flex flex-col justify-between overflow-hidden group"
            >
              {/* Card Header */}
              <div className="p-5 border-b border-slate-100 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-[10px] font-black tracking-wider uppercase shrink-0">
                    {exam.code}
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    <div 
                      className="px-2 py-0.5 bg-amber-50 text-amber-900 border border-amber-300 rounded-md text-[10px] font-mono font-black flex items-center gap-1 cursor-pointer hover:bg-amber-100 transition"
                      onClick={() => {
                        const tokenVal = exam.token || 'AM2026';
                        navigator.clipboard.writeText(tokenVal);
                        triggerToast(`Token ujian ${tokenVal} berhasil disalin!`);
                      }}
                      title="Klik untuk menyalin token ujian"
                    >
                      <Key className="w-3 h-3 text-amber-600" />
                      <span>Token: <strong>{exam.token || 'AM2026'}</strong></span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
                        let newToken = '';
                        for (let i = 0; i < 6; i++) {
                          newToken += chars.charAt(Math.floor(Math.random() * chars.length));
                        }
                        updateExam({ ...exam, token: newToken });
                        triggerToast(`Token paket ujian ${exam.code} berhasil di-generate ulang: ${newToken}`);
                      }}
                      className="p-1 text-slate-400 hover:text-amber-700 hover:bg-amber-100 rounded-md transition cursor-pointer"
                      title="Generate Ulang Token Acak"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </button>
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-[10px] font-bold shrink-0">
                      {exam.subject}
                    </span>
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-extrabold text-slate-900 line-clamp-2 group-hover:text-emerald-700 transition">
                    {exam.title}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-1.5">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {exam.durationMinutes} Menit
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Award className="w-3.5 h-3.5 text-slate-400" />
                      KKM: {exam.passingGrade}
                    </span>
                    <span>•</span>
                    <span>{exam.academicYear}</span>
                  </div>
                </div>

                {/* Tanggal Pelaksanaan Ujian Banner */}
                {(() => {
                  const examDateStr = exam.examDate || exam.startTime?.split('T')[0] || todayYmd;
                  const isToday = examDateStr === todayYmd;
                  const isUpcoming = examDateStr > todayYmd;
                  const formattedDate = new Date(examDateStr + 'T00:00:00').toLocaleDateString('id-ID', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  });
                  return (
                    <div className="p-2.5 rounded-2xl bg-gradient-to-r from-blue-50/90 to-indigo-50/90 border border-blue-200/90 flex items-center justify-between gap-2 shadow-2xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                          <Calendar className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[10px] uppercase font-bold text-blue-700 tracking-wider">
                            Jadwal Pelaksanaan Ujian:
                          </div>
                          <div className="text-xs font-black text-slate-900 truncate">
                            {formattedDate}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black inline-flex items-center gap-1 ${
                          isToday
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : isUpcoming
                            ? 'bg-blue-100 text-blue-800 border border-blue-300'
                            : 'bg-slate-200 text-slate-700'
                        }`}>
                          {isToday && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                          {isToday ? 'Aktif Hari Ini' : isUpcoming ? 'Terjadwal' : 'Lewat Jadwal'}
                        </span>
                        <div className="text-[10px] text-indigo-700 font-mono font-bold mt-0.5">
                          {exam.examStartTime || '07:30'} - {exam.examEndTime || '09:00'} WIB
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* 4 Question Types Tag Breakdown */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {pgCount > 0 && (
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-md text-[10px] font-bold">
                      {pgCount} PG
                    </span>
                  )}
                  {pgkCount > 0 && (
                    <span className="px-2 py-0.5 bg-teal-50 text-teal-700 border border-teal-200 rounded-md text-[10px] font-bold">
                      {pgkCount} PG Kompleks
                    </span>
                  )}
                  {matchingCount > 0 && (
                    <span className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-md text-[10px] font-bold">
                      {matchingCount} Menjodohkan
                    </span>
                  )}
                  {essayCount > 0 && (
                    <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-md text-[10px] font-bold">
                      {essayCount} Esai
                    </span>
                  )}
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[10px] font-extrabold ml-auto">
                    Total: {totalQ} Soal
                  </span>
                </div>

                {/* Author Metadata */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 font-medium">Pembuat Soal:</span>
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <UserIcon className="w-3.5 h-3.5 text-emerald-600" />
                    {isTeacher 
                      ? (exam.authorName || currentUser?.name || 'Saya Sendiri') 
                      : (exam.authorName || 'Guru Mapel')}
                  </span>
                </div>

                {/* Target Classes List */}
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Rombel Sasaran:
                  </span>
                  <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                    {allowedClassesObjects.length > 0 ? (
                      allowedClassesObjects.map(c => (
                        <span
                          key={c.id}
                          className="px-2 py-0.5 bg-slate-50 text-slate-700 border border-slate-200 rounded-md text-[10px] font-semibold"
                        >
                          {c.name}
                        </span>
                      ))
                    ) : (
                      <span className="text-[11px] text-slate-400 italic">Semua Rombel (Terbuka)</span>
                    )}
                  </div>
                </div>

                {/* Exam Submissions & Export Results Shortcut */}
                {(() => {
                  const examSessions = (sessions || []).filter(s => s && s.examId === exam.id);
                  const examCompletedCount = examSessions.filter(s => s.status === 'completed' || s.status === 'locked').length;
                  const inProgressExamCount = examSessions.filter(s => s.status === 'in_progress').length;
                  const lockedExamCount = examSessions.filter(s => s.status === 'locked').length;

                  return (
                    <>
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                        <span className="text-slate-400 font-medium">Hasil Ujian:</span>
                        <button
                          type="button"
                          onClick={() => {
                            setExportExam(exam);
                            setExportInitialFormat('excel');
                          }}
                          className="font-bold text-emerald-800 hover:text-emerald-950 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-lg border border-emerald-200 flex items-center gap-1.5 cursor-pointer transition"
                          title="Ekspor Rekapitulasi Nilai Ujian (Excel & PDF)"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{examCompletedCount} Siswa • Unduh Nilai</span>
                        </button>
                      </div>

                      {/* Ruang Pengawas & Monitoring Peserta Real-Time */}
                      <div className="pt-2.5 pb-1 border-t border-slate-100 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                            <Activity className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
                            <span>Ruang Pengawas Soal:</span>
                          </span>

                          <div className="flex items-center gap-1">
                            {inProgressExamCount > 0 && (
                              <span className="px-1.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded font-bold text-[10px] flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
                                {inProgressExamCount} Mengerjakan
                              </span>
                            )}
                            {lockedExamCount > 0 && (
                              <span className="px-1.5 py-0.5 bg-rose-100 text-rose-800 border border-rose-300 rounded font-bold text-[10px] animate-pulse">
                                {lockedExamCount} Terkunci
                              </span>
                            )}
                            {inProgressExamCount === 0 && lockedExamCount === 0 && (
                              <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded font-medium text-[10px]">
                                {examCompletedCount > 0 ? `${examCompletedCount} Selesai` : 'Siap Dipantau'}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedExamId(exam.id);
                              setActiveTab('control_room');
                            }}
                            className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 hover:border-indigo-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition shadow-2xs active:scale-95"
                            title="Buka Ruang Pengawas untuk paket soal ini di dashboard saat ini"
                          >
                            <Activity className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Ruang Pengawas</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              const url = `${window.location.origin}${window.location.pathname}?tab=control_room&examId=${exam.id}`;
                              window.open(url, '_blank');
                            }}
                            className="px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 hover:text-indigo-600 border border-slate-200 hover:border-indigo-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition shadow-2xs active:scale-95"
                            title="Buka Ruang Pengawas soal ini di Tab Baru (bisa untuk monitor pengawas terpisah)"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Buka di Tab Baru</span>
                          </button>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Card Footer Actions */}
              <div className="p-4 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  {/* Proctor Control Room Button */}
                  <button
                    onClick={() => {
                      setSelectedExamId(exam.id);
                      setActiveTab('control_room');
                    }}
                    className="p-2 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-xl transition cursor-pointer border border-transparent hover:border-indigo-200"
                    title="Buka Ruang Pengawas Ujian Ini"
                  >
                    <Activity className="w-4 h-4" />
                  </button>

                  {/* Proctor Room New Tab Button */}
                  <button
                    onClick={() => {
                      const url = `${window.location.origin}${window.location.pathname}?tab=control_room&examId=${exam.id}`;
                      window.open(url, '_blank');
                    }}
                    className="p-2 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-xl transition cursor-pointer border border-transparent hover:border-indigo-200"
                    title="Buka Ruang Pengawas di Tab Baru"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>

                  {/* Preview Button */}
                  <button
                    onClick={() => setPreviewExam(exam)}
                    className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-white rounded-xl transition cursor-pointer border border-transparent hover:border-slate-200"
                    title="Pratinjau Butir Soal"
                  >
                    <Eye className="w-4 h-4" />
                  </button>

                  {/* Print / PDF Button */}
                  <button
                    onClick={() => setPrintExam(exam)}
                    className="p-2 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 rounded-xl transition cursor-pointer border border-transparent hover:border-emerald-200"
                    title="Cetak Naskah Soal ke Format PDF / Kertas Fisik"
                  >
                    <Printer className="w-4 h-4" />
                  </button>

                  {/* Export Results Excel & PDF Button */}
                  <button
                    onClick={() => {
                      setExportExam(exam);
                      setExportInitialFormat('excel');
                    }}
                    className="p-2 text-indigo-700 hover:text-indigo-900 hover:bg-indigo-50 rounded-xl transition cursor-pointer border border-transparent hover:border-indigo-200"
                    title="Ekspor Rekap Nilai Siswa (Excel / PDF) untuk Mapel Ini"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                  </button>

                  {/* Duplicate Button */}
                  <button
                    onClick={() => handleDuplicateExam(exam)}
                    className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-white rounded-xl transition cursor-pointer border border-transparent hover:border-slate-200"
                    title="Duplikat Paket Ujian ke Akun Anda"
                  >
                    <Copy className="w-4 h-4" />
                  </button>

                  {/* Delete Button */}
                  <button
                    onClick={() => handleDeleteExam(exam)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-white rounded-xl transition cursor-pointer border border-transparent hover:border-slate-200"
                    title="Hapus Paket Soal"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Edit & Manage Button */}
                <button
                  onClick={() => {
                    setEditingExam(exam);
                    setShowBuilderModal(true);
                  }}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition shadow-xs active:scale-95"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit & Kelola Soal</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredExams.length === 0 && (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 max-w-lg mx-auto">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-extrabold text-slate-800 text-base">
            {isTeacher ? 'Belum Ada Soal Buatan Anda' : 'Tidak ada paket soal yang cocok'}
          </h3>
          <p className="text-xs text-slate-400 mt-1 mb-5 leading-relaxed">
            {isTeacher 
              ? 'Anda hanya melihat paket soal yang dibuat oleh akun Anda sendiri. Klik tombol di bawah untuk membuat naskah baru atau mengimpor file Word (.docx).'
              : 'Sesuaikan kata kunci pencarian, filter mata pelajaran, atau buat paket soal ujian baru sekarang.'}
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedSubjectFilter('all');
                setSelectedClassFilter('all');
                setSelectedTeacherFilter('all');
              }}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
            >
              Reset Filter
            </button>
            <button
              onClick={() => {
                setEditingExam(null);
                setShowBuilderModal(true);
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer"
            >
              + Buat Paket Baru
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: EXAM & QUESTION BUILDER MODAL */}
      {/* ========================================================================= */}
      {showBuilderModal && (
        <ExamQuestionBuilderModal
          classes={classes}
          initialExam={editingExam}
          onClose={() => {
            setShowBuilderModal(false);
            setEditingExam(null);
          }}
          onSave={(savedExam) => {
            const examWithAuthor: Exam = {
              ...savedExam,
              authorId: savedExam.authorId || currentUser?.id,
              authorName: savedExam.authorName || currentUser?.name,
              authorUsername: savedExam.authorUsername || currentUser?.username,
            };
            if (editingExam) {
              updateExam(examWithAuthor);
              triggerToast(`Paket soal "${examWithAuthor.title}" berhasil diperbarui!`);
            } else {
              addExam(examWithAuthor);
              triggerToast(`Paket soal baru "${examWithAuthor.title}" berhasil disimpan dan tersinkron!`);
            }
            setShowBuilderModal(false);
            setEditingExam(null);
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: DIRECT WORD (.DOCX) IMPORT MODAL */}
      {/* ========================================================================= */}
      {showWordImportModal && (
        <WordExamImportModal
          currentSubject="Fikih MTs"
          onClose={() => setShowWordImportModal(false)}
          onImport={handleDirectWordImport}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: EXAM QUESTION PREVIEW MODAL */}
      {/* ========================================================================= */}
      {previewExam && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50 rounded-t-3xl">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-md text-[10px] font-black uppercase">
                    {previewExam.code}
                  </span>
                  <span className="text-xs font-bold text-slate-500">{previewExam.subject}</span>
                </div>
                <h2 className="text-base font-extrabold text-slate-900 mt-0.5">
                  Pratinjau Butir Soal: {previewExam.title}
                </h2>
                <div className="flex items-center gap-2 mt-1 text-xs text-blue-800 font-semibold">
                  <span className="flex items-center gap-1 bg-blue-100/70 border border-blue-200 px-2 py-0.5 rounded-md">
                    <Calendar className="w-3.5 h-3.5 text-blue-600" />
                    <span>Jadwal Ujian: {previewExam.examDate || todayYmd} ({previewExam.examStartTime || '07:30'} - {previewExam.examEndTime || '09:00'} WIB)</span>
                  </span>
                </div>
              </div>

              <button
                onClick={() => setPreviewExam(null)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Questions List */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {previewExam.questions.map((q, idx) => (
                <div key={q.id} className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-xs font-black">
                        #{idx + 1}
                      </span>
                      <span className="text-xs font-bold text-slate-600 capitalize">
                        {q.type === 'multiple_choice' && 'Pilihan Ganda'}
                        {q.type === 'multiple_choice_complex' && 'Pilihan Ganda Kompleks'}
                        {q.type === 'matching' && 'Mencocokkan Pasangan'}
                        {q.type === 'essay' && 'Esai / Uraian'}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-900 border border-blue-200 text-[10px] font-bold flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-blue-600" />
                        <span>Jadwal: {q.examDate || previewExam.examDate || todayYmd}</span>
                      </span>
                    </div>
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                      {q.points} Poin
                    </span>
                  </div>

                  <div className="text-sm font-semibold text-slate-800 leading-relaxed">
                    <MathRenderer text={q.text} />
                  </div>

                  {q.image && (
                    <div className="rounded-xl overflow-hidden border border-slate-200 bg-white p-2 inline-block max-w-md">
                      <img 
                        src={q.image} 
                        alt={`Lampiran Soal #${idx + 1}`} 
                        className="max-h-56 w-auto object-contain rounded-lg mx-auto" 
                      />
                    </div>
                  )}

                  {/* Multiple Choice Options */}
                  {q.type === 'multiple_choice' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {q.options.map((opt, optIdx) => {
                        const isCorrect = q.correctOptionId === opt.id;
                        const letter = String.fromCharCode(65 + optIdx);
                        return (
                          <div
                            key={opt.id}
                            className={`p-2.5 rounded-xl border text-xs flex items-center gap-2 ${
                              isCorrect
                                ? 'bg-emerald-50 border-emerald-400 text-emerald-950 font-bold'
                                : 'bg-white border-slate-200 text-slate-700'
                            }`}
                          >
                            <span className={`w-5 h-5 rounded flex items-center justify-center font-bold text-[11px] shrink-0 ${
                              isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {letter}
                            </span>
                            <div className="flex-1">
                              <MathRenderer text={opt.text} inline />
                              {opt.image && (
                                <div className="mt-1">
                                  <img src={opt.image} alt="Opsi" className="h-10 object-contain rounded border" />
                                </div>
                              )}
                            </div>
                            {isCorrect && <span className="ml-auto text-[10px] text-emerald-700 font-extrabold shrink-0">Kunci</span>}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Multiple Choice Complex Options */}
                  {q.type === 'multiple_choice_complex' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {q.options.map((opt, optIdx) => {
                        const isCorrect = (q.correctOptionIds || []).includes(opt.id);
                        const letter = String.fromCharCode(65 + optIdx);
                        return (
                          <div
                            key={opt.id}
                            className={`p-2.5 rounded-xl border text-xs flex items-center gap-2 ${
                              isCorrect
                                ? 'bg-teal-50 border-teal-400 text-teal-950 font-bold'
                                : 'bg-white border-slate-200 text-slate-700'
                            }`}
                          >
                            <span className={`w-5 h-5 rounded flex items-center justify-center font-bold text-[11px] shrink-0 ${
                              isCorrect ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {letter}
                            </span>
                            <div className="flex-1">
                              <MathRenderer text={opt.text} inline />
                              {opt.image && (
                                <div className="mt-1">
                                  <img src={opt.image} alt="Opsi" className="h-10 object-contain rounded border" />
                                </div>
                              )}
                            </div>
                            {isCorrect && <span className="ml-auto text-[10px] text-teal-700 font-extrabold shrink-0">Benar</span>}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Matching Pairs */}
                  {q.type === 'matching' && (
                    <div className="space-y-1.5 pt-1">
                      {(q.matchingPairs || []).map((pair, pIdx) => (
                        <div key={pair.id || pIdx} className="p-2.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-800">{pIdx + 1}. {pair.leftPrompt}</span>
                          <ArrowRightLeft className="w-3.5 h-3.5 text-purple-400 mx-2" />
                          <span className="font-bold text-purple-900 bg-purple-50 px-2 py-0.5 rounded-md">{pair.rightAnswer}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Essay */}
                  {q.type === 'essay' && (
                    <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs space-y-1.5">
                      <span className="font-bold text-amber-900 block">Kunci / Rubrik Jawaban Guru:</span>
                      <p className="text-slate-700 italic">{q.sampleAnswer || 'Belum ada kunci jawaban referensi.'}</p>
                      {q.keywords && q.keywords.length > 0 && (
                        <div className="flex items-center gap-1 pt-1 text-[11px] text-amber-800">
                          <span className="font-semibold">Kata Kunci:</span>
                          <span>{q.keywords.join(', ')}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 rounded-b-3xl flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-slate-500">
                Total {previewExam.questions.length} butir soal terkonfigurasi.
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const examId = previewExam.id;
                    setPreviewExam(null);
                    setSelectedExamId(examId);
                    setActiveTab('control_room');
                  }}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition"
                  title="Buka Ruang Pengawas untuk paket soal ini"
                >
                  <Activity className="w-4 h-4" />
                  <span>Ruang Pengawas</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const url = `${window.location.origin}${window.location.pathname}?tab=control_room&examId=${previewExam.id}`;
                    window.open(url, '_blank');
                  }}
                  className="px-3 py-2 bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition"
                  title="Buka Ruang Pengawas soal ini di Tab Baru"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Tab Baru</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const toPrint = previewExam;
                    setPreviewExam(null);
                    setPrintExam(toPrint);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak Naskah (PDF)</span>
                </button>

                <button
                  onClick={() => setPreviewExam(null)}
                  className="px-4 py-2 bg-slate-900 text-white font-bold rounded-xl text-xs cursor-pointer hover:bg-black transition"
                >
                  Tutup Pratinjau
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: CETAK NASKAH SOAL KE PDF / KERTAS FISIK */}
      {/* ========================================================================= */}
      {printExam && (
        <PrintExamModal
          isOpen={!!printExam}
          exam={printExam}
          classes={classes}
          onClose={() => setPrintExam(null)}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: EKSPOR REKAP HASIL UJIAN (EXCEL & PDF) PER MAPEL */}
      {/* ========================================================================= */}
      {exportExam && (
        <ExportReportsModal
          isOpen={!!exportExam}
          exam={exportExam}
          availableExams={authorScopedExams}
          sessions={sessions || []}
          initialFormat={exportInitialFormat}
          onClose={() => setExportExam(null)}
        />
      )}
    </div>
  );
};
