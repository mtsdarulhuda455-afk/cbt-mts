import React, { useState } from 'react';
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
  ListOrdered,
  FileDown
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
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [pdfProgressText, setPdfProgressText] = useState<string>('Download PDF');

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

  const examDateFormatted = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  // Decide how options are structured
  const shouldRenderOptionGrid = (opts: QuestionOption[]) => {
    if (optionLayout === 'vertical') return false;
    if (optionLayout === 'grid2') return true;
    if (optionLayout === 'horizontal') return false;
    // auto
    const hasLongText = opts.some(o => (o.text || '').length > 28);
    const hasImages = opts.some(o => !!o.image);
    return !hasImages && !hasLongText;
  };

  const shouldRenderOptionHorizontal = (opts: QuestionOption[]) => {
    if (optionLayout === 'horizontal') return true;
    if (optionLayout === 'auto') {
      const hasImages = opts.some(o => !!o.image);
      const isVeryShort = opts.every(o => (o.text || '').length <= 12);
      return !hasImages && isVeryShort;
    }
    return false;
  };

  // Generate Standalone Printable HTML Content with FULL embedded CSS (no external dependencies needed)
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
      -webkit-font-smoothing: antialiased;
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
    
    .paper-wrapper {
      max-width: 900px;
      margin: 0 auto;
      padding: 20px;
      background: #fff;
    }

    /* Print media overrides */
    @media print {
      .print-control-bar { display: none !important; }
      body { padding: 0 !important; background: transparent !important; }
      .paper-wrapper {
        max-width: 100% !important;
        padding: 0 !important;
        margin: 0 !important;
      }
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

    /* Structural exam styles */
    table {
      border-collapse: collapse;
      width: 100%;
    }
    .break-inside-avoid {
      break-inside: avoid;
      page-break-inside: avoid;
      -webkit-column-break-inside: avoid;
    }
    .break-after-page {
      break-after: page;
      page-break-after: always;
    }
    img {
      max-width: 100%;
      height: auto;
    }

    /* Two-column newspaper style */
    .exam-columns-2 {
      column-count: 2;
      column-gap: 28px;
      column-rule: 1px solid #d1d5db;
    }
    .exam-columns-1 {
      column-count: 1;
    }

    /* Utility classes mappings for print standalone */
    .flex { display: flex; }
    .items-center { align-items: center; }
    .items-start { align-items: flex-start; }
    .justify-between { justify-content: space-between; }
    .justify-center { justify-content: center; }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .text-justify { text-align: justify; }
    .font-bold { font-weight: bold; }
    .font-black { font-weight: 900; }
    .uppercase { text-transform: uppercase; }
    .underline { text-decoration: underline; }
    .italic { font-style: italic; }
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
      }, 400);
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

  // Direct Multi-Page PDF Download using jsPDF and html2canvas
  const handleDownloadPdf = async () => {
    const printElement = document.getElementById('printable-exam-paper');
    if (!printElement) {
      alert('Elemen naskah soal tidak ditemukan.');
      return;
    }

    setIsGeneratingPdf(true);
    setPdfProgressText('Menyiapkan...');

    try {
      const { jsPDF } = await import('jspdf');
      const html2canvasModule = await import('html2canvas');
      const html2canvas = html2canvasModule.default || html2canvasModule;

      setPdfProgressText('Merender...');

      // Render high-res canvas (scale 2 for crisp vector/equation rendering)
      const canvas = await html2canvas(printElement, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 850
      });

      setPdfProgressText('Menyusun PDF...');

      const pageWidthMm = paperSize === 'F4' ? 215 : 210;
      const pageHeightMm = paperSize === 'F4' ? 330 : 297;

      // Calculate how many pixels of canvas equal 1 PDF page
      const pageHeightPx = Math.floor((canvas.width * pageHeightMm) / pageWidthMm);
      const totalPages = Math.ceil(canvas.height / pageHeightPx);

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: paperSize === 'F4' ? [215, 330] : 'a4'
      });

      for (let i = 0; i < totalPages; i++) {
        setPdfProgressText(`Hal ${i + 1}/${totalPages}...`);

        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvas.width;
        const currentSliceHeight = Math.min(pageHeightPx, canvas.height - i * pageHeightPx);
        pageCanvas.height = currentSliceHeight;

        const ctx = pageCanvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
          ctx.drawImage(
            canvas,
            0, i * pageHeightPx, canvas.width, currentSliceHeight,
            0, 0, pageCanvas.width, currentSliceHeight
          );
        }

        const pageImgData = pageCanvas.toDataURL('image/jpeg', 0.95);
        if (i > 0) {
          pdf.addPage();
        }

        const sliceHeightMm = (currentSliceHeight * pageWidthMm) / canvas.width;
        pdf.addImage(pageImgData, 'JPEG', 0, 0, pageWidthMm, sliceHeightMm);
      }

      setPdfProgressText('Menyimpan...');
      const fileName = `Naskah-Soal-${exam.code}-${printMode}.pdf`;
      pdf.save(fileName);

      addAuditLog(
        'DOWNLOAD_EXAM_PDF',
        'exam',
        `Berhasil mengunduh berkas naskah soal PDF: ${fileName} (${totalPages} halaman)`,
        'info'
      );

      setCopySuccess(`Berkas PDF ${fileName} (${totalPages} Halaman) berhasil diunduh ke komputer Anda!`);
      setTimeout(() => setCopySuccess(null), 5000);
    } catch (err: any) {
      console.warn('Gagal membuat PDF via canvas, mengalihkan ke dialog cetak browser:', err);
      alert('Pemberitahuan: Pembuatan berkas PDF dialihkan ke dialog cetak browser (Pilih "Save as PDF" / "Simpan sebagai PDF").');
      handlePrint();
    } finally {
      setIsGeneratingPdf(false);
      setPdfProgressText('Download PDF');
    }
  };
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
                disabled={isGeneratingPdf}
                onClick={handleDownloadPdf}
                className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition shadow-xs disabled:opacity-50"
                title="Unduh Naskah Soal langsung ke format file .PDF"
              >
                {isGeneratingPdf ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <FileDown className="w-4 h-4" />
                )}
                <span>{isGeneratingPdf ? (pdfProgressText || 'Membuat PDF...') : 'Download PDF'}</span>
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
            className="bg-white text-black shadow-2xl rounded-none w-full max-w-[850px] p-6 sm:p-10 transition-all"
            style={{
              fontFamily: '"Times New Roman", Times, Georgia, serif',
              fontSize: fontSize === 'compact' ? '10pt' : fontSize === 'large' ? '12pt' : '11pt',
              lineHeight: fontSize === 'compact' ? '1.35' : '1.45',
              color: '#000',
              minHeight: '1050px'
            }}
          >
            {/* ========================================================================= */}
            {/* 1. KOP SURAT MADRASAH RESMI (TABEL 3 SEL DENGAN GARIS GANDA RESMI) */}
            {/* ========================================================================= */}
            {showKop && (
              <div style={{ marginBottom: '14px', pageBreakInside: 'avoid' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', border: 'none' }}>
                  <tbody>
                    <tr>
                      {/* Logo Kemenag / Madrasah */}
                      <td style={{ width: '70px', verticalAlign: 'middle', textAlign: 'center', border: 'none', padding: '0 8px 0 0' }}>
                        <svg style={{ width: '60px', height: '60px', display: 'block', margin: '0 auto' }} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <polygon points="50,5 92,25 92,75 50,95 8,75 8,25" stroke="#000" strokeWidth="2.5" fill="#f8fafc" />
                          <circle cx="50" cy="50" r="28" stroke="#000" strokeWidth="2" fill="#fff" />
                          <path d="M 50 26 L 50 74 M 26 50 L 74 50" stroke="#000" strokeWidth="1.5" />
                          <path d="M 36 62 Q 50 48 64 62" stroke="#000" strokeWidth="2.5" fill="none" />
                          <circle cx="50" cy="40" r="5" fill="#000" />
                          <text x="50" y="85" textAnchor="middle" fontSize="6.5" fontWeight="bold" fill="#000" fontFamily="sans-serif">IKHLAS BERAMAL</text>
                        </svg>
                      </td>

                      {/* Teks Lembaga & Kementerian */}
                      <td style={{ verticalAlign: 'middle', textAlign: 'center', border: 'none', padding: '0 6px' }}>
                        <div style={{ fontSize: '10pt', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0, color: '#000' }}>
                          KEMENTERIAN AGAMA REPUBLIK INDONESIA
                        </div>
                        <div style={{ fontSize: '9.5pt', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.3px', margin: 0, color: '#000' }}>
                          KANTOR KEMENTERIAN AGAMA {systemSettings.city ? `KABUPATEN/KOTA ${systemSettings.city.toUpperCase()}` : 'KABUPATEN/KOTA'}
                        </div>
                        <div style={{ fontSize: '13pt', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '2px 0', color: '#000' }}>
                          {systemSettings.schoolName || 'MADRASAH TSANAWIYAH DARUL HUDA'}
                        </div>
                        <div style={{ fontSize: '9pt', fontWeight: 'normal', lineHeight: '1.25', margin: 0, color: '#000' }}>
                          {systemSettings.address || 'Jl. KH. Hasyim Asy\'ari No. 12'}, Kec. {systemSettings.subdistrict || 'Megaluh'}, {systemSettings.city || 'Jombang'}, Prov. {systemSettings.province || 'Jawa Timur'}
                        </div>
                        <div style={{ fontSize: '9pt', fontWeight: 'bold', marginTop: '1px', color: '#000' }}>
                          NSM: {systemSettings.nsm || '121235170001'} &bull; NPSN: {systemSettings.npsn || '20277812'}
                        </div>
                      </td>

                      {/* Badge Kanan */}
                      <td style={{ width: '70px', verticalAlign: 'middle', textAlign: 'center', border: 'none', padding: '0 0 0 8px' }}>
                        <div style={{ border: '1.5px solid #000', padding: '4px', fontSize: '8pt', fontWeight: 'bold', textAlign: 'center', lineHeight: '1.2' }}>
                          <div>ASESMEN</div>
                          <div style={{ fontSize: '10pt', fontWeight: '900' }}>CBT</div>
                          <div>{exam.academicYear.split('/')[0]}</div>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Garis Ganda Resmi Naskah Dinas: Garis Tebal 2.5px + Garis Tipis 0.8px */}
                <div style={{ borderTop: '2.5px solid #000', borderBottom: '0.8px solid #000', height: '2.5px', marginTop: '6px' }}></div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* 2. JUDUL NASKAH UJIAN */}
            {/* ========================================================================= */}
            <div style={{ textAlign: 'center', marginBottom: '12px', pageBreakInside: 'avoid' }}>
              <div style={{ fontSize: '12pt', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.5px', textDecoration: 'underline' }}>
                {exam.title.toUpperCase()}
              </div>
              <div style={{ fontSize: '10pt', fontWeight: 'bold', textTransform: 'uppercase', marginTop: '2px' }}>
                TAHUN AJARAN {exam.academicYear} &bull; SEMESTER {exam.semester.toUpperCase()}
              </div>
              {printMode === 'teacher' && (
                <div style={{ display: 'inline-block', marginTop: '4px', padding: '2px 10px', backgroundColor: '#000', color: '#fff', fontSize: '9pt', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', borderRadius: '3px' }}>
                  *** DOKUMEN RESMI: ARSIP GURU &amp; KUNCI JAWABAN LENGKAP ***
                </div>
              )}
            </div>

            {/* ========================================================================= */}
            {/* 3. TABEL IDENTITAS MATA PELAJARAN & SISWA (STANDAR TABEL RESMI) */}
            {/* ========================================================================= */}
            {showIdentityBox && (
              <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', marginBottom: '12px', fontSize: '10pt', pageBreakInside: 'avoid' }}>
                <tbody>
                  <tr>
                    <td style={{ width: '115px', fontWeight: 'bold', backgroundColor: '#f8fafc', border: '1px solid #000', padding: '4px 6px' }}>Mata Pelajaran</td>
                    <td style={{ width: '10px', textAlign: 'center', border: '1px solid #000', fontWeight: 'bold' }}>:</td>
                    <td style={{ border: '1px solid #000', padding: '4px 6px', fontWeight: 'bold', textTransform: 'uppercase' }}>{exam.subject}</td>
                    
                    <td style={{ width: '115px', fontWeight: 'bold', backgroundColor: '#f8fafc', border: '1px solid #000', padding: '4px 6px' }}>Hari / Tanggal</td>
                    <td style={{ width: '10px', textAlign: 'center', border: '1px solid #000', fontWeight: 'bold' }}>:</td>
                    <td style={{ border: '1px solid #000', padding: '4px 6px' }}>{examDateFormatted}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 'bold', backgroundColor: '#f8fafc', border: '1px solid #000', padding: '4px 6px' }}>Kelas / Sasaran</td>
                    <td style={{ textAlign: 'center', border: '1px solid #000', fontWeight: 'bold' }}>:</td>
                    <td style={{ border: '1px solid #000', padding: '4px 6px' }}>{targetClassesNames}</td>
                    
                    <td style={{ fontWeight: 'bold', backgroundColor: '#f8fafc', border: '1px solid #000', padding: '4px 6px' }}>Alokasi Waktu</td>
                    <td style={{ textAlign: 'center', border: '1px solid #000', fontWeight: 'bold' }}>:</td>
                    <td style={{ border: '1px solid #000', padding: '4px 6px' }}>{exam.durationMinutes} Menit</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 'bold', backgroundColor: '#f8fafc', border: '1px solid #000', padding: '4px 6px' }}>Kode Paket Soal</td>
                    <td style={{ textAlign: 'center', border: '1px solid #000', fontWeight: 'bold' }}>:</td>
                    <td style={{ border: '1px solid #000', padding: '4px 6px', fontFamily: 'monospace', fontWeight: 'bold' }}>{exam.code}</td>
                    
                    <td style={{ fontWeight: 'bold', backgroundColor: '#f8fafc', border: '1px solid #000', padding: '4px 6px' }}>Nama &amp; No. Siswa</td>
                    <td style={{ textAlign: 'center', border: '1px solid #000', fontWeight: 'bold' }}>:</td>
                    <td style={{ border: '1px solid #000', padding: '4px 6px', color: '#444' }}>...................................................</td>
                  </tr>
                </tbody>
              </table>
            )}

            {/* ========================================================================= */}
            {/* 4. PETUNJUK UMUM PENGERJAAN */}
            {/* ========================================================================= */}
            {showInstructions && (
              <div style={{ border: '1px solid #000', padding: '6px 12px', marginBottom: '14px', backgroundColor: '#fafafa', fontSize: '9.5pt', lineHeight: '1.4', pageBreakInside: 'avoid' }}>
                <div style={{ fontWeight: 'bold', textDecoration: 'underline', marginBottom: '4px' }}>PETUNJUK UMUM PENGERJAAN:</div>
                <ol style={{ margin: 0, paddingLeft: '18px' }}>
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
            <div className={columns === '2' ? 'exam-columns-2' : 'exam-columns-1'}>
              {sections.map((section, sIdx) => (
                <div key={sIdx} style={{ pageBreakInside: 'avoid', marginBottom: '12px' }}>
                  
                  {/* Section Title & Instruction */}
                  {groupingMode === 'sections' && (
                    <div style={{ borderBottom: '1.5px solid #000', paddingBottom: '3px', margin: '14px 0 10px 0', pageBreakAfter: 'avoid' }}>
                      <div style={{ fontWeight: 'bold', fontSize: '10.5pt', textTransform: 'uppercase' }}>
                        {section.title}
                      </div>
                      <div style={{ fontSize: '9pt', fontStyle: 'italic', color: '#333', marginTop: '1px' }}>
                        {section.instruction}
                      </div>
                    </div>
                  )}

                  {/* Section Questions */}
                  <div>
                    {section.items.map(({ question: q, originalIndex, sectionIndex }) => {
                      const displayNum = groupingMode === 'sections' ? sectionIndex : originalIndex + 1;
                      const isGrid = shouldRenderOptionGrid(q.options || []);
                      const isHorizontal = shouldRenderOptionHorizontal(q.options || []);

                      return (
                        <div
                          key={q.id}
                          style={{
                            pageBreakInside: 'avoid',
                            breakInside: 'avoid',
                            marginBottom: '10px',
                            paddingBottom: '8px',
                            borderBottom: '1px dashed #d1d5db'
                          }}
                        >
                          {/* Table structure for Number and Question Body for bulletproof indentation */}
                          <table style={{ width: '100%', borderCollapse: 'collapse', border: 'none', margin: 0, padding: 0 }}>
                            <tbody>
                              <tr>
                                {/* Nomor Soal (Hanging Indent Table Cell) */}
                                <td style={{ width: '26px', verticalAlign: 'top', fontWeight: 'bold', border: 'none', padding: '0 6px 0 0', textAlign: 'right' }}>
                                  {displayNum}.
                                </td>

                                {/* Narasi & Konten Soal */}
                                <td style={{ verticalAlign: 'top', border: 'none', padding: 0, textAlign: 'justify', lineHeight: '1.45' }}>
                                  {/* Points badge in Teacher mode */}
                                  {printMode === 'teacher' && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9pt', fontWeight: 'bold', color: '#4b5563', marginBottom: '2px' }}>
                                      <span>[Tipe: {q.type}]</span>
                                      <span style={{ backgroundColor: '#f3f4f6', padding: '1px 6px', border: '1px solid #d1d5db', borderRadius: '3px' }}>
                                        Bobot: {q.points || 10} Poin
                                      </span>
                                    </div>
                                  )}

                                  {/* Teks Soal / Rumus KaTeX */}
                                  <div style={{ color: '#000' }}>
                                    <MathRenderer text={q.text} />
                                  </div>

                                  {/* Gambar Soal (Jika ada) */}
                                  {q.image && (
                                    <div style={{ margin: '6px 0', border: '1px solid #999', padding: '3px', background: '#fff', display: 'inline-block', maxWidth: '100%' }}>
                                      <img
                                        src={q.image}
                                        alt={`Gambar Soal #${displayNum}`}
                                        style={{ maxHeight: '160px', width: 'auto', display: 'block', margin: '0 auto' }}
                                      />
                                      <div style={{ fontSize: '8pt', textAlign: 'center', color: '#555', fontStyle: 'italic', marginTop: '2px' }}>
                                        (Gambar Soal #{displayNum})
                                      </div>
                                    </div>
                                  )}

                                  {/* ========================================================= */}
                                  {/* OPSI TIPE 1: PILIHAN GANDA (PG) */}
                                  {/* ========================================================= */}
                                  {q.type === 'multiple_choice' && (
                                    <div style={{ marginTop: '5px' }}>
                                      {/* Mode 1: 2 Kolom Grid */}
                                      {isGrid ? (
                                        <table style={{ width: '100%', borderCollapse: 'collapse', border: 'none', margin: '2px 0' }}>
                                          <tbody>
                                            {Array.from({ length: Math.ceil(q.options.length / 2) }).map((_, rIdx) => {
                                              const opt1 = q.options[rIdx * 2];
                                              const opt2 = q.options[rIdx * 2 + 1];
                                              const letter1 = String.fromCharCode(65 + rIdx * 2);
                                              const letter2 = String.fromCharCode(65 + rIdx * 2 + 1);
                                              const isCorrect1 = q.correctOptionId === opt1?.id;
                                              const isCorrect2 = opt2 && q.correctOptionId === opt2.id;

                                              return (
                                                <tr key={rIdx}>
                                                  {/* Col 1 */}
                                                  <td style={{ width: '50%', verticalAlign: 'top', border: 'none', padding: '2px 10px 2px 0' }}>
                                                    <div style={{ display: 'flex', alignItems: 'flex-start', ...(printMode === 'teacher' && isCorrect1 ? { backgroundColor: '#f0fdf4', fontWeight: 'bold' } : {}) }}>
                                                      <span style={{ fontWeight: 'bold', width: '20px', flexShrink: 0 }}>{letter1}.</span>
                                                      <div style={{ flex: 1 }}>
                                                        <MathRenderer text={opt1.text} inline />
                                                        {printMode === 'teacher' && isCorrect1 && (
                                                          <span style={{ marginLeft: '6px', fontSize: '8.5pt', color: '#047857', fontWeight: 'bold' }}>(✓ Kunci)</span>
                                                        )}
                                                      </div>
                                                    </div>
                                                  </td>

                                                  {/* Col 2 */}
                                                  <td style={{ width: '50%', verticalAlign: 'top', border: 'none', padding: '2px 0 2px 10px' }}>
                                                    {opt2 && (
                                                      <div style={{ display: 'flex', alignItems: 'flex-start', ...(printMode === 'teacher' && isCorrect2 ? { backgroundColor: '#f0fdf4', fontWeight: 'bold' } : {}) }}>
                                                        <span style={{ fontWeight: 'bold', width: '20px', flexShrink: 0 }}>{letter2}.</span>
                                                        <div style={{ flex: 1 }}>
                                                          <MathRenderer text={opt2.text} inline />
                                                          {printMode === 'teacher' && isCorrect2 && (
                                                            <span style={{ marginLeft: '6px', fontSize: '8.5pt', color: '#047857', fontWeight: 'bold' }}>(✓ Kunci)</span>
                                                          )}
                                                        </div>
                                                      </div>
                                                    )}
                                                  </td>
                                                </tr>
                                              );
                                            })}
                                          </tbody>
                                        </table>
                                      ) : isHorizontal ? (
                                        /* Mode 2: Horizontal Sebaris */
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 18px', marginTop: '4px' }}>
                                          {q.options.map((opt, optIdx) => {
                                            const letter = String.fromCharCode(65 + optIdx);
                                            const isCorrect = q.correctOptionId === opt.id;
                                            return (
                                              <span
                                                key={opt.id}
                                                style={{
                                                  display: 'inline-flex',
                                                  alignItems: 'baseline',
                                                  ...(printMode === 'teacher' && isCorrect ? { backgroundColor: '#f0fdf4', fontWeight: 'bold' } : {})
                                                }}
                                              >
                                                <strong style={{ marginRight: '4px' }}>{letter}.</strong>
                                                <MathRenderer text={opt.text} inline />
                                                {printMode === 'teacher' && isCorrect && (
                                                  <span style={{ marginLeft: '4px', fontSize: '8pt', color: '#047857', fontWeight: 'bold' }}>(✓ Kunci)</span>
                                                )}
                                              </span>
                                            );
                                          })}
                                        </div>
                                      ) : (
                                        /* Mode 3: 1 Kolom Vertikal (Standar) */
                                        <table style={{ width: '100%', borderCollapse: 'collapse', border: 'none', margin: '2px 0' }}>
                                          <tbody>
                                            {q.options.map((opt, optIdx) => {
                                              const letter = String.fromCharCode(65 + optIdx);
                                              const isCorrect = q.correctOptionId === opt.id;
                                              return (
                                                <tr key={opt.id} style={printMode === 'teacher' && isCorrect ? { backgroundColor: '#f0fdf4' } : {}}>
                                                  <td style={{ width: '22px', verticalAlign: 'top', fontWeight: 'bold', border: 'none', padding: '2px 4px 2px 0' }}>
                                                    {letter}.
                                                  </td>
                                                  <td style={{ verticalAlign: 'top', border: 'none', padding: '2px 0' }}>
                                                    <MathRenderer text={opt.text} inline />
                                                    {opt.image && (
                                                      <div style={{ margin: '4px 0' }}>
                                                        <img src={opt.image} alt={`Opsi ${letter}`} style={{ maxHeight: '80px', border: '1px solid #ccc' }} />
                                                      </div>
                                                    )}
                                                    {printMode === 'teacher' && isCorrect && (
                                                      <span style={{ marginLeft: '8px', fontSize: '8.5pt', color: '#047857', fontWeight: 'bold' }}>
                                                        (✓ Kunci Benar)
                                                      </span>
                                                    )}
                                                  </td>
                                                </tr>
                                              );
                                            })}
                                          </tbody>
                                        </table>
                                      )}
                                    </div>
                                  )}

                                  {/* ========================================================= */}
                                  {/* OPSI TIPE 2: PILIHAN GANDA KOMPLEKS (PG-K) */}
                                  {/* ========================================================= */}
                                  {q.type === 'multiple_choice_complex' && (
                                    <div style={{ marginTop: '5px' }}>
                                      <table style={{ width: '100%', borderCollapse: 'collapse', border: 'none', margin: '2px 0' }}>
                                        <tbody>
                                          {q.options.map((opt, optIdx) => {
                                            const letter = String.fromCharCode(65 + optIdx);
                                            const isCorrect = (q.correctOptionIds || []).includes(opt.id);
                                            return (
                                              <tr key={opt.id} style={printMode === 'teacher' && isCorrect ? { backgroundColor: '#f0fdf4' } : {}}>
                                                <td style={{ width: '38px', verticalAlign: 'top', fontFamily: 'monospace', fontWeight: 'bold', border: 'none', padding: '2px 4px 2px 0' }}>
                                                  {printMode === 'teacher' && isCorrect ? '[ ✓ ]' : '[ &nbsp; ]'}
                                                </td>
                                                <td style={{ width: '22px', verticalAlign: 'top', fontWeight: 'bold', border: 'none', padding: '2px 4px 2px 0' }}>
                                                  {letter}.
                                                </td>
                                                <td style={{ verticalAlign: 'top', border: 'none', padding: '2px 0' }}>
                                                  <MathRenderer text={opt.text} inline />
                                                  {printMode === 'teacher' && isCorrect && (
                                                    <span style={{ marginLeft: '8px', fontSize: '8.5pt', color: '#047857', fontWeight: 'bold' }}>
                                                      (✓ Kunci Benar)
                                                    </span>
                                                  )}
                                                </td>
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                      </table>
                                    </div>
                                  )}

                                  {/* ========================================================= */}
                                  {/* OPSI TIPE 3: MENJODOHKAN (MATCHING) */}
                                  {/* ========================================================= */}
                                  {q.type === 'matching' && (
                                    <div style={{ marginTop: '6px' }}>
                                      <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', margin: '4px 0', fontSize: '9.5pt' }}>
                                        <thead>
                                          <tr style={{ backgroundColor: '#f1f5f9', fontWeight: 'bold' }}>
                                            <th style={{ border: '1px solid #000', padding: '4px', textAlign: 'center', width: '28px' }}>No</th>
                                            <th style={{ border: '1px solid #000', padding: '4px 8px', textAlign: 'left' }}>Kolom Premis / Pernyataan (Kiri)</th>
                                            <th style={{ border: '1px solid #000', padding: '4px', textAlign: 'center', width: '60px' }}>Jawaban</th>
                                            <th style={{ border: '1px solid #000', padding: '4px 8px', textAlign: 'left' }}>Pilihan Jawaban (Kanan)</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {(q.matchingPairs || []).map((pair, pIdx) => {
                                            const pairLetter = String.fromCharCode(65 + pIdx);
                                            return (
                                              <tr key={pair.id || pIdx}>
                                                <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center', fontWeight: 'bold' }}>{pIdx + 1}</td>
                                                <td style={{ border: '1px solid #000', padding: '4px 8px' }}>{pair.leftPrompt}</td>
                                                <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center', fontWeight: 'bold' }}>
                                                  {printMode === 'teacher' ? (
                                                    <span style={{ textDecoration: 'underline', color: '#047857', fontWeight: 'bold' }}>[{pairLetter}]</span>
                                                  ) : (
                                                    <span style={{ color: '#444' }}>( ... )</span>
                                                  )}
                                                </td>
                                                <td style={{ border: '1px solid #000', padding: '4px 8px' }}>
                                                  <strong>{pairLetter}.</strong> {pair.rightAnswer}
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
                                    <div style={{ marginTop: '6px' }}>
                                      {printMode === 'student' ? (
                                        <div style={{ paddingTop: '2px' }}>
                                          <div style={{ fontSize: '8.5pt', fontWeight: 'bold', color: '#555', textTransform: 'uppercase' }}>
                                            Ruang Jawaban:
                                          </div>
                                          <div style={{ borderBottom: '1px dashed #777', height: '22px', margin: '4px 0' }}></div>
                                          <div style={{ borderBottom: '1px dashed #777', height: '22px', margin: '4px 0' }}></div>
                                          <div style={{ borderBottom: '1px dashed #777', height: '22px', margin: '4px 0' }}></div>
                                          <div style={{ borderBottom: '1px dashed #777', height: '22px', margin: '4px 0' }}></div>
                                        </div>
                                      ) : (
                                        <div style={{ border: '1px solid #000', padding: '6px 10px', backgroundColor: '#f8fafc', fontSize: '9.5pt', marginTop: '6px', borderRadius: '3px' }}>
                                          <div style={{ fontWeight: 'bold', textDecoration: 'underline', color: '#0f172a' }}>
                                            Kunci &amp; Rubrik Pedoman Penskoran:
                                          </div>
                                          <div style={{ fontStyle: 'italic', marginTop: '2px', color: '#111' }}>
                                            {q.sampleAnswer || '(Kunci jawaban referensi belum diisi guru)'}
                                          </div>
                                          {q.keywords && q.keywords.length > 0 && (
                                            <div style={{ fontSize: '9pt', marginTop: '4px' }}>
                                              <strong>Kata Kunci: </strong> <span style={{ fontFamily: 'monospace' }}>{q.keywords.join(', ')}</span>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  )}

                                </td>
                              </tr>
                            </tbody>
                          </table>

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
              <div style={{ marginTop: '20px', paddingTop: '10px', borderTop: '2px solid #000', fontSize: '9.5pt', pageBreakInside: 'avoid' }}>
                <div style={{ fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', textAlign: 'center' }}>
                  TABEL REKAPITULASI KUNCI JAWABAN RINGKAS (ARSIP GURU)
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', textAlign: 'center', fontSize: '9pt' }}>
                  <tbody>
                    <tr style={{ backgroundColor: '#f1f5f9', fontWeight: 'bold' }}>
                      {questions.slice(0, Math.min(25, questions.length)).map((_, i) => (
                        <th key={i} style={{ border: '1px solid #000', padding: '3px', width: '4%' }}>{i + 1}</th>
                      ))}
                    </tr>
                    <tr style={{ fontWeight: 'bold' }}>
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
                          keyText = 'Esai';
                        }
                        return (
                          <td key={i} style={{ border: '1px solid #000', padding: '3px', backgroundColor: '#f0fdf4', color: '#065f46' }}>
                            {keyText}
                          </td>
                        );
                      })}
                    </tr>

                    {/* Row 2 if questions > 25 */}
                    {questions.length > 25 && (
                      <>
                        <tr style={{ backgroundColor: '#f1f5f9', fontWeight: 'bold' }}>
                          {questions.slice(25, Math.min(50, questions.length)).map((_, i) => (
                            <th key={i + 25} style={{ border: '1px solid #000', padding: '3px', width: '4%' }}>{i + 26}</th>
                          ))}
                        </tr>
                        <tr style={{ fontWeight: 'bold' }}>
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
                              keyText = 'Esai';
                            }
                            return (
                              <td key={i + 25} style={{ border: '1px solid #000', padding: '3px', backgroundColor: '#f0fdf4', color: '#065f46' }}>
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
            )}

            {/* ========================================================================= */}
            {/* 7. TANDA TANGAN PENGESAHAN KEPALA MADRASAH & GURU PENGAMPU */}
            {/* ========================================================================= */}
            {showSignature && (
              <div style={{ marginTop: '24px', paddingTop: '10px', borderTop: '1px solid #000', pageBreakInside: 'avoid' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', border: 'none', fontSize: '10pt' }}>
                  <tbody>
                    <tr>
                      {/* Kolom Kiri: Kepala Madrasah */}
                      <td style={{ width: '50%', textAlign: 'center', verticalAlign: 'top', border: 'none', padding: '0 10px' }}>
                        <p style={{ margin: '0 0 2px 0' }}>Mengetahui,</p>
                        <p style={{ margin: '0 0 55px 0', fontWeight: 'bold' }}>Kepala Madrasah,</p>
                        <p style={{ margin: 0, fontWeight: 'bold', textDecoration: 'underline', textTransform: 'uppercase' }}>
                          {systemSettings.headmasterName || '...................................................'}
                        </p>
                        <p style={{ margin: '2px 0 0 0', fontSize: '9pt' }}>
                          NIP. {systemSettings.headmasterNip || '...........................................'}
                        </p>
                      </td>

                      {/* Kolom Kanan: Guru Pengampu */}
                      <td style={{ width: '50%', textAlign: 'center', verticalAlign: 'top', border: 'none', padding: '0 10px' }}>
                        <p style={{ margin: '0 0 2px 0' }}>
                          {systemSettings.city || 'Kabupaten'}, {examDateFormatted}
                        </p>
                        <p style={{ margin: '0 0 55px 0', fontWeight: 'bold' }}>Guru Pengampu Mata Pelajaran,</p>
                        <p style={{ margin: 0, fontWeight: 'bold', textDecoration: 'underline', textTransform: 'uppercase' }}>
                          {exam.authorName || '...................................................'}
                        </p>
                        <p style={{ margin: '2px 0 0 0', fontSize: '9pt' }}>
                          NIP. ...........................................
                        </p>
                      </td>
                    </tr>
                  </tbody>
                </table>

                <div style={{ marginTop: '12px', paddingTop: '4px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', fontSize: '8.5pt', color: '#6b7280', fontStyle: 'italic' }}>
                  <span>Dicetak melalui Sistem CBT MTs Terpadu &bull; Paket: <strong>{exam.code}</strong></span>
                  <span>Token Ujian: <strong>{exam.token}</strong> &bull; Halaman Dokumen Resmi</span>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* 8. OPTIONAL: LEMBAR JAWABAN FISIK (LJK KOMPUTER / KERTAS LEMBAR JAWAB) */}
            {/* ========================================================================= */}
            {showAnswerSheet && (
              <div style={{ pageBreakBefore: 'always', marginTop: '24px', paddingTop: '16px', borderTop: '3px dashed #000' }}>
                {/* LJK Kop */}
                <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                  <div style={{ fontSize: '12pt', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.5px', textDecoration: 'underline' }}>
                    LEMBAR JAWABAN UJIAN (LJK FISIK)
                  </div>
                  <div style={{ fontSize: '9.5pt', fontWeight: 'bold', textTransform: 'uppercase', marginTop: '2px' }}>
                    {systemSettings.schoolName || 'MADRASAH TSANAWIYAH'} &bull; {exam.title} ({exam.code})
                  </div>
                </div>

                {/* Kotak Identitas Siswa LJK */}
                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', marginBottom: '10px', fontSize: '9.5pt' }}>
                  <tbody>
                    <tr>
                      <td style={{ border: '1px solid #000', padding: '4px 6px', width: '50%' }}>
                        <strong>Nama Lengkap:</strong> ....................................................
                      </td>
                      <td style={{ border: '1px solid #000', padding: '4px 6px', width: '50%' }}>
                        <strong>Nomor Peserta:</strong> ....................................................
                      </td>
                    </tr>
                    <tr>
                      <td style={{ border: '1px solid #000', padding: '4px 6px' }}>
                        <strong>Kelas / Ruang:</strong> ....................................................
                      </td>
                      <td style={{ border: '1px solid #000', padding: '4px 6px' }}>
                        <strong>Nilai Akhir:</strong> [&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;]
                      </td>
                    </tr>
                  </tbody>
                </table>

                <div style={{ fontSize: '8.5pt', fontStyle: 'italic', marginBottom: '8px', color: '#444' }}>
                  * Berilah tanda silang (X) atau hitamkan bulatan pada huruf pilihan jawaban A, B, C, atau D yang Anda anggap paling benar.
                </div>

                {/* Grid Lembar Jawaban Pilihan Ganda */}
                <div style={{ border: '1px solid #000', padding: '8px', marginBottom: '10px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', border: 'none', fontSize: '9pt' }}>
                    <tbody>
                      {Array.from({ length: Math.ceil(questions.filter(q => q.type === 'multiple_choice' || q.type === 'multiple_choice_complex').length / 2) }).map((_, rIdx) => {
                        const q1 = questions.filter(q => q.type === 'multiple_choice' || q.type === 'multiple_choice_complex')[rIdx * 2];
                        const q2 = questions.filter(q => q.type === 'multiple_choice' || q.type === 'multiple_choice_complex')[rIdx * 2 + 1];

                        return (
                          <tr key={rIdx}>
                            {/* Col 1 */}
                            <td style={{ width: '50%', border: 'none', padding: '2px 8px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ fontWeight: 'bold', width: '24px' }}>{rIdx * 2 + 1}.</span>
                                <div style={{ display: 'flex', gap: '6px', fontFamily: 'monospace', fontWeight: 'bold' }}>
                                  <span style={{ border: '1px solid #000', borderRadius: '50%', width: '18px', height: '18px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '7.5pt' }}>A</span>
                                  <span style={{ border: '1px solid #000', borderRadius: '50%', width: '18px', height: '18px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '7.5pt' }}>B</span>
                                  <span style={{ border: '1px solid #000', borderRadius: '50%', width: '18px', height: '18px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '7.5pt' }}>C</span>
                                  <span style={{ border: '1px solid #000', borderRadius: '50%', width: '18px', height: '18px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '7.5pt' }}>D</span>
                                </div>
                              </div>
                            </td>

                            {/* Col 2 */}
                            <td style={{ width: '50%', border: 'none', padding: '2px 8px' }}>
                              {q2 && (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                  <span style={{ fontWeight: 'bold', width: '24px' }}>{rIdx * 2 + 2}.</span>
                                  <div style={{ display: 'flex', gap: '6px', fontFamily: 'monospace', fontWeight: 'bold' }}>
                                    <span style={{ border: '1px solid #000', borderRadius: '50%', width: '18px', height: '18px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '7.5pt' }}>A</span>
                                    <span style={{ border: '1px solid #000', borderRadius: '50%', width: '18px', height: '18px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '7.5pt' }}>B</span>
                                    <span style={{ border: '1px solid #000', borderRadius: '50%', width: '18px', height: '18px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '7.5pt' }}>C</span>
                                    <span style={{ border: '1px solid #000', borderRadius: '50%', width: '18px', height: '18px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '7.5pt' }}>D</span>
                                  </div>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Area Jawaban Esai LJK */}
                {essayCount > 0 && (
                  <div style={{ border: '1px solid #000', padding: '8px', fontSize: '9.5pt' }}>
                    <div style={{ fontWeight: 'bold', textTransform: 'uppercase', textDecoration: 'underline', marginBottom: '6px' }}>
                      LEMBAR JAWABAN KHUSUS ESAI / URAIAN:
                    </div>
                    <div style={{ borderBottom: '1px dotted #000', height: '22px', margin: '4px 0' }}></div>
                    <div style={{ borderBottom: '1px dotted #000', height: '22px', margin: '4px 0' }}></div>
                    <div style={{ borderBottom: '1px dotted #000', height: '22px', margin: '4px 0' }}></div>
                    <div style={{ borderBottom: '1px dotted #000', height: '22px', margin: '4px 0' }}></div>
                    <div style={{ borderBottom: '1px dotted #000', height: '22px', margin: '4px 0' }}></div>
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
              disabled={isGeneratingPdf}
              onClick={handleDownloadPdf}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl text-xs flex items-center gap-2 cursor-pointer transition shadow-md shadow-rose-200 active:scale-95 disabled:opacity-50"
            >
              {isGeneratingPdf ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <FileDown className="w-4 h-4" />
              )}
              <span>{isGeneratingPdf ? (pdfProgressText || 'Memproses PDF...') : 'Download PDF (.pdf)'}</span>
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
