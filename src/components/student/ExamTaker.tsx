import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useCbt } from '../../context/CbtContext';
import { Question } from '../../types/cbt';
import { 
  ShieldAlert, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  HelpCircle, 
  ChevronLeft, 
  ChevronRight, 
  Send, 
  Maximize2, 
  Minimize2,
  Wifi, 
  WifiOff, 
  Lock, 
  RotateCcw,
  Check,
  AlertCircle,
  LogOut,
  CheckSquare,
  Square,
  ArrowRightLeft,
  Edit3,
  Key,
  Radio,
  Signal,
  Printer,
  Download,
  Calendar,
  Camera,
  CameraOff,
  Video,
  FlipHorizontal,
  RefreshCw,
  ShieldCheck
} from 'lucide-react';
import { isSplitScreenDetected } from '../../services/cbtEngine';
import { MathRenderer } from '../common/MathRenderer';
import { createStudentCamSnapshot } from '../../data/mockCbtData';

export const ExamTaker: React.FC = () => {
  const { 
    currentUser, 
    exams, 
    sessions, 
    startExamForStudent, 
    updateStudentAnswer, 
    updateStudentCameraSnapshot,
    toggleFlagQuestion, 
    submitExam, 
    recordViolation,
    isSimulatedOffline,
    setIsSimulatedOffline,
    latestBroadcast,
    clearLatestBroadcast,
    logout,
    systemSettings,
    selectedExamId,
    setSelectedExamId,
    setActiveTab
  } = useCbt();

  // Hardware internet detection
  const [isHardwareOnline, setIsHardwareOnline] = useState<boolean>(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsHardwareOnline(true);
    const handleOffline = () => setIsHardwareOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Effective internet connection: true if internet connection exists, false if offline
  const isInternetConnected = !isSimulatedOffline && isHardwareOnline;

  const [fontSizeClass, setFontSizeClass] = useState<'text-base' | 'text-lg' | 'text-xl'>('text-base');
  const [splitScreenAlert, setSplitScreenAlert] = useState<boolean>(false);
  const [showSubmitModal, setShowSubmitModal] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showFullscreenEnforcer, setShowFullscreenEnforcer] = useState<boolean>(false);
  const [tabSwitchWarning, setTabSwitchWarning] = useState<{
    isOpen: boolean;
    reason: string;
    timestamp: string;
    violationCount: number;
    maxAllowed: number;
    dbLogSent: boolean;
  } | null>(null);
  const [lastSavedTime, setLastSavedTime] = useState<string>('Baru saja');

  // Eligible exams for this student based on class or all exams
  const eligibleExams = exams.filter(e => {
    if (!currentUser?.classId && !currentUser?.className) return true;
    if (!e.classesAllowed || e.classesAllowed.length === 0) return true;
    return e.classesAllowed.some(clsId => 
      clsId === currentUser.classId || 
      clsId === currentUser.className ||
      (currentUser.className && clsId.toLowerCase().includes(currentUser.className.toLowerCase()))
    );
  });

  const activeExam = (selectedExamId ? exams.find(e => e.id === selectedExamId) : null) || eligibleExams[0] || exams[0];
  const studentSession = sessions.find(s => s.examId === activeExam?.id && s.studentId === currentUser?.id);

  // Token verification for activeExam
  const tokenStorageKey = `cbt_token_${currentUser?.id}_${activeExam?.id}`;
  const [isTokenVerified, setIsTokenVerified] = useState<boolean>(() => {
    if (!activeExam?.token) return true;
    return localStorage.getItem(tokenStorageKey) === 'verified';
  });
  const [takerTokenInput, setTakerTokenInput] = useState<string>('');
  const [takerTokenError, setTakerTokenError] = useState<string | null>(null);

  useEffect(() => {
    if (activeExam) {
      if (!activeExam.token) {
        setIsTokenVerified(true);
      } else {
        const key = `cbt_token_${currentUser?.id}_${activeExam.id}`;
        setIsTokenVerified(localStorage.getItem(key) === 'verified');
      }
    }
  }, [activeExam?.id, currentUser?.id]);

  const checkIsFullscreen = useCallback((): boolean => {
    const doc: any = document;
    return !!(
      doc.fullscreenElement ||
      doc.webkitFullscreenElement ||
      doc.mozFullScreenElement ||
      doc.msFullscreenElement
    );
  }, []);

  const requestFullscreen = useCallback(async () => {
    const docEl: any = document.documentElement;
    try {
      if (docEl.requestFullscreen) {
        await docEl.requestFullscreen();
      } else if (docEl.webkitRequestFullscreen) {
        await docEl.webkitRequestFullscreen();
      } else if (docEl.mozRequestFullScreen) {
        await docEl.mozRequestFullScreen();
      } else if (docEl.msRequestFullscreen) {
        await docEl.msRequestFullscreen();
      }
      setIsFullscreen(true);
      setShowFullscreenEnforcer(false);
    } catch (err: any) {
      console.warn('Fullscreen request blocked or unsupported in iframe:', err);
      setIsFullscreen(true);
      setShowFullscreenEnforcer(false);
    }
  }, []);

  const handleVerifyTokenInTaker = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeExam) return;
    const expected = (activeExam.token || 'AM2026').trim().toUpperCase();
    const entered = takerTokenInput.trim().toUpperCase();

    if (entered !== expected) {
      setTakerTokenError(`Token "${entered}" salah! Silakan tanyakan token resmi ke guru / pengawas.`);
      return;
    }

    if (currentUser?.id) {
      localStorage.setItem(`cbt_token_${currentUser.id}_${activeExam.id}`, 'verified');
    }
    setIsTokenVerified(true);
    setTakerTokenError(null);
    // Otomatis aktifkan mode layar penuh saat token berhasil diverifikasi
    requestFullscreen();
  };

  // Initialize or resume session
  useEffect(() => {
    if (!studentSession && currentUser && activeExam) {
      startExamForStudent(activeExam.id, currentUser);
    }
  }, [studentSession, currentUser, activeExam, startExamForStudent]);

  const [currentIdx, setCurrentIdx] = useState<number>(0);

  // Live Proctor Webcam State & Streaming (HP / Laptop Front Camera)
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraMinimized, setIsCameraMinimized] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [lastCamSnapshotTime, setLastCamSnapshotTime] = useState<string>('Siap');

  // Capture canvas snapshot from video and send to proctor room
  const captureAndSendSnapshot = useCallback(() => {
    if (!studentSession) return;
    try {
      const nowTime = new Date().toLocaleTimeString('id-ID');
      const studentName = currentUser?.name || studentSession.studentName || 'Santri';

      if (videoRef.current && videoRef.current.videoWidth > 0 && videoRef.current.videoHeight > 0) {
        const video = videoRef.current;
        const canvas = document.createElement('canvas');
        canvas.width = 240;
        canvas.height = 180;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Mirror horizontally if user front-camera
          if (facingMode === 'user') {
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
          }
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          ctx.setTransform(1, 0, 0, 1, 0, 0);

          // Timestamp watermark for proctor
          ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
          ctx.fillRect(0, canvas.height - 24, canvas.width, 24);
          ctx.fillStyle = '#10b981';
          ctx.beginPath();
          ctx.arc(10, canvas.height - 12, 3.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 9px sans-serif';
          ctx.fillText(`${studentName.slice(0, 16)} • ${nowTime}`, 18, canvas.height - 8);

          const dataUrl = canvas.toDataURL('image/jpeg', 0.55);
          updateStudentCameraSnapshot(studentSession.id, dataUrl, true);
          setLastCamSnapshotTime(nowTime);
        }
      } else {
        // Fallback snapshot if physical camera feed is unavailable or in sandbox
        const fallbackSnap = createStudentCamSnapshot(studentName, true, (studentSession.violationsCount || 0) > 0);
        updateStudentCameraSnapshot(studentSession.id, fallbackSnap, isCameraActive);
        setLastCamSnapshotTime(nowTime);
      }
    } catch (e) {
      console.warn('Proctor camera capture notice:', e);
    }
  }, [studentSession, updateStudentCameraSnapshot, currentUser?.name, facingMode, isCameraActive]);

  // Start webcam / phone camera (support HP / Laptop)
  const startCamera = useCallback(async (mode: 'user' | 'environment' = facingMode) => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Browser tidak mendukung akses kamera perangkat.');
        setIsCameraActive(false);
        // Fallback snapshot for proctor
        if (studentSession && currentUser?.name) {
          const fallbackSnap = createStudentCamSnapshot(currentUser.name, true, false);
          updateStudentCameraSnapshot(studentSession.id, fallbackSnap, false);
        }
        return;
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: mode },
            width: { ideal: 640, max: 1280 },
            height: { ideal: 480, max: 720 }
          },
          audio: false
        });
      } catch (errConstraint) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: mode },
            audio: false
          });
        } catch (errBasic) {
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false
          });
        }
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.setAttribute('webkit-playsinline', 'true');
        videoRef.current.play().catch(() => {});
      }
      setIsCameraActive(true);
      setCameraError(null);

      // Trigger initial snapshot after camera stream starts
      setTimeout(() => {
        captureAndSendSnapshot();
      }, 500);
    } catch (err: any) {
      console.warn('Camera request error:', err);
      let errMsg = 'Kamera tidak dapat diakses atau izin ditolak.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errMsg = 'Izin kamera ditolak. Harap izinkan akses kamera di peramban browser Anda.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errMsg = 'Kamera perangkat tidak ditemukan.';
      }
      setCameraError(errMsg);
      setIsCameraActive(false);

      // Send fallback snapshot with student info so proctor room has visual
      if (studentSession && currentUser?.name) {
        const fallbackSnap = createStudentCamSnapshot(currentUser.name, true, false);
        updateStudentCameraSnapshot(studentSession.id, fallbackSnap, false);
      }
    }
  }, [facingMode, captureAndSendSnapshot, studentSession, currentUser?.name, updateStudentCameraSnapshot]);

  // Toggle front and back camera (HP / Mobile)
  const handleToggleFacingMode = () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  // Re-attach video stream if element re-renders
  useEffect(() => {
    if (videoRef.current && streamRef.current && isCameraActive) {
      if (videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
        videoRef.current.muted = true;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.setAttribute('webkit-playsinline', 'true');
        videoRef.current.play().catch(() => {});
      }
    }
  }, [isCameraActive, isCameraMinimized, isTokenVerified]);

  // Mobile collapsed state
  const [isMobileCamCollapsed, setIsMobileCamCollapsed] = useState<boolean>(false);

  // Activate camera when in progress session is ready and token is verified
  useEffect(() => {
    if (studentSession && studentSession.status === 'in_progress' && isTokenVerified) {
      startCamera();
    }

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    };
  }, [studentSession?.id, studentSession?.status, isTokenVerified, startCamera]);

  // Periodic proctor camera snapshot interval (every 4 seconds)
  useEffect(() => {
    if (!studentSession || studentSession.status !== 'in_progress') return;

    const intervalId = setInterval(() => {
      captureAndSendSnapshot();
    }, 4000);

    return () => clearInterval(intervalId);
  }, [studentSession?.id, studentSession?.status, captureAndSendSnapshot]);

  const violationCooldownRef = useRef<boolean>(false);

  // Trigger violation safely with throttle
  const triggerViolation = useCallback((type: 'tab_switch' | 'split_screen' | 'right_click' | 'clipboard_attempt' | 'fullscreen_exit', detail: string) => {
    if (!studentSession || studentSession.status !== 'in_progress') return;
    if (violationCooldownRef.current) return;

    violationCooldownRef.current = true;
    recordViolation(studentSession.id, type, detail);
    setTimeout(() => {
      violationCooldownRef.current = false;
    }, 2000);
  }, [studentSession, recordViolation]);

  // Anti-Cheat: Tab Switching & Focus Loss Detection
  useEffect(() => {
    if (!studentSession || studentSession.status !== 'in_progress' || !isTokenVerified) return;

    let isBlurred = false;

    const handleFocusLoss = (reason: string) => {
      if (isBlurred) return;
      isBlurred = true;

      // Log immediately to database & audit logs
      triggerViolation('tab_switch', reason);

      const maxViolations = systemSettings?.maxViolationsAllowed ?? activeExam?.maxViolationsAllowed ?? 3;
      const currentCount = (studentSession.violationsCount || 0) + 1;

      // Show immediate warning modal to the student
      setTabSwitchWarning({
        isOpen: true,
        reason,
        timestamp: new Date().toLocaleTimeString('id-ID') + ' WIB',
        violationCount: currentCount,
        maxAllowed: maxViolations,
        dbLogSent: true
      });

      // Release debounce after 2.5s
      setTimeout(() => {
        isBlurred = false;
      }, 2500);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleFocusLoss('Siswa berpindah tab peramban (browser) atau meminimalkan jendela ujian');
      } else {
        // When coming back, ensure warning alert is active if violation count exists
        if ((studentSession.violationsCount || 0) > 0) {
          const maxViolations = systemSettings?.maxViolationsAllowed ?? activeExam?.maxViolationsAllowed ?? 3;
          setTabSwitchWarning(prev => prev ? { ...prev, isOpen: true } : {
            isOpen: true,
            reason: 'Siswa kembali setelah berpindah tab / meninggalkan jendela ujian',
            timestamp: new Date().toLocaleTimeString('id-ID') + ' WIB',
            violationCount: studentSession.violationsCount,
            maxAllowed: maxViolations,
            dbLogSent: true
          });
        }
      }
    };

    const handleWindowBlur = () => {
      handleFocusLoss('Kursor atau fokus meninggalkan jendela ujian (membuka aplikasi lain / multitasking)');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [studentSession?.id, studentSession?.status, studentSession?.violationsCount, isTokenVerified, triggerViolation, systemSettings?.maxViolationsAllowed, activeExam?.maxViolationsAllowed]);

  // Anti-Cheat: Disable Right-click context menu
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      triggerViolation('right_click', 'Klik kanan diblokir oleh protokol anti-cheat');
    };

    // Anti-Cheat: Disable Clipboard (Copy, Cut, Paste)
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      triggerViolation('clipboard_attempt', 'Tindakan menyalin (Copy) teks dicegah');
    };

    const handleCut = (e: ClipboardEvent) => {
      e.preventDefault();
      triggerViolation('clipboard_attempt', 'Tindakan memotong (Cut) teks dicegah');
    };

    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault();
      triggerViolation('clipboard_attempt', 'Tindakan menempel (Paste) teks dicegah');
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('cut', handleCut);
    document.addEventListener('paste', handlePaste);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('cut', handleCut);
      document.removeEventListener('paste', handlePaste);
    };
  }, [triggerViolation]);

  // Anti-Cheat: Split-screen detection
  useEffect(() => {
    if (!studentSession || studentSession.status !== 'in_progress') return;

    const checkDimensions = () => {
      const isSplit = isSplitScreenDetected();
      setSplitScreenAlert(isSplit);
      if (isSplit) {
        triggerViolation('split_screen', `Ukuran jendela tidak normal (${window.innerWidth}x${window.innerHeight}px). Split-screen dicegah.`);
      }
    };

    window.addEventListener('resize', checkDimensions);
    // Initial check
    if (isSplitScreenDetected()) {
      setSplitScreenAlert(true);
    }

    return () => {
      window.removeEventListener('resize', checkDimensions);
    };
  }, [studentSession, triggerViolation]);

  // Fullscreen tracking & auto enforcement
  useEffect(() => {
    const handleFullscreenChange = () => {
      const full = checkIsFullscreen();
      setIsFullscreen(full);
      if (!full && studentSession && studentSession.status === 'in_progress' && isTokenVerified) {
        triggerViolation('fullscreen_exit', 'Siswa keluar dari mode layar penuh (Full Screen)');
        setShowFullscreenEnforcer(true);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, [studentSession?.id, studentSession?.status, triggerViolation, isTokenVerified, checkIsFullscreen]);

  // Fitur Otomatis Paksa Layar Penuh saat Ujian Dimulai
  useEffect(() => {
    if (studentSession && studentSession.status === 'in_progress' && isTokenVerified) {
      if (!checkIsFullscreen()) {
        setShowFullscreenEnforcer(true);
      }
    }
  }, [studentSession?.id, studentSession?.status, isTokenVerified, checkIsFullscreen]);

  // Timer countdown
  const [timeLeft, setTimeLeft] = useState<number>(() => studentSession?.timeRemainingSeconds || 45 * 60);

  useEffect(() => {
    if (!studentSession || studentSession.status !== 'in_progress') return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          submitExam(studentSession.id);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [studentSession, submitExam]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!activeExam) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 shadow-md max-w-lg mx-auto my-12 space-y-4">
        <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-slate-800">Belum Ada Paket Ujian Terpilih</h2>
        <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
          Silakan buka Beranda & Jadwal Ujian untuk memilih mata pelajaran yang aktif dan memasukkan token pengerjaan.
        </p>
        <div className="pt-2">
          <button
            onClick={() => setActiveTab('student_home')}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow cursor-pointer transition"
          >
            Ke Beranda & Jadwal Ujian
          </button>
        </div>
      </div>
    );
  }

  if (!studentSession) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 shadow-md max-w-lg mx-auto my-12 space-y-4">
        <Clock className="w-12 h-12 text-emerald-600 mx-auto animate-spin" />
        <h2 className="text-xl font-black text-slate-800">Menyiapkan Lembar Soal...</h2>
        <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
          Mengunduh paket soal terenkripsi ({activeExam.title}) dan mengacak butir soal anti-cheat...
        </p>
        <div className="pt-2 flex items-center justify-center gap-2">
          <button
            onClick={() => {
              if (currentUser && activeExam) {
                startExamForStudent(activeExam.id, currentUser);
                requestFullscreen();
              }
            }}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow cursor-pointer transition"
          >
            Mulai Pengerjaan Ujian Sekarang
          </button>
          <button
            onClick={() => setActiveTab(currentUser?.role === 'student' ? 'student_home' : 'teacher_exams')}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer transition"
          >
            Kembali
          </button>
        </div>
      </div>
    );
  }

  // LOCKED STATE: Anti-cheat lock
  if (studentSession.status === 'locked') {
    return (
      <div className="max-w-2xl mx-auto my-12 bg-white rounded-2xl shadow-xl border-2 border-rose-300 p-8 text-center">
        <div className="w-20 h-20 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <Lock className="w-10 h-10" />
        </div>
        <span className="px-3 py-1 bg-rose-100 text-rose-800 text-xs font-bold rounded-full uppercase tracking-wider">
          Sesi Ujian Dikunci Otomatis
        </span>
        <h2 className="text-2xl font-extrabold text-slate-900 mt-4">
          Akses Lembar Ujian Diberhentikan
        </h2>
        <p className="text-slate-600 text-base mt-3 max-w-lg mx-auto">
          Sistem anti-cheat mendeteksi pelanggaran berulang (<strong>{studentSession.violationsCount} kali</strong>) seperti berpindah tab, split-screen, atau manipulasi antarmuka selama ujian berlangsung.
        </p>

        <div className="my-6 p-4 bg-slate-50 rounded-xl border border-slate-200 text-left max-h-48 overflow-y-auto">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Riwayat Pelanggaran Tercatat:</h4>
          <div className="space-y-2">
            {studentSession.violationLogs.map((log) => (
              <div key={log.id} className="flex items-start gap-2 text-xs text-rose-700 bg-rose-50 p-2 rounded">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">{log.detail}</span>
                  <span className="block text-slate-400 text-[10px] mt-0.5">
                    {new Date(log.timestamp).toLocaleTimeString('id-ID')} WIB
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm mb-6 flex items-center gap-3">
          <ShieldAlert className="w-6 h-6 shrink-0" />
          <span>Silakan laporkan kejadian ini ke <strong>Pengawas Ujian (Proctor)</strong> di ruangan Anda untuk meminta pembukaan kunci (Reset Kunci / Unlock).</span>
        </div>

        <div className="flex justify-end">
          <button
            onClick={() => {
              if (confirm('Keluar dari sesi ujian dan akun siswa?')) {
                logout();
              }
            }}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition"
          >
            <LogOut className="w-4 h-4" />
            <span>Keluar / Logout Akun</span>
          </button>
        </div>
      </div>
    );
  }

  // COMPLETED STATE
  if (studentSession.status === 'completed') {
    return (
      <div className="max-w-3xl mx-auto my-8 bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-8 text-center">
          <CheckCircle2 className="w-16 h-16 mx-auto mb-3 text-emerald-200" />
          <h2 className="text-2xl font-bold">Ujian Berhasil Diselesaikan!</h2>
          <p className="text-emerald-100 text-sm mt-1">
            Jawaban Anda telah tersimpan secara permanen dan disinkronkan dengan database pusat sekolah.
          </p>
        </div>

        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 text-center">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-xs font-semibold text-slate-500 uppercase">Nilai Akhir</span>
              <div className="text-3xl font-extrabold text-indigo-600 mt-1">
                {studentSession.score ?? 0}
              </div>
              <span className="text-[11px] text-slate-400">Skala 100</span>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-xs font-semibold text-slate-500 uppercase">Status KKM ({activeExam.passingGrade})</span>
              <div className="mt-1">
                <span className={`inline-block px-3 py-1 text-sm font-bold rounded-full ${
                  studentSession.isPassed 
                    ? 'bg-emerald-100 text-emerald-800' 
                    : 'bg-rose-100 text-rose-800'
                }`}>
                  {studentSession.isPassed ? 'TUNTAS' : 'REMEDIAL'}
                </span>
              </div>
              <span className="text-[11px] text-slate-400">KKM Sekolah</span>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-xs font-semibold text-slate-500 uppercase">Benar / Salah</span>
              <div className="text-xl font-bold text-slate-800 mt-2">
                <span className="text-emerald-600">{studentSession.correctCount ?? 0}</span>
                <span className="text-slate-400 mx-1">/</span>
                <span className="text-rose-600">{studentSession.wrongCount ?? 0}</span>
              </div>
              <span className="text-[11px] text-slate-400">Total {activeExam.totalQuestions} Soal</span>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-xs font-semibold text-slate-500 uppercase">Integritas Anti-Cheat</span>
              <div className="text-xl font-bold text-slate-800 mt-2">
                {studentSession.violationsCount === 0 ? (
                  <span className="text-emerald-600 font-bold">100% Bersih</span>
                ) : (
                  <span className="text-amber-600 font-bold">{studentSession.violationsCount} Teguran</span>
                )}
              </div>
              <span className="text-[11px] text-slate-400">Catatan Pengawas</span>
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
            <div className="flex justify-between">
              <span>Mata Pelajaran:</span>
              <span className="font-semibold text-slate-800">{activeExam.subject} - {activeExam.title}</span>
            </div>
            <div className="flex justify-between">
              <span>Nama Siswa / NISN:</span>
              <span className="font-semibold text-slate-800">{studentSession.studentName} ({studentSession.nisn})</span>
            </div>
            <div className="flex justify-between">
              <span>Kelas:</span>
              <span className="font-semibold text-slate-800">{studentSession.className}</span>
            </div>
            <div className="flex justify-between">
              <span>Waktu Selesai:</span>
              <span className="font-semibold text-slate-800">
                {studentSession.submittedAt ? new Date(studentSession.submittedAt).toLocaleString('id-ID') : '-'}
              </span>
            </div>
          </div>

          {/* Locked status banner */}
          <div className="p-4 bg-slate-100 border border-slate-300 rounded-2xl flex items-start gap-3 text-xs text-slate-700">
            <Lock className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
            <div>
              <div className="font-extrabold text-slate-800">Status Soal: Terkunci (Abu-Abu)</div>
              <p className="text-[11px] text-slate-600 mt-0.5 leading-normal">
                Soal ini telah selesai dikerjakan dan otomatis terkunci. Anda tidak dapat mengerjakan kembali lembar soal ini kecuali telah dibuka atau direset oleh Administrator/Pengawas Ujian.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('student_home')}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer shadow-md shadow-emerald-200 transition"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Kembali ke Beranda Ujian</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const slipHtml = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Kartu Hasil Ujian CBT - ${studentSession.studentName} - ${activeExam.code}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; max-width: 650px; margin: 0 auto; font-size: 11px; }
    .kop { text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 14px; }
    .kop h2 { margin: 0; font-size: 15px; text-transform: uppercase; }
    .kop p { margin: 2px 0; font-size: 10px; color: #475569; }
    .box { border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; margin-bottom: 12px; background: #f8fafc; }
    .score-circle { font-size: 38px; font-weight: 900; color: ${studentSession.isPassed ? '#059669' : '#dc2626'}; text-align: center; margin: 8px 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 6px; }
    td { padding: 4px 6px; }
    .grid-table th { background: #f1f5f9; padding: 6px; border: 1px solid #cbd5e1; }
    .grid-table td { padding: 6px; border: 1px solid #cbd5e1; text-align: center; }
  </style>
</head>
<body>
  <div class="kop">
    <h2>KARTU BUKTI HASIL ASESMEN MADRASAH (CBT)</h2>
    <p>${systemSettings.schoolName} • NSM: ${systemSettings.nsm} • NPSN: ${systemSettings.npsn}</p>
    <p>Tahun Ajaran ${systemSettings.academicYear} • Semester ${systemSettings.activeSemester}</p>
  </div>
  <div class="box">
    <table>
      <tr><td style="width: 30%;"><strong>Nama Santri:</strong></td><td>${studentSession.studentName}</td></tr>
      <tr><td><strong>NISN / Rombel:</strong></td><td>${studentSession.nisn} / ${studentSession.className}</td></tr>
      <tr><td><strong>Mata Pelajaran:</strong></td><td>${activeExam.subject} (${activeExam.title})</td></tr>
      <tr><td><strong>Kode Naskah:</strong></td><td>${activeExam.code} • KKM: ${activeExam.passingGrade}</td></tr>
      <tr><td><strong>Waktu Selesai:</strong></td><td>${studentSession.submittedAt ? new Date(studentSession.submittedAt).toLocaleString('id-ID') : new Date().toLocaleString('id-ID')}</td></tr>
    </table>
    <div class="score-circle">${studentSession.score ?? 0}</div>
    <p style="text-align: center; font-weight: bold; margin: 0; font-size: 12px; color: ${studentSession.isPassed ? '#059669' : '#dc2626'};">
      STATUS CAPAIAN: ${studentSession.isPassed ? 'TUNTAS (MEMENUHI KKM)' : 'REMEDIAL'}
    </p>
  </div>
  <table class="grid-table">
    <tr>
      <th>Jawaban Benar</th>
      <th>Jawaban Salah</th>
      <th>Standar KKM</th>
      <th>Integritas Anti-Cheat</th>
    </tr>
    <tr>
      <td style="color: #059669; font-weight: bold;">${studentSession.correctCount ?? 0}</td>
      <td style="color: #dc2626; font-weight: bold;">${studentSession.wrongCount ?? 0}</td>
      <td>${activeExam.passingGrade}</td>
      <td style="color: ${studentSession.violationsCount === 0 ? '#059669' : '#b91c1c'}; font-weight: bold;">
        ${studentSession.violationsCount === 0 ? '100% Bersih' : `${studentSession.violationsCount} Teguran`}
      </td>
    </tr>
  </table>
  <div style="margin-top: 36px; display: flex; justify-content: space-between; font-size: 10px;">
    <div>Tercetak otomatis oleh Sistem CBT Terpadu</div>
    <div style="text-align: center; width: 200px;">
      ${systemSettings.city}, ${new Date().toLocaleDateString('id-ID')}<br/>Pengawas Ruangan CBT,<br/><br/><br/>
      <strong>( ${activeExam.authorName || 'Guru Pengampu Mapel'} )</strong>
    </div>
  </div>
  <script>window.print();</script>
</body>
</html>`;
                  const blob = new Blob([slipHtml], { type: 'text/html;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = `Bukti_Hasil_${activeExam.code}_${studentSession.nisn}.html`;
                  link.click();
                  URL.revokeObjectURL(url);
                }}
                className="px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer border border-indigo-200 transition"
                title="Cetak & Unduh Kartu Hasil Nilai Ujian"
              >
                <Printer className="w-4 h-4 text-indigo-600" />
                <span>Cetak Bukti Nilai (PDF)</span>
              </button>
            </div>

            <button
              onClick={() => {
                if (confirm('Keluar dari sesi ujian dan akun siswa?')) {
                  logout();
                }
              }}
              className="px-4 py-2.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer border border-slate-200 transition"
            >
              <LogOut className="w-4 h-4" />
              <span>Keluar / Logout Akun</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If student hasn't entered the required exam token, show the Token Unlock screen
  if (!isTokenVerified) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 sm:p-8 bg-white rounded-3xl border border-slate-200 shadow-xl text-center space-y-5 animate-in fade-in">
        <div className="w-16 h-16 rounded-3xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto shadow-inner">
          <Key className="w-8 h-8" />
        </div>

        <div>
          <div className="inline-block px-2.5 py-0.5 bg-amber-100 text-amber-900 rounded-md text-[10px] font-black uppercase mb-1">
            Autentikasi Akses Soal Ujian
          </div>
          <h2 className="text-xl font-black text-slate-900">
            Masukkan Token Ujian
          </h2>
          <p className="text-xs text-slate-600 mt-1">
            Paket Ujian: <strong>{activeExam?.title}</strong> ({activeExam?.subject})
          </p>
        </div>

        <form onSubmit={handleVerifyTokenInTaker} className="space-y-4 text-left">
          <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-2xl text-xs text-amber-900 space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-amber-800">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Token Wajib Diisi</span>
            </div>
            <p className="text-[11px] text-amber-800/90 leading-relaxed">
              Mintalah token ujian 6 karakter kepada bapak/ibu guru pengawas ruang. Naskah soal tidak dapat dibuka tanpa token yang valid.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 text-center">
              KODE TOKEN UJIAN
            </label>
            <input
              type="text"
              autoFocus
              required
              maxLength={10}
              placeholder="Contoh: FIQ789"
              value={takerTokenInput}
              onChange={(e) => {
                setTakerTokenInput(e.target.value.toUpperCase());
                if (takerTokenError) setTakerTokenError(null);
              }}
              className="w-full py-3.5 px-4 text-center bg-slate-50 border-2 border-slate-300 focus:border-emerald-500 rounded-2xl text-2xl font-black font-mono tracking-widest text-slate-900 uppercase focus:bg-white focus:outline-hidden focus:ring-4 focus:ring-emerald-100 transition"
            />
          </div>

          {takerTokenError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 font-semibold flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{takerTokenError}</span>
            </div>
          )}

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => setActiveTab('student_home')}
              className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer transition text-center"
            >
              Kembali
            </button>
            <button
              type="submit"
              disabled={!takerTokenInput.trim()}
              className="flex-2 py-3 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 disabled:opacity-50 text-white font-extrabold rounded-xl text-xs shadow-md shadow-emerald-200 cursor-pointer transition text-center flex items-center justify-center gap-2"
            >
              <Key className="w-4 h-4" />
              <span>Buka Naskah Soal →</span>
            </button>
          </div>
        </form>
      </div>
    );
  }

  // Helper to determine if question is answered for all types
  const checkIsQuestionAnswered = (q: Question, ans: any): boolean => {
    if (ans === undefined || ans === null) return false;
    if (q.type === 'multiple_choice') {
      return typeof ans === 'string' && ans.trim().length > 0;
    }
    if (q.type === 'multiple_choice_complex') {
      return Array.isArray(ans) && ans.length > 0;
    }
    if (q.type === 'matching') {
      if (typeof ans !== 'object' || Array.isArray(ans)) return false;
      const values = Object.values(ans).filter(v => typeof v === 'string' && (v as string).trim().length > 0);
      return values.length > 0;
    }
    if (q.type === 'essay') {
      return typeof ans === 'string' && ans.trim().length > 0;
    }
    return !!ans;
  };

  // IN PROGRESS EXAM INTERFACE
  const questions = studentSession.randomizedQuestions;
  const currentQ = questions[currentIdx];
  const rawAnswer = studentSession.answers[currentQ.id];
  const isCurrentFlagged = studentSession.flaggedQuestionIds.includes(currentQ.id);

  const answeredTotal = questions.filter(q => checkIsQuestionAnswered(q, studentSession.answers[q.id])).length;
  const flaggedTotal = studentSession.flaggedQuestionIds.length;

  return (
    <div className="exam-no-select max-w-6xl mx-auto pb-16">
      {/* Broadcast Alert Modal / Banner */}
      {latestBroadcast && (
        <div className="mb-4 p-4 bg-rose-600 text-white rounded-xl shadow-lg flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 shrink-0" />
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-rose-200">Pengumuman Pengawas Ujian</span>
              <p className="text-base font-semibold">{latestBroadcast}</p>
            </div>
          </div>
          <button 
            onClick={clearLatestBroadcast}
            className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded text-xs font-bold cursor-pointer transition"
          >
            Mengerti
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL PERINGATAN TAB SWITCHING / FOCUS LOSS                               */}
      {/* Memberikan peringatan tegas & notifikasi pengiriman log ke database      */}
      {/* ========================================================================= */}
      {tabSwitchWarning?.isOpen && (
        <div className="fixed inset-0 z-[65] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full text-center shadow-2xl border-4 border-rose-600 space-y-4 animate-in zoom-in-95">
            <div className="w-20 h-20 rounded-3xl bg-rose-100 text-rose-600 border-2 border-rose-200 flex items-center justify-center mx-auto shadow-inner animate-pulse">
              <ShieldAlert className="w-10 h-10" />
            </div>

            <div>
              <span className="px-3 py-1 bg-rose-100 text-rose-800 rounded-full text-xs font-black uppercase tracking-wider inline-flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                <span>Pelanggaran Protokol Kejujuran Terdeteksi</span>
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-2">
                Peringatan: Anda Meninggalkan Halaman Ujian!
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 mt-1.5 leading-relaxed">
                Sistem anti-cheat mendeteksi bahwa Anda telah <strong>berpindah tab browser</strong> atau <strong>kehilangan fokus jendela ujian</strong> saat ujian berlangsung.
              </p>
            </div>

            {/* Rincian Pelanggaran & Bukti Log Database */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-left text-xs space-y-2">
              <div className="flex items-start justify-between gap-2 border-b border-slate-200 pb-2">
                <span className="text-slate-500 font-medium shrink-0">Aktivitas:</span>
                <span className="font-bold text-rose-700 text-right">{tabSwitchWarning.reason}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500 font-medium">Waktu Deteksi:</span>
                <span className="font-mono font-bold text-slate-800">{tabSwitchWarning.timestamp}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500 font-medium">Status Teguran:</span>
                <span className={`font-black px-2 py-0.5 rounded text-[11px] ${
                  tabSwitchWarning.violationCount >= tabSwitchWarning.maxAllowed
                    ? 'bg-rose-600 text-white'
                    : 'bg-amber-100 text-amber-900 border border-amber-300'
                }`}>
                  Teguran ke-{tabSwitchWarning.violationCount} dari maksimal {tabSwitchWarning.maxAllowed} kali
                </span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-slate-500 font-medium">Log ke Database:</span>
                <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[10px]">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>Tersimpan di Cloud Database & Ruang Pengawas</span>
                </span>
              </div>
            </div>

            {/* Warning consequence */}
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-2xl text-amber-900 text-left text-xs space-y-1">
              <div className="font-extrabold flex items-center gap-1.5 text-amber-800">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Peringatan Keras Pengawas:</span>
              </div>
              <p className="text-[11px] text-amber-800/90 leading-relaxed">
                Jika akumulasi teguran mencapai batas maksimal ({tabSwitchWarning.maxAllowed} kali), sesi ujian Anda akan <strong>OTOMATIS DIKUNCI</strong> dan Anda tidak dapat melanjutkan ujian tanpa izin tertulis dari Pengawas Ruang.
              </p>
            </div>

            {/* Tombol Konfirmasi & Kembali Layar Penuh */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setTabSwitchWarning(null);
                  requestFullscreen();
                }}
                className="w-full py-3.5 bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-700 hover:to-red-800 text-white font-black rounded-2xl text-xs sm:text-sm shadow-lg shadow-rose-200 cursor-pointer transition flex items-center justify-center gap-2"
              >
                <Maximize2 className="w-4 h-4" />
                <span>Saya Mengerti & Lanjutkan Ujian (Kembali ke Layar Penuh)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* FITUR PAKSA LAYAR PENUH (FULLSCREEN API ENFORCER)                         */}
      {/* Otomatis aktif saat ujian dimulai, dengan notifikasi untuk tetap berada   */}
      {/* dalam mode layar penuh selama pengerjaan                                  */}
      {/* ========================================================================= */}
      {showFullscreenEnforcer && !tabSwitchWarning?.isOpen && !splitScreenAlert && (
        <div className="fixed inset-0 z-[60] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full text-center shadow-2xl border-4 border-indigo-600 space-y-4 animate-in zoom-in-95">
            <div className="w-18 h-18 rounded-3xl bg-indigo-100 text-indigo-700 border-2 border-indigo-200 flex items-center justify-center mx-auto shadow-inner animate-pulse">
              <Maximize2 className="w-9 h-9" />
            </div>

            <div>
              <span className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs font-black uppercase tracking-wider inline-flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                <span>Protokol Keamanan Layar Penuh (Fullscreen)</span>
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-2">
                Wajib Masuk Mode Layar Penuh
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 mt-1.5 leading-relaxed">
                Untuk menjamin integritas dan objektivitas Asesmen Madrasah CBT, pengerjaan soal wajib dilakukan dalam <strong>mode layar penuh (Fullscreen)</strong>.
              </p>
            </div>

            <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-2xl text-left text-xs text-indigo-950 space-y-2">
              <div className="font-extrabold flex items-center gap-1.5 text-indigo-900">
                <AlertCircle className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>Instruksi Selama Ujian Berlangsung:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-indigo-900/90 leading-relaxed">
                <li>Anda <strong>WAJIB TETAP berada dalam mode layar penuh</strong> hingga seluruh soal selesai dan tombol <strong>Selesai Ujian</strong> diklik.</li>
                <li>Dilarang menekan tombol <strong>ESC</strong>, <strong>F11</strong>, atau meminimalkan jendela browser.</li>
                <li>Dilarang membuka tab browser lain atau aplikasi multitasking di komputer/ponsel.</li>
                <li>Keluar dari layar penuh akan otomatis dicatat sebagai <strong>pelanggaran anti-cheat</strong> dan terkirim ke server pengawas.</li>
              </ul>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={requestFullscreen}
                className="w-full py-4 bg-gradient-to-r from-indigo-600 via-emerald-600 to-teal-700 hover:from-indigo-700 hover:to-teal-800 text-white font-black rounded-2xl text-xs sm:text-sm shadow-xl shadow-indigo-200 cursor-pointer transition flex items-center justify-center gap-2"
              >
                <Maximize2 className="w-5 h-5" />
                <span>Aktifkan Mode Layar Penuh Sekarang →</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Split Screen Overlay Blocker */}
      {splitScreenAlert && (
        <div className="fixed inset-0 z-50 bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl p-8 max-w-lg text-center shadow-2xl border-4 border-rose-500">
            <AlertTriangle className="w-16 h-16 text-rose-500 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-slate-900">Peringatan: Split Screen Terdeteksi!</h3>
            <p className="text-slate-600 mt-3 text-sm leading-relaxed">
              Sistem CBT melarang penggunaan layar terbagi (split-screen / multitasking window) untuk mencegah kecurangan.
            </p>
            <p className="text-amber-800 font-semibold text-sm bg-amber-50 p-3 rounded-lg mt-4">
              Harap maksimalkan layar penuh (Maximize / Fullscreen) browser Anda untuk melanjutkan pengerjaan soal.
            </p>
            <button
              onClick={() => {
                requestFullscreen();
                setSplitScreenAlert(false);
              }}
              className="mt-6 w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow cursor-pointer transition flex items-center justify-center gap-2"
            >
              <Maximize2 className="w-4 h-4" />
              Aktifkan Layar Penuh
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PROTOKOL UJIAN: WAJIB TIDAK ADA ALIRAN JARINGAN INTERNET SELAMA MENGERJAKAN */}
      {/* ========================================================================= */}
      {isInternetConnected && !showSubmitModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full text-center shadow-2xl border-4 border-rose-500 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-inner animate-pulse">
              <Wifi className="w-8 h-8" />
            </div>

            <div>
              <span className="px-3 py-1 bg-rose-100 text-rose-800 rounded-full text-xs font-black uppercase tracking-wider">
                Protokol Ujian CBT: Aliran Internet Terdeteksi
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-2">
                Wajib Matikan Aliran Internet!
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
                Sesuai regulasi Asesmen Madrasah, setelah masuk ke naskah soal Anda <strong>WAJIB MEMATIKAN JARINGAN INTERNET</strong> (Nonaktifkan Wi-Fi / Data Seluler / Mode Pesawat) untuk mencegah kebocoran soal dan kecurangan penelusuran online.
              </p>
            </div>

            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-left text-xs text-amber-900 space-y-1.5">
              <div className="font-bold flex items-center gap-1.5 text-amber-800">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Pengerjaan Soal Dijeda Otomatis</span>
              </div>
              <p className="text-[11px] text-amber-800/90 leading-relaxed">
                Seluruh naskah soal disembunyikan sampai aliran jaringan internet diputus. Seluruh jawaban Anda tetap tersimpan dengan aman di penyimpanan lokal perangkat.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => setIsSimulatedOffline(true)}
                className="w-full py-3.5 bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-700 hover:to-red-800 text-white font-black rounded-2xl text-xs shadow-lg shadow-rose-200 cursor-pointer transition flex items-center justify-center gap-2"
              >
                <WifiOff className="w-4 h-4" />
                <span>Putuskan Aliran Internet Sekarang (Mode Offline)</span>
              </button>

              <p className="text-[11px] text-slate-400">
                Atau matikan sakelar Wi-Fi / cabut kabel LAN fisik di perangkat laptop/ponsel Anda.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* FLOATING CORNER CAMERA FOR MOBILE DEVICES (POJOK KANAN ATAS HP)           */}
      {/* Muncul di pojok kanan atas tanpa menutupi urutan nomor soal atau jawaban   */}
      {/* ========================================================================= */}
      <div className="fixed top-16 right-3 z-40 lg:hidden pointer-events-auto">
        {!isMobileCamCollapsed ? (
          <div className="w-28 sm:w-32 bg-slate-950/95 border-2 border-emerald-500 rounded-2xl shadow-2xl overflow-hidden p-1.5 space-y-1 backdrop-blur-md animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between text-[9px] text-slate-300 px-0.5">
              <span className="flex items-center gap-1 font-bold text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>REC LIVE</span>
              </span>
              <button
                type="button"
                onClick={() => setIsMobileCamCollapsed(true)}
                title="Kecilkan pratinjau kamera agar layar lebih luas"
                className="p-0.5 hover:text-white rounded bg-slate-800 text-slate-400 cursor-pointer"
              >
                <Minimize2 className="w-2.5 h-2.5" />
              </button>
            </div>

            <div className="relative aspect-4/3 w-full bg-black rounded-lg overflow-hidden flex items-center justify-center">
              {isCameraActive ? (
                <>
                  <video
                    autoPlay
                    playsInline
                    muted
                    ref={(el) => {
                      if (el && streamRef.current && el.srcObject !== streamRef.current) {
                        el.srcObject = streamRef.current;
                        el.muted = true;
                        el.setAttribute('playsinline', 'true');
                        el.setAttribute('webkit-playsinline', 'true');
                        el.play().catch(() => {});
                      }
                    }}
                    className={`w-full h-full object-cover ${facingMode === 'user' ? 'transform -scale-x-100' : ''}`}
                  />
                  <div className="absolute bottom-1 right-1 px-1 py-0.2 bg-black/70 rounded text-[7px] font-mono text-slate-300">
                    {lastCamSnapshotTime}
                  </div>
                </>
              ) : (
                <div className="p-1 text-center text-slate-400 text-[8px] flex flex-col items-center">
                  <CameraOff className="w-3.5 h-3.5 text-rose-400 mb-0.5" />
                  <span>Kamera Standby</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-[8px] text-slate-400 px-0.5">
              <span className="truncate max-w-[65px] font-medium text-slate-300">
                {currentUser?.name?.split(' ')[0] || 'Santri'}
              </span>
              <button
                type="button"
                onClick={handleToggleFacingMode}
                className="text-emerald-400 hover:text-emerald-300 text-[8px] font-bold cursor-pointer"
              >
                {facingMode === 'user' ? 'Kamera HP' : 'Belakang'}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsMobileCamCollapsed(false)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-900/90 hover:bg-slate-900 text-white border-2 border-emerald-500 rounded-full shadow-lg text-[10px] font-bold backdrop-blur-sm animate-in fade-in cursor-pointer"
            title="Klik untuk membuka pratinjau kamera pengawas di pojok kanan atas"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <Video className="w-3.5 h-3.5 text-emerald-400" />
            <span>Kamera Live</span>
          </button>
        )}
      </div>

      {/* Top Header Bar */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200 px-4 py-3 mb-6 rounded-2xl shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setActiveTab('student_home')}
            className="p-2 sm:px-3 sm:py-2 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 border border-slate-200 cursor-pointer transition shrink-0"
            title="Kembali ke Beranda Daftar Soal Ujian"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Beranda Soal</span>
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">{activeExam.subject}</span>
              <span className="px-2 py-0.5 bg-blue-50 text-blue-900 border border-blue-200 rounded-md text-[10px] font-bold flex items-center gap-1">
                <Calendar className="w-3 h-3 text-blue-600" />
                <span>Tanggal: {activeExam.examDate || '2026-10-19'}</span>
              </span>
              <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[10px] font-mono font-bold">
                {activeExam.examStartTime || '07:30'} - {activeExam.examEndTime || '09:00'} WIB
              </span>
            {eligibleExams.length > 1 && (
              <select
                value={activeExam.id}
                onChange={(e) => {
                  setSelectedExamId(e.target.value);
                  setCurrentIdx(0);
                }}
                className="text-[11px] font-bold bg-indigo-50 border border-indigo-200 text-indigo-900 rounded-lg px-2 py-0.5 cursor-pointer"
              >
                {eligibleExams.map(ex => (
                  <option key={ex.id} value={ex.id}>
                    Pilih Ujian: {ex.title}
                  </option>
                ))}
              </select>
            )}
          </div>
          <h1 className="text-base font-bold text-slate-800 line-clamp-1">
            <span className="text-emerald-700 text-xs font-semibold block">{systemSettings.schoolName}</span>
            {activeExam.title}
          </h1>
        </div>
      </div>

        <div className="flex items-center gap-3">
          {/* Offline/Online Resilience indicator */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${
            !isInternetConnected 
              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
              : 'bg-rose-100 text-rose-800 border border-rose-300 animate-pulse'
          }`}>
            {!isInternetConnected ? (
              <>
                <WifiOff className="w-3.5 h-3.5 text-emerald-700" />
                <span>Mode Offline Aman (Regulasi CBT)</span>
              </>
            ) : (
              <>
                <Wifi className="w-3.5 h-3.5 text-rose-600" />
                <span>Internet Aktif (Wajib Dimatikan)</span>
              </>
            )}
          </div>

          {/* Violation warning pill */}
          <div className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold ${
            studentSession.violationsCount > 0
              ? 'bg-rose-100 text-rose-700 border border-rose-300'
              : 'bg-slate-100 text-slate-700 border border-slate-200'
          }`}>
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Teguran: {studentSession.violationsCount}/{systemSettings.maxViolationsAllowed ?? activeExam.maxViolationsAllowed ?? 3}</span>
          </div>

          {/* Camera Status Pill */}
          <div className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${
            isCameraActive 
              ? 'bg-rose-50 text-rose-800 border border-rose-200' 
              : 'bg-amber-50 text-amber-800 border border-amber-200'
          }`}>
            <span className="relative flex h-2 w-2">
              {isCameraActive && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isCameraActive ? 'bg-rose-600' : 'bg-amber-500'}`}></span>
            </span>
            <Video className="w-3.5 h-3.5 text-rose-600" />
            <span>{isCameraActive ? 'Kamera Live' : 'Kamera Standby'}</span>
          </div>

          {/* Timer */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 text-white rounded-lg font-mono text-sm font-bold shadow-inner">
            <Clock className="w-4 h-4 text-indigo-400" />
            <span>{formatTime(timeLeft)}</span>
          </div>

          {/* Fullscreen Button */}
          <button
            onClick={requestFullscreen}
            title="Layar Penuh"
            className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-lg cursor-pointer transition"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* NOTIFIKASI TETAP BERADA DALAM MODE LAYAR PENUH SELAMA PENGERJAAN */}
      <div className="mb-4 px-4 py-3 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl shadow-lg border border-indigo-500/30 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-indigo-300 shrink-0">
            <Maximize2 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-indigo-300 uppercase tracking-wider text-[11px]">Protokol Layar Penuh (Fullscreen)</span>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>
            <p className="text-slate-300 text-[11px] mt-0.5 leading-relaxed">
              Notifikasi: Anda wajib <strong>tetap berada dalam mode layar penuh</strong> selama seluruh pengerjaan soal. Dilarang menekan tombol ESC, berpindah tab browser, atau meminimalkan layar agar sesi ujian tidak terkunci otomatis.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg text-[10px] font-bold font-mono flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Anti-Cheat Aktif</span>
          </div>
        </div>
      </div>

      {/* Main Exam Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Question Content Area (8 Cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 relative">
            {/* Top row of question: Number, Category, Type, Font Resizer */}
            <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-4 mb-5 gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-extrabold flex items-center justify-center text-sm shadow-xs">
                  {currentIdx + 1}
                </span>
                <span className="text-xs font-semibold text-slate-500 uppercase">
                  {currentQ.category} • Poin: {currentQ.points}
                </span>

                {/* Type Badge */}
                {currentQ.type === 'multiple_choice' && (
                  <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 rounded-md text-[10px] font-extrabold">
                    Pilihan Ganda (1 Jawaban)
                  </span>
                )}
                {currentQ.type === 'multiple_choice_complex' && (
                  <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-800 rounded-md text-[10px] font-extrabold flex items-center gap-1">
                    <CheckSquare className="w-3 h-3" />
                    PG Kompleks (&gt;1 Jawaban)
                  </span>
                )}
                {currentQ.type === 'matching' && (
                  <span className="px-2.5 py-0.5 bg-purple-100 text-purple-800 rounded-md text-[10px] font-extrabold flex items-center gap-1">
                    <ArrowRightLeft className="w-3 h-3" />
                    Menjodohkan
                  </span>
                )}
                {currentQ.type === 'essay' && (
                  <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 rounded-md text-[10px] font-extrabold flex items-center gap-1">
                    <Edit3 className="w-3 h-3" />
                    Esai / Uraian
                  </span>
                )}

                {/* Question Scheduled Date Badge */}
                <span className="px-2 py-0.5 bg-blue-50 text-blue-900 border border-blue-200 rounded-md text-[10px] font-bold flex items-center gap-1" title="Tanggal Pelaksanaan Butir Soal">
                  <Calendar className="w-3 h-3 text-blue-600" />
                  <span>Jadwal: {currentQ.examDate || activeExam.examDate || '2026-10-19'}</span>
                </span>
              </div>

              {/* Font Size Adjuster */}
              <div className="flex items-center gap-1 text-xs text-slate-500 bg-slate-100 p-1 rounded-lg">
                <span className="px-1 text-[11px]">Ukuran:</span>
                <button
                  onClick={() => setFontSizeClass('text-base')}
                  className={`px-1.5 py-0.5 rounded cursor-pointer ${fontSizeClass === 'text-base' ? 'bg-white font-bold text-indigo-600 shadow-xs' : ''}`}
                >
                  A
                </button>
                <button
                  onClick={() => setFontSizeClass('text-lg')}
                  className={`px-1.5 py-0.5 rounded cursor-pointer ${fontSizeClass === 'text-lg' ? 'bg-white font-bold text-indigo-600 shadow-xs' : ''}`}
                >
                  A+
                </button>
                <button
                  onClick={() => setFontSizeClass('text-xl')}
                  className={`px-1.5 py-0.5 rounded cursor-pointer ${fontSizeClass === 'text-xl' ? 'bg-white font-bold text-indigo-600 shadow-xs' : ''}`}
                >
                  A++
                </button>
              </div>
            </div>

            {/* Question Text */}
            <div className={`text-slate-800 leading-relaxed font-normal ${fontSizeClass} mb-4 select-none`}>
              <MathRenderer text={currentQ.text} />
            </div>

            {/* Question Image (if present) */}
            {currentQ.image && (
              <div className="mb-6 rounded-2xl overflow-hidden border border-slate-200 bg-slate-50/60 p-2 sm:p-3 inline-block max-w-full">
                <img 
                  src={currentQ.image} 
                  alt={`Gambar Soal Nomor ${currentIdx + 1}`} 
                  className="max-h-80 sm:max-h-96 w-auto object-contain rounded-xl shadow-xs mx-auto"
                />
                <span className="text-[10px] text-slate-400 font-semibold block text-center mt-1.5">
                  Lampiran Gambar Soal #{currentIdx + 1}
                </span>
              </div>
            )}

            {/* ========================================================================= */}
            {/* TYPE 1: PILIHAN GANDA BIASA (SINGLE CHOICE) */}
            {/* ========================================================================= */}
            {currentQ.type === 'multiple_choice' && (
              <div className="space-y-3">
                {currentQ.options.map((opt, optIdx) => {
                  const optLetter = String.fromCharCode(65 + optIdx); // A, B, C, D, E
                  const isSelected = rawAnswer === opt.id;

                  return (
                    <button
                      key={opt.id}
                      onClick={() => {
                        updateStudentAnswer(studentSession.id, currentQ.id, opt.id);
                        setLastSavedTime(new Date().toLocaleTimeString('id-ID'));
                      }}
                      className={`w-full text-left p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
                        isSelected
                          ? 'bg-indigo-50 border-indigo-500 text-indigo-900 shadow-xs ring-2 ring-indigo-200'
                          : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/70 text-slate-800'
                      }`}
                    >
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 border border-slate-300'
                      }`}>
                        {optLetter}
                      </span>
                      <div className="flex-1 pt-0.5">
                        <span className={`text-sm md:text-base ${fontSizeClass}`}>
                          <MathRenderer text={opt.text} inline />
                        </span>
                        {opt.image && (
                          <div className="mt-2 mb-1">
                            <img src={opt.image} alt={`Gambar Opsi ${optLetter}`} className="max-h-40 w-auto object-contain rounded-lg border border-slate-200 bg-white" />
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* ========================================================================= */}
            {/* TYPE 2: PILIHAN GANDA LEBIH DARI SATU JAWABAN (COMPLEX MULTI-SELECT) */}
            {/* ========================================================================= */}
            {currentQ.type === 'multiple_choice_complex' && (
              <div className="space-y-3">
                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center gap-2 text-indigo-900 text-xs font-semibold">
                  <CheckSquare className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>Petunjuk: Pilihan Ganda Kompleks — Centang semua jawaban yang Anda anggap benar (bisa lebih dari satu).</span>
                </div>

                <div className="space-y-3 pt-1">
                  {currentQ.options.map((opt, optIdx) => {
                    const optLetter = String.fromCharCode(65 + optIdx);
                    const selectedList: string[] = Array.isArray(rawAnswer) ? rawAnswer : (rawAnswer ? [String(rawAnswer)] : []);
                    const isSelected = selectedList.includes(opt.id);

                    const handleToggle = () => {
                      const updated = isSelected 
                        ? selectedList.filter(id => id !== opt.id)
                        : [...selectedList, opt.id];
                      updateStudentAnswer(studentSession.id, currentQ.id, updated);
                      setLastSavedTime(new Date().toLocaleTimeString('id-ID'));
                    };

                    return (
                      <div
                        key={opt.id}
                        onClick={handleToggle}
                        className={`w-full text-left p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
                          isSelected
                            ? 'bg-indigo-50 border-indigo-500 text-indigo-900 shadow-xs ring-2 ring-indigo-200'
                            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/70 text-slate-800'
                        }`}
                      >
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 border border-slate-300'
                        }`}>
                          {isSelected ? <Check className="w-4 h-4" /> : optLetter}
                        </div>
                        <div className="flex-1 pt-0.5">
                          <span className={`text-sm md:text-base ${fontSizeClass}`}>
                            <MathRenderer text={opt.text} inline />
                          </span>
                          {opt.image && (
                            <div className="mt-2 mb-1">
                              <img src={opt.image} alt={`Gambar Opsi ${optLetter}`} className="max-h-40 w-auto object-contain rounded-lg border border-slate-200 bg-white" />
                            </div>
                          )}
                        </div>
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${
                          isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'
                        }`}>
                          {isSelected ? 'Terpilih' : 'Pilih'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* TYPE 3: MENJODOHKAN / MENCOCOKKAN (MATCHING) */}
            {/* ========================================================================= */}
            {currentQ.type === 'matching' && (
              <div className="space-y-4">
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl flex items-center gap-2 text-purple-900 text-xs font-semibold">
                  <ArrowRightLeft className="w-4 h-4 text-purple-600 shrink-0" />
                  <span>Petunjuk Menjodohkan: Pasangkan setiap premis di kolom kiri dengan pilihan jawaban yang tepat di kolom kanan.</span>
                </div>

                <div className="space-y-3">
                  {(currentQ.matchingPairs || []).map((pair, pIdx) => {
                    const matchingMap: Record<string, string> = (typeof rawAnswer === 'object' && rawAnswer !== null && !Array.isArray(rawAnswer)) ? rawAnswer : {};
                    const chosen = matchingMap[pair.id] || '';

                    // Available right choices
                    const choices = (currentQ.matchingPairs || []).map(p => p.rightAnswer);

                    return (
                      <div
                        key={pair.id || pIdx}
                        className="p-4 bg-white border border-slate-200 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs hover:border-purple-300 transition"
                      >
                        <div className="flex items-center gap-2.5 flex-1">
                          <span className="w-7 h-7 rounded-lg bg-purple-100 text-purple-800 font-extrabold text-xs flex items-center justify-center shrink-0">
                            {pIdx + 1}
                          </span>
                          <span className="text-sm font-semibold text-slate-800">
                            {pair.leftPrompt}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 flex-1 w-full md:w-auto">
                          <ArrowRightLeft className="w-4 h-4 text-purple-500 shrink-0 hidden md:block" />
                          <select
                            value={chosen}
                            onChange={(e) => {
                              const updated = { ...matchingMap, [pair.id]: e.target.value };
                              updateStudentAnswer(studentSession.id, currentQ.id, updated);
                              setLastSavedTime(new Date().toLocaleTimeString('id-ID'));
                            }}
                            className={`w-full px-3 py-2 text-xs md:text-sm font-medium rounded-xl border cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-purple-500 transition ${
                              chosen
                                ? 'bg-purple-50/70 border-purple-400 text-purple-900 font-bold'
                                : 'bg-slate-50 border-slate-200 text-slate-600'
                            }`}
                          >
                            <option value="">-- Pilih Pasangan Jawaban --</option>
                            {choices.map((c, cIdx) => (
                              <option key={cIdx} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* TYPE 4: ESAI / URAIAN */}
            {/* ========================================================================= */}
            {currentQ.type === 'essay' && (
              <div className="space-y-3">
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-amber-900 text-xs font-semibold">
                  <Edit3 className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Petunjuk Soal Esai: Tuliskan uraian jawaban Anda secara komprehensif pada kotak jawaban di bawah ini.</span>
                </div>

                <div className="relative">
                  <textarea
                    rows={7}
                    value={typeof rawAnswer === 'string' ? rawAnswer : ''}
                    onChange={(e) => {
                      updateStudentAnswer(studentSession.id, currentQ.id, e.target.value);
                      setLastSavedTime(new Date().toLocaleTimeString('id-ID'));
                    }}
                    placeholder="Ketik uraian jawaban Anda secara lengkap di sini..."
                    className={`w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500 transition leading-relaxed ${fontSizeClass}`}
                  />
                  <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400 px-1">
                    <span>Jawaban Anda otomatis tersimpan saat Anda mengetik.</span>
                    <span>
                      {typeof rawAnswer === 'string' ? rawAnswer.trim().length : 0} Karakter
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Actions: Prev, Flag, Next */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5 mt-8">
              <button
                disabled={currentIdx === 0}
                onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 font-semibold rounded-xl text-xs flex items-center gap-1 cursor-pointer transition"
              >
                <ChevronLeft className="w-4 h-4" />
                Sebelumnya
              </button>

              <button
                onClick={() => toggleFlagQuestion(studentSession.id, currentQ.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition ${
                  isCurrentFlagged
                    ? 'bg-amber-500 hover:bg-amber-600 text-white'
                    : 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300'
                }`}
              >
                <HelpCircle className="w-4 h-4" />
                {isCurrentFlagged ? 'Hapus Tanda Ragu' : 'Ragu-Ragu'}
              </button>

              {currentIdx < questions.length - 1 ? (
                <button
                  onClick={() => setCurrentIdx(prev => Math.min(questions.length - 1, prev + 1))}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs flex items-center gap-1 cursor-pointer transition shadow"
                >
                  Berikutnya
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={() => setShowSubmitModal(true)}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition shadow"
                >
                  <Send className="w-4 h-4" />
                  Selesai Ujian
                </button>
              )}
            </div>

            {/* Autosave feedback */}
            <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <Check className="w-3 h-3 text-emerald-500" />
                Tersimpan otomatis di penyimpanan lokal ({lastSavedTime})
              </span>
              <span>Protokol Pengacakan: Aktif</span>
            </div>
          </div>
        </div>

        {/* Right: Question Palette / Navigator (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* ========================================================================= */}
          {/* LIVE PROCTOR CAMERA FEED (POJOK KANAN ATAS - ANTI MENUTUPI NOMOR SOAL)    */}
          {/* ========================================================================= */}
          <div className="bg-slate-900 text-white rounded-2xl border border-slate-700 shadow-md p-3.5 space-y-2.5 transition-all">
            {/* Header: Title + Live Badge + Camera Controls */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                </span>
                <div className="flex items-center gap-1.5 font-bold text-xs text-slate-100">
                  <Video className="w-3.5 h-3.5 text-rose-400" />
                  <span>Kamera Pengawas</span>
                </div>
                <span className="px-1.5 py-0.5 bg-rose-950/90 text-rose-300 border border-rose-800/80 rounded text-[9px] font-black uppercase tracking-wider">
                  REC LIVE
                </span>
              </div>

              <div className="flex items-center gap-1">
                {/* Switch Front/Back Camera (Khusus HP / Tablet) */}
                <button
                  type="button"
                  onClick={handleToggleFacingMode}
                  title={`Ganti Kamera HP (Saat ini: ${facingMode === 'user' ? 'Kamera Depan' : 'Kamera Belakang'})`}
                  className="p-1 px-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition text-[10px] flex items-center gap-1 cursor-pointer"
                >
                  <FlipHorizontal className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline text-[9px] font-semibold">{facingMode === 'user' ? 'Depan' : 'Belakang'}</span>
                </button>

                {/* Minimize / Expand Toggle */}
                <button
                  type="button"
                  onClick={() => setIsCameraMinimized(prev => !prev)}
                  title={isCameraMinimized ? 'Perbesar Pratinjau Kamera' : 'Kecilkan Pratinjau Kamera'}
                  className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
                >
                  {isCameraMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Video Preview Viewport */}
            {!isCameraMinimized && (
              <div className="relative aspect-4/3 w-full bg-black rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center shadow-inner">
                {/* Real Video Element (HP / Laptop Front Camera) */}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${facingMode === 'user' ? 'transform -scale-x-100' : ''} ${!isCameraActive ? 'hidden' : 'block'}`}
                />

                {/* Fallback View if Camera Inactive or Blocked */}
                {!isCameraActive && (
                  <div className="absolute inset-0 p-3.5 flex flex-col items-center justify-center text-center bg-slate-950/95 text-slate-300 space-y-2">
                    <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-rose-400 border border-slate-700">
                      <CameraOff className="w-5 h-5" />
                    </div>
                    <div className="text-[11px] font-bold text-white">Kamera Belum Aktif</div>
                    <p className="text-[10px] text-slate-400 leading-tight max-w-xs">
                      {cameraError || 'Pengawas memerlukan akses kamera HP/laptop Anda selama ujian berlangsung.'}
                    </p>
                    <button
                      type="button"
                      onClick={() => startCamera()}
                      className="mt-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-[10px] font-bold cursor-pointer transition flex items-center gap-1.5 shadow-md"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Aktifkan Kamera Sekarang</span>
                    </button>
                  </div>
                )}

                {/* Live Stream Overlays */}
                {isCameraActive && (
                  <>
                    <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/70 backdrop-blur-xs rounded-md text-[9px] font-mono font-bold text-emerald-400 flex items-center gap-1 shadow">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span>TERHUBUNG PENGAWAS</span>
                    </div>

                    <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/70 backdrop-blur-xs rounded text-[9px] font-mono text-slate-300 shadow">
                      {lastCamSnapshotTime || 'Live'}
                    </div>

                    <div className="absolute bottom-2 left-2 px-1.5 py-0.5 bg-black/70 backdrop-blur-xs rounded text-[9px] font-mono text-slate-300 truncate max-w-[130px]">
                      {currentUser?.name || studentSession.studentName}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Camera Footnote info */}
            <div className="flex items-center justify-between text-[10px] text-slate-400 px-0.5 pt-0.5 border-t border-slate-800/80">
              <span className="flex items-center gap-1 truncate max-w-[180px]">
                <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />
                <span>Foto dikirim ke Ruang Pengawas</span>
              </span>
              <span className="text-[9px] font-mono text-slate-400 flex items-center gap-1">
                <RefreshCw className="w-2.5 h-2.5 text-indigo-400 animate-spin" />
                <span>Auto-Sync 5s</span>
              </span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800 text-sm">Nomor Soal</h3>
              <span className="text-xs text-slate-500">{answeredTotal}/{questions.length} Terjawab</span>
            </div>

            {/* Legend */}
            <div className="grid grid-cols-3 gap-2 text-[10px] font-semibold text-slate-600 mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-emerald-500 inline-block"></span>
                <span>Dijawab</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-amber-500 inline-block"></span>
                <span>Ragu-ragu</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-slate-200 inline-block"></span>
                <span>Kosong</span>
              </div>
            </div>

            {/* Number grid */}
            <div className="grid grid-cols-5 gap-2.5">
              {questions.map((q, idx) => {
                const isAnswered = checkIsQuestionAnswered(q, studentSession.answers[q.id]);
                const isFlagged = studentSession.flaggedQuestionIds.includes(q.id);
                const isCurrent = idx === currentIdx;

                let colorClasses = 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200';
                if (isFlagged) {
                  colorClasses = 'bg-amber-500 text-white border-amber-600 font-bold';
                } else if (isAnswered) {
                  colorClasses = 'bg-emerald-600 text-white border-emerald-700 font-bold';
                }

                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIdx(idx)}
                    className={`h-10 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center justify-center relative ${colorClasses} ${
                      isCurrent ? 'ring-2 ring-indigo-600 ring-offset-2 scale-105' : ''
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100">
              <button
                onClick={() => setShowSubmitModal(true)}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow transition cursor-pointer flex items-center justify-center gap-2"
              >
                <Send className="w-3.5 h-3.5" />
                Kumpulkan Jawaban Akhir
              </button>
            </div>
          </div>

          {/* Student Anti-Cheat Info Box */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 text-xs text-slate-600 space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-800">
              <ShieldAlert className="w-4 h-4 text-indigo-600" />
              <span>Protokol Keamanan Aktif</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-slate-500 pl-1">
              <li>Pindah tab / aplikasi dicatat sebagai pelanggaran.</li>
              <li>Klik kanan dan tombol salin/tempel dinonaktifkan.</li>
              <li>Split screen / dual monitor dipantau otomatis.</li>
              <li>Pengawas dapat mengunci lembar ujian kapan saja.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Confirmation Submit Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Konfirmasi Pengumpulan Jawaban</h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Pastikan Anda telah memeriksa kembali seluruh jawaban sebelum mengirimkan hasil akhir.
            </p>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs mb-5">
              <div className="flex justify-between">
                <span className="text-slate-500">Soal Terjawab:</span>
                <span className="font-bold text-emerald-600">{answeredTotal} Soal</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Soal Ragu-ragu:</span>
                <span className="font-bold text-amber-600">{flaggedTotal} Soal</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Belum Dijawab:</span>
                <span className="font-bold text-rose-600">{questions.length - answeredTotal} Soal</span>
              </div>
            </div>

            {/* INTERNET REQUIREMENT FOR SUBMITTING ANSWERS */}
            {!isInternetConnected ? (
              <div className="mb-5 p-4 bg-amber-50 border-2 border-amber-300 rounded-2xl text-xs space-y-3">
                <div className="flex items-start gap-2.5">
                  <div className="p-1.5 bg-amber-200 text-amber-900 rounded-lg shrink-0 mt-0.5">
                    <Wifi className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-amber-950 text-xs">
                      Wajib Menghubungkan Aliran Internet!
                    </h4>
                    <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                      Untuk mengirimkan nilai dan sinkronisasi berkas lembar jawaban ke server CBT pengawas, Anda <strong>wajib mengaktifkan kembali koneksi internet</strong> (Hubungkan Wi-Fi / Data Seluler).
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsSimulatedOffline(false)}
                  className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-bold rounded-xl text-xs shadow-xs cursor-pointer transition flex items-center justify-center gap-1.5"
                >
                  <Wifi className="w-3.5 h-3.5" />
                  <span>Sambungkan Aliran Internet Sekarang (Online Mode)</span>
                </button>
              </div>
            ) : (
              <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-300 rounded-2xl text-xs flex items-center gap-2.5 text-emerald-900">
                <div className="p-1.5 bg-emerald-200 text-emerald-900 rounded-lg shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                </div>
                <div>
                  <div className="font-extrabold text-emerald-950 text-xs">Aliran Internet Terhubung & Stabil</div>
                  <div className="text-[11px] text-emerald-700">Server CBT siap menerima pengiriman lembar jawaban Anda.</div>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer transition text-center"
              >
                Kembali Periksa
              </button>
              <button
                type="button"
                disabled={!isInternetConnected}
                onClick={() => {
                  submitExam(studentSession.id);
                  setShowSubmitModal(false);
                }}
                className={`flex-1 py-3 font-extrabold rounded-xl text-xs transition text-center flex items-center justify-center gap-1.5 shadow-md ${
                  isInternetConnected
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200 cursor-pointer'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                }`}
                title={!isInternetConnected ? 'Hubungkan internet terlebih dahulu untuk mengirimkan jawaban' : 'Kirim jawaban sekarang'}
              >
                {!isInternetConnected ? (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>Terkunci (Offline)</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Ya, Kumpulkan Jawaban</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
