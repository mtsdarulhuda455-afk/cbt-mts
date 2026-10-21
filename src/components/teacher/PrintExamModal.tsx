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
  Image as ImageIcon
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
  const [columns, setColumns] = useState<'1' | '2'>('2');
  const [fontSize, setFontSize] = useState<'compact' | 'normal' | 'large'>('compact');
  const [showKop, setShowKop] = useState<boolean>(true);
  const [showIdentityBox, setShowIdentityBox] = useState<boolean>(true);
  const [showInstructions, setShowInstructions] = useState<boolean>(true);
  const [showAnswerSheet, setShowAnswerSheet] = useState<boolean>(false);
  const [paperSize, setPaperSize] = useState<'A4' | 'F4'>('A4');

  if (!isOpen || !exam) return null;

  const questions: Question[] = exam.questions || [];

  // Allowed classes formatted text
  const targetClassesNames = classes
    .filter(c => exam.classesAllowed && exam.classesAllowed.includes(c.id))
    .map(c => c.name)
    .join(', ') || 'Semua Kelas MTs';

  // Stats
  const pgCount = questions.filter(q => q.type === 'multiple_choice').length;
  const pgkCount = questions.filter(q => q.type === 'multiple_choice_complex').length;
  const matchingCount = questions.filter(q => q.type === 'matching').length;
  const essayCount = questions.filter(q => q.type === 'essay').length;
  const totalPoints = questions.reduce((sum, q) => sum + (q.points || 0), 0);

  // Trigger Native Print Dialog
  const handlePrint = () => {
    document.body.classList.add('printing-exam-mode');
    
    // Add audit log
    addAuditLog(
      'PRINT_EXAM_PDF',
      'exam',
      `Mencetak naskah soal ujian ${exam.code} (${printMode === 'student' ? 'Naskah Siswa' : 'Arsip Guru & Kunci'})`,
      'info'
    );

    const cleanup = () => {
      document.body.classList.remove('printing-exam-mode');
      window.removeEventListener('afterprint', cleanup);
    };

    window.addEventListener('afterprint', cleanup);
    setTimeout(() => {
      window.print();
      // Fallback cleanup if afterprint does not fire
      setTimeout(cleanup, 2000);
    }, 150);
  };

  // Download Self-Contained Offline HTML Document (Opens in any browser & prints to PDF)
  const handleDownloadHtml = () => {
    const printElement = document.getElementById('printable-exam-paper');
    if (!printElement) return;

    const htmlContent = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Naskah Soal - ${exam.code} - ${exam.title}</title>
  <style>
    @page {
      size: ${paperSize === 'F4' ? '215mm 330mm' : 'A4'};
      margin: 12mm 15mm 15mm 15mm;
    }
    body {
      font-family: 'Times New Roman', Times, serif, system-ui, -apple-system;
      color: #000;
      background: #fff;
      margin: 0;
      padding: 20px;
      font-size: ${fontSize === 'compact' ? '10.5pt' : fontSize === 'large' ? '12pt' : '11pt'};
      line-height: 1.45;
    }
    .print-btn-bar {
      position: sticky;
      top: 0;
      background: #0f172a;
      color: white;
      padding: 12px 20px;
      margin: -20px -20px 20px -20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-family: sans-serif;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
    }
    .print-btn {
      background: #059669;
      color: white;
      border: none;
      padding: 8px 18px;
      border-radius: 8px;
      font-weight: bold;
      cursor: pointer;
      font-size: 14px;
    }
    .print-btn:hover { background: #047857; }
    @media print {
      .print-btn-bar { display: none !important; }
      body { padding: 0 !important; }
    }
    .paper-sheet { max-width: 900px; margin: 0 auto; }
    .break-inside-avoid { break-inside: avoid; page-break-inside: avoid; }
    .break-after-page { break-after: page; page-break-after: always; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #000; padding: 4px 6px; }
  </style>
</head>
<body>
  <div class="print-btn-bar">
    <div><strong>Naskah Soal CBT Madrasah:</strong> ${exam.title} (${exam.code})</div>
    <button class="print-btn" onclick="window.print()">Cetak / Simpan ke PDF (Ctrl + P)</button>
  </div>
  <div class="paper-sheet">
    ${printElement.innerHTML}
  </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Naskah-Soal-${exam.code}-${printMode}.html`;
    link.click();
    URL.revokeObjectURL(url);

    addAuditLog(
      'EXPORT_EXAM_HTML',
      'exam',
      `Mengunduh naskah soal offline HTML siap cetak ${exam.code}`,
      'info'
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-100 rounded-3xl max-w-6xl w-full max-h-[96vh] flex flex-col shadow-2xl border border-slate-300 animate-in fade-in zoom-in-95 overflow-hidden">
        
        {/* ========================================================================= */}
        {/* TOP CONTROL & SETTINGS TOOLBAR (HIDDEN WHEN PRINTING) */}
        {/* ========================================================================= */}
        <div className="bg-white border-b border-slate-200 p-4 sm:p-5 flex flex-col gap-4 shrink-0 no-print">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black shadow-xs">
                <Printer className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <span>Cetak Naskah Soal ke Format PDF / Kertas Fisik</span>
                  <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded-full uppercase tracking-wider">
                    {exam.code}
                  </span>
                </h2>
                <p className="text-xs text-slate-500">
                  Konversi paket soal CBT menjadi lembar ujian fisik siap cetak dan dibagikan ke santri.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadHtml}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition shadow-2xs"
                title="Unduh berkas dokumen HTML mandiri siap cetak offline"
              >
                <Download className="w-4 h-4 text-slate-600" />
                <span className="hidden sm:inline">Unduh File HTML Offline</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs flex items-center gap-2 cursor-pointer transition shadow-md shadow-emerald-200 active:scale-95"
                title="Cetak Naskah atau Simpan PDF"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak / Simpan PDF</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-xl cursor-pointer transition ml-1"
                title="Tutup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Configuration Options Bar */}
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            {/* Mode Cetak Toggle */}
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-700">Tujuan Naskah:</span>
              <div className="flex items-center bg-white p-0.5 rounded-xl border border-slate-200 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setPrintMode('student')}
                  className={`px-3 py-1.5 rounded-lg font-bold text-xs cursor-pointer transition ${
                    printMode === 'student'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Naskah Siswa (Ujian Fisik)
                </button>
                <button
                  type="button"
                  onClick={() => setPrintMode('teacher')}
                  className={`px-3 py-1.5 rounded-lg font-bold text-xs cursor-pointer transition ${
                    printMode === 'teacher'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Arsip & Kunci Guru
                </button>
              </div>
            </div>

            {/* Layout Options */}
            <div className="flex flex-wrap items-center gap-4">
              {/* Columns */}
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-600">Kolom:</span>
                <select
                  value={columns}
                  onChange={(e) => setColumns(e.target.value as '1' | '2')}
                  className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 cursor-pointer"
                >
                  <option value="2">2 Kolom (Hemat Kertas Koran)</option>
                  <option value="1">1 Kolom Penuh (Standar)</option>
                </select>
              </div>

              {/* Font Size */}
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-600">Ukuran Teks:</span>
                <select
                  value={fontSize}
                  onChange={(e) => setFontSize(e.target.value as any)}
                  className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 cursor-pointer"
                >
                  <option value="compact">Kecil / Padat (10.5pt - Hemat Kertas)</option>
                  <option value="normal">Normal (11pt)</option>
                  <option value="large">Besar (12pt)</option>
                </select>
              </div>

              {/* Paper Size */}
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-600">Kertas:</span>
                <select
                  value={paperSize}
                  onChange={(e) => setPaperSize(e.target.value as 'A4' | 'F4')}
                  className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 cursor-pointer"
                >
                  <option value="A4">A4 (210 x 297 mm)</option>
                  <option value="F4">F4 / Folio (215 x 330 mm)</option>
                </select>
              </div>
            </div>

            {/* Checkbox toggles */}
            <div className="flex flex-wrap items-center gap-3 pt-1 sm:pt-0">
              <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={showKop}
                  onChange={(e) => setShowKop(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-emerald-600"
                />
                <span>Kop Madrasah</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={showIdentityBox}
                  onChange={(e) => setShowIdentityBox(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-emerald-600"
                />
                <span>Kolom Siswa</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={showInstructions}
                  onChange={(e) => setShowInstructions(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-emerald-600"
                />
                <span>Petunjuk Umum</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-slate-700" title="Tambahkan Lembar Jawab Komputer (LJK) Fisik di lembar terpisah">
                <input
                  type="checkbox"
                  checked={showAnswerSheet}
                  onChange={(e) => setShowAnswerSheet(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-emerald-600"
                />
                <span>+ Lembar Jawab Fisik</span>
              </label>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* PREVIEW CONTAINER & PRINTABLE PAPER SHEET */}
        {/* ========================================================================= */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-200/70 flex justify-center">
          
          <div
            id="printable-exam-paper"
            className={`bg-white text-black shadow-xl border border-slate-300 rounded-none w-full max-w-[850px] p-6 sm:p-10 transition-all ${
              fontSize === 'compact' ? 'text-[13.5px] leading-relaxed' : fontSize === 'large' ? 'text-[15.5px] leading-loose' : 'text-[14px] leading-normal'
            }`}
            style={{
              fontFamily: '"Times New Roman", Times, Georgia, serif'
            }}
          >
            {/* KOP SURAT MADRASAH RESMI */}
            {showKop && (
              <div className="mb-4 text-center border-b-2 border-black pb-2">
                <div className="flex items-center justify-between gap-4">
                  {/* Logo Placeholder / Kemenag Logo */}
                  <div className="w-16 h-16 shrink-0 flex items-center justify-center font-bold text-center border border-black/20 rounded p-1 text-[10px]">
                    <School className="w-10 h-10 text-black stroke-1" />
                  </div>

                  {/* Header text */}
                  <div className="flex-1 text-center">
                    <h4 className="text-xs sm:text-sm font-bold tracking-wider uppercase mb-0.5">
                      KEMENTERIAN AGAMA REPUBLIK INDONESIA
                    </h4>
                    <h3 className="text-sm sm:text-base font-black tracking-wide uppercase mb-0.5">
                      {systemSettings.schoolName || 'MADRASAH TSANAWIYAH DARUL HUDA'}
                    </h3>
                    <p className="text-[11px] font-normal leading-tight">
                      {systemSettings.address || 'Jl. KH. Hasyim Asy\'ari No. 12'}, {systemSettings.subdistrict || 'Kecamatan'}, {systemSettings.city || 'Kota'}, {systemSettings.province || 'Jawa Timur'}
                    </p>
                    <p className="text-[10px] font-bold mt-0.5">
                      NSM: {systemSettings.nsm || '121235170001'} • NPSN: {systemSettings.npsn || '20277812'}
                    </p>
                  </div>

                  <div className="w-16 h-16 shrink-0 hidden sm:flex items-center justify-center border border-black/20 rounded p-1 text-[10px] font-bold">
                    <span className="text-center leading-tight">AM<br />{exam.academicYear.split('/')[0]}</span>
                  </div>
                </div>

                {/* Double Border Bottom (Garis Tebal - Garis Tipis Naskah Dinas) */}
                <div className="w-full border-t border-black mt-2 pt-0.5"></div>
              </div>
            )}

            {/* JUDUL NASKAH UJIAN & IDENTITAS */}
            <div className="text-center mb-4">
              <h2 className="text-sm sm:text-base font-black uppercase tracking-wider underline">
                {exam.title.toUpperCase()}
              </h2>
              <div className="text-xs font-bold uppercase mt-0.5">
                TAHUN AJARAN {exam.academicYear} • SEMESTER {exam.semester.toUpperCase()}
              </div>
              {printMode === 'teacher' && (
                <div className="inline-block mt-1 px-3 py-0.5 bg-black text-white text-[11px] font-bold uppercase tracking-wider rounded">
                  *** DOKUMEN ARSIP GURU & KUNCI JAWABAN RESMI ***
                </div>
              )}
            </div>

            {/* TABEL IDENTITAS MATA PELAJARAN & SISWA */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 text-xs">
              {/* Kolom Kiri: Meta Ujian */}
              <div className="border border-black p-2.5 space-y-1">
                <div className="flex">
                  <span className="w-28 font-bold">Mata Pelajaran</span>
                  <span className="w-4">:</span>
                  <span className="font-bold flex-1">{exam.subject}</span>
                </div>
                <div className="flex">
                  <span className="w-28 font-bold">Kelas / Sasaran</span>
                  <span className="w-4">:</span>
                  <span className="flex-1">{targetClassesNames}</span>
                </div>
                <div className="flex">
                  <span className="w-28 font-bold">Alokasi Waktu</span>
                  <span className="w-4">:</span>
                  <span className="flex-1">{exam.durationMinutes} Menit</span>
                </div>
                <div className="flex">
                  <span className="w-28 font-bold">Kode Paket Soal</span>
                  <span className="w-4">:</span>
                  <span className="font-bold font-mono flex-1">{exam.code}</span>
                </div>
                <div className="flex">
                  <span className="w-28 font-bold">Guru Pengampu</span>
                  <span className="w-4">:</span>
                  <span className="font-bold flex-1">{exam.authorName || 'Guru Mata Pelajaran MTs'}</span>
                </div>
              </div>

              {/* Kolom Kanan: Kotak Identitas Siswa */}
              {showIdentityBox ? (
                <div className="border border-black p-2.5 space-y-1">
                  <div className="flex">
                    <span className="w-28 font-bold">Nama Santri</span>
                    <span className="w-4">:</span>
                    <span className="flex-1 border-b border-dotted border-black">...................................................</span>
                  </div>
                  <div className="flex">
                    <span className="w-28 font-bold">Nomor Peserta</span>
                    <span className="w-4">:</span>
                    <span className="flex-1 border-b border-dotted border-black">...................................................</span>
                  </div>
                  <div className="flex">
                    <span className="w-28 font-bold">Hari / Tanggal</span>
                    <span className="w-4">:</span>
                    <span className="flex-1 border-b border-dotted border-black">...................................................</span>
                  </div>
                  <div className="flex">
                    <span className="w-28 font-bold">Tanda Tangan</span>
                    <span className="w-4">:</span>
                    <span className="flex-1 border-b border-dotted border-black">...................................................</span>
                  </div>
                </div>
              ) : (
                <div className="border border-black p-2.5 flex items-center justify-around text-center">
                  <div>
                    <span className="block font-bold">Total Butir Soal</span>
                    <span className="text-base font-black">{questions.length} Butir</span>
                  </div>
                  <div className="h-8 w-px bg-black"></div>
                  <div>
                    <span className="block font-bold">Total Bobot Poin</span>
                    <span className="text-base font-black">{totalPoints} Poin</span>
                  </div>
                </div>
              )}
            </div>

            {/* PETUNJUK UMUM PENGERJAAN */}
            {showInstructions && (
              <div className="border border-black p-2.5 mb-4 text-[11px] leading-relaxed bg-slate-50/50">
                <span className="font-bold underline block mb-0.5">PETUNJUK UMUM:</span>
                <ol className="list-decimal pl-4 space-y-0.5">
                  <li>Awali pengerjaan dengan membaca Basmalah dan berdoa.</li>
                  <li>Tuliskan nama dan nomor peserta pada lembar jawaban yang telah disediakan.</li>
                  <li>Periksa dan bacalah setiap butir soal dengan teliti sebelum menjawab.</li>
                  <li>Laporkan kepada pengawas ujian jika terdapat tulisan yang tidak jelas, rusak, atau jumlah halaman kurang.</li>
                  <li>Dahulukan menjawab soal-soal yang Anda anggap mudah.</li>
                  <li>Periksa kembali seluruh lembar jawaban Anda sebelum diserahkan kepada pengawas ujian.</li>
                </ol>
              </div>
            )}

            {/* ========================================================================= */}
            {/* DAFTAR BUTIR SOAL (LAYOUT 1 KOLOM ATAU 2 KOLOM) */}
            {/* ========================================================================= */}
            <div className={columns === '2' ? 'columns-1 sm:columns-2 gap-6' : 'space-y-4'}>
              {questions.map((q, idx) => {
                return (
                  <div
                    key={q.id}
                    className="break-inside-avoid mb-4 pb-3 border-b border-slate-200 text-black leading-relaxed"
                  >
                    {/* Header Butir Soal */}
                    <div className="flex items-start gap-2 mb-1.5">
                      <span className="font-bold text-sm shrink-0">
                        {idx + 1}.
                      </span>
                      <div className="flex-1">
                        {/* Jenis Soal / Bobot Poin (Muncul di mode guru atau sebagai petunjuk) */}
                        <div className="flex items-center gap-2 mb-1 text-[10px]">
                          {q.type === 'multiple_choice_complex' && (
                            <span className="font-bold italic text-slate-800">
                              [Pilihan Ganda Kompleks: Pilihlah lebih dari satu jawaban benar]
                            </span>
                          )}
                          {q.type === 'matching' && (
                            <span className="font-bold italic text-slate-800">
                              [Menjodohkan Pasangan]
                            </span>
                          )}
                          {q.type === 'essay' && (
                            <span className="font-bold italic text-slate-800">
                              [Esai / Uraian]
                            </span>
                          )}
                          {printMode === 'teacher' && (
                            <span className="font-bold ml-auto bg-slate-200 px-1 rounded">
                              Bobot: {q.points || 10}p
                            </span>
                          )}
                        </div>

                        {/* Teks Narasi Soal */}
                        <div className="font-normal whitespace-pre-line text-black">
                          <MathRenderer text={q.text} />
                        </div>
                      </div>
                    </div>

                    {/* Lampiran Gambar Soal (Jika ada) */}
                    {q.image && (
                      <div className="my-2 ml-5 p-1 border border-black/40 rounded bg-white inline-block max-w-full">
                        <img
                          src={q.image}
                          alt={`Gambar Soal #${idx + 1}`}
                          className="max-h-52 w-auto object-contain mx-auto"
                        />
                        <span className="text-[9px] text-center block text-slate-600 mt-0.5 italic">
                          (Gambar / Bagan Soal #{idx + 1})
                        </span>
                      </div>
                    )}

                    {/* OPSI JAWABAN TIPE 1: PILIHAN GANDA */}
                    {q.type === 'multiple_choice' && (
                      <div className="ml-5 mt-2 space-y-1 text-black">
                        {q.options.map((opt, optIdx) => {
                          const letter = String.fromCharCode(65 + optIdx);
                          const isCorrect = q.correctOptionId === opt.id;
                          return (
                            <div
                              key={opt.id}
                              className={`flex items-start gap-2 ${
                                printMode === 'teacher' && isCorrect
                                  ? 'font-black underline bg-slate-100 p-0.5 rounded'
                                  : ''
                              }`}
                            >
                              <span className="font-bold shrink-0">{letter}.</span>
                              <div className="flex-1">
                                <span><MathRenderer text={opt.text} inline /></span>
                                {opt.image && (
                                  <div className="my-1">
                                    <img src={opt.image} alt={`Opsi ${letter}`} className="max-h-24 object-contain border" />
                                  </div>
                                )}
                                {printMode === 'teacher' && isCorrect && (
                                  <span className="ml-2 text-[10px] uppercase font-bold text-emerald-800">
                                    [Kunci Benar]
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* OPSI JAWABAN TIPE 2: PILIHAN GANDA KOMPLEKS */}
                    {q.type === 'multiple_choice_complex' && (
                      <div className="ml-5 mt-2 space-y-1 text-black">
                        {q.options.map((opt, optIdx) => {
                          const letter = String.fromCharCode(65 + optIdx);
                          const isCorrect = (q.correctOptionIds || []).includes(opt.id);
                          return (
                            <div
                              key={opt.id}
                              className={`flex items-start gap-2 ${
                                printMode === 'teacher' && isCorrect
                                  ? 'font-black underline bg-slate-100 p-0.5 rounded'
                                  : ''
                              }`}
                            >
                              <span className="font-mono text-xs shrink-0">[ &nbsp; ]</span>
                              <span className="font-bold shrink-0">{letter}.</span>
                              <div className="flex-1">
                                <span><MathRenderer text={opt.text} inline /></span>
                                {printMode === 'teacher' && isCorrect && (
                                  <span className="ml-2 text-[10px] uppercase font-bold text-teal-800">
                                    [Kunci Benar]
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* OPSI JAWABAN TIPE 3: MENJODOHKAN (MATCHING) */}
                    {q.type === 'matching' && (
                      <div className="ml-5 mt-2">
                        <table className="w-full text-[11px] border-collapse border border-black my-1">
                          <thead>
                            <tr className="bg-slate-100 font-bold">
                              <th className="border border-black p-1 text-center w-8">No</th>
                              <th className="border border-black p-1 text-left">Kolom Premis (Kiri)</th>
                              <th className="border border-black p-1 text-center w-8">Pasangan</th>
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
                                      <span className="underline font-black">{pairLetter}</span>
                                    ) : (
                                      <span>( ... )</span>
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

                    {/* OPSI JAWABAN TIPE 4: ESAI / URAIAN */}
                    {q.type === 'essay' && (
                      <div className="ml-5 mt-2">
                        {printMode === 'student' ? (
                          /* Ruang Jawaban Tulisan Tangan Siswa (Ruang Garis) */
                          <div className="space-y-3 pt-2">
                            <span className="text-[10px] font-bold text-slate-500 uppercase block">
                              Jawaban Santri:
                            </span>
                            <div className="border-b border-slate-400 h-5"></div>
                            <div className="border-b border-slate-400 h-5"></div>
                            <div className="border-b border-slate-400 h-5"></div>
                            <div className="border-b border-slate-400 h-5"></div>
                          </div>
                        ) : (
                          /* Kunci & Rubrik Esai untuk Guru */
                          <div className="p-2 border border-black/40 rounded bg-slate-50 text-xs space-y-1">
                            <span className="font-bold underline block">Kunci / Rubrik Jawaban Guru:</span>
                            <p className="italic">{q.sampleAnswer || '(Belum diisi kunci referensi)'}</p>
                            {q.keywords && q.keywords.length > 0 && (
                              <div className="pt-1 text-[10px]">
                                <span className="font-bold">Kata Kunci Penilaian: </span>
                                <span>{q.keywords.join(', ')}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                  </div>
                );
              })}
            </div>

            {/* PENUTUP & TANDA TANGAN VALIDASI (DI AKHIR NASKAH) */}
            <div className="break-inside-avoid mt-8 pt-4 border-t border-black text-xs flex justify-between items-start">
              <div>
                <p className="italic text-[10px] text-slate-600">
                  Dicetak melalui Aplikasi CBT MTs Darul Huda • Token Ujian: <strong>{exam.token}</strong>
                </p>
                <p className="text-[10px] text-slate-500">
                  Tanggal Cetak: {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>

              <div className="text-center w-56">
                <p className="font-bold mb-14">Guru Pengampu Mata Pelajaran,</p>
                <p className="font-bold underline">___________________________</p>
                <p className="text-[10px]">NIP: .......................................</p>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* OPTIONAL: LEMBAR JAWABAN FISIK (LJK MINI) DI HALAMAN BERIKUTNYA */}
            {/* ========================================================================= */}
            {showAnswerSheet && (
              <div className="break-after-page mt-12 pt-8 border-t-4 border-dashed border-black">
                <div className="text-center mb-4">
                  <h3 className="text-sm font-black uppercase tracking-wider underline">
                    LEMBAR JAWABAN UJIAN FISIK (LJK)
                  </h3>
                  <p className="text-xs font-bold uppercase mt-0.5">
                    {systemSettings.schoolName} • {exam.title} ({exam.code})
                  </p>
                </div>

                {/* Kotak Identitas LJK */}
                <div className="border border-black p-3 mb-4 grid grid-cols-2 gap-2 text-xs">
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
                    <span className="font-bold">Nilai Akhir:</span> [ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ]
                  </div>
                </div>

                {/* Petunjuk Pengisian */}
                <p className="text-[10px] italic mb-3">
                  * Berilah tanda silang (X) atau hitamkan bulatan pada huruf pilihan jawaban A, B, C, atau D yang Anda anggap paling benar.
                </p>

                {/* Grid Lembar Jawaban Pilihan Ganda */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 border border-black p-3 text-xs mb-4">
                  {questions.filter(q => q.type === 'multiple_choice' || q.type === 'multiple_choice_complex').map((q, idx) => (
                    <div key={q.id} className="flex items-center gap-1.5 py-0.5">
                      <span className="w-6 font-bold text-right">{idx + 1}.</span>
                      <div className="flex items-center gap-1 font-mono font-bold text-[11px]">
                        <span>(A)</span>
                        <span>(B)</span>
                        <span>(C)</span>
                        <span>(D)</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Area Jawaban Esai */}
                {essayCount > 0 && (
                  <div className="border border-black p-3 text-xs space-y-3">
                    <span className="font-bold block uppercase underline">LEMBAR JAWABAN KHUSUS ESAI / URAIAN:</span>
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

        {/* Modal Footer */}
        <div className="p-4 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 no-print">
          <div className="text-xs text-slate-500">
            {questions.length} Butir Soal ({pgCount} PG, {pgkCount} PG-K, {matchingCount} Jodoh, {essayCount} Esai) • Mode: <strong>{printMode === 'student' ? 'Naskah Siswa' : 'Arsip & Kunci Guru'}</strong>
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
              onClick={handleDownloadHtml}
              className="px-4 py-2 bg-slate-800 hover:bg-black text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition shadow-xs"
            >
              <Download className="w-4 h-4" />
              <span>Unduh HTML Offline</span>
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
