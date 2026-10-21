import React, { useState } from 'react';
import { 
  FileText, 
  X, 
  Save, 
  Plus, 
  Trash2, 
  Copy, 
  Check, 
  Sparkles, 
  UploadCloud, 
  Layers, 
  Settings2, 
  ArrowRightLeft, 
  Edit3, 
  CheckSquare,
  Key,
  RotateCcw,
  Image as ImageIcon,
  Upload,
  Search,
  Link as LinkIcon,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  ChevronUp,
  School,
  AlertCircle,
  Printer,
  Calendar,
  Clock
} from 'lucide-react';
import { ClassGroup, Exam, Question, QuestionOption, QuestionType } from '../../types/cbt';
import { useCbt } from '../../context/CbtContext';
import { WordExamImportModal } from '../admin/WordExamImportModal';
import { PrintExamModal } from './PrintExamModal';

export interface ExamQuestionBuilderModalProps {
  targetClassId?: string | null;
  classes: ClassGroup[];
  initialExam?: Exam | null;
  onClose: () => void;
  onSave: (exam: Exam) => void;
}

export const ExamQuestionBuilderModal: React.FC<ExamQuestionBuilderModalProps> = ({
  targetClassId,
  classes,
  initialExam,
  onClose,
  onSave
}) => {
  const { currentUser } = useCbt();

  // Active step: 'meta' (Identitas & Kelas) or 'questions' (Susun Butir Soal Menurun Ke Bawah)
  const [activeStep, setActiveStep] = useState<'meta' | 'questions'>(initialExam ? 'questions' : 'meta');

  // Exam Meta Form
  const [title, setTitle] = useState(initialExam?.title || 'Asesmen Sumatif: Fikih Thaharah & Ibadah');
  const [code, setCode] = useState(initialExam?.code || `AM-FIQ-${Math.floor(100 + Math.random() * 900)}`);
  const [subject, setSubject] = useState(initialExam?.subject || 'Fikih MTs');
  const [durationMinutes, setDurationMinutes] = useState(initialExam?.durationMinutes || 45);
  const [passingGrade, setPassingGrade] = useState(initialExam?.passingGrade || 75);
  const [academicYear, setAcademicYear] = useState(initialExam?.academicYear || '2026/2027');
  const [semester, setSemester] = useState(initialExam?.semester || 'Genap');
  const [selectedClasses, setSelectedClasses] = useState<string[]>(
    initialExam?.classesAllowed 
      ? initialExam.classesAllowed 
      : targetClassId 
        ? [targetClassId] 
        : classes.slice(0, 2).map(c => c.id)
  );
  const [randomizeQuestions, setRandomizeQuestions] = useState(initialExam?.randomizeQuestions ?? true);
  const [randomizeOptions, setRandomizeOptions] = useState(initialExam?.randomizeOptions ?? true);

  // Helper to generate a clean 6-character alphanumeric exam token
  const generateRandomToken = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let res = '';
    for (let i = 0; i < 6; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return res;
  };

  // Exam Access Token
  const [token, setToken] = useState<string>(initialExam?.token || generateRandomToken());
  const [tokenCopied, setTokenCopied] = useState<boolean>(false);

  // Helper to format date string YYYY-MM-DD
  const formatDateToYmd = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Tanggal & Jam Pelaksanaan Ujian
  const [examDate, setExamDate] = useState<string>(
    initialExam?.examDate || 
    (initialExam?.startTime ? initialExam.startTime.split('T')[0] : formatDateToYmd(new Date()))
  );
  const [examStartTime, setExamStartTime] = useState<string>(initialExam?.examStartTime || '07:30');
  const [examEndTime, setExamEndTime] = useState<string>(initialExam?.examEndTime || '09:00');

  const [syncAllQuestionsDate, setSyncAllQuestionsDate] = useState<boolean>(true);

  const handleUpdateExamDate = (newDate: string) => {
    setExamDate(newDate);
    if (syncAllQuestionsDate) {
      setQuestions(prev => prev.map(q => ({
        ...q,
        examDate: newDate
      })));
    }
  };

  // Quick Date Selectors
  const setDateToToday = () => handleUpdateExamDate(formatDateToYmd(new Date()));
  const setDateToTomorrow = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    handleUpdateExamDate(formatDateToYmd(d));
  };
  const setDateToDayAfterTomorrow = () => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    handleUpdateExamDate(formatDateToYmd(d));
  };

  const handleSyncAllQuestionsDate = () => {
    setQuestions(prev => prev.map(q => ({
      ...q,
      examDate: examDate
    })));
  };

  // Questions State
  const [questions, setQuestions] = useState<Question[]>(
    initialExam?.questions && initialExam.questions.length > 0
      ? initialExam.questions
      : [
          {
            id: 'q-1',
            number: 1,
            type: 'multiple_choice',
            text: 'Berikut ini yang termasuk syarat sah shalat fardhu menurut Mazhab Syafi\'i adalah...',
            points: 10,
            category: 'Fikih Ibadah',
            difficulty: 'mudah',
            options: [
              { id: 'opt-1-a', text: 'Menghadap kiblat dan suci dari hadats kecil maupun besar' },
              { id: 'opt-1-b', text: 'Membaca Surat Al-Fatihah dengan tartil' },
              { id: 'opt-1-c', text: 'Melakukan ruku\' disertai thuma\'ninah' },
              { id: 'opt-1-d', text: 'Mengucapkan salam pertama ke arah kanan' }
            ],
            correctOptionId: 'opt-1-a'
          },
          {
            id: 'q-2',
            number: 2,
            type: 'multiple_choice',
            text: 'Air suci yang dapat digunakan untuk bersuci (thaharah) sekaligus menyucikan benda lain disebut...',
            points: 10,
            category: 'Thaharah',
            difficulty: 'sedang',
            options: [
              { id: 'opt-2-a', text: 'Air Mutanajis' },
              { id: 'opt-2-b', text: 'Air Mutlak (Thahur)' },
              { id: 'opt-2-c', text: 'Air Musta\'mal' },
              { id: 'opt-2-d', text: 'Air Musyammas' }
            ],
            correctOptionId: 'opt-2-b'
          },
          {
            id: 'q-3',
            number: 3,
            type: 'multiple_choice',
            text: 'Batas minimal nisab zakat mal emas murni yang wajib dizakati setelah mencapai haul 1 tahun adalah setara dengan...',
            points: 10,
            category: 'Zakat & Muamalah',
            difficulty: 'sedang',
            options: [
              { id: 'opt-3-a', text: '50 gram emas' },
              { id: 'opt-3-b', text: '85 gram emas murni (20 Dinar)' },
              { id: 'opt-3-c', text: '100 gram emas' },
              { id: 'opt-3-d', text: '120 gram emas' }
            ],
            correctOptionId: 'opt-3-b'
          }
        ]
  );

  const [showWordImportModal, setShowWordImportModal] = useState<boolean>(false);
  const [questionSearchQuery, setQuestionSearchQuery] = useState<string>('');
  
  // State for which cards are collapsed (by question ID)
  const [collapsedCardIds, setCollapsedCardIds] = useState<Record<string, boolean>>({});
  
  // State for showing URL input box per question index
  const [activeUrlInputIndex, setActiveUrlInputIndex] = useState<number | null>(null);
  const [tempUrlInput, setTempUrlInput] = useState<string>('');
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);

  // Toggle Collapse All / Expand All
  const handleToggleCollapseAll = (collapse: boolean) => {
    const next: Record<string, boolean> = {};
    questions.forEach(q => {
      next[q.id] = collapse;
    });
    setCollapsedCardIds(next);
  };

  const toggleSingleCollapse = (qId: string) => {
    setCollapsedCardIds(prev => ({
      ...prev,
      [qId]: !prev[qId]
    }));
  };

  // Image Upload handler (Compressed via canvas to keep Firestore document size light)
  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>, questionIdx: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Pilih berkas gambar yang valid (JPG, PNG, WEBP, GIF).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const rawUrl = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const maxDim = 1200;
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.82);
          setQuestions(prev => prev.map((q, i) => i === questionIdx ? { ...q, image: compressed } : q));
        }
      };
      img.src = rawUrl;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleApplyImageUrl = (questionIdx: number) => {
    if (!tempUrlInput.trim()) return;
    setQuestions(prev => prev.map((q, i) => i === questionIdx ? { ...q, image: tempUrlInput.trim() } : q));
    setTempUrlInput('');
    setActiveUrlInputIndex(null);
  };

  const handleRemoveImage = (questionIdx: number) => {
    setQuestions(prev => prev.map((q, i) => i === questionIdx ? { ...q, image: undefined } : q));
  };

  // Option Image Upload Handler (Opsional untuk Opsi Pilihan)
  const handleOptionImageUpload = (e: React.ChangeEvent<HTMLInputElement>, questionIdx: number, optIdx: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const rawUrl = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const maxDim = 600;
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.8);
          setQuestions(prev => prev.map((q, i) => {
            if (i !== questionIdx) return q;
            const updatedOpts = [...q.options];
            updatedOpts[optIdx] = { ...updatedOpts[optIdx], image: compressed };
            return { ...q, options: updatedOpts };
          }));
        }
      };
      img.src = rawUrl;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemoveOptionImage = (questionIdx: number, optIdx: number) => {
    setQuestions(prev => prev.map((q, i) => {
      if (i !== questionIdx) return q;
      const updatedOpts = [...q.options];
      updatedOpts[optIdx] = { ...updatedOpts[optIdx], image: undefined };
      return { ...q, options: updatedOpts };
    }));
  };

  // Toggle Class selection
  const handleToggleClass = (clsId: string) => {
    setSelectedClasses(prev => 
      prev.includes(clsId) ? prev.filter(id => id !== clsId) : [...prev, clsId]
    );
  };

  const handleSelectAllClasses = () => {
    if (selectedClasses.length === classes.length) {
      setSelectedClasses([]);
    } else {
      setSelectedClasses(classes.map(c => c.id));
    }
  };

  // Change question type for specific question
  const handleQuestionTypeChange = (questionIdx: number, newType: QuestionType) => {
    setQuestions(prev => prev.map((q, i) => {
      if (i !== questionIdx) return q;
      const updated: Question = { ...q, type: newType };
      if (newType === 'multiple_choice_complex') {
        if (!updated.correctOptionIds || updated.correctOptionIds.length === 0) {
          updated.correctOptionIds = updated.correctOptionId ? [updated.correctOptionId] : [updated.options[0]?.id || 'opt-1-a'];
        }
      } else if (newType === 'matching') {
        if (!updated.matchingPairs || updated.matchingPairs.length === 0) {
          updated.matchingPairs = [
            { id: `pair-${Date.now()}-1`, leftPrompt: 'Kitab Taurat', rightAnswer: 'Nabi Musa AS' },
            { id: `pair-${Date.now()}-2`, leftPrompt: 'Kitab Zabur', rightAnswer: 'Nabi Daud AS' },
            { id: `pair-${Date.now()}-3`, leftPrompt: 'Kitab Injil', rightAnswer: 'Nabi Isa AS' },
            { id: `pair-${Date.now()}-4`, leftPrompt: 'Kitab Al-Qur\'an', rightAnswer: 'Nabi Muhammad SAW' },
          ];
        }
      } else if (newType === 'essay') {
        if (!updated.sampleAnswer) {
          updated.sampleAnswer = 'Jawaban referensi / rubrik penilaian guru...';
        }
        if (!updated.keywords) {
          updated.keywords = ['kata kunci 1', 'kata kunci 2'];
        }
      }
      return updated;
    }));
  };

  // Toggle multiple correct options for multiple_choice_complex
  const handleToggleCorrectOptionMulti = (questionIdx: number, optId: string) => {
    setQuestions(prev => prev.map((q, i) => {
      if (i !== questionIdx) return q;
      const current = q.correctOptionIds || (q.correctOptionId ? [q.correctOptionId] : []);
      const exists = current.includes(optId);
      let next: string[];
      if (exists) {
        if (current.length <= 1) return q; // keep at least one
        next = current.filter(id => id !== optId);
      } else {
        next = [...current, optId];
      }
      return { ...q, correctOptionIds: next, correctOptionId: next[0] };
    }));
  };

  // Add option to multiple choice
  const handleAddOption = (questionIdx: number) => {
    setQuestions(prev => prev.map((q, i) => {
      if (i !== questionIdx) return q;
      const opts = q.options || [];
      const letter = String.fromCharCode(65 + opts.length);
      const newOpt: QuestionOption = {
        id: `opt-${Date.now()}-${opts.length}`,
        text: `Pilihan Opsi ${letter}`,
      };
      return { ...q, options: [...opts, newOpt] };
    }));
  };

  // Delete option
  const handleDeleteOption = (questionIdx: number, optIndex: number) => {
    setQuestions(prev => prev.map((q, i) => {
      if (i !== questionIdx) return q;
      if (q.options.length <= 2) {
        alert('Minimal harus ada 2 opsi pilihan.');
        return q;
      }
      const targetOpt = q.options[optIndex];
      const remaining = q.options.filter((_, idx) => idx !== optIndex);
      let correctId = q.correctOptionId;
      let correctIds = q.correctOptionIds || [];
      if (correctId === targetOpt.id) correctId = remaining[0]?.id;
      correctIds = correctIds.filter(id => id !== targetOpt.id);
      if (correctIds.length === 0) correctIds = [remaining[0]?.id];
      return { ...q, options: remaining, correctOptionId: correctId, correctOptionIds: correctIds };
    }));
  };

  // Matching pairs handlers
  const handleAddMatchingPair = (questionIdx: number) => {
    setQuestions(prev => prev.map((q, i) => {
      if (i !== questionIdx) return q;
      const currentPairs = q.matchingPairs || [];
      const newPair = {
        id: `pair-${Date.now()}-${currentPairs.length + 1}`,
        leftPrompt: `Pernyataan Premis ${currentPairs.length + 1}`,
        rightAnswer: `Jawaban Pasangan ${currentPairs.length + 1}`
      };
      return { ...q, matchingPairs: [...currentPairs, newPair] };
    }));
  };

  const handleUpdateMatchingPair = (questionIdx: number, pairIdx: number, field: 'leftPrompt' | 'rightAnswer', val: string) => {
    setQuestions(prev => prev.map((q, i) => {
      if (i !== questionIdx) return q;
      const pairs = [...(q.matchingPairs || [])];
      pairs[pairIdx] = { ...pairs[pairIdx], [field]: val };
      return { ...q, matchingPairs: pairs };
    }));
  };

  const handleDeleteMatchingPair = (questionIdx: number, pairIdx: number) => {
    setQuestions(prev => prev.map((q, i) => {
      if (i !== questionIdx) return q;
      const pairs = (q.matchingPairs || []).filter((_, idx) => idx !== pairIdx);
      return { ...q, matchingPairs: pairs };
    }));
  };

  // Add new question of default type (at bottom or inserted at index)
  const handleAddNewQuestion = (type: QuestionType = 'multiple_choice', insertAfterIdx?: number) => {
    const newQ: Question = {
      id: `q-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      number: questions.length + 1,
      type,
      text: type === 'matching' 
        ? 'Pasangkanlah setiap pernyataan berikut dengan jawaban yang benar:' 
        : type === 'essay'
          ? 'Jelaskan hikmah disyariatkannya ibadah shalat berjamaah...'
          : 'Tuliskan teks pertanyaan baru di sini...',
      points: 10,
      category: subject,
      difficulty: 'sedang',
      options: [
        { id: `opt-${Date.now()}-a`, text: 'Pilihan Jawaban A' },
        { id: `opt-${Date.now()}-b`, text: 'Pilihan Jawaban B' },
        { id: `opt-${Date.now()}-c`, text: 'Pilihan Jawaban C' },
        { id: `opt-${Date.now()}-d`, text: 'Pilihan Jawaban D' },
      ],
      correctOptionId: `opt-${Date.now()}-a`,
      correctOptionIds: [`opt-${Date.now()}-a`],
      matchingPairs: type === 'matching' ? [
        { id: `pair-${Date.now()}-1`, leftPrompt: 'Rukun Iman ke-1', rightAnswer: 'Iman kepada Allah SWT' },
        { id: `pair-${Date.now()}-2`, leftPrompt: 'Rukun Iman ke-2', rightAnswer: 'Iman kepada Malaikat Allah' },
        { id: `pair-${Date.now()}-3`, leftPrompt: 'Rukun Iman ke-3', rightAnswer: 'Iman kepada Kitab-Kitab Allah' },
      ] : undefined,
      sampleAnswer: type === 'essay' ? 'Kunci jawaban referensi...' : undefined,
      keywords: type === 'essay' ? ['kata kunci'] : undefined
    };

    if (typeof insertAfterIdx === 'number') {
      const next = [...questions];
      next.splice(insertAfterIdx + 1, 0, newQ);
      const renumbered = next.map((q, i) => ({ ...q, number: i + 1 }));
      setQuestions(renumbered);
      setTimeout(() => {
        document.getElementById(`question-card-${newQ.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    } else {
      const renumbered = [...questions, newQ].map((q, i) => ({ ...q, number: i + 1 }));
      setQuestions(renumbered);
      setTimeout(() => {
        document.getElementById(`question-card-${newQ.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  };

  // Duplicate question
  const handleDuplicateQuestion = (index: number) => {
    const source = questions[index];
    const newQ: Question = {
      ...source,
      id: `q-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      number: questions.length + 1,
      text: `${source.text} (Salinan)`
    };
    const next = [...questions];
    next.splice(index + 1, 0, newQ);
    const renumbered = next.map((q, i) => ({ ...q, number: i + 1 }));
    setQuestions(renumbered);
    setTimeout(() => {
      document.getElementById(`question-card-${newQ.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  // Delete question
  const handleDeleteQuestion = (index: number) => {
    if (questions.length <= 1) {
      alert('Paket ujian harus memiliki minimal 1 butir soal.');
      return;
    }
    if (confirm(`Hapus butir soal #${index + 1}?`)) {
      const updated = questions.filter((_, i) => i !== index).map((q, idx) => ({
        ...q,
        number: idx + 1
      }));
      setQuestions(updated);
    }
  };

  // Move Question Up / Down
  const handleMoveQuestion = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= questions.length) return;
    const next = [...questions];
    const temp = next[index];
    next[index] = next[targetIndex];
    next[targetIndex] = temp;
    const renumbered = next.map((q, i) => ({ ...q, number: i + 1 }));
    setQuestions(renumbered);
  };

  // Update specific question field
  const handleUpdateQuestion = (questionIdx: number, field: keyof Question, value: any) => {
    setQuestions(prev => prev.map((q, i) => i === questionIdx ? { ...q, [field]: value } : q));
  };

  // Update option text for specific question
  const handleUpdateOptionText = (questionIdx: number, optIndex: number, text: string) => {
    setQuestions(prev => prev.map((q, i) => {
      if (i !== questionIdx) return q;
      const newOpts = [...q.options];
      newOpts[optIndex] = { ...newOpts[optIndex], text };
      return { ...q, options: newOpts };
    }));
  };

  // Set correct option for specific question (Single choice)
  const handleSetCorrectOption = (questionIdx: number, optId: string) => {
    setQuestions(prev => prev.map((q, i) => {
      if (i !== questionIdx) return q;
      return { ...q, correctOptionId: optId, correctOptionIds: [optId] };
    }));
  };

  // Load sample questions template with all 4 question types
  const handleLoadSampleTemplate = () => {
    const sampleQuestions: Question[] = [
      {
        id: `q-tpl-1`,
        number: 1,
        type: 'multiple_choice',
        text: 'Manakah di antara shalat sunnah berikut yang hukumnya sunnah muakkad dan dikerjakan mengiringi shalat fardhu?',
        points: 10,
        category: 'Fikih Shalat',
        difficulty: 'mudah',
        options: [
          { id: 'opt-t1-a', text: 'Shalat Sunnah Rawatib' },
          { id: 'opt-t1-b', text: 'Shalat Sunnah Istisqa' },
          { id: 'opt-t1-c', text: 'Shalat Sunnah Khusuf' },
          { id: 'opt-t1-d', text: 'Shalat Sunnah Tahiyyatul Masjid' }
        ],
        correctOptionId: 'opt-t1-a'
      },
      {
        id: `q-tpl-2`,
        number: 2,
        type: 'multiple_choice_complex',
        text: 'Manakah di antara pernyataan berikut yang merupakan sebab-sebab diperbolehkannya melakukan sujud sahwi? (Pilih lebih dari satu jawaban benar):',
        points: 15,
        category: 'Fikih Ibadah',
        difficulty: 'sedang',
        options: [
          { id: 'opt-t2-a', text: 'Lupa meninggalkan tasyahud awal (sunnah ab\'adh)' },
          { id: 'opt-t2-b', text: 'Ragu-ragu terhadap jumlah rakaat yang telah dikerjakan' },
          { id: 'opt-t2-c', text: 'Tertawa terbahak-bahak saat berdiri membaca Al-Fatihah' },
          { id: 'opt-t2-d', text: 'Kelebihan rakaat shalat karena lupa' }
        ],
        correctOptionIds: ['opt-t2-a', 'opt-t2-b', 'opt-t2-d']
      },
      {
        id: `q-tpl-3`,
        number: 3,
        type: 'matching',
        text: 'Pasangkanlah nama kitab suci samawi di kolom kiri dengan nama Nabi penerima wahyu di kolom kanan secara tepat:',
        points: 20,
        category: 'Aqidah Islam',
        difficulty: 'sedang',
        matchingPairs: [
          { id: 'p-1', leftPrompt: 'Kitab Taurat', rightAnswer: 'Nabi Musa AS' },
          { id: 'p-2', leftPrompt: 'Kitab Zabur', rightAnswer: 'Nabi Daud AS' },
          { id: 'p-3', leftPrompt: 'Kitab Injil', rightAnswer: 'Nabi Isa AS' },
          { id: 'p-4', leftPrompt: 'Kitab Al-Qur\'an', rightAnswer: 'Nabi Muhammad SAW' }
        ],
        options: []
      },
      {
        id: `q-tpl-4`,
        number: 4,
        type: 'essay',
        text: 'Jelaskan perbedaan mendasar antara zakat fitrah dan zakat mal dari segi waktu penunaian, objek yang dizakati, dan tujuan utamanya!',
        points: 25,
        category: 'Fikih Muamalah',
        difficulty: 'sukar',
        sampleAnswer: 'Zakat fitrah ditunaikan selama bulan Ramadhan sebelum shalat Idul Fitri berupa makanan pokok untuk mensucikan jiwa orang berpuasa. Sedangkan zakat mal ditunaikan saat harta (emas, perak, perniagaan, hasil bumi) mencapai nisab dan haul 1 tahun untuk membersihkan harta kekayaan.',
        keywords: ['ramadhan', 'idul fitri', 'makanan pokok', 'haul', 'nisab', 'emas', 'perak'],
        options: []
      }
    ];

    setQuestions(sampleQuestions);
    alert('Template paket soal komprehensif (PG, PG Kompleks, Menjodohkan, Esai) berhasil dimuat!');
  };

  // Word import handler
  const handleWordImport = (parsedQuestions: Question[], mode: 'append' | 'replace') => {
    if (mode === 'replace') {
      const renumbered = parsedQuestions.map((q, idx) => ({ ...q, number: idx + 1 }));
      setQuestions(renumbered);
    } else {
      const startNum = questions.length;
      const renumbered = parsedQuestions.map((q, idx) => ({ ...q, number: startNum + idx + 1 }));
      setQuestions(prev => [...prev, ...renumbered]);
    }
    setShowWordImportModal(false);
    setActiveStep('questions');
    alert(`Berhasil mengimpor ${parsedQuestions.length} butir soal dari dokumen Word!`);
  };

  // Submit Exam Creation
  const handleSaveExam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Judul ujian wajib diisi.');
      return;
    }
    if (selectedClasses.length === 0) {
      alert('Pilih minimal satu rombel / kelas sasaran ujian.');
      return;
    }
    if (questions.length === 0) {
      alert('Buat minimal 1 butir soal.');
      return;
    }

    const savedExam: Exam = {
      id: initialExam ? initialExam.id : `exm-${Date.now()}`,
      code: code.trim().toUpperCase(),
      title: title.trim(),
      subject: subject.trim(),
      academicYear,
      semester,
      durationMinutes,
      passingGrade,
      totalQuestions: questions.length,
      classesAllowed: selectedClasses,
      randomizeQuestions,
      randomizeOptions,
      token: token.trim().toUpperCase() || generateRandomToken(),
      authorId: initialExam?.authorId || currentUser?.id,
      authorName: initialExam?.authorName || currentUser?.name,
      authorUsername: initialExam?.authorUsername || currentUser?.username,
      maxViolationsAllowed: initialExam?.maxViolationsAllowed ?? 3,
      status: initialExam?.status || 'active',
      examDate,
      examStartTime,
      examEndTime,
      startTime: `${examDate}T${examStartTime}:00Z`,
      endTime: `${examDate}T${examEndTime}:00Z`,
      questions: questions.map(q => ({
        ...q,
        examDate: q.examDate || examDate
      }))
    };

    onSave(savedExam);
  };

  // Filtered questions based on search query
  const filteredQuestions = questions.filter((q, idx) => {
    if (!questionSearchQuery.trim()) return true;
    const query = questionSearchQuery.toLowerCase();
    return (
      `soal ${idx + 1}`.includes(query) ||
      `#${idx + 1}`.includes(query) ||
      (idx + 1).toString() === query ||
      (q.text || '').toLowerCase().includes(query) ||
      (q.category || '').toLowerCase().includes(query)
    );
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[95vh] flex flex-col shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
        
        {/* Modal Top Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80 rounded-t-3xl shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900">
                {initialExam ? 'Edit & Kelola Paket Soal Ujian' : 'Pembuat Paket Soal & Ujian Terintegrasi'}
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500">
                Urutan Soal Tersusun Kebawah Menurun • Upload Gambar di Setiap Butir Soal • 4 Jenis Soal
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-xl cursor-pointer transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Stepper Tabs */}
        <div className="flex border-b border-slate-200 bg-white px-4 sm:px-6 pt-2 shrink-0">
          <button
            onClick={() => setActiveStep('meta')}
            className={`flex items-center gap-2 pb-3 px-3 text-xs font-bold border-b-2 transition cursor-pointer ${
              activeStep === 'meta'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Settings2 className="w-4 h-4" />
            <span>1. Identitas Ujian & Kelas Sasaran</span>
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[10px] text-slate-600 font-semibold">
              {selectedClasses.length} Rombel
            </span>
          </button>

          <button
            onClick={() => setActiveStep('questions')}
            className={`flex items-center gap-2 pb-3 px-3 text-xs font-bold border-b-2 transition cursor-pointer ${
              activeStep === 'questions'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>2. Susun Butir Soal (Menurun Ke Bawah)</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
              {questions.length} Butir Soal
            </span>
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">

          {/* ========================================================================= */}
          {/* STEP 1: METADATA & INTEGRATED TARGET CLASSES */}
          {/* ========================================================================= */}
          {activeStep === 'meta' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Judul Paket Ujian / Asesmen: <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Contoh: Asesmen Sumatif Akhir Semester: Fikih Thaharah"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Kode Paket Soal: <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Contoh: AM-FIQ-01"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mata Pelajaran: <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Contoh: Fikih MTs, Matematika, IPA"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Durasi Pengerjaan (Menit):
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={240}
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 45)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Standar KKM / Batas Lulus:
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={passingGrade}
                    onChange={(e) => setPassingGrade(parseInt(e.target.value) || 75)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tahun Ajaran:
                  </label>
                  <input
                    type="text"
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Semester:
                  </label>
                  <select
                    value={semester}
                    onChange={(e) => setSemester(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition"
                  >
                    <option value="Ganjil">Ganjil</option>
                    <option value="Genap">Genap</option>
                  </select>
                </div>
              </div>

              {/* JADWAL & TANGGAL PELAKSANAAN UJIAN */}
              <div className="p-4.5 bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-emerald-50/50 rounded-2xl border-2 border-blue-200/90 space-y-3.5 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      <span>Jadwal & Tanggal Pelaksanaan Ujian</span>
                      <span className="px-2 py-0.5 bg-blue-600 text-white text-[10px] font-black rounded-md">
                        AKTIF SESUAI TANGGAL
                      </span>
                    </span>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Soal ujian hanya akan berstatus aktif dan siap dikerjakan oleh siswa pada tanggal yang telah diatur, sehingga tampilan dashboard siswa tertata rapi.
                    </p>
                  </div>

                  {/* Quick Select Buttons */}
                  <div className="flex items-center gap-1.5 self-start sm:self-center">
                    <button
                      type="button"
                      onClick={setDateToToday}
                      className="px-2.5 py-1 bg-white hover:bg-blue-100 text-blue-800 border border-blue-300 rounded-lg text-[10px] font-bold cursor-pointer transition shadow-2xs"
                    >
                      Hari Ini
                    </button>
                    <button
                      type="button"
                      onClick={setDateToTomorrow}
                      className="px-2.5 py-1 bg-white hover:bg-blue-100 text-blue-800 border border-blue-300 rounded-lg text-[10px] font-bold cursor-pointer transition shadow-2xs"
                    >
                      Besok
                    </button>
                    <button
                      type="button"
                      onClick={setDateToDayAfterTomorrow}
                      className="px-2.5 py-1 bg-white hover:bg-blue-100 text-blue-800 border border-blue-300 rounded-lg text-[10px] font-bold cursor-pointer transition shadow-2xs"
                    >
                      Lusa
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-extrabold text-slate-700 mb-1 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-blue-600" />
                      <span>Tanggal Pelaksanaan:</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={examDate}
                      onChange={(e) => handleUpdateExamDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-blue-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs cursor-pointer"
                    />
                    <label className="flex items-center gap-1.5 text-[10px] text-blue-900 font-bold mt-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={syncAllQuestionsDate}
                        onChange={(e) => setSyncAllQuestionsDate(e.target.checked)}
                        className="rounded text-blue-600 w-3.5 h-3.5"
                      />
                      <span>Sinkron ke seluruh butir soal</span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-[11px] font-extrabold text-slate-700 mb-1 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Jam Mulai (WIB):</span>
                    </label>
                    <input
                      type="time"
                      required
                      value={examStartTime}
                      onChange={(e) => setExamStartTime(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 shadow-2xs cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-extrabold text-slate-700 mb-1 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Jam Selesai (WIB):</span>
                    </label>
                    <input
                      type="time"
                      required
                      value={examEndTime}
                      onChange={(e) => setExamEndTime(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-emerald-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 shadow-2xs cursor-pointer"
                    />
                  </div>
                </div>

                {/* Date formatted live banner */}
                <div className="p-2.5 bg-white/90 border border-blue-100 rounded-xl flex items-center justify-between text-xs font-medium text-slate-700">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>Jadwal Ujian Terkonfirmasi:</span>
                    <strong className="text-blue-900 font-bold">
                      {new Date(examDate + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </strong>
                  </span>
                  <span className="text-[11px] font-mono text-indigo-700 font-bold bg-indigo-50 px-2 py-0.5 rounded-md">
                    {examStartTime} - {examEndTime} WIB ({durationMinutes} Menit)
                  </span>
                </div>
              </div>

              {/* Target Class Selection (CORE INTEGRATION) */}
              <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-extrabold text-emerald-900 flex items-center gap-1.5">
                      <School className="w-4 h-4 text-emerald-700" />
                      Pilih Rombel / Kelas Sasaran Ujian
                    </span>
                    <p className="text-[11px] text-emerald-700 mt-0.5">
                      Hanya santri di kelas terpilih yang dapat melihat dan mengerjakan paket soal ini.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSelectAllClasses}
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-900 underline cursor-pointer"
                  >
                    {selectedClasses.length === classes.length ? 'Batal Pilih Semua' : 'Pilih Semua Rombel'}
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto p-1">
                  {classes.map(cls => {
                    const isSelected = selectedClasses.includes(cls.id);
                    return (
                      <div
                        key={cls.id}
                        onClick={() => handleToggleClass(cls.id)}
                        className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-between cursor-pointer transition select-none ${
                          isSelected
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <div className="truncate">
                          <span className="font-extrabold block text-xs">{cls.name}</span>
                          <span className="text-[10px] text-slate-400">Tingkat {cls.grade} • {cls.totalStudents} Santri</span>
                        </div>
                        <div className={`w-5 h-5 rounded-md flex items-center justify-center border shrink-0 ml-2 ${
                          isSelected ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 bg-white'
                        }`}>
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* GENERATE TOKEN AKSES UJIAN (WAJIB SISWA) */}
              <div className="pt-2">
                <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border-2 border-amber-300 rounded-2xl p-4 sm:p-5 shadow-xs">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                          <Key className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                            <span>Token Akses Ujian Siswa</span>
                            <span className="px-2 py-0.5 bg-amber-200 text-amber-900 text-[10px] font-black rounded-md">
                              Wajib Dimasukkan Siswa
                            </span>
                          </h4>
                          <p className="text-[11px] text-slate-600">
                            Siswa <strong>wajib memasukkan token ini</strong> di perangkat mereka sebelum dapat membuka naskah soal.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <div className="relative">
                        <input
                          type="text"
                          required
                          maxLength={10}
                          value={token}
                          onChange={(e) => setToken(e.target.value.toUpperCase())}
                          placeholder="TOKEN"
                          className="w-36 px-3 py-2 text-center bg-white border-2 border-amber-400 rounded-xl text-lg font-black tracking-widest text-amber-950 font-mono shadow-inner focus:outline-hidden focus:ring-2 focus:ring-amber-500 uppercase"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const newToken = generateRandomToken();
                          setToken(newToken);
                        }}
                        className="px-3 py-2.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition flex items-center gap-1.5"
                        title="Generate Token Acak Baru"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Generate Token</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(token);
                          setTokenCopied(true);
                          setTimeout(() => setTokenCopied(false), 2500);
                        }}
                        className={`px-3 py-2.5 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center gap-1.5 ${
                          tokenCopied
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : 'bg-white hover:bg-amber-100 text-amber-900 border-amber-300 shadow-xs'
                        }`}
                        title="Salin Token"
                      >
                        {tokenCopied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-700" />
                            <span>Tersalin!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-amber-700" />
                            <span>Salin</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Anti-Cheat & Randomization Options */}
              <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100 transition">
                  <input
                    type="checkbox"
                    checked={randomizeQuestions}
                    onChange={(e) => setRandomizeQuestions(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Acak Urutan Butir Soal</span>
                    <span className="text-[11px] text-slate-500">Tiap santri akan menerima urutan butir soal yang berbeda</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100 transition">
                  <input
                    type="checkbox"
                    checked={randomizeOptions}
                    onChange={(e) => setRandomizeOptions(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Acak Opsi Pilihan Jawaban</span>
                    <span className="text-[11px] text-slate-500">Kocok abjad opsi A/B/C/D pada soal pilihan ganda</span>
                  </div>
                </label>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setActiveStep('questions')}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer shadow-xs transition"
                >
                  <span>Lanjut: Susun Butir Soal (Menurun Ke Bawah)</span>
                  <Layers className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 2: QUESTIONS AUTHORING (URUTAN SOAL MENURUN KE BAWAH + UPLOAD GAMBAR) */}
          {/* ========================================================================= */}
          {activeStep === 'questions' && (
            <div className="space-y-5">
              {/* Top Action & Template Bar */}
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-extrabold text-emerald-950 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    Editor Soal Menurun Ke Bawah & Opsi Upload Gambar Tiap Soal
                  </span>
                  <p className="text-[11px] text-emerald-800 mt-0.5">
                    Semua butir soal disusun berurutan ke bawah untuk memudahkan pengeditan tanpa perlu geser ke samping.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  {/* Upload Word Document Button */}
                  <button
                    type="button"
                    onClick={() => setShowWordImportModal(true)}
                    className="px-3.5 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 text-blue-900 border border-blue-300 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition"
                    title="Upload soal Word (.docx) dengan Equation rumus matematika, gambar langsung, dan deteksi kunci jawaban otomatis"
                  >
                    <UploadCloud className="w-4 h-4 text-blue-600" />
                    <span>Upload Word (.docx)</span>
                    <span className="px-1.5 py-0.5 bg-blue-600 text-white text-[9px] font-black rounded-md">
                      Equation & Gambar
                    </span>
                  </button>

                  {/* Cetak Lembar Soal (PDF / Fisik) Button */}
                  <button
                    type="button"
                    onClick={() => setShowPrintModal(true)}
                    className="px-3.5 py-2 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition"
                    title="Cetak Naskah Soal ini ke Format PDF atau Kertas Fisik"
                  >
                    <Printer className="w-4 h-4 text-emerald-600" />
                    <span>Cetak Soal (PDF)</span>
                  </button>

                  {/* Muat Contoh 4 Jenis Soal */}
                  <button
                    type="button"
                    onClick={handleLoadSampleTemplate}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Muat Contoh 4 Jenis Soal</span>
                  </button>

                  {/* Samakan Jadwal Semua Soal */}
                  <button
                    type="button"
                    onClick={handleSyncAllQuestionsDate}
                    className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-300 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition"
                    title={`Terapkan tanggal pelaksanaan ujian (${examDate}) ke seluruh butir soal`}
                  >
                    <Calendar className="w-4 h-4 text-blue-600" />
                    <span>Samakan Tanggal ({examDate})</span>
                  </button>

                  {/* Add New Question at Bottom */}
                  <button
                    type="button"
                    onClick={() => handleAddNewQuestion('multiple_choice')}
                    className="px-3.5 py-2 bg-slate-900 hover:bg-black text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Tambah Soal Baru</span>
                  </button>
                </div>
              </div>

              {/* Sticky Quick-Jump Navigation Bar (Mempermudah Lompat Nomor Soal) */}
              <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md p-3 rounded-2xl border border-slate-200 shadow-sm space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-emerald-600" />
                      <span>Navigasi Cepat ({questions.length} Butir Soal):</span>
                    </span>
                    <span className="text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      Total {questions.reduce((sum, q) => sum + (q.points || 0), 0)} Poin
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleCollapseAll(false)}
                      className="text-[11px] font-bold text-slate-600 hover:text-slate-900 px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer transition"
                    >
                      Buka Semua
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleCollapseAll(true)}
                      className="text-[11px] font-bold text-slate-600 hover:text-slate-900 px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer transition"
                    >
                      Ciutkan Semua
                    </button>
                  </div>
                </div>

                {/* Quick Number Pills to Smooth-Scroll to Question */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
                  {questions.map((q, idx) => {
                    let typeBadge = 'PG';
                    if (q.type === 'multiple_choice_complex') typeBadge = 'PG-K';
                    else if (q.type === 'matching') typeBadge = 'Jodoh';
                    else if (q.type === 'essay') typeBadge = 'Esai';

                    return (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => {
                          // Uncollapse if collapsed
                          if (collapsedCardIds[q.id]) {
                            toggleSingleCollapse(q.id);
                          }
                          const el = document.getElementById(`question-card-${q.id}`);
                          if (el) {
                            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          }
                        }}
                        className={`px-2.5 py-1 rounded-xl text-xs font-bold shrink-0 transition flex items-center gap-1 cursor-pointer border ${
                          q.image
                            ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                            : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-800'
                        }`}
                        title={`Lompat ke Soal #${idx + 1} (${typeBadge})${q.image ? ' • Memiliki Gambar' : ''}`}
                      >
                        <span>#{idx + 1}</span>
                        <span className="text-[9px] opacity-75 font-black uppercase">{typeBadge}</span>
                        {q.image && (
                          <ImageIcon className="w-3 h-3 text-amber-600 shrink-0" />
                        )}
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() => handleAddNewQuestion('multiple_choice')}
                    className="px-2.5 py-1 rounded-xl text-xs font-bold shrink-0 transition flex items-center gap-1 cursor-pointer bg-emerald-600 text-white hover:bg-emerald-700 shadow-2xs"
                    title="Tambah Soal Baru di Bawah"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Soal</span>
                  </button>
                </div>

                {/* Optional Search / Filter in exam */}
                {questions.length > 5 && (
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Cari nomor atau teks dalam naskah soal..."
                      value={questionSearchQuery}
                      onChange={(e) => setQuestionSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                )}
              </div>

              {/* ========================================================================= */}
              {/* DAFTAR SOAL MENURUN KE BAWAH SECARA VERTIKAL */}
              {/* ========================================================================= */}
              <div className="space-y-6">
                {filteredQuestions.map((q) => {
                  const origIdx = questions.findIndex(item => item.id === q.id);
                  const isCollapsed = !!collapsedCardIds[q.id];

                  let typeLabel = 'Pilihan Ganda';
                  let badgeColor = 'bg-blue-100 text-blue-800 border-blue-200';
                  if (q.type === 'multiple_choice_complex') {
                    typeLabel = 'Pilihan Ganda Kompleks (>1 Jawaban)';
                    badgeColor = 'bg-teal-100 text-teal-800 border-teal-200';
                  } else if (q.type === 'matching') {
                    typeLabel = 'Mencocokkan Pasangan';
                    badgeColor = 'bg-purple-100 text-purple-800 border-purple-200';
                  } else if (q.type === 'essay') {
                    typeLabel = 'Esai / Uraian';
                    badgeColor = 'bg-amber-100 text-amber-800 border-amber-200';
                  }

                  return (
                    <div
                      key={q.id}
                      id={`question-card-${q.id}`}
                      className="bg-white rounded-2xl border-2 border-slate-200 hover:border-emerald-400 shadow-xs transition duration-200 overflow-hidden"
                    >
                      {/* Question Card Top Bar */}
                      <div className="p-3.5 sm:p-4 bg-slate-50/90 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Number Badge */}
                          <span className="px-3 py-1 bg-emerald-600 text-white rounded-xl text-xs font-black shadow-xs">
                            Soal #{origIdx + 1}
                          </span>

                          {/* Question Type Selector */}
                          <div className="flex items-center gap-1.5">
                            <select
                              value={q.type}
                              onChange={(e) => handleQuestionTypeChange(origIdx, e.target.value as QuestionType)}
                              className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition cursor-pointer"
                            >
                              <option value="multiple_choice">Pilihan Ganda (1 Jawaban Benar)</option>
                              <option value="multiple_choice_complex">Pilihan Ganda Kompleks (Banyak Jawaban)</option>
                              <option value="matching">Menjodohkan / Mencocokkan Pasangan</option>
                              <option value="essay">Esai / Uraian Teks Bebas</option>
                            </select>
                          </div>

                          {/* Tanggal Pelaksanaan Ujian Pill */}
                          <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-900 border border-blue-200 text-[10px] font-bold flex items-center gap-1" title="Soal ini aktif pada tanggal pelaksanaan ujian">
                            <Calendar className="w-3 h-3 text-blue-600" />
                            <span>Jadwal: {q.examDate || examDate}</span>
                          </span>

                          {/* Image indicator pill */}
                          {q.image && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black flex items-center gap-1">
                              <ImageIcon className="w-3 h-3 text-amber-600" />
                              <span>Bergambar</span>
                            </span>
                          )}
                        </div>

                        {/* Card Header Actions: Points, Move Up/Down, Duplicate, Delete, Collapse */}
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          {/* Point weight */}
                          <div className="flex items-center gap-1 text-xs">
                            <span className="text-slate-500 font-semibold text-[11px]">Bobot:</span>
                            <input
                              type="number"
                              min={1}
                              max={100}
                              value={q.points || 10}
                              onChange={(e) => handleUpdateQuestion(origIdx, 'points', parseInt(e.target.value) || 10)}
                              className="w-13 px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-black text-center text-slate-900"
                              title="Bobot poin soal ini"
                            />
                            <span className="text-slate-400 text-[10px] font-bold">p</span>
                          </div>

                          <div className="h-4 w-px bg-slate-300 mx-0.5" />

                          {/* Move Question Up */}
                          <button
                            type="button"
                            disabled={origIdx === 0}
                            onClick={() => handleMoveQuestion(origIdx, 'up')}
                            className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg cursor-pointer transition"
                            title="Geser Urutan Soal ke Atas"
                          >
                            <ArrowUp className="w-4 h-4" />
                          </button>

                          {/* Move Question Down */}
                          <button
                            type="button"
                            disabled={origIdx === questions.length - 1}
                            onClick={() => handleMoveQuestion(origIdx, 'down')}
                            className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg cursor-pointer transition"
                            title="Geser Urutan Soal ke Bawah"
                          >
                            <ArrowDown className="w-4 h-4" />
                          </button>

                          {/* Duplicate */}
                          <button
                            type="button"
                            onClick={() => handleDuplicateQuestion(origIdx)}
                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg cursor-pointer transition"
                            title="Duplikat Butir Soal Ini"
                          >
                            <Copy className="w-4 h-4" />
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            disabled={questions.length <= 1}
                            onClick={() => handleDeleteQuestion(origIdx)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg cursor-pointer transition"
                            title="Hapus Butir Soal Ini"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>

                          {/* Collapse/Expand Toggle */}
                          <button
                            type="button"
                            onClick={() => toggleSingleCollapse(q.id)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg cursor-pointer transition"
                            title={isCollapsed ? 'Buka Soal' : 'Ciutkan Soal'}
                          >
                            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Card Content (When not collapsed) */}
                      {!isCollapsed && (
                        <div className="p-4 sm:p-5 space-y-4">
                          
                          {/* ========================================================================= */}
                          {/* JADWAL PELAKSANAAN BUTIR SOAL (TANGGAL SOAL AKTIF) */}
                          {/* ========================================================================= */}
                          <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 border border-blue-200">
                                <Calendar className="w-4 h-4 text-blue-600" />
                              </div>
                              <div>
                                <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                                  <span>Tanggal Pelaksanaan Butir Soal #{origIdx + 1}:</span>
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    (q.examDate || examDate) === examDate 
                                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                                      : 'bg-amber-100 text-amber-900 border border-amber-300'
                                  }`}>
                                    {(q.examDate || examDate) === examDate ? 'Sesuai Jadwal Paket' : 'Jadwal Khusus'}
                                  </span>
                                </div>
                                <span className="text-[11px] text-slate-500 block mt-0.5">
                                  Soal ini aktif pada tanggal pelaksanaan yang diatur berikut:
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap">
                              <input
                                type="date"
                                value={q.examDate || examDate}
                                onChange={(e) => handleUpdateQuestion(origIdx, 'examDate', e.target.value)}
                                className="px-3 py-1.5 bg-white border border-blue-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs cursor-pointer"
                                title="Atur tanggal pelaksanaan untuk butir soal ini"
                              />
                              {q.examDate && q.examDate !== examDate && (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateQuestion(origIdx, 'examDate', examDate)}
                                  className="px-2.5 py-1.5 bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-[11px] font-bold transition cursor-pointer"
                                  title="Kembalikan tanggal soal ke jadwal paket ujian"
                                >
                                  Reset ke {examDate}
                                </button>
                              )}
                            </div>
                          </div>

                          {/* ========================================================================= */}
                          {/* OPSI UPLOAD GAMBAR DI SETIAP BUTIR SOAL */}
                          {/* ========================================================================= */}
                          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                                  <ImageIcon className="w-4 h-4" />
                                </div>
                                <div>
                                  <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                                    <span>Lampiran Gambar / Diagram Soal #{origIdx + 1}</span>
                                    {q.image ? (
                                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black flex items-center gap-1">
                                        <Check className="w-3 h-3" />
                                        Gambar Siap
                                      </span>
                                    ) : (
                                      <span className="text-[10px] text-slate-400 font-normal">(Opsional)</span>
                                    )}
                                  </label>
                                  <span className="text-[11px] text-slate-500 block">
                                    Unggah gambar, grafik, tabel, potongan ayat, peta, atau bagan untuk soal ini.
                                  </span>
                                </div>
                              </div>

                              {q.image && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveImage(origIdx)}
                                  className="px-2.5 py-1 text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-1 transition cursor-pointer"
                                  title="Hapus gambar dari butir soal ini"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Hapus Gambar</span>
                                </button>
                              )}
                            </div>

                            {/* Image Preview & Actions if attached */}
                            {q.image ? (
                              <div className="p-3 bg-white rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center gap-4">
                                <div className="relative group max-w-xs shrink-0 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 shadow-2xs">
                                  <img
                                    src={q.image}
                                    alt={`Lampiran Soal #${origIdx + 1}`}
                                    className="max-h-48 w-auto object-contain mx-auto rounded-lg"
                                  />
                                </div>

                                <div className="flex-1 space-y-2 text-xs">
                                  <div className="space-y-0.5">
                                    <span className="font-bold text-slate-800 block">
                                      Gambar tampil tepat di bawah narasi teks soal untuk santri
                                    </span>
                                    <p className="text-[11px] text-slate-500 leading-relaxed">
                                      Gambar telah dikompresi optimal sehingga hemat data dan cepat dimuat di HP/komputer santri.
                                    </p>
                                  </div>

                                  <div className="flex items-center gap-2 pt-1">
                                    <label className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer transition shadow-2xs">
                                      <Upload className="w-3.5 h-3.5 text-emerald-600" />
                                      <span>Ganti Gambar</span>
                                      <input
                                        type="file"
                                        accept="image/png, image/jpeg, image/jpg, image/webp, image/gif"
                                        onChange={(e) => handleImageFileUpload(e, origIdx)}
                                        className="hidden"
                                      />
                                    </label>

                                    <button
                                      type="button"
                                      onClick={() => handleRemoveImage(origIdx)}
                                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer transition"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                      <span>Hapus</span>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              /* Upload Box when no image */
                              <div className="space-y-2">
                                <div className="border-2 border-dashed border-slate-200 hover:border-emerald-400 bg-white hover:bg-emerald-50/20 rounded-xl p-3.5 text-center transition">
                                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                                    <label className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer transition">
                                      <Upload className="w-4 h-4" />
                                      <span>Pilih File Gambar dari Komputer / HP</span>
                                      <input
                                        type="file"
                                        accept="image/png, image/jpeg, image/jpg, image/webp, image/gif"
                                        onChange={(e) => handleImageFileUpload(e, origIdx)}
                                        className="hidden"
                                      />
                                    </label>

                                    <span className="text-xs text-slate-400 font-semibold">atau</span>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (activeUrlInputIndex === origIdx) {
                                          setActiveUrlInputIndex(null);
                                        } else {
                                          setActiveUrlInputIndex(origIdx);
                                          setTempUrlInput('');
                                        }
                                      }}
                                      className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition"
                                    >
                                      <LinkIcon className="w-3.5 h-3.5 text-slate-500" />
                                      <span>{activeUrlInputIndex === origIdx ? 'Tutup Input Link' : 'Tempel Link Gambar'}</span>
                                    </button>
                                  </div>

                                  <p className="text-[11px] text-slate-400 mt-2">
                                    Format didukung: PNG, JPG, JPEG, WEBP, GIF. Otomatis dikompres ringan untuk ujian CBT.
                                  </p>
                                </div>

                                {activeUrlInputIndex === origIdx && (
                                  <div className="p-3 bg-slate-100 rounded-xl flex items-center gap-2 animate-in fade-in">
                                    <LinkIcon className="w-4 h-4 text-slate-400 shrink-0" />
                                    <input
                                      type="url"
                                      placeholder="https://contoh-link-gambar.com/diagram.png"
                                      value={tempUrlInput}
                                      onChange={(e) => setTempUrlInput(e.target.value)}
                                      className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleApplyImageUrl(origIdx)}
                                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs cursor-pointer transition"
                                    >
                                      Terapkan
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Question Text / Prompt */}
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                              Teks Narasi / Pertanyaan Soal:
                            </label>
                            <textarea
                              rows={3}
                              value={q.text}
                              onChange={(e) => handleUpdateQuestion(origIdx, 'text', e.target.value)}
                              placeholder="Ketikkan teks pertanyaan butir soal di sini..."
                              className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition leading-relaxed"
                            />
                          </div>

                          {/* ========================================================================= */}
                          {/* TYPE 1: MULTIPLE CHOICE (PILIHAN GANDA 1 JAWABAN BENAR) */}
                          {/* ========================================================================= */}
                          {q.type === 'multiple_choice' && (
                            <div className="space-y-3 pt-1">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                  <span>Opsi Pilihan Jawaban (Klik abjad untuk menetapkan Kunci Jawaban Benar):</span>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleAddOption(origIdx)}
                                  className="text-xs font-bold text-emerald-600 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>+ Tambah Opsi</span>
                                </button>
                              </div>

                              <div className="space-y-2">
                                {q.options.map((opt, optIdx) => {
                                  const isCorrect = q.correctOptionId === opt.id;
                                  const letter = String.fromCharCode(65 + optIdx);
                                  return (
                                    <div
                                      key={opt.id}
                                      className={`p-2.5 rounded-xl border flex flex-col sm:flex-row sm:items-center gap-2.5 transition ${
                                        isCorrect
                                          ? 'bg-emerald-50/80 border-emerald-400 ring-1 ring-emerald-400'
                                          : 'bg-white border-slate-200'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2.5 flex-1">
                                        {/* Kunci Button */}
                                        <button
                                          type="button"
                                          onClick={() => handleSetCorrectOption(origIdx, opt.id)}
                                          className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 cursor-pointer transition ${
                                            isCorrect
                                              ? 'bg-emerald-600 text-white shadow-xs'
                                              : 'bg-slate-100 text-slate-700 hover:bg-emerald-100'
                                          }`}
                                          title="Klik untuk jadikan kunci jawaban benar"
                                        >
                                          {isCorrect ? <Check className="w-4 h-4" /> : letter}
                                        </button>

                                        {/* Text Input */}
                                        <input
                                          type="text"
                                          value={opt.text}
                                          onChange={(e) => handleUpdateOptionText(origIdx, optIdx, e.target.value)}
                                          placeholder={`Teks Opsi ${letter}...`}
                                          className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                                        />
                                      </div>

                                      <div className="flex items-center gap-2 self-end sm:self-center">
                                        {/* Optional Option Image Upload */}
                                        {opt.image ? (
                                          <div className="flex items-center gap-1 bg-amber-50 border border-amber-300 rounded-lg px-2 py-1">
                                            <img src={opt.image} alt="Opsi" className="w-5 h-5 object-cover rounded" />
                                            <span className="text-[10px] text-amber-900 font-bold">Gambar</span>
                                            <button
                                              type="button"
                                              onClick={() => handleRemoveOptionImage(origIdx, optIdx)}
                                              className="p-0.5 text-rose-600 hover:bg-rose-100 rounded"
                                              title="Hapus gambar opsi"
                                            >
                                              <X className="w-3 h-3" />
                                            </button>
                                          </div>
                                        ) : (
                                          <label className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg cursor-pointer transition" title="Tambah Gambar pada Opsi Ini">
                                            <ImageIcon className="w-3.5 h-3.5" />
                                            <input
                                              type="file"
                                              accept="image/*"
                                              onChange={(e) => handleOptionImageUpload(e, origIdx, optIdx)}
                                              className="hidden"
                                            />
                                          </label>
                                        )}

                                        {isCorrect && (
                                          <span className="px-2 py-0.5 bg-emerald-600 text-white rounded-md text-[10px] font-extrabold uppercase shrink-0">
                                            Kunci Benar
                                          </span>
                                        )}

                                        {q.options.length > 2 && (
                                          <button
                                            type="button"
                                            onClick={() => handleDeleteOption(origIdx, optIdx)}
                                            className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition shrink-0"
                                            title="Hapus Opsi"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* ========================================================================= */}
                          {/* TYPE 2: MULTIPLE CHOICE COMPLEX (>1 JAWABAN BENAR) */}
                          {/* ========================================================================= */}
                          {q.type === 'multiple_choice_complex' && (
                            <div className="space-y-3 pt-1">
                              <div className="flex items-center justify-between">
                                <div>
                                  <span className="text-xs font-bold text-teal-900 flex items-center gap-1.5">
                                    <CheckSquare className="w-4 h-4 text-teal-600" />
                                    <span>Pilihan Ganda Kompleks: Centang seluruh opsi yang benar</span>
                                  </span>
                                  <span className="text-[11px] text-slate-500 block">
                                    Santri dapat memilih lebih dari satu jawaban benar.
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleAddOption(origIdx)}
                                  className="text-xs font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1 cursor-pointer"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>+ Tambah Opsi</span>
                                </button>
                              </div>

                              <div className="space-y-2">
                                {q.options.map((opt, optIdx) => {
                                  const isCorrect = (q.correctOptionIds || []).includes(opt.id);
                                  const letter = String.fromCharCode(65 + optIdx);
                                  return (
                                    <div
                                      key={opt.id}
                                      className={`p-2.5 rounded-xl border flex flex-col sm:flex-row sm:items-center gap-2.5 transition ${
                                        isCorrect
                                          ? 'bg-teal-50/80 border-teal-400 ring-1 ring-teal-400'
                                          : 'bg-white border-slate-200'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2.5 flex-1">
                                        <button
                                          type="button"
                                          onClick={() => handleToggleCorrectOptionMulti(origIdx, opt.id)}
                                          className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 cursor-pointer transition ${
                                            isCorrect
                                              ? 'bg-teal-600 text-white shadow-xs'
                                              : 'bg-slate-100 text-slate-700 hover:bg-teal-100'
                                          }`}
                                          title="Klik untuk centang sebagai salah satu jawaban benar"
                                        >
                                          {isCorrect ? <Check className="w-4 h-4" /> : letter}
                                        </button>

                                        <input
                                          type="text"
                                          value={opt.text}
                                          onChange={(e) => handleUpdateOptionText(origIdx, optIdx, e.target.value)}
                                          placeholder={`Teks Opsi ${letter}...`}
                                          className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-teal-500"
                                        />
                                      </div>

                                      <div className="flex items-center gap-2 self-end sm:self-center">
                                        {isCorrect && (
                                          <span className="px-2 py-0.5 bg-teal-600 text-white rounded-md text-[10px] font-extrabold uppercase shrink-0">
                                            Jawaban Benar
                                          </span>
                                        )}

                                        {q.options.length > 2 && (
                                          <button
                                            type="button"
                                            onClick={() => handleDeleteOption(origIdx, optIdx)}
                                            className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition shrink-0"
                                            title="Hapus Opsi"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* ========================================================================= */}
                          {/* TYPE 3: MATCHING / MENCOCOKKAN PASANGAN */}
                          {/* ========================================================================= */}
                          {q.type === 'matching' && (
                            <div className="space-y-3 pt-1">
                              <div className="flex items-center justify-between">
                                <div>
                                  <span className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                                    <ArrowRightLeft className="w-4 h-4 text-purple-600" />
                                    <span>Mencocokkan / Menjodohkan Pasangan: Premis Kiri & Kunci Kanan</span>
                                  </span>
                                  <span className="text-[11px] text-slate-500 block">
                                    Saat ujian, opsi kolom kanan akan diacak oleh sistem CBT untuk dipasangkan santri.
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleAddMatchingPair(origIdx)}
                                  className="text-xs font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1 cursor-pointer"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>+ Tambah Pasangan</span>
                                </button>
                              </div>

                              <div className="space-y-2">
                                {(q.matchingPairs || []).map((pair, pIdx) => (
                                  <div
                                    key={pair.id || pIdx}
                                    className="p-3 bg-white border border-slate-200 rounded-xl flex flex-col sm:flex-row items-center gap-2"
                                  >
                                    <span className="w-6 h-6 rounded-md bg-purple-100 text-purple-800 text-xs font-bold flex items-center justify-center shrink-0">
                                      {pIdx + 1}
                                    </span>

                                    {/* Left prompt */}
                                    <div className="flex-1 w-full">
                                      <input
                                        type="text"
                                        value={pair.leftPrompt}
                                        onChange={(e) => handleUpdateMatchingPair(origIdx, pIdx, 'leftPrompt', e.target.value)}
                                        placeholder="Pernyataan / Premis Kiri (contoh: Kitab Taurat)..."
                                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-purple-500"
                                      />
                                    </div>

                                    <ArrowRightLeft className="w-4 h-4 text-purple-500 shrink-0 hidden sm:block" />

                                    {/* Right answer */}
                                    <div className="flex-1 w-full">
                                      <input
                                        type="text"
                                        value={pair.rightAnswer}
                                        onChange={(e) => handleUpdateMatchingPair(origIdx, pIdx, 'rightAnswer', e.target.value)}
                                        placeholder="Jawaban Pasangan Kanan (contoh: Nabi Musa AS)..."
                                        className="w-full px-3 py-1.5 bg-purple-50/50 border border-purple-200 rounded-lg text-xs font-medium text-purple-900 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-purple-500"
                                      />
                                    </div>

                                    {(q.matchingPairs?.length || 0) > 2 && (
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteMatchingPair(origIdx, pIdx)}
                                        className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition shrink-0"
                                        title="Hapus Pasangan Baris"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* ========================================================================= */}
                          {/* TYPE 4: ESAI / URAIAN */}
                          {/* ========================================================================= */}
                          {q.type === 'essay' && (
                            <div className="space-y-3 pt-1">
                              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2">
                                <Edit3 className="w-4 h-4 text-amber-700 shrink-0" />
                                <span className="text-xs text-amber-900 font-semibold">
                                  Soal Esai: Santri menjawab dalam bentuk uraian teks bebas. Sediakan kunci referensi dan kata kunci penilaian.
                                </span>
                              </div>

                              <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                  Kunci Jawaban Referensi / Rubrik Penilaian Guru:
                                </label>
                                <textarea
                                  rows={3}
                                  value={q.sampleAnswer || ''}
                                  onChange={(e) => handleUpdateQuestion(origIdx, 'sampleAnswer', e.target.value)}
                                  placeholder="Tuliskan jawaban acuan atau rubrik penilaian untuk soal esai ini..."
                                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-amber-500 transition leading-relaxed"
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                  Kata Kunci Penilaian (Keywords dipisahkan tanda koma):
                                </label>
                                <input
                                  type="text"
                                  value={(q.keywords || []).join(', ')}
                                  onChange={(e) => {
                                    const kws = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                                    handleUpdateQuestion(origIdx, 'keywords', kws);
                                  }}
                                  placeholder="Contoh: ramadhan, idul fitri, zakat jiwa, beras"
                                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-amber-500 transition"
                                />
                                <span className="text-[10px] text-slate-400 mt-1 block">
                                  Kata kunci ini digunakan oleh sistem untuk menganalisis jawaban santri secara semi-otomatis.
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Action Button: Insert Next Question Directly Below */}
                          <div className="pt-2 flex justify-center">
                            <button
                              type="button"
                              onClick={() => handleAddNewQuestion('multiple_choice', origIdx)}
                              className="px-4 py-1.5 bg-slate-50 hover:bg-emerald-50 border border-dashed border-slate-300 hover:border-emerald-500 text-slate-600 hover:text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5 text-emerald-600" />
                              <span>+ Sisipkan Butir Soal Baru di Bawah Soal #{origIdx + 1}</span>
                            </button>
                          </div>

                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Big Bottom Button to Add Question */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => handleAddNewQuestion('multiple_choice')}
                  className="w-full py-3 bg-white hover:bg-emerald-50 border-2 border-dashed border-emerald-300 hover:border-emerald-600 text-emerald-800 font-extrabold rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transition shadow-2xs"
                >
                  <Plus className="w-5 h-5 text-emerald-600" />
                  <span>+ Tambah Butir Soal Nomor #{questions.length + 1}</span>
                </button>
              </div>

            </div>
          )}

        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50/80 rounded-b-3xl flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500">
            Target: <strong className="text-slate-800">{selectedClasses.length} Rombel</strong> • Total: <strong className="text-slate-800">{questions.length} Butir Soal</strong>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setShowPrintModal(true)}
              className="py-2.5 px-3.5 bg-slate-100 hover:bg-emerald-50 text-emerald-800 border border-slate-200 hover:border-emerald-300 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition shadow-2xs"
              title="Cetak Naskah Soal ini ke Format PDF"
            >
              <Printer className="w-4 h-4 text-emerald-600" />
              <span>Cetak (PDF)</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer transition"
            >
              Batal
            </button>

            <button
              type="button"
              onClick={handleSaveExam}
              className="py-2.5 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition shadow-md shadow-emerald-200 active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>Simpan & Rilis Ujian ke Rombel</span>
            </button>
          </div>
        </div>

      </div>

      {/* Word Document Import Sub-Modal */}
      {showWordImportModal && (
        <WordExamImportModal
          currentSubject={subject}
          onClose={() => setShowWordImportModal(false)}
          onImport={handleWordImport}
        />
      )}

      {/* Print / PDF Exam Modal */}
      {showPrintModal && (
        <PrintExamModal
          isOpen={showPrintModal}
          onClose={() => setShowPrintModal(false)}
          exam={{
            id: initialExam?.id || `exm-${Date.now()}`,
            code: code.trim().toUpperCase(),
            title: title.trim(),
            subject: subject.trim(),
            academicYear,
            semester,
            durationMinutes,
            passingGrade,
            totalQuestions: questions.length,
            classesAllowed: selectedClasses,
            randomizeQuestions,
            randomizeOptions,
            token: token.trim().toUpperCase() || 'AM2026',
            authorId: initialExam?.authorId || currentUser?.id,
            authorName: initialExam?.authorName || currentUser?.name,
            authorUsername: initialExam?.authorUsername || currentUser?.username,
            maxViolationsAllowed: 3,
            status: 'active',
            startTime: new Date().toISOString(),
            endTime: new Date().toISOString(),
            questions: questions
          }}
          classes={classes}
        />
      )}
    </div>
  );
};
