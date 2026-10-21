import React, { useState, useRef } from 'react';
import { 
  FileText, 
  Upload, 
  FileUp, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Layers, 
  CheckSquare, 
  ArrowRightLeft, 
  Edit3, 
  Sparkles,
  Info,
  Image as ImageIcon,
  KeyRound,
  Check,
  Calculator,
  Eye
} from 'lucide-react';
import { Question } from '../../types/cbt';
import { extractTextFromDocx, parseQuestionsFromText, getSampleWordTemplateText, ParseResult } from '../../services/wordExamParser';
import { MathRenderer } from '../common/MathRenderer';

interface WordExamImportModalProps {
  currentSubject?: string;
  onClose: () => void;
  onImport: (parsedQuestions: Question[], mode: 'append' | 'replace') => void;
}

export const WordExamImportModal: React.FC<WordExamImportModalProps> = ({
  currentSubject = 'Umum',
  onClose,
  onImport
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pastedText, setPastedText] = useState<string>('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [previewImageModal, setPreviewImageModal] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file selection (.docx)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);
    setFileName(file.name);
    setIsProcessing(true);

    try {
      let rawText = '';
      if (file.name.endsWith('.docx') || file.name.endsWith('.doc')) {
        const arrayBuffer = await file.arrayBuffer();
        rawText = await extractTextFromDocx(arrayBuffer);
      } else {
        // Plain text fallback or other text files
        rawText = await file.text();
      }

      if (!rawText.trim()) {
        throw new Error('Dokumen Word kosong atau tidak berisi teks yang terbaca.');
      }

      const result = parseQuestionsFromText(rawText, currentSubject);
      if (result.questions.length === 0) {
        throw new Error('Tidak ada butir soal yang berhasil terdeteksi dari dokumen ini. Periksa penomoran atau format teks soal.');
      }

      setParseResult(result);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Terjadi kesalahan saat memproses berkas Word.');
      setParseResult(null);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle parsing pasted text
  const handleParsePastedText = () => {
    if (!pastedText.trim()) {
      setErrorMessage('Silakan tempel (paste) teks soal terlebih dahulu.');
      return;
    }

    setErrorMessage(null);
    try {
      const result = parseQuestionsFromText(pastedText, currentSubject);
      if (result.questions.length === 0) {
        throw new Error('Format tidak terdeteksi. Pastikan ada penomoran soal (contoh: 1., 2.) dan pilihan jawaban/kunci.');
      }
      setParseResult(result);
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal memproses teks.');
    }
  };

  // Allow teacher to quick-change answer key directly in preview
  const handleSelectOptionKey = (questionIndex: number, optionId: string) => {
    if (!parseResult) return;

    const updatedQuestions = [...parseResult.questions];
    const targetQ = { ...updatedQuestions[questionIndex] };

    if (targetQ.type === 'multiple_choice_complex') {
      const currentKeys = targetQ.correctOptionIds || [];
      const isSelected = currentKeys.includes(optionId);
      const newKeys = isSelected ? currentKeys.filter(id => id !== optionId) : [...currentKeys, optionId];
      targetQ.correctOptionIds = newKeys;
      targetQ.correctOptionId = newKeys[0] || '';
      targetQ.options = targetQ.options.map(opt => ({
        ...opt,
        isCorrect: newKeys.includes(opt.id)
      }));
    } else {
      targetQ.correctOptionId = optionId;
      targetQ.correctOptionIds = [optionId];
      targetQ.options = targetQ.options.map(opt => ({
        ...opt,
        isCorrect: opt.id === optionId
      }));
    }

    updatedQuestions[questionIndex] = targetQ;
    setParseResult({
      ...parseResult,
      questions: updatedQuestions
    });
  };

  // Download template text
  const handleDownloadTemplate = () => {
    const templateContent = getSampleWordTemplateText();
    const blob = new Blob([templateContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Template_Soal_Word_CBT_MTs.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Apply parsed questions
  const handleConfirmImport = () => {
    if (!parseResult || parseResult.questions.length === 0) return;
    onImport(parseResult.questions, importMode);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
        
        {/* Top Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-blue-50 via-indigo-50/60 to-emerald-50/50 rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center shadow-md">
              <FileUp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-extrabold text-slate-900">
                  Upload & Impor Soal Dokumen Word (.docx)
                </h2>
                <span className="px-2 py-0.5 bg-blue-600 text-white text-[10px] font-black rounded-md tracking-wider">
                  WORD EQUATION & GAMBAR
                </span>
                <span className="px-2 py-0.5 bg-emerald-600 text-white text-[10px] font-black rounded-md tracking-wider">
                  KUNCI OTOMATIS
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Mendukung Equation rumus matematika (OMML/KaTeX), gambar langsung di Word, dan deteksi otomatis kunci jawaban di bawah pilihan ganda.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white hover:bg-slate-100 border border-slate-200 text-slate-500 flex items-center justify-center cursor-pointer transition shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Feature Highlights Bar */}
        <div className="px-6 py-2.5 bg-slate-50/80 border-b border-slate-200/80 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
          <div className="flex items-center gap-2 text-blue-900">
            <div className="w-5 h-5 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
              <Calculator className="w-3.5 h-3.5" />
            </div>
            <span><strong>Equation Otomatis:</strong> Rumus pecahan, akar, pangkat & matriks</span>
          </div>

          <div className="flex items-center gap-2 text-indigo-900">
            <div className="w-5 h-5 rounded-md bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
              <ImageIcon className="w-3.5 h-3.5" />
            </div>
            <span><strong>Gambar Langsung:</strong> Paste/Insert gambar di Word otomatis diekstrak</span>
          </div>

          <div className="flex items-center gap-2 text-emerald-900">
            <div className="w-5 h-5 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <KeyRound className="w-3.5 h-3.5" />
            </div>
            <span><strong>Kunci Otomatis:</strong> Tulis <em>KUNCI: A</em> di bawah pilihan ganda</span>
          </div>
        </div>

        {/* Tab & Download Guidelines Bar */}
        <div className="px-6 pt-3 pb-2 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-white">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('upload')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'upload'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Unggah File Word (.docx)</span>
            </button>

            <button
              onClick={() => setActiveTab('paste')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'paste'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Paste Teks Dokumen Word</span>
            </button>
          </div>

          <button
            onClick={handleDownloadTemplate}
            className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer transition shadow-2xs"
            title="Unduh format acuan penulisan soal Word"
          >
            <Download className="w-3.5 h-3.5 text-blue-600" />
            <span>Unduh Contoh Format Word</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          
          {/* TAB 1: UPLOAD FILE WORD */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".docx,.doc,.txt"
                onChange={handleFileChange}
                className="hidden"
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-blue-300 hover:border-blue-500 bg-blue-50/30 hover:bg-blue-50/60 rounded-2xl p-8 text-center cursor-pointer transition duration-200 group"
              >
                <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-blue-100 group-hover:bg-blue-200 text-blue-600 flex items-center justify-center transition shadow-xs">
                  <FileUp className="w-7 h-7" />
                </div>
                <h3 className="text-sm font-extrabold text-slate-800">
                  {fileName ? `File Terpilih: ${fileName}` : 'Klik untuk Memilih File Dokumen Word (.docx)'}
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Format didukung: <span className="font-semibold text-blue-600">Microsoft Word (.docx)</span> dengan Equation rumus, gambar tersemat, dan kunci jawaban otomatis.
                </p>
                <button
                  type="button"
                  className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs inline-flex items-center gap-2 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Pilih Berkas Word dari Komputer</span>
                </button>
              </div>

              {isProcessing && (
                <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center gap-3 text-indigo-700 text-xs font-medium animate-pulse">
                  <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin shrink-0" />
                  <span>Mengekstrak naskah soal, memproses rumus Equation matematika, mengekstrak gambar, dan mendeteksi kunci jawaban...</span>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PASTE RAW TEXT */}
          {activeTab === 'paste' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">
                  Salin & Tempel Naskah Soal dari Microsoft Word:
                </label>
                <button
                  type="button"
                  onClick={() => setPastedText(getSampleWordTemplateText())}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Gunakan Contoh Format Soal</span>
                </button>
              </div>

              <textarea
                rows={7}
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Tempel teks soal dari Word di sini...&#10;Contoh:&#10;1. Berapakah hasil dari \frac{1}{2} + \frac{1}{4}?&#10;A. \frac{1}{6}&#10;B. \frac{2}{6}&#10;C. \frac{3}{4}&#10;D. \frac{1}{4}&#10;KUNCI: C"
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition leading-relaxed"
              />

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleParsePastedText}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Analisis & Ekstrak Soal</span>
                </button>
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-rose-800 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold">Gagal Mengimpor: </strong>
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          {/* Quick Syntax Cheat-Sheet Box */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-700">
              <Info className="w-4 h-4 text-blue-600" />
              <span>Petunjuk Format Penulisan Soal di Microsoft Word:</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-slate-600 pt-1">
              <div className="p-2.5 bg-white rounded-xl border border-slate-100 space-y-1">
                <strong className="text-blue-800 flex items-center gap-1 font-bold">
                  <Calculator className="w-3 h-3 text-blue-600" />
                  <span>1. Rumus / Equation</span>
                </strong>
                <p className="text-[10px] text-slate-500">
                  Gunakan menu <em>Insert &gt; Equation</em> di Word atau format LaTeX seperti <code>$\frac&#123;a&#125;&#123;b&#125;$</code> atau <code>$\sqrt&#123;144&#125;$</code>.
                </p>
              </div>

              <div className="p-2.5 bg-white rounded-xl border border-slate-100 space-y-1">
                <strong className="text-indigo-800 flex items-center gap-1 font-bold">
                  <ImageIcon className="w-3 h-3 text-indigo-600" />
                  <span>2. Gambar Langsung</span>
                </strong>
                <p className="text-[10px] text-slate-500">
                  Sisipkan gambar langsung di Word (Copy-Paste / Insert Picture) tepat di bawah soal atau opsi.
                </p>
              </div>

              <div className="p-2.5 bg-white rounded-xl border border-slate-100 space-y-1">
                <strong className="text-emerald-800 flex items-center gap-1 font-bold">
                  <KeyRound className="w-3 h-3 text-emerald-600" />
                  <span>3. Kunci Jawaban Otomatis</span>
                </strong>
                <p className="text-[10px] text-slate-500">
                  Tulis <code>KUNCI: B</code> atau <code>Kunci Jawaban: C</code> tepat di bawah pilihan ganda.
                </p>
              </div>
            </div>
          </div>

          {/* PARSED RESULTS REVIEW SECTION */}
          {parseResult && (
            <div className="space-y-4 pt-2 border-t border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Hasil Deteksi Butir Soal ({parseResult.stats.total} Soal)</span>
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Periksa ringkasan soal, rumus KaTeX, gambar terlampir, dan kunci jawaban yang terdeteksi otomatis.
                  </p>
                </div>

                {/* Status Kunci Otomatis Pill */}
                <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-full text-emerald-800 text-xs font-bold self-start sm:self-center">
                  <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Kunci Terdeteksi Otomatis: {parseResult.stats.keysDetected} / {parseResult.stats.total} Soal</span>
                </div>
              </div>

              {/* Composition Stats Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-center">
                  <span className="text-[11px] font-bold text-blue-700 block">Pilihan Ganda</span>
                  <span className="text-lg font-black text-blue-900">{parseResult.stats.multiple_choice}</span>
                </div>
                <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl text-center">
                  <span className="text-[11px] font-bold text-indigo-700 block">PG Kompleks (&gt;1)</span>
                  <span className="text-lg font-black text-indigo-900">{parseResult.stats.multiple_choice_complex}</span>
                </div>
                <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-center">
                  <span className="text-[11px] font-bold text-emerald-700 block">Rumus Equation</span>
                  <span className="text-lg font-black text-emerald-900">{parseResult.stats.withEquations}</span>
                </div>
                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-center">
                  <span className="text-[11px] font-bold text-amber-700 block">Gambar Terlampir</span>
                  <span className="text-lg font-black text-amber-900">{parseResult.stats.withImages}</span>
                </div>
              </div>

              {/* Warnings if any */}
              {parseResult.stats.warnings.length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
                  <span className="text-xs font-bold text-amber-800 block">Catatan Peringatan:</span>
                  {parseResult.stats.warnings.map((w, idx) => (
                    <p key={idx} className="text-[11px] text-amber-700">• {w}</p>
                  ))}
                </div>
              )}

              {/* Questions Preview List (Compact Cards with live KaTeX & Key badges) */}
              <div className="max-h-72 overflow-y-auto space-y-3 border border-slate-200 rounded-2xl p-3 bg-slate-50/50">
                {parseResult.questions.map((q, idx) => {
                  const hasEquation = q.text.includes('$') || q.text.includes('\\frac') || q.text.includes('\\sqrt') || q.options.some(o => o.text.includes('$') || o.text.includes('\\frac'));
                  
                  return (
                    <div key={q.id || idx} className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-md bg-slate-800 text-white font-extrabold text-[11px] flex items-center justify-center">
                            {idx + 1}
                          </span>
                          
                          {/* Type badge */}
                          {q.type === 'multiple_choice' && (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-md text-[10px] font-extrabold">
                              Pilihan Ganda
                            </span>
                          )}
                          {q.type === 'multiple_choice_complex' && (
                            <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-md text-[10px] font-extrabold">
                              PG Kompleks (&gt;1 Kunci)
                            </span>
                          )}
                          {q.type === 'matching' && (
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded-md text-[10px] font-extrabold">
                              Menjodohkan ({q.matchingPairs?.length || 0} Pasang)
                            </span>
                          )}
                          {q.type === 'essay' && (
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md text-[10px] font-extrabold">
                              Esai / Uraian
                            </span>
                          )}

                          {/* Equation badge */}
                          {hasEquation && (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md text-[10px] font-extrabold flex items-center gap-1">
                              <Calculator className="w-3 h-3" />
                              <span>Rumus KaTeX</span>
                            </span>
                          )}

                          {/* Image badge */}
                          {q.image && (
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md text-[10px] font-extrabold flex items-center gap-1">
                              <ImageIcon className="w-3 h-3" />
                              <span>Ada Gambar</span>
                            </span>
                          )}
                        </div>

                        <span className="text-xs font-bold text-slate-500">{q.points} Poin</span>
                      </div>

                      {/* Question Text with MathRenderer */}
                      <div className="text-xs font-medium text-slate-800 leading-relaxed">
                        <MathRenderer text={q.text} />
                      </div>

                      {/* Question Image Preview Thumbnail */}
                      {q.image && (
                        <div className="p-2 bg-slate-50 rounded-xl border border-slate-200 inline-flex items-center gap-3">
                          <img 
                            src={q.image} 
                            alt={`Lampiran Soal #${idx + 1}`} 
                            className="h-16 w-auto max-w-xs object-contain rounded border border-slate-300 bg-white" 
                          />
                          <button
                            type="button"
                            onClick={() => setPreviewImageModal(q.image!)}
                            className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700 flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3 h-3 text-blue-600" />
                            <span>Perbesar Gambar</span>
                          </button>
                        </div>
                      )}

                      {/* Multiple Choice Options Preview with Interactive Key Selector */}
                      {(q.type === 'multiple_choice' || q.type === 'multiple_choice_complex') && (
                        <div className="pt-1 space-y-1.5 border-t border-slate-100">
                          <div className="flex items-center justify-between text-[11px] text-slate-500">
                            <span className="font-semibold">Opsi Jawaban & Kunci:</span>
                            <span className="text-[10px] text-slate-400 italic">Klik tombol huruf opsi untuk mengganti kunci jawaban</span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {q.options.map((opt, optIdx) => {
                              const letter = String.fromCharCode(65 + optIdx);
                              const isCorrect = q.type === 'multiple_choice_complex'
                                ? Boolean(q.correctOptionIds?.includes(opt.id))
                                : q.correctOptionId === opt.id;

                              return (
                                <div 
                                  key={opt.id}
                                  onClick={() => handleSelectOptionKey(idx, opt.id)}
                                  className={`p-2 rounded-lg border text-xs flex items-start gap-2 cursor-pointer transition select-none ${
                                    isCorrect 
                                      ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-semibold ring-1 ring-emerald-300' 
                                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                                  }`}
                                >
                                  <span className={`w-5 h-5 rounded flex items-center justify-center font-black text-[10px] shrink-0 ${
                                    isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                                  }`}>
                                    {isCorrect ? <Check className="w-3 h-3" /> : letter}
                                  </span>

                                  <div className="flex-1 min-w-0">
                                    <MathRenderer text={opt.text} inline />
                                    {opt.image && (
                                      <div className="mt-1">
                                        <img src={opt.image} alt="Opsi" className="h-10 object-contain rounded border" />
                                      </div>
                                    )}
                                  </div>

                                  {isCorrect && (
                                    <span className="px-1.5 py-0.5 bg-emerald-600 text-white text-[9px] font-black rounded shrink-0">
                                      KUNCI
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Matching details */}
                      {q.type === 'matching' && q.matchingPairs && (
                        <div className="text-[11px] text-purple-700 pt-1">
                          {q.matchingPairs.slice(0, 2).map(p => `"${p.leftPrompt} ➔ ${p.rightAnswer}"`).join(', ')}
                          {q.matchingPairs.length > 2 && ` (+${q.matchingPairs.length - 2} lainnya)`}
                        </div>
                      )}

                      {/* Essay details */}
                      {q.type === 'essay' && q.sampleAnswer && (
                        <div className="text-[11px] text-amber-800 line-clamp-1 italic pt-1">
                          Kunci / Rubrik: {q.sampleAnswer}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Mode Selection */}
              <div className="p-3 bg-slate-100 rounded-xl flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Metode Penggabungan Soal:</span>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="importMode"
                      value="append"
                      checked={importMode === 'append'}
                      onChange={() => setImportMode('append')}
                      className="accent-blue-600"
                    />
                    <span>Tambahkan ke Soal Saat Ini</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="importMode"
                      value="replace"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                      className="accent-blue-600"
                    />
                    <span>Gantikan Semua Soal</span>
                  </label>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Modal Bottom Actions */}
        <div className="p-5 border-t border-slate-200 bg-slate-50/80 rounded-b-3xl flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-4 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer transition"
          >
            Batal
          </button>

          <button
            type="button"
            disabled={!parseResult || parseResult.questions.length === 0}
            onClick={handleConfirmImport}
            className={`py-2.5 px-5 font-black rounded-xl text-xs flex items-center gap-2 cursor-pointer transition shadow-md ${
              parseResult && parseResult.questions.length > 0
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200 active:scale-95'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Masukkan {parseResult?.questions.length || 0} Soal ke Ujian</span>
          </button>
        </div>

      </div>

      {/* Lightbox Modal for Image Preview */}
      {previewImageModal && (
        <div 
          onClick={() => setPreviewImageModal(null)}
          className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in"
        >
          <div className="max-w-2xl max-h-[85vh] bg-white p-3 rounded-2xl shadow-2xl overflow-hidden">
            <img src={previewImageModal} alt="Preview Soal" className="max-h-[80vh] w-auto object-contain mx-auto rounded-lg" />
            <p className="text-center text-xs text-slate-500 mt-2 font-semibold">Klik di mana saja untuk menutup</p>
          </div>
        </div>
      )}
    </div>
  );
};
