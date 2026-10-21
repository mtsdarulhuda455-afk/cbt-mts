import React, { useEffect, Component, ErrorInfo, ReactNode } from 'react';
import { CbtProvider, useCbt } from './context/CbtContext';
import { Header } from './components/layout/Header';
import { LoginPage } from './components/auth/LoginPage';
import { ExamTaker } from './components/student/ExamTaker';
import { StudentHomeView } from './components/student/StudentHomeView';
import { ControlRoom } from './components/proctor/ControlRoom';
import { AnalyticsDashboard } from './components/analytics/AnalyticsDashboard';
import { CentralDatabaseView } from './components/admin/CentralDatabaseView';
import { SystemSettingsView } from './components/admin/SystemSettingsView';
import { ClassManagementView } from './components/admin/ClassManagementView';
import { TeacherExamBuilderView } from './components/teacher/TeacherExamBuilderView';
import { AdminSpecialView } from './components/admin/AdminSpecialView';
import { AttendanceView } from './components/attendance/AttendanceView';
import { AutoUpdateBanner } from './components/common/AutoUpdateBanner';
import { Shield, Sparkles, School, Cpu, CheckCircle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  onReset?: () => void;
  onSelectTab?: (tab: string) => void;
  userRole?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error | null;
}

class AppErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('CBT Render Error caught by boundary:', error, errorInfo);
  }

  handleRecover = (targetTab?: string) => {
    this.setState({ hasError: false, error: null });
    if (targetTab && this.props.onSelectTab) {
      this.props.onSelectTab(targetTab);
    } else if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      const role = this.props.userRole || 'admin';
      return (
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-6 sm:p-10 text-center space-y-5">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner border border-emerald-100">
              <Shield className="w-8 h-8" />
            </div>

            <div>
              <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-black uppercase tracking-wider">
                Pemulihan Tampilan Otomatis
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-2.5">
                Penyegaran Tampilan Akun CBT
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto mt-2 leading-relaxed">
                Sistem telah menormalkan cache data. Silakan pilih menu di bawah ini untuk langsung kembali beraktivitas:
              </p>
            </div>

            {/* Quick Navigation Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-w-2xl mx-auto pt-2 text-left">
              {(role === 'admin' || role === 'teacher') && (
                <button
                  type="button"
                  onClick={() => this.handleRecover('teacher_exams')}
                  className="p-3.5 bg-emerald-50/80 hover:bg-emerald-100 border border-emerald-200 rounded-2xl cursor-pointer transition text-left group"
                >
                  <div className="font-extrabold text-xs text-emerald-900 group-hover:text-emerald-950">
                    📝 Pembuatan Soal & Bank Soal
                  </div>
                  <div className="text-[11px] text-emerald-700 mt-0.5">
                    Susun butir soal & upload Word (.docx)
                  </div>
                </button>
              )}

              {(role === 'admin' || role === 'teacher') && (
                <button
                  type="button"
                  onClick={() => this.handleRecover('control_room')}
                  className="p-3.5 bg-indigo-50/80 hover:bg-indigo-100 border border-indigo-200 rounded-2xl cursor-pointer transition text-left group"
                >
                  <div className="font-extrabold text-xs text-indigo-900 group-hover:text-indigo-950">
                    👁️ Ruang Kontrol Pengawas
                  </div>
                  <div className="text-[11px] text-indigo-700 mt-0.5">
                    Pantau ujian multi-kelas & reset siswa
                  </div>
                </button>
              )}

              {role === 'admin' && (
                <button
                  type="button"
                  onClick={() => this.handleRecover('database')}
                  className="p-3.5 bg-amber-50/80 hover:bg-amber-100 border border-amber-200 rounded-2xl cursor-pointer transition text-left group"
                >
                  <div className="font-extrabold text-xs text-amber-900 group-hover:text-amber-950">
                    📊 Database Excel Siswa & Guru
                  </div>
                  <div className="text-[11px] text-amber-700 mt-0.5">
                    Kelola akun, impor Excel & sandi
                  </div>
                </button>
              )}

              {role === 'admin' && (
                <button
                  type="button"
                  onClick={() => this.handleRecover('classes')}
                  className="p-3.5 bg-teal-50/80 hover:bg-teal-100 border border-teal-200 rounded-2xl cursor-pointer transition text-left group"
                >
                  <div className="font-extrabold text-xs text-teal-900 group-hover:text-teal-950">
                    🏫 Pengaturan Kelas & Rombel
                  </div>
                  <div className="text-[11px] text-teal-700 mt-0.5">
                    Kelola rombel VII, VIII, IX & wali kelas
                  </div>
                </button>
              )}

              {role === 'admin' && (
                <button
                  type="button"
                  onClick={() => this.handleRecover('settings')}
                  className="p-3.5 bg-purple-50/80 hover:bg-purple-100 border border-purple-200 rounded-2xl cursor-pointer transition text-left group"
                >
                  <div className="font-extrabold text-xs text-purple-900 group-hover:text-purple-950">
                    ⚙️ Pengaturan Lembaga & Sistem
                  </div>
                  <div className="text-[11px] text-purple-700 mt-0.5">
                    Profil madrasah, cloud database & KKM
                  </div>
                </button>
              )}

              <button
                type="button"
                onClick={() => this.handleRecover(role === 'student' ? 'student_home' : 'admin_special')}
                className="p-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl cursor-pointer transition text-left group"
              >
                <div className="font-extrabold text-xs text-slate-800">
                  {role === 'student' ? '🎓 Beranda Ujian Santri' : '🛡️ Konsol Khusus Super Admin'}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {role === 'student' ? 'Masuk ke jadwal ujian aktif' : 'Operasi master & bypass keys'}
                </div>
              </button>
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => this.handleRecover(role === 'student' ? 'student_home' : 'teacher_exams')}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer transition flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Buka Menu Utama Sekarang</span>
              </button>
            </div>
          </div>
        </main>
      );
    }
    return this.props.children;
  }
}

const MainContent: React.FC = () => {
  const { activeTab, currentUser, setActiveTab, selectedExamId } = useCbt();

  if (!currentUser) {
    return <LoginPage />;
  }

  // Role guard: Only admin can access 'classes', 'settings', 'database', and 'admin_special'
  const isAdminTab = activeTab === 'classes' || activeTab === 'settings' || activeTab === 'database' || activeTab === 'admin_special';

  // Automatically redirect teacher, admin, or student if they land on an unauthorized tab
  useEffect(() => {
    if (currentUser.role === 'teacher' && (isAdminTab || activeTab === 'student_exam' || activeTab === 'student_home')) {
      setActiveTab('teacher_exams');
    } else if (currentUser.role === 'admin' && (activeTab === 'student_exam' || activeTab === 'student_home')) {
      setActiveTab('teacher_exams');
    } else if (currentUser.role === 'student' && (isAdminTab || activeTab === 'attendance' || activeTab === 'teacher_exams' || activeTab === 'control_room' || activeTab === 'analytics')) {
      setActiveTab('student_home');
    }
  }, [currentUser.role, activeTab, isAdminTab, setActiveTab]);

  if (isAdminTab && currentUser.role !== 'admin') {
    return (
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-8 sm:p-12 text-center space-y-5">
          <div className="w-16 h-16 bg-amber-100 text-amber-800 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
            <School className="w-8 h-8" />
          </div>
          <div>
            <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-black uppercase tracking-wider">
              Khusus Akun Administrator
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-2">
              Menu Khusus Hak Akses Administrator CBT
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 max-w-xl mx-auto mt-2 leading-relaxed">
              Anda saat ini sedang login sebagai <strong>{currentUser.name} ({currentUser.role === 'teacher' ? 'Guru / Pengawas' : 'Siswa / Santri'})</strong>. Menu Konsol Super Admin dan Pengaturan Master hanya dapat diakses melalui akun Administrator CBT.
            </p>
          </div>

          <div className="pt-2 flex items-center justify-center">
            <button
              onClick={() => setActiveTab(currentUser.role === 'student' ? 'student_home' : 'teacher_exams')}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer transition"
            >
              Kembali ke {currentUser.role === 'student' ? 'Beranda Ujian Santri' : 'Menu Pembuatan Soal Guru'}
            </button>
          </div>
        </div>
      </main>
    );
  }

  // Safe tab resolver with fallback so page is NEVER blank
  const renderTabContent = () => {
    switch (activeTab) {
      case 'student_home':
        return <StudentHomeView />;
      case 'attendance':
        return (currentUser.role === 'admin' || currentUser.role === 'teacher')
          ? <AttendanceView />
          : <StudentHomeView />;
      case 'teacher_exams':
        return <TeacherExamBuilderView />;
      case 'student_exam':
        return currentUser.role === 'student' ? <ExamTaker /> : <TeacherExamBuilderView />;
      case 'control_room':
        return <ControlRoom initialExamId={selectedExamId || undefined} />;
      case 'analytics':
        return <AnalyticsDashboard />;
      case 'classes':
        return currentUser.role === 'admin' ? <ClassManagementView /> : <TeacherExamBuilderView />;
      case 'database':
        return currentUser.role === 'admin' ? <CentralDatabaseView /> : <TeacherExamBuilderView />;
      case 'settings':
        return currentUser.role === 'admin' ? <SystemSettingsView /> : <TeacherExamBuilderView />;
      case 'admin_special':
        return currentUser.role === 'admin' ? <AdminSpecialView /> : <TeacherExamBuilderView />;
      default:
        // Guaranteed fallback based on user role
        if (currentUser.role === 'student') return <StudentHomeView />;
        if (currentUser.role === 'teacher') return <TeacherExamBuilderView />;
        return <ControlRoom />;
    }
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {renderTabContent()}
    </main>
  );
};

const AppShell: React.FC = () => {
  const { currentUser, setActiveTab } = useCbt();

  if (!currentUser) {
    return (
      <>
        <LoginPage />
        <AutoUpdateBanner />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between text-slate-800 relative">
      <div>
        <Header />
        <AppErrorBoundary 
          userRole={currentUser.role}
          onReset={() => setActiveTab(currentUser.role === 'teacher' ? 'teacher_exams' : currentUser.role === 'student' ? 'student_home' : 'admin_special')}
          onSelectTab={(tab) => setActiveTab(tab)}
        >
          <MainContent />
        </AppErrorBoundary>
      </div>

      <AutoUpdateBanner />

      {/* Madrasah Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 mt-12 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></div>
            <span className="font-bold text-slate-800">EduExam CBT MTs Engine v4.8</span>
            <span>• Asesmen Madrasah (AM) Terpadu Standar Kemenag</span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-slate-400">
            <span className="flex items-center gap-1 text-emerald-700 font-medium">
              <Shield className="w-3.5 h-3.5 text-emerald-600" />
              Anti-Cheat Kemenag
            </span>
            <span className="flex items-center gap-1 text-teal-700 font-medium">
              <Cpu className="w-3.5 h-3.5 text-teal-600" />
              Autosave Real-Time
            </span>
            <span className="flex items-center gap-1 text-slate-600 font-medium">
              <School className="w-3.5 h-3.5 text-slate-500" />
              Standar Kemenag RI
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <CbtProvider>
      <AppShell />
    </CbtProvider>
  );
}
