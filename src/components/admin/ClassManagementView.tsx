import React, { useState } from 'react';
import { useCbt } from '../../context/CbtContext';
import { ClassGroup, Exam, Question, QuestionOption, QuestionType, User } from '../../types/cbt';
import { WordExamImportModal } from './WordExamImportModal';
import { ExamQuestionBuilderModal } from '../teacher/ExamQuestionBuilderModal';
import { 
  School, 
  Users, 
  FileText, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  BookOpen, 
  Clock, 
  Layers, 
  Sparkles, 
  X, 
  Save, 
  Eye, 
  Shuffle, 
  GraduationCap, 
  Check, 
  ArrowRight,
  Filter,
  CheckSquare,
  Square,
  HelpCircle,
  AlertCircle,
  FileUp,
  ArrowRightLeft,
  ListPlus,
  UserPlus,
  UserMinus,
  UserCheck,
  Key,
  Lock,
  ShieldAlert
} from 'lucide-react';

export const ClassManagementView: React.FC = () => {
  const { 
    classes, 
    addClass, 
    updateClass, 
    deleteClass, 
    exams, 
    addExam, 
    updateExam, 
    deleteExam,
    users, 
    addUser,
    updateUser,
    deleteUser,
    currentUser,
    systemSettings 
  } = useCbt();

  // State
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals
  const [showClassModal, setShowClassModal] = useState<boolean>(false);
  const [editingClass, setEditingClass] = useState<ClassGroup | null>(null);

  const [showExamBuilderModal, setShowExamBuilderModal] = useState<boolean>(false);
  const [targetClassForExam, setTargetClassForExam] = useState<string | null>(null);

  const [showRosterModal, setShowRosterModal] = useState<boolean>(false);
  const [selectedRosterClass, setSelectedRosterClass] = useState<ClassGroup | null>(null);

  // Helper Toast
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Filtered Classes
  const filteredClasses = (classes || []).filter(cls => {
    if (!cls) return false;
    const matchesGrade = selectedGradeFilter === 'all' || cls.grade === selectedGradeFilter;
    const q = (searchQuery || '').toLowerCase().trim();
    const matchesSearch = !q || 
      (cls.name || '').toLowerCase().includes(q) ||
      (cls.homeroomTeacher && cls.homeroomTeacher.toLowerCase().includes(q)) ||
      (cls.majorOrTrack && cls.majorOrTrack.toLowerCase().includes(q));
    return matchesGrade && matchesSearch;
  });

  // Calculate actual enrolled students per class from users
  const getStudentsForClass = (cls: ClassGroup): User[] => {
    if (!cls) return [];
    return (users || []).filter(u => {
      if (!u || u.role !== 'student') return false;
      if (u.classId) return u.classId === cls.id;
      if (!u.className || u.className === 'Tanpa Rombel' || u.className === 'Belum Ditentukan') return false;
      return (cls.name && u.className.toLowerCase() === cls.name.toLowerCase());
    });
  };

  // Get exams assigned to a class
  const getExamsForClass = (classId: string): Exam[] => {
    return exams.filter(e => e.classesAllowed && e.classesAllowed.includes(classId));
  };

  // Open Exam Builder targeted for a class
  const handleCreateExamForClass = (classId: string) => {
    setTargetClassForExam(classId);
    setShowExamBuilderModal(true);
  };

  // Open Edit Class Modal
  const handleOpenEditClass = (cls: ClassGroup) => {
    setEditingClass(cls);
    setShowClassModal(true);
  };

  // Delete Class with Confirmation
  const handleDeleteClass = (cls: ClassGroup) => {
    if (confirm(`Apakah Anda yakin ingin menghapus rombel ${cls.name}? Data ujian yang tertaut tetap tersimpan.`)) {
      deleteClass(cls.id);
      triggerToast(`Rombel ${cls.name} berhasil dihapus.`);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 p-4 bg-emerald-700 text-white rounded-2xl shadow-xl flex items-center gap-3 animate-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-200" />
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}

      {/* Top Banner */}
      <div className="bg-gradient-to-r from-teal-800 via-emerald-800 to-indigo-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold uppercase tracking-wider text-emerald-100 flex items-center gap-1.5">
                <School className="w-3.5 h-3.5" />
                Manajemen Rombel & Integrasi Bank Soal
              </span>
              <span className="px-2.5 py-0.5 bg-emerald-500/40 text-emerald-100 rounded-full text-[11px] font-semibold">
                T.A. {systemSettings.academicYear}
              </span>
              <span className="px-2.5 py-0.5 bg-white/20 text-white rounded-full text-[11px] font-semibold flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-300" />
                Khusus Admin • Sinkron Otomatis ke Guru & Siswa
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Pengaturan Kelas & Pembuatan Soal MTs
            </h1>
            <p className="text-emerald-100 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
              Kelola rombongan belajar (rombel) madrasah, pantau daftar santri per kelas, dan buat paket soal ujian yang langsung terintegrasi secara spesifik ke rombel tujuan.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
            <button
              onClick={() => {
                setEditingClass(null);
                setShowClassModal(true);
              }}
              className="px-4 py-2.5 bg-white/15 hover:bg-white/25 backdrop-blur-md text-white border border-white/20 font-bold rounded-2xl text-xs flex items-center gap-2 cursor-pointer transition shadow-xs"
            >
              <Plus className="w-4 h-4 text-emerald-300" />
              <span>Tambah Rombel Baru</span>
            </button>

            <button
              onClick={() => {
                setTargetClassForExam(null);
                setShowExamBuilderModal(true);
              }}
              className="px-5 py-2.5 bg-white text-emerald-900 hover:bg-emerald-50 font-black rounded-2xl text-xs flex items-center gap-2 cursor-pointer transition shadow-lg active:scale-95"
            >
              <FileText className="w-4 h-4 text-emerald-600" />
              <span>Buat Paket Soal Baru</span>
            </button>
          </div>
        </div>

        {/* Quick Statistics Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/15">
          <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-3 border border-white/10">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-200 block">Total Rombel</span>
            <div className="text-xl sm:text-2xl font-black mt-0.5">{classes.length} Kelas</div>
          </div>
          <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-3 border border-white/10">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-200 block">Santri Terdata</span>
            <div className="text-xl sm:text-2xl font-black mt-0.5">
              {users.filter(u => u.role === 'student').length} Siswa
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-3 border border-white/10">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-200 block">Paket Soal / Ujian</span>
            <div className="text-xl sm:text-2xl font-black mt-0.5">{exams.length} Paket</div>
          </div>
          <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-3 border border-white/10">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-200 block">Jenjang Aktif</span>
            <div className="text-xl sm:text-2xl font-black mt-0.5">VII, VIII, IX</div>
          </div>
        </div>
      </div>

      {/* Control Bar: Filters & Search */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Grade Filters */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setSelectedGradeFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition shrink-0 ${
              selectedGradeFilter === 'all'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Semua Rombel ({classes.length})
          </button>
          <button
            onClick={() => setSelectedGradeFilter('VII')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition shrink-0 ${
              selectedGradeFilter === 'VII'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Kelas VII ({classes.filter(c => c.grade === 'VII').length})
          </button>
          <button
            onClick={() => setSelectedGradeFilter('VIII')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition shrink-0 ${
              selectedGradeFilter === 'VIII'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Kelas VIII ({classes.filter(c => c.grade === 'VIII').length})
          </button>
          <button
            onClick={() => setSelectedGradeFilter('IX')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition shrink-0 ${
              selectedGradeFilter === 'IX'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Kelas IX ({classes.filter(c => c.grade === 'IX').length})
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama rombel, wali kelas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition"
          />
        </div>
      </div>

      {/* Class Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredClasses.map(cls => {
          const classStudents = getStudentsForClass(cls);
          const classExams = getExamsForClass(cls.id);

          return (
            <div
              key={cls.id}
              className="bg-white rounded-3xl border border-slate-200 hover:border-emerald-300 shadow-xs hover:shadow-md transition duration-200 flex flex-col justify-between overflow-hidden"
            >
              {/* Card Header */}
              <div className="p-5 border-b border-slate-100 bg-gradient-to-br from-slate-50/70 to-white">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="w-10 h-10 rounded-2xl bg-emerald-600 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-xs">
                      {cls.grade}
                    </span>
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-base leading-tight">
                        {cls.name}
                      </h3>
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md inline-block mt-0.5">
                        {cls.majorOrTrack || 'Reguler MTs'}
                      </span>
                    </div>
                  </div>

                  {/* Actions: Edit & Delete */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditClass(cls)}
                      title="Edit Informasi Rombel"
                      className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl cursor-pointer transition"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteClass(cls)}
                      title="Hapus Rombel"
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl cursor-pointer transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Details info */}
                <div className="mt-4 space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-[11px]">Wali Kelas:</span>
                    <span className="font-bold text-slate-800">{cls.homeroomTeacher || 'Belum ditentukan'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-[11px]">Lokasi Ruang:</span>
                    <span className="font-medium text-slate-700">{cls.roomLocation || 'Kampus Utama'}</span>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-slate-400 text-[11px]">Santri Terdaftar:</span>
                    <button
                      onClick={() => {
                        setSelectedRosterClass(cls);
                        setShowRosterModal(true);
                      }}
                      className="font-extrabold text-emerald-700 hover:text-emerald-800 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>{classStudents.length > 0 ? classStudents.length : cls.totalStudents} Santri</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Card Body: INTEGRATED EXAMS & QUESTIONS */}
              <div className="p-5 space-y-3 flex-1 flex flex-col justify-between bg-slate-50/40">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                      Paket Soal Terjadwal ({classExams.length})
                    </span>
                  </div>

                  {classExams.length === 0 ? (
                    <div className="p-3.5 bg-white rounded-2xl border border-dashed border-slate-200 text-center">
                      <p className="text-[11px] text-slate-400">Belum ada paket soal khusus rombel ini.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {classExams.map(ex => (
                        <div
                          key={ex.id}
                          className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-2xs hover:border-emerald-200 transition"
                        >
                          <div className="flex items-start justify-between gap-1.5">
                            <div className="flex-1">
                              <div className="text-xs font-bold text-slate-900 line-clamp-1">
                                {ex.title}
                              </div>
                              <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5">
                                <span className="font-semibold text-emerald-700">{ex.subject}</span>
                                <span>•</span>
                                <span>{ex.questions?.length || ex.totalQuestions} Butir Soal</span>
                                <span>•</span>
                                <span>{ex.durationMinutes} Menit</span>
                              </div>
                            </div>
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md text-[10px] font-extrabold uppercase shrink-0">
                              {ex.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Integration Action: Buat Soal untuk Kelas Ini */}
                <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      setSelectedRosterClass(cls);
                      setShowRosterModal(true);
                    }}
                    className="py-2 px-3 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold rounded-xl text-[11px] flex items-center justify-center gap-1.5 cursor-pointer transition"
                  >
                    <Eye className="w-3.5 h-3.5 text-slate-500" />
                    <span>Daftar Santri</span>
                  </button>

                  <button
                    onClick={() => handleCreateExamForClass(cls.id)}
                    className="py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-[11px] flex items-center justify-center gap-1.5 cursor-pointer transition shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Buat Soal</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredClasses.length === 0 && (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 max-w-lg mx-auto">
          <School className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-extrabold text-slate-800 text-base">Tidak ada rombel yang cocok</h3>
          <p className="text-xs text-slate-400 mt-1 mb-5">
            Coba sesuaikan filter tingkat kelas atau kata kunci pencarian Anda.
          </p>
          <button
            onClick={() => {
              setSelectedGradeFilter('all');
              setSearchQuery('');
            }}
            className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold"
          >
            Reset Filter
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: INTEGRATED EXAM & QUESTION BUILDER MODAL */}
      {/* ========================================================================= */}
      {showExamBuilderModal && (
        <ExamQuestionBuilderModal
          targetClassId={targetClassForExam}
          classes={classes}
          onClose={() => {
            setShowExamBuilderModal(false);
            setTargetClassForExam(null);
          }}
          onSave={(newExam) => {
            const examWithAuthor: Exam = {
              ...newExam,
              authorId: newExam.authorId || currentUser?.id,
              authorName: newExam.authorName || currentUser?.name,
              authorUsername: newExam.authorUsername || currentUser?.username,
            };
            addExam(examWithAuthor);
            setShowExamBuilderModal(false);
            setTargetClassForExam(null);
            triggerToast(`Paket soal "${examWithAuthor.title}" berhasil dibuat dan diintegrasikan ke kelas sasaran!`);
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ADD / EDIT CLASS MODAL */}
      {/* ========================================================================= */}
      {showClassModal && (
        <ClassFormModal
          editingClass={editingClass}
          academicYear={systemSettings.academicYear}
          onClose={() => {
            setShowClassModal(false);
            setEditingClass(null);
          }}
          onSave={(savedClass) => {
            if (editingClass) {
              updateClass(savedClass);
              triggerToast(`Rombel ${savedClass.name} berhasil diperbarui.`);
            } else {
              addClass(savedClass);
              triggerToast(`Rombel ${savedClass.name} berhasil ditambahkan.`);
            }
            setShowClassModal(false);
            setEditingClass(null);
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: ROSTER SANTRI MODAL */}
      {/* ========================================================================= */}
      {showRosterModal && selectedRosterClass && (
        <ClassStudentsModal
          cls={selectedRosterClass}
          allClasses={classes}
          onClose={() => {
            setShowRosterModal(false);
            setSelectedRosterClass(null);
          }}
          onNotify={triggerToast}
        />
      )}

    </div>
  );
};


/* ========================================================================= */
/* SUB-COMPONENT: ADD / EDIT CLASS MODAL */
/* ========================================================================= */
interface ClassFormModalProps {
  editingClass: ClassGroup | null;
  academicYear: string;
  onClose: () => void;
  onSave: (cls: ClassGroup) => void;
}

const ClassFormModal: React.FC<ClassFormModalProps> = ({
  editingClass,
  academicYear,
  onClose,
  onSave
}) => {
  const [name, setName] = useState(editingClass?.name || 'VII-C (Reguler)');
  const [grade, setGrade] = useState(editingClass?.grade || 'VII');
  const [homeroomTeacher, setHomeroomTeacher] = useState(editingClass?.homeroomTeacher || '');
  const [majorOrTrack, setMajorOrTrack] = useState(editingClass?.majorOrTrack || 'Reguler Mandiri');
  const [roomLocation, setRoomLocation] = useState(editingClass?.roomLocation || 'Gedung Madrasah R.103');
  const [totalStudents, setTotalStudents] = useState(editingClass?.totalStudents || 32);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const saved: ClassGroup = {
      id: editingClass ? editingClass.id : `cls-${Date.now()}`,
      name: name.trim(),
      grade,
      homeroomTeacher: homeroomTeacher.trim(),
      majorOrTrack: majorOrTrack.trim(),
      roomLocation: roomLocation.trim(),
      totalStudents,
      academicYear: editingClass ? editingClass.academicYear : academicYear
    };

    onSave(saved);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <School className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">
                {editingClass ? 'Edit Rombongan Belajar' : 'Tambah Rombel Baru'}
              </h3>
              <p className="text-[11px] text-slate-400">Kelas & Rombel MTs Negeri 1</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Nama Rombel / Kelas <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: VII-C (Tahfidz Unggulan)"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tingkat Jenjang</label>
              <select
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition"
              >
                <option value="VII">Kelas VII</option>
                <option value="VIII">Kelas VIII</option>
                <option value="IX">Kelas IX</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Kapasitas Santri</label>
              <input
                type="number"
                min={1}
                max={50}
                value={totalStudents}
                onChange={(e) => setTotalStudents(parseInt(e.target.value) || 30)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Program / Peminatan Rombel</label>
            <input
              type="text"
              value={majorOrTrack}
              onChange={(e) => setMajorOrTrack(e.target.value)}
              placeholder="Contoh: Tahfidz Al-Qur'an, Sains, Riset"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Nama Wali Kelas</label>
            <input
              type="text"
              value={homeroomTeacher}
              onChange={(e) => setHomeroomTeacher(e.target.value)}
              placeholder="Contoh: Ust. Ahmad Fauzi, S.Pd.I"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Lokasi Ruang Kelas</label>
            <input
              type="text"
              value={roomLocation}
              onChange={(e) => setRoomLocation(e.target.value)}
              placeholder="Contoh: Gedung Umar bin Khattab R.103"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer transition text-center"
            >
              Batal
            </button>
            <button
              type="submit"
              className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs cursor-pointer transition shadow-xs text-center flex items-center justify-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Rombel</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ========================================================================= */
/* SUB-COMPONENT: ROSTER SANTRI MODAL (LENGKAP: TAMBAH, EDIT & KELUARKAN) */
/* ========================================================================= */
interface ClassStudentsModalProps {
  cls: ClassGroup;
  allClasses: ClassGroup[];
  onClose: () => void;
  onNotify: (msg: string) => void;
}

const ClassStudentsModal: React.FC<ClassStudentsModalProps> = ({
  cls,
  allClasses,
  onClose,
  onNotify
}) => {
  const { users, addUser, updateUser, systemSettings } = useCbt();

  // Tab view: 'list' | 'add_existing' | 'add_new'
  const [activeTab, setActiveTab] = useState<'list' | 'add_existing' | 'add_new'>('list');
  const [searchInClass, setSearchInClass] = useState('');
  const [searchExisting, setSearchExisting] = useState('');

  // Edit student modal state
  const [editingStudent, setEditingStudent] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [editNisn, setEditNisn] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editClassId, setEditClassId] = useState(cls.id);

  // Remove confirmation modal state
  const [confirmRemoveStudent, setConfirmRemoveStudent] = useState<User | null>(null);

  // New student form state
  const [newName, setNewName] = useState('');
  const [newNisn, setNewNisn] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('123456');

  // Compute enrolled students in this class
  const classStudents = (users || []).filter(u => {
    if (!u || u.role !== 'student') return false;
    if (u.classId) return u.classId === cls.id;
    if (!u.className || u.className === 'Tanpa Rombel' || u.className === 'Belum Ditentukan') return false;
    return (cls.name && u.className.toLowerCase() === cls.name.toLowerCase());
  });

  // Filtered students by local search query
  const filteredStudents = classStudents.filter(s => {
    if (!s) return false;
    const q = (searchInClass || '').toLowerCase().trim();
    if (!q) return true;
    return (
      (s.name || '').toLowerCase().includes(q) ||
      (s.nisnOrNip && s.nisnOrNip.toLowerCase().includes(q)) ||
      (s.username || '').toLowerCase().includes(q)
    );
  });

  // Available students to add (students not currently in this class)
  const availableStudents = (users || []).filter(u => {
    if (!u || u.role !== 'student') return false;
    const isInThisClass = u.classId === cls.id || (!u.classId && cls.name && u.className === cls.name);
    return !isInThisClass;
  });

  const filteredAvailable = availableStudents.filter(s => {
    if (!s) return false;
    const q = (searchExisting || '').toLowerCase().trim();
    if (!q) return true;
    return (
      (s.name || '').toLowerCase().includes(q) ||
      (s.nisnOrNip && s.nisnOrNip.toLowerCase().includes(q)) ||
      (s.className && s.className.toLowerCase().includes(q)) ||
      (s.username || '').toLowerCase().includes(q)
    );
  });

  // Open edit modal
  const handleOpenEdit = (student: User) => {
    setEditingStudent(student);
    setEditName(student.name);
    setEditNisn(student.nisnOrNip || '');
    setEditUsername(student.username);
    setEditPassword(student.password || '123456');
    setEditClassId(student.classId || cls.id);
  };

  // Save edit student
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    const targetClass = allClasses.find(c => c.id === editClassId);
    const updated: User = {
      ...editingStudent,
      name: editName.trim(),
      nisnOrNip: editNisn.trim(),
      username: editUsername.trim().toLowerCase(),
      password: editPassword.trim() || editingStudent.password,
      classId: editClassId,
      className: targetClass ? targetClass.name : (editClassId ? editingStudent.className : 'Tanpa Rombel'),
    };
    updateUser(updated);
    setEditingStudent(null);
    onNotify(`Data santri ${updated.name} berhasil diperbarui.`);
  };

  // Remove student from class (status changes to 'Tanpa Rombel')
  const handleConfirmRemove = () => {
    if (!confirmRemoveStudent) return;
    const target = confirmRemoveStudent;
    updateUser({
      ...target,
      classId: '',
      className: 'Tanpa Rombel',
    });
    setConfirmRemoveStudent(null);
    onNotify(`Santri ${target.name} berhasil dikeluarkan dari rombel ${cls.name}.`);
  };

  // Assign existing student to this class
  const handleAssignExisting = (student: User) => {
    updateUser({
      ...student,
      classId: cls.id,
      className: cls.name,
    });
    onNotify(`Santri ${student.name} berhasil dimasukkan ke rombel ${cls.name}.`);
  };

  // Create brand new student directly in this class
  const handleCreateNewStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const cleanUsername = newUsername.trim() || newName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10) + Math.floor(10 + Math.random() * 90);
    const cleanNisn = newNisn.trim() || `00${Math.floor(10000000 + Math.random() * 90000000)}`;

    const newUser: User = {
      id: `student-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: newName.trim(),
      username: cleanUsername.toLowerCase(),
      password: newPassword.trim() || '123456',
      role: 'student',
      nisnOrNip: cleanNisn,
      classId: cls.id,
      className: cls.name,
      schoolName: systemSettings.schoolName || 'Madrasah Tsanawiyah',
      isMfaVerified: true,
    };

    addUser(newUser);
    onNotify(`Santri baru ${newUser.name} berhasil ditambahkan ke rombel ${cls.name}.`);
    setNewName('');
    setNewNisn('');
    setNewUsername('');
    setNewPassword('123456');
    setActiveTab('list');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[88vh] flex flex-col p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-lg text-xs font-black">
                {cls.grade}
              </span>
              <h3 className="font-extrabold text-slate-900 text-lg">
                Daftar Santri / Siswa: {cls.name}
              </h3>
              <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full text-xs font-bold border border-slate-200">
                {classStudents.length} Terdaftar
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Wali Kelas: <strong className="text-slate-700">{cls.homeroomTeacher || 'Belum ditentukan'}</strong> • Ruang: {cls.roomLocation || '-'} • Target Kapasitas: {cls.totalStudents} Santri
            </p>
          </div>

          <button 
            onClick={onClose} 
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl cursor-pointer transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs inside Modal */}
        <div className="flex items-center justify-between gap-2 pt-3 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab('list')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'list'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Daftar Santri ({classStudents.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('add_existing')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'add_existing'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>+ Pilih dari Santri Terdaftar</span>
            </button>

            <button
              onClick={() => setActiveTab('add_new')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'add_new'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ Input Santri Baru</span>
            </button>
          </div>

          {activeTab === 'list' && (
            <div className="relative w-56">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari santri di rombel ini..."
                value={searchInClass}
                onChange={(e) => setSearchInClass(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500 transition"
              />
            </div>
          )}
        </div>

        {/* Tab 1: LIST SANTRI DI KELAS INI */}
        {activeTab === 'list' && (
          <div className="overflow-y-auto flex-1 py-3 space-y-2 pr-1">
            {classStudents.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-3">
                <Users className="w-10 h-10 text-slate-300 mx-auto" />
                <div>
                  <p className="text-xs text-slate-600 font-bold">Belum ada akun santri di rombel {cls.name}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Gunakan tombol di atas untuk memasukkan santri yang sudah ada atau membuat santri baru.
                  </p>
                </div>
                <div className="flex items-center justify-center gap-2 pt-2">
                  <button
                    onClick={() => setActiveTab('add_existing')}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer transition flex items-center gap-1.5"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Pilih dari Santri Terdaftar</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('add_new')}
                    className="px-3.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold rounded-xl cursor-pointer transition flex items-center gap-1.5"
                  >
                    <UserPlus className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Input Santri Baru</span>
                  </button>
                </div>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">
                Tidak ditemukan santri dengan kata kunci &quot;{searchInClass}&quot;
              </div>
            ) : (
              <div className="space-y-2">
                {filteredStudents.map((st, i) => (
                  <div
                    key={st.id}
                    className="p-3 bg-slate-50/70 hover:bg-emerald-50/40 border border-slate-200/80 hover:border-emerald-200 rounded-2xl flex items-center justify-between gap-3 transition"
                  >
                    {/* Left: Avatar & Info */}
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-7 h-7 rounded-xl bg-white text-slate-600 border border-slate-200 flex items-center justify-center text-xs font-extrabold shrink-0 shadow-2xs">
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 truncate flex items-center gap-2">
                          <span>{st.name}</span>
                          <span className="px-2 py-0.2 bg-emerald-100 text-emerald-800 text-[10px] font-semibold rounded-md shrink-0">
                            Aktif
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono flex items-center gap-2 mt-0.5 truncate">
                          <span>NISN: <strong className="text-slate-700">{st.nisnOrNip || '-'}</strong></span>
                          <span>•</span>
                          <span>User: <strong className="text-slate-700">{st.username}</strong></span>
                          <span>•</span>
                          <span className="flex items-center gap-0.5 text-slate-600">
                            <Lock className="w-3 h-3 text-slate-400" />
                            <span>PIN: {st.password || '123456'}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions Menu (EDIT & KELUARKAN) */}
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Tombol Edit Santri */}
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(st)}
                        title="Edit data santri ini"
                        className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                        <span>Edit</span>
                      </button>

                      {/* Tombol Keluarkan Santri dari Rombel */}
                      <button
                        type="button"
                        onClick={() => setConfirmRemoveStudent(st)}
                        title="Keluarkan santri dari rombel ini"
                        className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition"
                      >
                        <UserMinus className="w-3.5 h-3.5 text-rose-600" />
                        <span>Keluarkan</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: PILIH SANTRI TERDAFTAR (MASUKKAN KE KELAS INI) */}
        {activeTab === 'add_existing' && (
          <div className="overflow-y-auto flex-1 py-3 space-y-3 pr-1">
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-3 text-xs text-emerald-900">
              <p className="font-bold flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-emerald-700" />
                <span>Pilih Santri Terdaftar di Sistem untuk Masuk ke {cls.name}</span>
              </p>
              <p className="text-[11px] text-emerald-700 mt-0.5">
                Pilih santri yang berstatus &quot;Tanpa Rombel&quot; atau santri dari rombel lain untuk dipindahkan ke rombel {cls.name}.
              </p>
            </div>

            {/* Search filter for available students */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari santri berdasarkan nama, NISN, atau kelas saat ini..."
                value={searchExisting}
                onChange={(e) => setSearchExisting(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition"
              />
            </div>

            {/* Available students list */}
            {availableStudents.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">
                Semua santri terdaftar sudah dimasukkan ke dalam rombel ini.
              </div>
            ) : filteredAvailable.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">
                Tidak ada santri yang cocok dengan pencarian &quot;{searchExisting}&quot;
              </div>
            ) : (
              <div className="space-y-2">
                {filteredAvailable.map(st => (
                  <div
                    key={st.id}
                    className="p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-3 transition"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                        <span>{st.name}</span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          st.className && st.className !== 'Tanpa Rombel'
                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {st.className && st.className !== 'Tanpa Rombel' ? `Rombel: ${st.className}` : 'Tanpa Rombel'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        NISN: {st.nisnOrNip || '-'} • User: {st.username}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAssignExisting(st)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Masukkan ke {cls.name}</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: INPUT SANTRI BARU (FORM CEPAT) */}
        {activeTab === 'add_new' && (
          <div className="overflow-y-auto flex-1 py-3 pr-1">
            <form onSubmit={handleCreateNewStudent} className="space-y-3.5 bg-slate-50/70 p-4 rounded-2xl border border-slate-200">
              <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5 pb-2 border-b border-slate-200">
                <UserPlus className="w-4 h-4 text-emerald-600" />
                <span>Registrasi Santri Baru untuk Rombel {cls.name}</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Lengkap Santri <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Muhammad Farhan Al-Fatih"
                  value={newName}
                  onChange={(e) => {
                    setNewName(e.target.value);
                    if (!newUsername) {
                      setNewUsername(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10));
                    }
                  }}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    NISN / Nomor Induk Santri
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 0098765432"
                    value={newNisn}
                    onChange={(e) => setNewNisn(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Username CBT <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: farhan2026"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Password / PIN Akses Ujian
                </label>
                <input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Default: 123456"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Santri dapat menggunakan username dan password ini untuk login ujian mandiri.
                </span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('list')}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer transition"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Simpan & Masukkan ke {cls.name}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Footer */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>
            Total: <strong>{classStudents.length} Santri</strong> di rombel {cls.name}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer transition"
          >
            Tutup
          </button>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* SUB-MODAL 1: EDIT SANTRI */}
      {/* ========================================================================= */}
      {editingStudent && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm">Edit Data Santri</h4>
                  <p className="text-[10px] text-slate-400">Perbarui identitas & akun ujian</p>
                </div>
              </div>
              <button
                onClick={() => setEditingStudent(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3 pt-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nama Santri</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">NISN / NIP</label>
                  <input
                    type="text"
                    value={editNisn}
                    onChange={(e) => setEditNisn(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Username Login</label>
                  <input
                    type="text"
                    required
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Password / PIN Ujian</label>
                <input
                  type="text"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="PIN Ujian Santri"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Pilihan Rombel Kelas</label>
                <select
                  value={editClassId}
                  onChange={(e) => setEditClassId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                >
                  {allClasses.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.grade})
                    </option>
                  ))}
                  <option value="">-- Tanpa Rombel (Dilepas) --</option>
                </select>
              </div>

              <div className="pt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer transition text-center"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs cursor-pointer transition shadow-xs text-center flex items-center justify-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-MODAL 2: KONFIRMASI KELUARKAN SANTRI DARI ROMBEL */}
      {/* ========================================================================= */}
      {confirmRemoveStudent && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <UserMinus className="w-6 h-6" />
            </div>

            <h4 className="font-extrabold text-slate-900 text-base">
              Keluarkan dari Rombel?
            </h4>

            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Keluarkan santri <strong>{confirmRemoveStudent.name}</strong> (NISN: {confirmRemoveStudent.nisnOrNip || '-'}) dari rombel <strong>{cls.name}</strong>?
            </p>

            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-500 mt-3 text-left">
              💡 <strong>Catatan:</strong> Akun santri tidak dihapus dari sistem CBT, hanya status kelasnya diubah menjadi <em>Tanpa Rombel</em> sehingga dapat dipindahkan ke rombel lain kapan saja.
            </div>

            <div className="grid grid-cols-2 gap-2 pt-4">
              <button
                type="button"
                onClick={() => setConfirmRemoveStudent(null)}
                className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmRemove}
                className="py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs cursor-pointer transition shadow-xs flex items-center justify-center gap-1.5"
              >
                <UserMinus className="w-3.5 h-3.5" />
                <span>Ya, Keluarkan</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
