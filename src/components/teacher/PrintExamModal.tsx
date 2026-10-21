import React, { useState, useId } from 'react';
import { 
  Printer, 
  Download, 
  X, 
  FileText, 
  CheckCircle2, 
  Settings2, 
  School, 
  Columns, 
  Square, 
  CheckSquare, 
  HelpCircle, 
  Eye, 
  BookOpen, 
  Clock, 
  Award, 
  Check,
  ArrowRightLeft,
  Edit3,
  Image as ImageIcon,
  Copy,
  ExternalLink,
  Layers,
  Sparkles,
  SlidersHorizontal,
  ChevronRight,
  ListOrdered
} from 'lucide-react';
import { Exam, ClassGroup, Question, QuestionOption, SystemSettings } from '../../types/cbt';
import { useCbt } from '../../context/CbtContext';
import { MathRenderer } from '../common/MathRenderer';

export interface PrintExamModalProps {
  isOpen: boolean;
  onClose: () => void;
  exam: Exam;
  classes?: ClassGroup[];
}

export const PrintExamModal: React.FC<PrintExamModalProps> = ({
  isOpen,
  onClose,
  exam,
  classes = []
}) => {
  const { systemSettings, addAuditLog } = useCbt();

  // Print Configuration Options
  const [printMode, setPrintMode] = useState<'student' | 'teacher'>('student');
  const [columns, setColumns] = useState<'1' | '2'>('1');
  const [fontSize, setFontSize] = useState<'compact' | 'normal' | 'large'>('normal');
  const [paperSize, setPaperSize] = useState<'A4' | 'F4'>('A4');
  const [optionLayout, setOptionLayout] = useState<'auto' | 'vertical' | 'grid2' | 'horizontal'>('auto');
  const [groupingMode, setGroupingMode] = useState<'sections' | 'original'>('sections');
  
  // Component Toggles
  const [showKop, setShowKop] = useState<boolean>(true);
  const [showIdentityBox, setShowIdentityBox] = useState<boolean>(true);
  const [showInstructions, setShowInstructions] = useState<boolean>(true);
  const [showSignature, setShowSignature] = useState<boolean>(true);
  const [showAnswerSheet, setShowAnswerSheet] = useState<boolean>(false);
  const [showAnswerKeySummary, setShowAnswerKeySummary] = useState<boolean>(true);

  // Copy toast state
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  if (!isOpen || !exam) return null;

  const questions: Question[] = exam.questions || [];

  // Allowed classes formatted text
  const targetClassesNames = classes
    .filter(c => exam.classesAllowed && exam.classesAllowed.includes(c.id))
    .map(c => c.name)
    .join(', ') || 'Semua Kelas MTs';

  // Stats
  const pgList = questions.filter(q => q.type === 'multiple_choice');
  const pgkList = questions.filter(q => q.type === 'multiple_choice_complex');
  const matchingList = questions.filter(q => q.type === 'matching');
  const essayList = questions.filter(q => q.type === 'essay');

  const pgCount = pgList.length;
  const pgkCount = pgkList.length;
  const matchingCount = matchingList.length;
  const essayCount = essayList.length;
  const totalPoints = questions.reduce((sum, q) => sum + (q.points || 0), 0);

  // Grouped questions structure or original list
  type QuestionSection = {
    title: string;
    instruction: string;
    items: { question: Question; originalIndex: number; sectionIndex: number }[];
  };

  const sections: QuestionSection[] = [];
  if (groupingMode === 'sections') {
    if (pgCount > 0) {
      sections.push({
        title: 'BAGIAN I: PILIHAN GANDA TUNGGAL (PG)',
        instruction: 'Pilihlah salah satu jawaban yang paling tepat dengan memberi tanda silang (X) pada huruf A, B, C, atau D.',
        items: pgList.map((q, idx) => ({
          question: q,
          originalIndex: questions.findIndex(orig => orig.id === q.id),
          sectionIndex: idx + 1
        }))
      });
    }
    if (pgkCount > 0) {
      const partNumber = sections.length === 1 ? 'II' : sections.length === 0 ? 'I' : 'II';
      sections.push({
        title: `BAGIAN ${partNumber}: PILIHAN GANDA KOMPLEKS (PG-K)`,
        instruction: 'Pilihlah jawaban-jawaban yang benar dengan memberi tanda centang (✓) pada kotak [   ] yang disediakan (jawaban benar lebih dari satu).',
        items: pgkList.map((q, idx) => ({
          question: q,
          originalIndex: questions.findIndex(orig => orig.id === q.id),
          sectionIndex: idx + 1
        }))
      });
    }
    if (matchingCount > 0) {
      const romanNums = ['I', 'II', 'III', 'IV'];
      const partNumber = romanNums[sections.length] || 'III';
      sections.push({
        title: `BAGIAN ${partNumber}: MENJODOHKAN (MATCHING)`,
        instruction: 'Jodohkanlah pernyataan pada Kolom Premis di sebelah kiri dengan jawaban yang tepat pada Kolom Pilihan di sebelah kanan.',
        items: matchingList.map((q, idx) => ({
          question: q,
          originalIndex: questions.findIndex(orig => orig.id === q.id),
          sectionIndex: idx + 1
        }))
      });
    }
    if (essayCount > 0) {
      const romanNums = ['I', 'II', 'III', 'IV', 'V'];
      const partNumber = romanNums[sections.length] || 'IV';
      sections.push({
        title: `BAGIAN ${partNumber}: ESAI / URAIAN`,
        instruction: 'Jawablah pertanyaan-pertanyaan berikut dengan jelas, sistematis, dan tepat pada ruang jawaban yang telah disediakan.',
        items: essayList.map((q, idx) => ({
          question: q,
          originalIndex: questions.findIndex(orig => orig.id === q.id),
          sectionIndex: idx + 1
        }))
      });
    }
  } else {
    sections.push({
      title: 'DAFTAR BUTIR SOAL UJIAN',
      instruction: 'Kerjakan soal-soal berikut dengan teliti sesuai petunjuk pada masing-masing butir soal.',
      items: questions.map((q, idx) => ({
        question: q,
        originalIndex: idx,
        sectionIndex: idx + 1
      }))
    });
  }

  // Presets
  const applyPreset = (preset: 'standard' | 'compact' | 'teacher_archive' | 'student_ljk') => {
    if (preset === 'standard') {
      setPrintMode('student');
      setColumns('1');
      setFontSize('normal');
      setPaperSize('A4');
      setOptionLayout('auto');
      setGroupingMode('sections');
      setShowKop(true);
      setShowIdentityBox(true);
      setShowInstructions(true);
      setShowSignature(true);
      setShowAnswerSheet(false);
      setShowAnswerKeySummary(false);
    } else if (preset === 'compact') {
      setPrintMode('student');
      setColumns('2');
      setFontSize('compact');
      setPaperSize('F4');
      setOptionLayout('grid2');
      setGroupingMode('sections');
      setShowKop(true);
      setShowIdentityBox(true);
      setShowInstructions(false);
      setShowSignature(true);
      setShowAnswerSheet(false);
      setShowAnswerKeySummary(false);
    } else if (preset === 'teacher_archive') {
      setPrintMode('teacher');
      setColumns('1');
      setFontSize('normal');
      setPaperSize('A4');
      setOptionLayout('auto');
      setGroupingMode('sections');
      setShowKop(true);
      setShowIdentityBox(true);
      setShowInstructions(false);
      setShowSignature(true);
      setShowAnswerSheet(false);
      setShowAnswerKeySummary(true);
    } else if (preset === 'student_ljk') {
      setPrintMode('student');
      setColumns('2');
      setFontSize('compact');
      setPaperSize('A4');
      setOptionLayout('auto');
      setGroupingMode('sections');
      setShowKop(true);
      setShowIdentityBox(true);
      setShowInstructions(true);
      setShowSignature(true);
      setShowAnswerSheet(true);
      setShowAnswerKeySummary(false);
    }
  };

  // Generate Standalone Printable HTML Content
  const getFullHtmlDocument = () => {
    const printElement = document.getElementById('printable-exam-paper');
    if (!printElement) return '';

    const contentHtml = printElement.innerHTML;

    return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Naskah Soal - ${exam.code} - ${exam.title}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css" crossorigin="anonymous">
  <style>
    @page {
      size: ${paperSize === 'F4' ? '215mm 330mm' : 'A4'};
      margin: 12mm 15mm 15mm 15mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: 'Times New Roman', Times, Georgia, serif;
      color: #000;
      background: #fff;
      margin: 0;
      padding: 0;
      font-size: ${fontSize === 'compact' ? '10pt' : fontSize === 'large' ? '12pt' : '11pt'};
      line-height: ${fontSize === 'compact' ? '1.35' : '1.45'};
    }
    .print-control-bar {
      position: sticky;
      top: 0;
      z-index: 9999;
      background: #0f172a;
      color: #fff;
      padding: 12px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
    }
    .print-btn {
      background: #059669;
      color: white;
      border: none;
      padding: 8px 20px;
      border-radius: 8px;
      font-weight: 700;
      cursor: pointer;
      font-size: 14px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.15);
    }
    .print-btn:hover { background: #047857; }
    @media print {
      .print-control-bar { display: none !important; }
      body { padding: 0 !important; background: transparent !important; }
      .break-inside-avoid {
        break-inside: avoid !important;
        page-break-inside: avoid !important;
        -webkit-column-break-inside: avoid !important;
      }
      .break-after-page {
        break-after: page !important;
        page-break-after: always !important;
      }
    }
    .paper-wrapper {
      max-width: 900px;
      margin: 0 auto;
      padding: 20px;
    }
    @media print {
      .paper-wrapper {
        max-width: 100% !important;
        padding: 0 !important;
        margin: 0 !important;
      }
    }
    table { border-collapse: collapse; width: 100%; }
    .break-inside-avoid {
      break-inside: avoid;
      page-break-inside: avoid;
      -webkit-column-break-inside: avoid;
    }
    .break-after-page {
      break-after: page;
      page-break-after: always;
    }
    img { max-width: 100%; height: auto; }
  </style>
</head>
<body>
  <div class="print-control-bar">
    <div>
      <span style="font-weight: 800; font-size: 15px;">Naskah Ujian Madrasah:</span>
      <span style="margin-left: 8px; opacity: 0.9;">${exam.title} (${exam.code})</span>
    </div>
    <button class="print-btn" onclick="window.print()">🖨️ Cetak / Simpan PDF (Ctrl + P)</button>
  </div>
  <div class="paper-wrapper">
    ${contentHtml}
  </div>
</body>
</html>`;
  };

  // Safe Iframe Native Print - Eliminates modal overflow clipping & multi-page truncation
  const handlePrint = () => {
    const html = getFullHtmlDocument();
    if (!html) return;

    addAuditLog(
      'PRINT_EXAM_PDF',
      'exam',
      `Mencetak naskah soal ujian ${exam.code} (${printMode === 'student' ? 'Naskah Siswa' : 'Arsip Guru & Kunci'})`,
      'info'
    );

    // Create a hidden iframe dedicated to printing
    const existingFrame = document.getElementById('exam-print-iframe');
    if (existingFrame) existingFrame.remove();

    const iframe = document.createElement('iframe');
    iframe.id = 'exam-print-iframe';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch {
          // Fallback if iframe print is restricted
          window.print();
        }
      }, 350);
    } else {
      window.print();
    }
  };

  // Open Full-Window Preview in New Tab
  const handleOpenNewTab = () => {
    const html = getFullHtmlDocument();
    if (!html) return;

    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.open();
      newWindow.document.write(html);
      newWindow.document.close();
    }
  };

  // Download Self-Contained Offline HTML Document
  const handleDownloadHtml = () => {
    const html = getFullHtmlDocument();
    if (!html) return;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Naskah-Soal-${exam.code}-${printMode}.html`;
    link.click();
    URL.revokeObjectURL(url);

    addAuditLog(
      'EXPORT_EXAM_HTML',
      'exam',
      `Mengunduh berkas naskah soal HTML mandiri ${exam.code}`,
      'info'
    );
  };

  // Copy Formatted Text / HTML to Clipboard for Microsoft Word
  const handleCopyWord = async () => {
    const printElement = document.getElementById('printable-exam-paper');
    if (!printElement) return;

    try {
      const htmlData = printElement.innerHTML;
      const textData = printElement.innerText;

      if (navigator.clipboard && window.ClipboardItem) {
        const item = new ClipboardItem({
          'text/html': new Blob([htmlData], { type: 'text/html' }),
          'text/plain': new Blob([textData], { type: 'text/plain' })
        });
        await navigator.clipboard.write([item]);
      } else {
        await navigator.clipboard.writeText(textData);
      }

      setCopySuccess('Format naskah disalin! Buka Microsoft Word dan tekan Paste (Ctrl+V).');
      setTimeout(() => setCopySuccess(null), 4000);
    } catch {
      setCopySuccess('Salin otomatis gagal, silakan gunakan fitur Unduh HTML.');
      setTimeout(() => setCopySuccess(null), 3000);
    }
  };

  // Helper: Determine Option Grid Arrangement for a Question
  const getOptionGridClass = (opts: QuestionOption[]) => {
    if (optionLayout === 'vertical') return 'grid-cols-1';
    if (optionLayout === 'grid2') return 'grid-cols-1 sm:grid-cols-2';
    if (optionLayout === 'horizontal') return 'flex flex-wrap items-center gap-x-6 gap-y-1';

    // Auto Mode: if all option texts are short (< 25 chars) and no images, arrange in 2 columns or horizontal
    const hasLongText = opts.some(o => (o.text || '').length > 28);
    const hasImages = opts.some(o => !!o.image);
    if (!hasImages && !hasLongText) {
      const isVeryShort = opts.every(o => (o.text || '').length <= 12);
      if (isVeryShort) {
        return 'flex flex-wrap items-center gap-x-6 gap-y-1';
      }
      return 'grid-cols-1 sm:grid-cols-2';
    }
    return 'grid-cols-1';
  };

  const examDateFormatted = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-100 rounded-2xl max-w-6xl w-full max-h-[96vh] flex flex-col shadow-2xl border border-slate-300 animate-in fade-in zoom-in-95 overflow-hidden">
        
        {/* ========================================================================= */}
        {/* HEADER TOOLBAR */}
        {/* ========================================================================= */}
        <div className="bg-white border-b border-slate-200 p-4 sm:p-5 flex flex-col gap-3.5 shrink-0 no-print">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black shadow-xs shrink-0">
                <Printer className="w-5 h-5" />
              </div>
              <div className="truncate">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-extrabold text-slate-900 truncate">
                    Cetak Naskah Ujian Resmi
                  </h2>
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[11px] font-black rounded-md tracking-wider font-mono shrink-0">
                    {exam.code}
                  </span>
                </div>
                <p className="text-xs text-slate-500 truncate">
                  {exam.title} • {questions.length} Butir Soal • {systemSettings.schoolName || 'Madrasah'}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleCopyWord}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition shadow-2xs"
                title="Salin Naskah untuk Di-paste ke Microsoft Word"
              >
                <Copy className="w-4 h-4 text-slate-600" />
                <span className="hidden md:inline">Salin ke Word</span>
              </button>

              <button
                type="button"
                onClick={handleOpenNewTab}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition shadow-2xs"
                title="Buka Dokumen di Tab Baru"
              >
                <ExternalLink className="w-4 h-4 text-slate-600" />
                <span className="hidden md:inline">Tab Baru</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadHtml}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition shadow-2xs"
                title="Unduh File HTML Mandiri"
              >
                <Download className="w-4 h-4 text-slate-600" />
                <span className="hidden sm:inline">Unduh HTML</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs flex items-center gap-2 cursor-pointer transition shadow-md shadow-emerald-200 active:scale-95"
                title="Cetak Naskah ke Printer Fisik atau Simpan sebagai PDF"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak / PDF</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl cursor-pointer transition ml-1"
                title="Tutup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Quick Preset Buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Preset Cepat:
            </span>
            <button
              type="button"
              onClick={() => applyPreset('standard')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                printMode === 'student' && columns === '1' && !showAnswerSheet
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              📄 Standar Madrasah (1 Kolom)
            </button>
            <button
              type="button"
              onClick={() => applyPreset('compact')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                columns === '2' && !showAnswerSheet
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              📰 Hemat Kertas (2 Kolom)
            </button>
            <button
              type="button"
              onClick={() => applyPreset('teacher_archive')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                printMode === 'teacher'
                  ? 'bg-indigo-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              🔑 Arsip & Kunci Guru Lengkap
            </button>
            <button
              type="button"
              onClick={() => applyPreset('student_ljk')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                showAnswerSheet
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              📝 Ujian + Lembar Jawab (LJK)
            </button>
          </div>

          {/* Configuration Controls Bar */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            {/* Mode Target */}
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-700">Tujuan Naskah:</span>
              <div className="flex items-center bg-white p-0.5 rounded-lg border border-slate-200 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setPrintMode('student')}
                  className={`px-2.5 py-1 rounded-md font-bold text-xs cursor-pointer transition ${
                    printMode === 'student'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Naskah Siswa
                </button>
                <button
                  type="button"
                  onClick={() => setPrintMode('teacher')}
                  className={`px-2.5 py-1 rounded-md font-bold text-xs cursor-pointer transition ${
                    printMode === 'teacher'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Kunci & Arsip Guru
                </button>
              </div>
            </div>

            {/* Dropdown Layouts */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Kolom */}
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-600">Kolom:</span>
                <select
                  value={columns}
                  onChange={(e) => setColumns(e.target.value as '1' | '2')}
                  className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 cursor-pointer"
                >
                  <option value="1">1 Kolom (Standar Rapi)</option>
                  <option value="2">2 Kolom (Hemat Kertas)</option>
                </select>
              </div>

              {/* Ukuran Huruf */}
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-600">Huruf:</span>
                <select
                  value={fontSize}
                  onChange={(e) => setFontSize(e.target.value as any)}
                  className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 cursor-pointer"
                >
                  <option value="compact">Kecil / 10pt (Hemat)</option>
                  <option value="normal">Normal / 11pt (Standar)</option>
                  <option value="large">Besar / 12pt (Nyaman)</option>
                </select>
              </div>

              {/* Susunan Opsi Jawaban */}
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-600">Opsi Jawaban:</span>
                <select
                  value={optionLayout}
                  onChange={(e) => setOptionLayout(e.target.value as any)}
                  className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 cursor-pointer"
                >
                  <option value="auto">Otomatis (Sesuai Panjang Teks)</option>
                  <option value="vertical">1 Kolom Vertikal (A-B-C-D ke Bawah)</option>
                  <option value="grid2">2 Kolom (A & B / C & D)</option>
                  <option value="horizontal">Sebaris (A ... B ... C ... D ...)</option>
                </select>
              </div>

              {/* Format Pengelompokan */}
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-600">Urutan:</span>
                <select
                  value={groupingMode}
                  onChange={(e) => setGroupingMode(e.target.value as any)}
                  className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 cursor-pointer"
                >
                  <option value="sections">Kelompokkan per Bagian (PG, Esai, dll)</option>
                  <option value="original">Urutan Nomor Asli (1 s/d {questions.length})</option>
                </select>
              </div>

              {/* Kertas */}
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-600">Kertas:</span>
                <select
                  value={paperSize}
                  onChange={(e) => setPaperSize(e.target.value as 'A4' | 'F4')}
                  className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 cursor-pointer"
                >
                  <option value="A4">A4 (21 x 29.7 cm)</option>
                  <option value="F4">F4 / Folio (21.5 x 33 cm)</option>
                </select>
              </div>
            </div>

            {/* Checkboxes Component Visibility */}
            <div className="flex flex-wrap items-center gap-3 pt-1 border-t sm:border-t-0 border-slate-200 w-full sm:w-auto">
              <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-slate-700 hover:text-slate-900 select-none">
                <input
                  type="checkbox"
                  checked={showKop}
                  onChange={(e) => setShowKop(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-emerald-600 cursor-pointer"
                />
                <span>Kop Madrasah</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-slate-700 hover:text-slate-900 select-none">
                <input
                  type="checkbox"
                  checked={showIdentityBox}
                  onChange={(e) => setShowIdentityBox(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-emerald-600 cursor-pointer"
                />
                <span>Tabel Identitas</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-slate-700 hover:text-slate-900 select-none">
                <input
                  type="checkbox"
                  checked={showInstructions}
                  onChange={(e) => setShowInstructions(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-emerald-600 cursor-pointer"
                />
                <span>Petunjuk Umum</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-slate-700 hover:text-slate-900 select-none">
                <input
                  type="checkbox"
                  checked={showSignature}
                  onChange={(e) => setShowSignature(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-emerald-600 cursor-pointer"
                />
                <span>Tanda Tangan</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-slate-700 hover:text-slate-900 select-none">
                <input
                  type="checkbox"
                  checked={showAnswerSheet}
                  onChange={(e) => setShowAnswerSheet(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-emerald-600 cursor-pointer"
                />
                <span>+ LJK Fisik</span>
              </label>

              {printMode === 'teacher' && (
                <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-indigo-700 hover:text-indigo-900 select-none">
                  <input
                    type="checkbox"
                    checked={showAnswerKeySummary}
                    onChange={(e) => setShowAnswerKeySummary(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-indigo-600 cursor-pointer"
                  />
                  <span>Tabel Kunci Ringkas</span>
                </label>
              )}
            </div>
          </div>

          {copySuccess && (
            <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 px-3.5 py-1.5 rounded-lg text-xs flex items-center justify-between font-bold animate-in fade-in">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                {copySuccess}
              </span>
              <button onClick={() => setCopySuccess(null)} className="text-emerald-700 hover:text-emerald-900">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* PREVIEW CONTAINER & PRINTABLE PAPER SHEET */}
        {/* ========================================================================= */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 md:p-8 bg-slate-200/90 flex justify-center">
          
          <div
            id="printable-exam-paper"
            className={`bg-white text-black shadow-2xl border border-slate-300 rounded-none w-full max-w-[850px] p-6 sm:p-10 transition-all ${
              fontSize === 'compact' 
                ? 'text-[13px] leading-snug' 
                : fontSize === 'large' 
                  ? 'text-[15.5px] leading-relaxed' 
                  : 'text-[14px] leading-normal'
            }`}
            style={{
              fontFamily: '"Times New Roman", Times, Georgia, serif',
              minHeight: '1050px'
            }}
          >
            {/* ========================================================================= */}
            {/* 1. KOP SURAT MADRASAH RESMI */}
            {/* ========================================================================= */}
            {showKop && (
              <div className="mb-4 pb-2 border-b-2 border-black">
                <div className="flex items-center justify-between gap-3 text-black">
                  {/* Logo Kemenag / Madrasah */}
                  <div className="w-16 h-16 shrink-0 flex items-center justify-center">
                    <svg className="w-14 h-14" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <polygon points="50,5 92,25 92,75 50,95 8,75 8,25" stroke="#000" strokeWidth="2.5" fill="#f8fafc" />
                      <circle cx="50" cy="50" r="28" stroke="#000" strokeWidth="2" fill="#fff" />
                      <path d="M 50 26 L 50 74 M 26 50 L 74 50" stroke="#000" strokeWidth="1.5" />
                      <path d="M 36 62 Q 50 48 64 62" stroke="#000" strokeWidth="2.5" fill="none" />
                      <circle cx="50" cy="40" r="5" fill="#000" />
                      <text x="50" y="85" textAnchor="middle" fontSize="6.5" fontWeight="bold" fill="#000" fontFamily="sans-serif">IKHLAS BERAMAL</text>
                    </svg>
                  </div>

                  {/* Hierarki Kemenag & Nama Lembaga */}
                  <div className="flex-1 text-center">
                    <h4 className="text-[11px] sm:text-xs font-bold tracking-wider uppercase mb-0 text-black">
                      KEMENTERIAN AGAMA REPUBLIK INDONESIA
                    </h4>
                    <h5 className="text-[10px] sm:text-[11px] font-bold tracking-wide uppercase mb-0 text-black">
                      KANTOR KEMENTERIAN AGAMA {systemSettings.city ? `KABUPATEN/KOTA ${systemSettings.city.toUpperCase()}` : 'KABUPATEN/KOTA'}
                    </h5>
                    <h3 className="text-base sm:text-lg font-black tracking-wide uppercase my-0.5 text-black">
                      {systemSettings.schoolName || 'MADRASAH TSANAWIYAH DARUL HUDA'}
                    </h3>
                    <p className="text-[10px] sm:text-[11px] font-normal leading-tight text-black">
                      {systemSettings.address || 'Jl. KH. Hasyim Asy\'ari No. 12'}, Kec. {systemSettings.subdistrict || 'Megaluh'}, {systemSettings.city || 'Jombang'}, Prov. {systemSettings.province || 'Jawa Timur'}
                    </p>
                    <p className="text-[10px] font-semibold mt-0.5 text-black">
                      NSM: {systemSettings.nsm || '121235170001'} &bull; NPSN: {systemSettings.npsn || '20277812'}
                    </p>
                  </div>

                  {/* Logo / Badge Kanan */}
                  <div className="w-16 h-16 shrink-0 hidden sm:flex flex-col items-center justify-center border border-black p-1 text-[9px] font-bold text-center leading-tight">
                    <span>ASESMEN</span>
                    <span className="text-xs font-black">MADRASAH</span>
                    <span>{exam.academicYear.split('/')[0]}</span>
                  </div>
                </div>

                {/* Garis Ganda Resmi Naskah Dinas: Garis Tebal 2.5px + Spasi + Garis Tipis 0.8px */}
                <div className="w-full border-t border-black mt-2 pt-0.5"></div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* 2. JUDUL NASKAH UJIAN */}
            {/* ========================================================================= */}
            <div className="text-center mb-3">
              <h2 className="text-sm sm:text-base font-black uppercase tracking-wider underline">
                {exam.title.toUpperCase()}
              </h2>
              <div className="text-xs font-bold uppercase mt-0.5 text-black">
                TAHUN AJARAN {exam.academicYear} &bull; SEMESTER {exam.semester.toUpperCase()}
              </div>
              {printMode === 'teacher' && (
                <div className="inline-block mt-1 px-3 py-0.5 bg-black text-white text-[10px] font-black uppercase tracking-widest rounded">
                  *** DOKUMEN RESMI: ARSIP GURU &amp; KUNCI JAWABAN LENGKAP ***
                </div>
              )}
            </div>

            {/* ========================================================================= */}
            {/* 3. TABEL IDENTITAS MATA PELAJARAN & SISWA (FORMAT RESMI 4 SEL) */}
            {/* ========================================================================= */}
            {showIdentityBox && (
              <div className="border border-black mb-3 text-xs">
                <table className="w-full border-collapse">
                  <tbody>
                    <tr className="border-b border-black">
                      <td className="w-28 font-bold p-1.5 border-r border-black bg-slate-50/50">Mata Pelajaran</td>
                      <td className="w-3 text-center border-r-0 font-bold">:</td>
                      <td className="p-1.5 font-bold uppercase border-r border-black">{exam.subject}</td>
                      
                      <td className="w-28 font-bold p-1.5 border-r border-black bg-slate-50/50">Hari / Tanggal</td>
                      <td className="w-3 text-center border-r-0 font-bold">:</td>
                      <td className="p-1.5">{examDateFormatted}</td>
                    </tr>
                    <tr className="border-b border-black">
                      <td className="font-bold p-1.5 border-r border-black bg-slate-50/50">Kelas / Sasaran</td>
                      <td className="text-center border-r-0 font-bold">:</td>
                      <td className="p-1.5 border-r border-black">{targetClassesNames}</td>
                      
                      <td className="font-bold p-1.5 border-r border-black bg-slate-50/50">Alokasi Waktu</td>
                      <td className="text-center border-r-0 font-bold">:</td>
                      <td className="p-1.5">{exam.durationMinutes} Menit</td>
                    </tr>
                    <tr>
                      <td className="font-bold p-1.5 border-r border-black bg-slate-50/50">Kode Paket Soal</td>
                      <td className="text-center border-r-0 font-bold">:</td>
                      <td className="p-1.5 font-mono font-bold border-r border-black">{exam.code}</td>
                      
                      <td className="font-bold p-1.5 border-r border-black bg-slate-50/50">Nama &amp; No. Siswa</td>
                      <td className="text-center border-r-0 font-bold">:</td>
                      <td className="p-1.5 text-slate-700 italic">...................................................</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* ========================================================================= */}
            {/* 4. PETUNJUK UMUM PENGERJAAN */}
            {/* ========================================================================= */}
            {showInstructions && (
              <div className="border border-black p-2.5 mb-4 text-[10.5px] sm:text-[11px] leading-relaxed bg-slate-50/40 break-inside-avoid">
                <span className="font-bold underline block mb-1">PETUNJUK UMUM PENGERJAAN:</span>
                <ol className="list-decimal pl-4 space-y-0.5">
                  <li>Awali pengerjaan naskah soal dengan membaca <em>Basmalah</em> dan berdoa.</li>
                  <li>Tuliskan nama lengkap, nomor peserta, dan kelas pada lembar jawaban yang telah disediakan.</li>
                  <li>Periksa dan bacalah setiap butir soal dengan saksama sebelum Anda menjawabnya.</li>
                  <li>Laporkan kepada pengawas ujian apabila terdapat lembar soal yang kurang jelas, rusak, atau tidak lengkap.</li>
                  <li>Dahulukan menjawab soal-soal yang Anda anggap mudah sebelum menjawab soal yang lebih sulit.</li>
                  <li>Periksalah kembali seluruh lembar jawaban Anda sebelum diserahkan kepada pengawas ujian.</li>
                </ol>
              </div>
            )}

            {/* ========================================================================= */}
            {/* 5. BUTIR-BUTIR SOAL UJIAN (1 KOLOM ATAU 2 KOLOM) */}
            {/* ========================================================================= */}
            <div className={columns === '2' ? 'columns-1 sm:columns-2 gap-7' : 'space-y-4'}>
              {sections.map((section, sIdx) => (
                <div key={sIdx} className="break-inside-avoid mb-4">
                  
                  {/* Section Title & Instruction */}
                  {groupingMode === 'sections' && (
                    <div className="break-inside-avoid mb-3 pb-1 border-b border-black text-black">
                      <h4 className="font-bold text-xs sm:text-sm uppercase tracking-wide">
                        {section.title}
                      </h4>
                      <p className="text-[10px] sm:text-[10.5px] italic text-slate-800 mt-0.5 leading-snug">
                        {section.instruction}
                      </p>
                    </div>
                  )}

                  {/* Section Questions */}
                  <div className="space-y-3.5">
                    {section.items.map(({ question: q, originalIndex, sectionIndex }) => {
                      const displayNum = groupingMode === 'sections' ? sectionIndex : originalIndex + 1;

                      return (
                        <div
                          key={q.id}
                          className="break-inside-avoid pb-3 border-b border-slate-200 text-black leading-relaxed"
                          style={{ pageBreakInside: 'avoid' }}
                        >
                          {/* Number & Question Text with Hanging Indent */}
                          <div className="flex items-start">
                            <span className="w-7 shrink-0 text-right pr-2 font-bold select-none text-xs sm:text-sm">
                              {displayNum}.
                            </span>
                            <div className="flex-1 min-w-0">
                              {/* Points badge in Teacher mode */}
                              {printMode === 'teacher' && (
                                <div className="flex items-center justify-between text-[10px] font-bold text-slate-600 mb-0.5">
                                  <span>[Jenis: {q.type}]</span>
                                  <span className="bg-slate-100 px-1.5 py-0.2 rounded border border-slate-300">
                                    Bobot: {q.points || 10} Poin
                                  </span>
                                </div>
                              )}

                              {/* Question Narrative / Equation */}
                              <div className="font-normal text-justify text-black">
                                <MathRenderer text={q.text} />
                              </div>

                              {/* Question Image (If any) */}
                              {q.image && (
                                <div className="my-2 p-1 border border-black/40 rounded bg-white inline-block max-w-full">
                                  <img
                                    src={q.image}
                                    alt={`Gambar Soal #${displayNum}`}
                                    className="max-h-44 w-auto object-contain mx-auto"
                                  />
                                  <span className="text-[9px] text-center block text-slate-600 mt-0.5 italic">
                                    (Gambar Soal #{displayNum})
                                  </span>
                                </div>
                              )}

                              {/* ========================================================= */}
                              {/* OPSI TIPE 1: PILIHAN GANDA */}
                              {/* ========================================================= */}
                              {q.type === 'multiple_choice' && (
                                <div className={`mt-2 ${getOptionGridClass(q.options)} gap-x-4 gap-y-1`}>
                                  {q.options.map((opt, optIdx) => {
                                    const letter = String.fromCharCode(65 + optIdx);
                                    const isCorrect = q.correctOptionId === opt.id;
                                    return (
                                      <div
                                        key={opt.id}
                                        className={`flex items-start gap-1.5 py-0.5 ${
                                          printMode === 'teacher' && isCorrect
                                            ? 'font-bold text-emerald-900 bg-emerald-50/80 px-1 rounded'
                                            : ''
                                        }`}
                                      >
                                        <span className="font-bold shrink-0">{letter}.</span>
                                        <div className="flex-1">
                                          <span><MathRenderer text={opt.text} inline /></span>
                                          {opt.image && (
                                            <div className="my-1">
                                              <img src={opt.image} alt={`Opsi ${letter}`} className="max-h-20 object-contain border" />
                                            </div>
                                          )}
                                          {printMode === 'teacher' && isCorrect && (
                                            <span className="ml-1 text-[9.5px] uppercase font-bold text-emerald-800">
                                              (✓ Kunci Benar)
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              {/* ========================================================= */}
                              {/* OPSI TIPE 2: PILIHAN GANDA KOMPLEKS */}
                              {/* ========================================================= */}
                              {q.type === 'multiple_choice_complex' && (
                                <div className={`mt-2 ${getOptionGridClass(q.options)} gap-x-4 gap-y-1`}>
                                  {q.options.map((opt, optIdx) => {
                                    const letter = String.fromCharCode(65 + optIdx);
                                    const isCorrect = (q.correctOptionIds || []).includes(opt.id);
                                    return (
                                      <div
                                        key={opt.id}
                                        className={`flex items-start gap-1.5 py-0.5 ${
                                          printMode === 'teacher' && isCorrect
                                            ? 'font-bold text-teal-900 bg-teal-50 px-1 rounded'
                                            : ''
                                        }`}
                                      >
                                        <span className="font-mono text-xs shrink-0">
                                          {printMode === 'teacher' && isCorrect ? '[ ✓ ]' : '[ &nbsp; ]'}
                                        </span>
                                        <span className="font-bold shrink-0">{letter}.</span>
                                        <div className="flex-1">
                                          <span><MathRenderer text={opt.text} inline /></span>
                                          {printMode === 'teacher' && isCorrect && (
                                            <span className="ml-1 text-[9.5px] uppercase font-bold text-teal-800">
                                              (✓ Kunci Benar)
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              {/* ========================================================= */}
                              {/* OPSI TIPE 3: MENJODOHKAN (MATCHING) */}
                              {/* ========================================================= */}
                              {q.type === 'matching' && (
                                <div className="mt-2 overflow-x-auto">
                                  <table className="w-full text-[11px] border-collapse border border-black my-1">
                                    <thead>
                                      <tr className="bg-slate-100/70 font-bold">
                                        <th className="border border-black p-1 text-center w-7">No</th>
                                        <th className="border border-black p-1 text-left">Kolom Pernyataan / Premis (Kiri)</th>
                                        <th className="border border-black p-1 text-center w-12">Jawaban</th>
                                        <th className="border border-black p-1 text-left">Pilihan Jawaban (Kanan)</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {(q.matchingPairs || []).map((pair, pIdx) => {
                                        const pairLetter = String.fromCharCode(65 + pIdx);
                                        return (
                                          <tr key={pair.id || pIdx}>
                                            <td className="border border-black p-1 text-center font-bold">{pIdx + 1}</td>
                                            <td className="border border-black p-1">{pair.leftPrompt}</td>
                                            <td className="border border-black p-1 text-center font-bold">
                                              {printMode === 'teacher' ? (
                                                <span className="underline font-black text-indigo-900">[{pairLetter}]</span>
                                              ) : (
                                                <span className="text-slate-600">( ... )</span>
                                              )}
                                            </td>
                                            <td className="border border-black p-1">
                                              <span className="font-bold mr-1">{pairLetter}.</span>
                                              <span>{pair.rightAnswer}</span>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              )}

                              {/* ========================================================= */}
                              {/* OPSI TIPE 4: ESAI / URAIAN */}
                              {/* ========================================================= */}
                              {q.type === 'essay' && (
                                <div className="mt-2">
                                  {printMode === 'student' ? (
                                    /* Ruang Garis Jawaban Tulis Tangan Siswa */
                                    <div className="pt-1.5 space-y-2">
                                      <span className="text-[9.5px] font-bold text-slate-500 uppercase block">
                                        Ruang Jawaban:
                                      </span>
                                      <div className="border-b border-dashed border-black/50 h-5"></div>
                                      <div className="border-b border-dashed border-black/50 h-5"></div>
                                      <div className="border-b border-dashed border-black/50 h-5"></div>
                                      <div className="border-b border-dashed border-black/50 h-5"></div>
                                    </div>
                                  ) : (
                                    /* Kunci & Rubrik Esai untuk Guru */
                                    <div className="p-2 border border-black/40 rounded bg-slate-50 text-xs space-y-1">
                                      <span className="font-bold underline block text-indigo-950">
                                        Kunci &amp; Rubrik Pedoman Penskoran:
                                      </span>
                                      <p className="italic text-slate-900">{q.sampleAnswer || '(Kunci referensi belum diisi guru)'}</p>
                                      {q.keywords && q.keywords.length > 0 && (
                                        <div className="pt-1 text-[10px]">
                                          <span className="font-bold">Kata Kunci Penilaian: </span>
                                          <span className="font-mono">{q.keywords.join(', ')}</span>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}

                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* ========================================================================= */}
            {/* 6. TABEL KUNCI JAWABAN RINGKAS (KHUSUS MODE GURU) */}
            {/* ========================================================================= */}
            {printMode === 'teacher' && showAnswerKeySummary && (
              <div className="break-inside-avoid mt-6 pt-3 border-t-2 border-black text-xs">
                <h4 className="font-black uppercase tracking-wider mb-2 text-center text-xs">
                  TABEL REKAPITULASI KUNCI JAWABAN SINGKAT (ARSIP GURU)
                </h4>
                <div className="border border-black overflow-x-auto">
                  <table className="w-full text-center text-[11px] border-collapse">
                    <tbody>
                      <tr className="bg-slate-100 font-bold border-b border-black">
                        {questions.slice(0, Math.min(25, questions.length)).map((_, i) => (
                          <th key={i} className="border-r border-black p-1 w-8">{i + 1}</th>
                        ))}
                      </tr>
                      <tr className="font-bold">
                        {questions.slice(0, Math.min(25, questions.length)).map((q, i) => {
                          let keyText = '-';
                          if (q.type === 'multiple_choice') {
                            const optIdx = q.options.findIndex(o => o.id === q.correctOptionId);
                            keyText = optIdx >= 0 ? String.fromCharCode(65 + optIdx) : '-';
                          } else if (q.type === 'multiple_choice_complex') {
                            keyText = (q.correctOptionIds || []).map(id => {
                              const oIdx = q.options.findIndex(o => o.id === id);
                              return oIdx >= 0 ? String.fromCharCode(65 + oIdx) : '';
                            }).filter(Boolean).join(',');
                          } else if (q.type === 'matching') {
                            keyText = 'Jodoh';
                          } else if (q.type === 'essay') {
                            keyText = 'Uraian';
                          }
                          return (
                            <td key={i} className="border-r border-black p-1 text-emerald-900 bg-emerald-50/40">
                              {keyText}
                            </td>
                          );
                        })}
                      </tr>

                      {/* Row 2 if questions > 25 */}
                      {questions.length > 25 && (
                        <>
                          <tr className="bg-slate-100 font-bold border-t border-b border-black">
                            {questions.slice(25, Math.min(50, questions.length)).map((_, i) => (
                              <th key={i + 25} className="border-r border-black p-1 w-8">{i + 26}</th>
                            ))}
                          </tr>
                          <tr className="font-bold">
                            {questions.slice(25, Math.min(50, questions.length)).map((q, i) => {
                              let keyText = '-';
                              if (q.type === 'multiple_choice') {
                                const optIdx = q.options.findIndex(o => o.id === q.correctOptionId);
                                keyText = optIdx >= 0 ? String.fromCharCode(65 + optIdx) : '-';
                              } else if (q.type === 'multiple_choice_complex') {
                                keyText = (q.correctOptionIds || []).map(id => {
                                  const oIdx = q.options.findIndex(o => o.id === id);
                                  return oIdx >= 0 ? String.fromCharCode(65 + oIdx) : '';
                                }).filter(Boolean).join(',');
                              } else if (q.type === 'matching') {
                                keyText = 'Jodoh';
                              } else if (q.type === 'essay') {
                                keyText = 'Uraian';
                              }
                              return (
                                <td key={i + 25} className="border-r border-black p-1 text-emerald-900 bg-emerald-50/40">
                                  {keyText}
                                </td>
                              );
                            })}
                          </tr>
                        </>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* 7. TANDA TANGAN PENGESAHAN KEPALA MADRASAH & GURU */}
            {/* ========================================================================= */}
            {showSignature && (
              <div className="break-inside-avoid mt-8 pt-4 border-t border-black text-xs">
                <div className="flex justify-between items-start text-center">
                  {/* Kolom Kiri: Kepala Madrasah */}
                  <div className="w-60">
                    <p className="mb-0.5">Mengetahui,</p>
                    <p className="font-bold mb-16">Kepala Madrasah,</p>
                    <p className="font-bold underline uppercase">
                      {systemSettings.headmasterName || '...................................................'}
                    </p>
                    <p className="text-[10px]">
                      NIP. {systemSettings.headmasterNip || '...........................................'}
                    </p>
                  </div>

                  {/* Kolom Kanan: Guru Pengampu */}
                  <div className="w-60">
                    <p className="mb-0.5">
                      {systemSettings.city || 'Kabupaten'}, {examDateFormatted}
                    </p>
                    <p className="font-bold mb-16">Guru Pengampu Mata Pelajaran,</p>
                    <p className="font-bold underline uppercase">
                      {exam.authorName || '...................................................'}
                    </p>
                    <p className="text-[10px]">NIP. ...........................................</p>
                  </div>
                </div>

                <div className="mt-4 pt-2 border-t border-slate-300 flex justify-between text-[9px] text-slate-500 italic">
                  <span>Dicetak melalui Sistem CBT MTs Terpadu &bull; Paket: <strong>{exam.code}</strong></span>
                  <span>Token Ujian: <strong>{exam.token}</strong> &bull; Halaman Resmi Madrasah</span>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* 8. OPTIONAL: LEMBAR JAWABAN FISIK (LJK KOMPUTER / KERTAS LEMBAR JAWAB) */}
            {/* ========================================================================= */}
            {showAnswerSheet && (
              <div className="break-after-page mt-12 pt-8 border-t-4 border-dashed border-black">
                {/* LJK Kop */}
                <div className="text-center mb-3">
                  <h3 className="text-sm font-black uppercase tracking-wider underline">
                    LEMBAR JAWABAN UJIAN (LJK FISIK)
                  </h3>
                  <p className="text-xs font-bold uppercase mt-0.5">
                    {systemSettings.schoolName || 'MADRASAH TSANAWIYAH'} &bull; {exam.title} ({exam.code})
                  </p>
                </div>

                {/* Kotak Identitas Siswa LJK */}
                <div className="border border-black p-2.5 mb-3 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="font-bold">Nama Lengkap:</span> ....................................................
                  </div>
                  <div>
                    <span className="font-bold">Nomor Peserta:</span> ....................................................
                  </div>
                  <div>
                    <span className="font-bold">Kelas / Ruang:</span> ....................................................
                  </div>
                  <div>
                    <span className="font-bold">Nilai Akhir:</span> [&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;]
                  </div>
                </div>

                <p className="text-[9.5px] italic mb-2 text-slate-700">
                  * Berilah tanda silang (X) atau hitamkan bulatan pada huruf pilihan jawaban A, B, C, atau D yang Anda anggap paling benar.
                </p>

                {/* Grid Lembar Jawaban 20 Butir per Kolom */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 border border-black p-2.5 text-xs mb-3">
                  {questions.filter(q => q.type === 'multiple_choice' || q.type === 'multiple_choice_complex').map((q, idx) => (
                    <div key={q.id} className="flex items-center gap-1.5 py-0.5">
                      <span className="w-5 font-bold text-right text-[11px]">{idx + 1}.</span>
                      <div className="flex items-center gap-1 font-mono font-bold text-[10.5px]">
                        <span className="border border-black rounded-full px-1 py-0.2">(A)</span>
                        <span className="border border-black rounded-full px-1 py-0.2">(B)</span>
                        <span className="border border-black rounded-full px-1 py-0.2">(C)</span>
                        <span className="border border-black rounded-full px-1 py-0.2">(D)</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Area Jawaban Esai */}
                {essayCount > 0 && (
                  <div className="border border-black p-2.5 text-xs space-y-2.5">
                    <span className="font-bold block uppercase underline text-[11px]">
                      LEMBAR JAWABAN KHUSUS ESAI / URAIAN:
                    </span>
                    <div className="border-b border-dotted border-black h-5"></div>
                    <div className="border-b border-dotted border-black h-5"></div>
                    <div className="border-b border-dotted border-black h-5"></div>
                    <div className="border-b border-dotted border-black h-5"></div>
                    <div className="border-b border-dotted border-black h-5"></div>
                  </div>
                )}
              </div>
            )}

          </div>

        </div>

        {/* ========================================================================= */}
        {/* MODAL FOOTER */}
        {/* ========================================================================= */}
        <div className="p-3.5 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 no-print">
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>
              Total: <strong>{questions.length} Soal</strong> ({pgCount} PG, {pgkCount} PG-K, {matchingCount} Jodoh, {essayCount} Esai) &bull; Mode: <strong>{printMode === 'student' ? 'Naskah Siswa' : 'Arsip Guru & Kunci'}</strong> &bull; Tata Letak: <strong>{columns} Kolom</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer transition"
            >
              Tutup
            </button>

            <button
              type="button"
              onClick={handleCopyWord}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition shadow-2xs"
            >
              <Copy className="w-4 h-4 text-slate-600" />
              <span>Salin ke Word</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs flex items-center gap-2 cursor-pointer transition shadow-md shadow-emerald-200 active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / Simpan PDF (Print)</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
