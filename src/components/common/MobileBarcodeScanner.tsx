import React, { useEffect, useRef, useState, useCallback } from 'react';
import jsQR from 'jsqr';
import { 
  Camera, 
  RefreshCw, 
  Zap, 
  ZapOff, 
  X, 
  Upload, 
  CheckCircle2, 
  AlertCircle,
  Smartphone,
  Apple
} from 'lucide-react';
import { scanAudio } from '../../services/attendanceUtils';

interface MobileBarcodeScannerProps {
  onScan: (code: string) => void;
  onClose?: () => void;
  title?: string;
  subtitle?: string;
  isOpen: boolean;
}

/**
 * Universal Mobile Barcode & QR Scanner
 * Kompatibel 100% untuk Android (Chrome/Samsung/dll) & Apple iOS (iPhone/iPad Safari WebKit)
 * Menggunakan dual-engine: Native BarcodeDetector + jsQR Canvas Fallback + File Upload Backup
 */
export const MobileBarcodeScanner: React.FC<MobileBarcodeScannerProps> = ({
  onScan,
  onClose,
  title = 'Scanner Barcode Kamera HP',
  subtitle = 'Dukung Android & Apple iOS (Kamera Belakang / Depan)',
  isOpen
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [lastDetectedCode, setLastDetectedCode] = useState<string | null>(null);
  const [scanCooldown, setScanCooldown] = useState(false);
  const [engineType, setEngineType] = useState<'BarcodeDetector' | 'jsQR'>('jsQR');

  // Stop camera tracks cleanly
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsScanning(false);
    setTorchOn(false);
  }, [stream]);

  // Start camera stream compatible with Apple iOS Safari & Android Chrome
  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      // Stop previous stream if any
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }

      // Constraints optimized for iOS Safari (playsInline) & Android
      const constraints: MediaStreamConstraints = {
        audio: false,
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        }
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);

      // Check flashlight/torch capability
      const videoTrack = mediaStream.getVideoTracks()[0];
      if (videoTrack && 'getCapabilities' in videoTrack) {
        const capabilities = (videoTrack as any).getCapabilities?.() || {};
        setHasTorch(!!capabilities.torch);
      } else {
        setHasTorch(false);
      }

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        // Important properties for Apple iOS Safari WebKit
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.setAttribute('webkit-playsinline', 'true');
        videoRef.current.muted = true;
        
        await videoRef.current.play();
        setIsScanning(true);
      }
    } catch (err: any) {
      console.warn('Camera access issue:', err);
      let errMsg = 'Tidak dapat mengakses kamera gawai.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errMsg = 'Izin kamera ditolak. Silakan izinkan akses kamera di pengaturan browser HP Anda.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errMsg = 'Kamera tidak ditemukan pada perangkat ini.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errMsg = 'Kamera sedang digunakan aplikasi lain. Silakan tutup aplikasi kamera lalu coba lagi.';
      }
      setCameraError(errMsg);
      setIsScanning(false);
    }
  }, [facingMode, stream]);

  // Toggle Front / Back Camera
  const toggleFacingMode = () => {
    stopCamera();
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  // Toggle Torch / Flashlight
  const toggleTorch = async () => {
    if (!stream || !hasTorch) return;
    try {
      const track = stream.getVideoTracks()[0];
      if (track && 'applyConstraints' in track) {
        const nextState = !torchOn;
        await (track as any).applyConstraints({
          advanced: [{ torch: nextState }]
        });
        setTorchOn(nextState);
      }
    } catch {
      // Ignore torch error
    }
  };

  // Handle successful detection
  const handleDetected = useCallback((codeText: string) => {
    if (scanCooldown) return;
    const cleanCode = codeText.trim();
    if (!cleanCode) return;

    setLastDetectedCode(cleanCode);
    setScanCooldown(true);
    onScan(cleanCode);

    // Cooldown 2.5 seconds before allowing next camera read to prevent duplicate/spam scans
    setTimeout(() => {
      setScanCooldown(false);
      setLastDetectedCode(null);
    }, 2500);
  }, [scanCooldown, onScan]);

  // Handle Photo / Image File Upload (Fallback for any device)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'attemptBoth'
        });

        if (qrCode && qrCode.data) {
          handleDetected(qrCode.data);
        } else {
          setCameraError('Barcode tidak terdeteksi pada gambar yang diunggah. Pastikan barcode kotak terlihat jelas dan tidak buram.');
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    if (e.target) e.target.value = '';
  };

  // Main scanning loop: Dual Engine (BarcodeDetector + jsQR)
  useEffect(() => {
    if (!isOpen || !isScanning) return;

    let animId: number;
    let isCancelled = false;
    let lastScanTime = 0;

    const supportsBarcodeDetector = typeof window !== 'undefined' && 'BarcodeDetector' in window;
    let barcodeDetectorInstance: any = null;

    if (supportsBarcodeDetector) {
      try {
        setEngineType('BarcodeDetector');
        barcodeDetectorInstance = new (window as any).BarcodeDetector({
          formats: ['qr_code', 'code_128', 'code_39', 'ean_13', 'data_matrix']
        });
      } catch {
        barcodeDetectorInstance = null;
        setEngineType('jsQR');
      }
    } else {
      setEngineType('jsQR');
    }

    const scanFrame = async (timestamp: number) => {
      if (isCancelled) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;

      // Throttle scanning to every 120ms to conserve battery and avoid UI freeze
      if (video && video.readyState === video.HAVE_ENOUGH_DATA && timestamp - lastScanTime >= 120) {
        lastScanTime = timestamp;

        try {
          let detectedString: string | null = null;

          // Engine 1: Native BarcodeDetector (Fast on Chrome Android & modern iOS 17)
          if (barcodeDetectorInstance) {
            try {
              const barcodes = await barcodeDetectorInstance.detect(video);
              if (barcodes && barcodes.length > 0) {
                detectedString = barcodes[0].rawValue;
              }
            } catch {
              // Fallback to jsQR
            }
          }

          // Engine 2: Pure JavaScript jsQR (Universal for all Apple iOS Safari & Android)
          if (!detectedString && canvas) {
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (ctx) {
              const width = video.videoWidth || 640;
              const height = video.videoHeight || 480;

              // Downscale slightly for rapid jsQR computation if 1080p
              const targetW = width > 800 ? Math.round(width * 0.75) : width;
              const targetH = height > 800 ? Math.round(height * 0.75) : height;

              canvas.width = targetW;
              canvas.height = targetH;
              ctx.drawImage(video, 0, 0, targetW, targetH);

              const imageData = ctx.getImageData(0, 0, targetW, targetH);
              const qr = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: 'dontInvert'
              });

              if (qr && qr.data) {
                detectedString = qr.data;
              }
            }
          }

          if (detectedString) {
            handleDetected(detectedString);
          }
        } catch (err) {
          // Keep loop running
        }
      }

      if (!isCancelled) {
        animId = requestAnimationFrame(scanFrame);
      }
    };

    animId = requestAnimationFrame(scanFrame);

    return () => {
      isCancelled = true;
      cancelAnimationFrame(animId);
    };
  }, [isOpen, isScanning, handleDetected]);

  // Start or stop when modal opens/closes or facingMode changes
  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-slate-900 text-white rounded-3xl max-w-lg w-full border border-slate-800 shadow-2xl overflow-hidden flex flex-col my-auto animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm text-white flex items-center gap-1.5">
                <span>{title}</span>
                <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  <Smartphone className="w-3 h-3" />
                  <span>Android</span>
                  <span>•</span>
                  <Apple className="w-3 h-3" />
                  <span>iOS</span>
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">{subtitle}</p>
            </div>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={() => {
                stopCamera();
                onClose();
              }}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
              title="Tutup Kamera"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Viewport / Video Area */}
        <div className="relative aspect-square sm:aspect-[4/3] bg-black flex items-center justify-center overflow-hidden">
          {/* Native HTML5 Video Element (playsInline crucial for Apple iOS Safari WebKit) */}
          <video
            ref={videoRef}
            playsInline
            autoPlay
            muted
            className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
          />

          {/* Hidden Canvas for Frame Processing */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Targeting Viewfinder Overlay */}
          {isScanning && !cameraError && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-8">
              {/* Center Box with glowing corners */}
              <div className="relative w-64 h-64 sm:w-72 sm:h-72 border-2 border-white/20 rounded-3xl flex items-center justify-center">
                {/* 4 Glowing Corner Brackets */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-2xl"></div>
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-2xl"></div>
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-2xl"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-2xl"></div>

                {/* Animated Laser Line */}
                <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-lg shadow-emerald-400/50 animate-pulse"></div>

                {/* Center target indicator */}
                <div className="w-2 h-2 rounded-full bg-emerald-400/80 animate-ping"></div>
              </div>

              {/* Viewfinder Instructions */}
              <div className="absolute bottom-4 left-0 right-0 text-center">
                <span className="bg-slate-950/80 backdrop-blur-md text-slate-200 text-xs px-3 py-1.5 rounded-full border border-white/10 shadow-lg">
                  Arahkan kamera ke <strong>Barcode Batang Kartu</strong> atau <strong>Barcode Lembaga</strong>
                </span>
              </div>
            </div>
          )}

          {/* Detection Alert Banner */}
          {lastDetectedCode && (
            <div className="absolute inset-0 bg-emerald-950/85 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center animate-in zoom-in-95 duration-150 z-20">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 text-emerald-300 flex items-center justify-center mb-3 shadow-lg shadow-emerald-500/30">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h4 className="text-lg font-black text-white">Barcode Berhasil Dipindai!</h4>
              <p className="font-mono text-xs text-emerald-200 bg-emerald-900/60 px-3 py-1.5 rounded-xl border border-emerald-500/30 mt-2 max-w-xs truncate">
                {lastDetectedCode}
              </p>
              <span className="text-[11px] text-slate-300 mt-2">
                Memproses presensi otomatis ke database...
              </span>
            </div>
          )}

          {/* Camera Error State */}
          {cameraError && (
            <div className="absolute inset-0 bg-slate-900/95 p-6 flex flex-col items-center justify-center text-center space-y-3 z-20">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-white">Kamera Tidak Aktif</h4>
              <p className="text-xs text-slate-300 max-w-xs">{cameraError}</p>
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={startCamera}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition shadow-xs"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Coba Lagi</span>
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition border border-slate-700"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Pilih Foto Barcode</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Controls Footer */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
          {/* Left Actions: Switch Camera & Torch */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleFacingMode}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition border border-slate-700 shadow-2xs"
              title="Ganti kamera belakang / depan"
            >
              <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
              <span>{facingMode === 'environment' ? 'Kamera Depan' : 'Kamera Belakang'}</span>
            </button>

            {hasTorch && (
              <button
                type="button"
                onClick={toggleTorch}
                className={`p-2 rounded-xl text-xs font-bold cursor-pointer transition border ${
                  torchOn 
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50' 
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
                title="Nyalakan Lampu Flash"
              >
                {torchOn ? <Zap className="w-4 h-4 fill-amber-300" /> : <ZapOff className="w-4 h-4" />}
              </button>
            )}

            {/* Hidden Photo Upload Input (Universal Fallback for Apple & Android) */}
            <input 
              ref={fileInputRef}
              type="file" 
              accept="image/*"
              capture="environment"
              onChange={handleFileUpload} 
              className="hidden" 
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition border border-slate-700 shadow-2xs"
              title="Unggah foto barcode dari galeri / kamera HP"
            >
              <Upload className="w-3.5 h-3.5 text-teal-400" />
              <span>Unggah Foto</span>
            </button>
          </div>

          {/* Engine indicator */}
          <div className="text-[10px] text-slate-400 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Engine: <strong>{engineType}</strong> (iOS & Android)</span>
          </div>
        </div>

      </div>
    </div>
  );
};
