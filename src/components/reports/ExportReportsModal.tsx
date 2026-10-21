import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { StudentExamSession, Exam } from '../../types/cbt';
import { 
  FileText, 
  FileSpreadsheet, 
  Download, 
  Printer, 
  X, 
  CheckCircle2,
  School,
  BookOpen,
  Award,
  Filter,
  Users,
  AlertTriangle,
  Sparkles,
  Check,
  Calendar,
  Clock,
  UserCheck
} from 'lucide-react';
import { useCbt } from '../../context/CbtContext';

export interface ExportReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: StudentExamSession[];
  exam?: Exam | null;
  availableExams?: Exam[];
  initialFormat?: 'pdf' | 'excel';
}

export const ExportReportsModal: React.FC<ExportReportsModalProps> = ({
  isOpen,
  onClose,
  sessions: allSessionsProp,
  exam: initialExam,
  availableExams: availableExamsProp,
  initialFormat = 'excel'
}) => {
  const { exams: contextExams, classes, currentUser, addAuditLog, systemSettings } = useCbt();

  // Determine exams list
  const examsList = useMemo(() => {
    if (availableExamsProp && availableExamsProp.length > 0) return availableExamsProp;
    return contextExams || [];
  }, [availableExamsProp, contextExams]);

  // Selected Exam (per mapel ujian)
  const [selectedExamId, setSelectedExamId] = useState<string>(
    initialExam?.id || examsList[0]?.id || ''
  );

  // Update selectedExamId when initialExam changes
  React.useEffect(() => {
    if (initialExam?.id) {
      setSelectedExamId(initialExam.id);
    } else if (examsList.length > 0 && !selectedExamId) {
      setSelectedExamId(examsList[0].id);
    }
  }, [initialExam, examsList]);

  const activeExam = useMemo(() => {
    return examsList.find(e => e.id === selectedExamId) || initialExam || examsList[0] || null;
  }, [examsList, selectedExamId, initialExam]);

  // Selected Rombel / Class filter
  const [selectedClassId, setSelectedClassId] = useState<string>('all');

  // Format selection
  const [selectedFormat, setSelectedFormat] = useState<'pdf' | 'excel'>(initialFormat);

  // Options
  const [includeViolations, setIncludeViolations] = useState<boolean>(true);
  const [onlyCompleted, setOnlyCompleted] = useState<boolean>(true);

  // Filtered student sessions for this specific exam and class
  const examSessions = useMemo(() => {
    if (!activeExam) return [];
    return allSessionsProp.filter(s => {
      if (!s) return false;
      const matchExam = s.examId === activeExam.id;
      if (!matchExam) return false;
      if (onlyCompleted && s.status !== 'completed') return false;
      if (selectedClassId !== 'all' && s.classId !== selectedClassId) return false;
      return true;
    });
  }, [allSessionsProp, activeExam, onlyCompleted, selectedClassId]);

  // Quick statistics
  const kkm = activeExam?.passingGrade || systemSettings?.defaultPassingGrade || 75;
  const totalStudents = examSessions.length;
  const scores = examSessions.map(s => s.score ?? 0);
  const avgScore = totalStudents > 0 ? Math.round((scores.reduce((a, b) => a + b, 0) / totalStudents) * 10) / 10 : 0;
  const maxScore = totalStudents > 0 ? Math.max(...scores) : 0;
  const minScore = totalStudents > 0 ? Math.min(...scores) : 0;
  const passedStudents = examSessions.filter(s => (s.score ?? 0) >= kkm).length;
  const remedialStudents = totalStudents - passedStudents;
  const passRate = totalStudents > 0 ? Math.round((passedStudents / totalStudents) * 100) : 0;

  if (!isOpen) return null;

  // 1. GENERATE NATIVE EXCEL WORKBOOK (.xlsx)
  const handleExportXlsx = () => {
    if (!activeExam) return;

    // Sheet 1: Data Rekapitulasi Nilai Siswa
    const studentData = examSessions.map((s, idx) => {
      const durMinutes = s.startTime && s.endTime 
        ? Math.max(1, Math.round((s.endTime - s.startTime) / 60000))
        : (activeExam.durationMinutes || 90);

      const row: Record<string, any> = {
        'No': idx + 1,
        'NISN': s.nisn,
        'Nama Lengkap Siswa': s.studentName,
        'Kelas / Rombel': s.className,
        'Nilai Akhir': s.score ?? 0,
        'Status KKM': (s.score ?? 0) >= kkm ? 'TUNTAS' : 'REMEDIAL',
        'Jawaban Benar': s.correctCount ?? 0,
        'Jawaban Salah': s.wrongCount ?? 0,
        'Kosong / Lewat': s.unansweredCount ?? 0,
        'Waktu Selesai': s.submittedAt ? new Date(s.submittedAt).toLocaleString('id-ID') : '-',
        'Durasi (Menit)': durMinutes,
      };

      if (includeViolations) {
        row['Jml Pelanggaran'] = s.violationsCount || 0;
        row['Catatan Anti-Cheat'] = s.violationLogs?.map(v => v.detail).join('; ') || 'Tertib & Terverifikasi';
      }

      return row;
    });

    const wsStudents = XLSX.utils.json_to_sheet(studentData);

    // Auto-fit column widths
    const colWidths = [
      { wch: 5 },  // No
      { wch: 14 }, // NISN
      { wch: 30 }, // Nama
      { wch: 18 }, // Kelas
      { wch: 12 }, // Nilai
      { wch: 14 }, // Status KKM
      { wch: 14 }, // Benar
      { wch: 14 }, // Salah
      { wch: 14 }, // Kosong
      { wch: 22 }, // Waktu Selesai
      { wch: 14 }, // Durasi
      ...(includeViolations ? [{ wch: 16 }, { wch: 40 }] : []),
    ];
    wsStudents['!cols'] = colWidths;

    // Sheet 2: Ringkasan Analisis & Berita Acara
    const summaryData = [
      { 'Parameter': 'Nama Madrasah / Sekolah', 'Keterangan': systemSettings.schoolName },
      { 'Parameter': 'Nomor Statistik Madrasah (NSM)', 'Keterangan': systemSettings.nsm },
      { 'Parameter': 'NPSN', 'Keterangan': systemSettings.npsn },
      { 'Parameter': 'Tahun Ajaran & Semester', 'Keterangan': `${systemSettings.academicYear} - Semester ${systemSettings.activeSemester}` },
      { 'Parameter': 'Mata Pelajaran', 'Keterangan': activeExam.subject },
      { 'Parameter': 'Judul Naskah Ujian', 'Keterangan': activeExam.title },
      { 'Parameter': 'Kode Paket Soal', 'Keterangan': activeExam.code },
      { 'Parameter': 'Guru Pembuat / Pengampu', 'Keterangan': activeExam.authorName || currentUser?.name || 'Guru Mata Pelajaran' },
      { 'Parameter': 'Standar KKM', 'Keterangan': `${kkm} (Skala 100)` },
      { 'Parameter': 'Total Butir Soal', 'Keterangan': `${activeExam.questions?.length || activeExam.totalQuestions || 0} Soal` },
      { 'Parameter': 'Total Peserta Mengerjakan', 'Keterangan': `${totalStudents} Siswa` },
      { 'Parameter': 'Peserta Tuntas (≥ KKM)', 'Keterangan': `${passedStudents} Siswa (${passRate}%)` },
      { 'Parameter': 'Peserta Remedial (< KKM)', 'Keterangan': `${remedialStudents} Siswa (${100 - passRate}%)` },
      { 'Parameter': 'Nilai Rata-rata Ujian', 'Keterangan': avgScore },
      { 'Parameter': 'Nilai Tertinggi', 'Keterangan': maxScore },
      { 'Parameter': 'Nilai Terendah', 'Keterangan': minScore },
      { 'Parameter': 'Kepala Madrasah', 'Keterangan': `${systemSettings.headmasterName} (NIP. ${systemSettings.headmasterNip})` },
      { 'Parameter': 'Tanggal Unduh Laporan', 'Keterangan': new Date().toLocaleString('id-ID') },
    ];
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    wsSummary['!cols'] = [{ wch: 32 }, { wch: 50 }];

    // Create workbook and append sheets
    const wb = XLSX.utils.book_new();
    const safeSheetName = `Rekap_${activeExam.subject.replace(/[^a-zA-Z0-9]/g, '_')}`.slice(0, 31);
    XLSX.utils.book_append_sheet(wb, wsStudents, safeSheetName);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Berita_Acara_Statistik');

    // Filename
    const dateStr = new Date().toISOString().split('T')[0];
    const safeSubject = activeExam.subject.replace(/[^a-zA-Z0-9]/g, '_');
    const safeCode = activeExam.code.replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `Rekap_Nilai_${safeSubject}_${safeCode}_${dateStr}.xlsx`;

    XLSX.writeFile(wb, fileName);

    addAuditLog(
      'EXPORT_REPORT_EXCEL', 
      'exam', 
      `Mengunduh rekap nilai Excel (.xlsx) per mapel: ${activeExam.subject} (${activeExam.code}) - ${examSessions.length} peserta`, 
      'info'
    );
    onClose();
  };

  // 2. GENERATE CSV EXCEL FALLBACK
  const handleExportCsv = () => {
    if (!activeExam) return;

    const headers = [
      'No',
      'NISN',
      'Nama Siswa',
      'Kelas',
      'Nilai Akhir',
      'Status KKM',
      'Benar',
      'Salah',
      'Kosong',
      'Waktu Selesai',
      ...(includeViolations ? ['Jumlah Pelanggaran', 'Catatan Anti-Cheat'] : [])
    ];

    const rows = examSessions.map((s, idx) => {
      const base = [
        idx + 1,
        `'${s.nisn}`, // apostrophe to prevent Excel dropping leading zero
        `"${s.studentName}"`,
        `"${s.className}"`,
        s.score ?? 0,
        (s.score ?? 0) >= kkm ? 'TUNTAS' : 'REMEDIAL',
        s.correctCount ?? 0,
        s.wrongCount ?? 0,
        s.unansweredCount ?? 0,
        s.submittedAt ? new Date(s.submittedAt).toLocaleString('id-ID') : '-',
      ];
      if (includeViolations) {
        base.push(s.violationsCount);
        base.push(`"${s.violationLogs?.map(v => v.detail).join('; ') || 'Tertib'}"`);
      }
      return base;
    });

    const csvContent = '\uFEFF' + [
      `LAPORAN REKAPITULASI HASIL UJIAN CBT PER MATA PELAJARAN`,
      `Madrasah: ${systemSettings.schoolName} (NSM: ${systemSettings.nsm} / NPSN: ${systemSettings.npsn})`,
      `Tahun Ajaran: ${systemSettings.academicYear} • Semester: ${systemSettings.activeSemester}`,
      `Mata Pelajaran: ${activeExam.subject} - ${activeExam.title} (Kode: ${activeExam.code})`,
      `Guru Pembuat: ${activeExam.authorName || currentUser?.name || 'Guru Pengampu'}`,
      `Standar KKM: ${kkm}`,
      `Rata-rata Nilai: ${avgScore} | Tertinggi: ${maxScore} | Terendah: ${minScore} | Ketuntasan: ${passRate}%`,
      `Tanggal Unduh: ${new Date().toLocaleDateString('id-ID')}`,
      '',
      headers.join(','),
      ...rows.map(r => r.join(',')),
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Rekap_Nilai_${activeExam.subject.replace(/[^a-zA-Z0-9]/g, '_')}_${activeExam.code}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    addAuditLog('EXPORT_REPORT_EXCEL', 'exam', `Mengunduh rekap nilai CSV: ${activeExam.subject}`, 'info');
    onClose();
  };

  // 3. BUILD PRINT-READY OFFICIAL REPORT HTML (Used for direct print & offline PDF download)
  const generateOfficialReportHtml = () => {
    if (!activeExam) return '';

    const rowsHtml = examSessions.map((s, idx) => `
      <tr style="border-bottom: 1px solid #cbd5e1; font-size: 11px;">
        <td style="padding: 6px 8px; text-align: center;">${idx + 1}</td>
        <td style="padding: 6px 8px; font-family: monospace; text-align: center;">${s.nisn}</td>
        <td style="padding: 6px 8px; font-weight: bold; text-align: left;">${s.studentName}</td>
        <td style="padding: 6px 8px; text-align: center;">${s.className}</td>
        <td style="padding: 6px 8px; text-align: center; font-weight: bold; font-size: 12px; color: ${(s.score ?? 0) >= kkm ? '#059669' : '#dc2626'};">${s.score ?? 0}</td>
        <td style="padding: 6px 8px; text-align: center; font-weight: bold;">
          <span style="display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; background-color: ${(s.score ?? 0) >= kkm ? '#d1fae5' : '#fee2e2'}; color: ${(s.score ?? 0) >= kkm ? '#065f46' : '#991b1b'};">
            ${(s.score ?? 0) >= kkm ? 'TUNTAS' : 'REMEDIAL'}
          </span>
        </td>
        <td style="padding: 6px 8px; text-align: center;">${s.correctCount ?? 0}</td>
        <td style="padding: 6px 8px; text-align: center;">${s.wrongCount ?? 0}</td>
        <td style="padding: 6px 8px; text-align: center;">${s.unansweredCount ?? 0}</td>
        ${includeViolations ? `
          <td style="padding: 6px 8px; text-align: center; font-size: 10px; color: ${s.violationsCount > 0 ? '#b91c1c' : '#059669'}; font-weight: ${s.violationsCount > 0 ? 'bold' : 'normal'};">
            ${s.violationsCount === 0 ? 'Tertib (0)' : `${s.violationsCount} Teguran`}
          </td>
        ` : ''}
      </tr>
    `).join('');

    return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Berita Acara & Rekap Nilai Resmi - ${activeExam.subject} (${activeExam.code})</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 15mm 15mm 15mm 15mm;
    }
    body {
      font-family: Arial, Helvetica, sans-serif;
      color: #0f172a;
      background: #fff;
      margin: 0;
      padding: 20px;
      font-size: 11px;
      line-height: 1.4;
    }
    .print-control-bar {
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
      font-size: 13px;
    }
    .print-btn:hover { background: #047857; }
    @media print {
      .print-control-bar { display: none !important; }
      body { padding: 0 !important; }
    }
    .kop {
      border-bottom: 3px double #000;
      padding-bottom: 10px;
      margin-bottom: 16px;
      text-align: center;
    }
    .kop h1 {
      margin: 0;
      font-size: 16px;
      text-transform: uppercase;
      font-weight: 800;
      letter-spacing: 0.5px;
    }
    .kop h2 {
      margin: 2px 0;
      font-size: 14px;
      text-transform: uppercase;
      color: #047857;
      font-weight: bold;
    }
    .kop p {
      margin: 2px 0;
      font-size: 10px;
      color: #334155;
    }
    .title-box {
      text-align: center;
      margin-bottom: 16px;
    }
    .title-box h3 {
      margin: 0;
      font-size: 13px;
      text-transform: uppercase;
      text-decoration: underline;
    }
    .title-box p {
      margin: 2px 0 0 0;
      font-size: 10px;
      color: #475569;
    }
    .meta-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 14px;
      font-size: 11px;
    }
    .meta-table td {
      padding: 3px 6px;
      vertical-align: top;
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
      font-size: 11px;
    }
    .data-table th {
      background-color: #f1f5f9;
      padding: 8px 6px;
      border: 1px solid #94a3b8;
      font-size: 10.5px;
      text-align: center;
      font-weight: bold;
      text-transform: uppercase;
    }
    .data-table td {
      border: 1px solid #cbd5e1;
    }
    .stats-card {
      margin-top: 14px;
      background-color: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 10px 14px;
      display: flex;
      justify-content: space-between;
      font-size: 11px;
    }
    .stat-item {
      text-align: center;
    }
    .stat-item strong {
      display: block;
      font-size: 13px;
      color: #0f172a;
    }
    .stat-item span {
      font-size: 9.5px;
      color: #64748b;
      text-transform: uppercase;
    }
    .signatures {
      margin-top: 36px;
      width: 100%;
      display: flex;
      justify-content: space-between;
      page-break-inside: avoid;
    }
    .sig-block {
      text-align: center;
      width: 240px;
      font-size: 11px;
    }
    .sig-space {
      height: 60px;
    }
    .sig-name {
      font-weight: bold;
      text-decoration: underline;
      margin: 0;
    }
    .sig-nip {
      margin: 2px 0 0 0;
      color: #475569;
      font-size: 10px;
    }
  </style>
</head>
<body>
  <div class="print-control-bar">
    <div>
      <strong>Laporan Hasil Ujian CBT: ${activeExam.subject}</strong>
      <span style="opacity: 0.8; font-size: 11px; margin-left: 8px;">(Total ${examSessions.length} Peserta)</span>
    </div>
    <div style="display: flex; gap: 8px;">
      <button class="print-btn" onclick="window.print()">🖨️ Cetak / Simpan ke PDF Sekarang</button>
    </div>
  </div>

  <div class="kop">
    <h1>KEMENTERIAN AGAMA REPUBLIK INDONESIA</h1>
    <h2>${systemSettings.schoolName.toUpperCase()}</h2>
    <p>NSM: ${systemSettings.nsm} • NPSN: ${systemSettings.npsn} • Status: Terakreditasi A (Unggul)</p>
    <p>${systemSettings.address}, ${systemSettings.city} • Website: cbt.madrasah.sch.id</p>
  </div>

  <div class="title-box">
    <h3>BERITA ACARA & DAFTAR REKAPITULASI HASIL ASESMEN MADRASAH (CBT)</h3>
    <p>Tahun Ajaran ${systemSettings.academicYear} • Semester ${systemSettings.activeSemester}</p>
  </div>

  <table class="meta-table">
    <tr>
      <td style="width: 18%;"><strong>Mata Pelajaran:</strong></td>
      <td style="width: 32%;">${activeExam.subject}</td>
      <td style="width: 18%;"><strong>Hari / Tanggal:</strong></td>
      <td style="width: 32%;">${new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</td>
    </tr>
    <tr>
      <td><strong>Paket Soal:</strong></td>
      <td>${activeExam.title} (${activeExam.code})</td>
      <td><strong>Standar KKM:</strong></td>
      <td><strong>${kkm}</strong> (Skala 100)</td>
    </tr>
    <tr>
      <td><strong>Guru Pengampu:</strong></td>
      <td>${activeExam.authorName || currentUser?.name || 'Guru Mata Pelajaran'}</td>
      <td><strong>Pengawas Ruang:</strong></td>
      <td>${currentUser?.name || 'Budi Santoso, S.Pd'}</td>
    </tr>
    <tr>
      <td><strong>Rombongan Belajar:</strong></td>
      <td>${selectedClassId === 'all' ? 'Seluruh Rombel Sasaran' : (classes.find(c => c.id === selectedClassId)?.name || selectedClassId)}</td>
      <td><strong>Integritas Anti-Cheat:</strong></td>
      <td>Tervalidasi Protokol CBT Mandiri</td>
    </tr>
  </table>

  <table class="data-table">
    <thead>
      <tr>
        <th style="width: 4%;">No</th>
        <th style="width: 14%;">NISN</th>
        <th style="width: 28%; text-align: left;">Nama Siswa</th>
        <th style="width: 12%;">Kelas</th>
        <th style="width: 9%;">Nilai</th>
        <th style="width: 11%;">Status KKM</th>
        <th style="width: 7%;">Benar</th>
        <th style="width: 7%;">Salah</th>
        <th style="width: 8%;">Kosong</th>
        ${includeViolations ? '<th style="width: 12%;">Anti-Cheat</th>' : ''}
      </tr>
    </thead>
    <tbody>
      ${rowsHtml || '<tr><td colspan="10" style="text-align: center; padding: 16px; color: #64748b;">Belum ada santri yang menyelesaikan ujian pada paket ini.</td></tr>'}
    </tbody>
  </table>

  <!-- Statistics Summary Card -->
  <div class="stats-card">
    <div class="stat-item">
      <strong>${totalStudents}</strong>
      <span>Peserta Ujian</span>
    </div>
    <div class="stat-item">
      <strong style="color: #059669;">${passedStudents} (${passRate}%)</strong>
      <span>Tuntas (≥ KKM)</span>
    </div>
    <div class="stat-item">
      <strong style="color: #dc2626;">${remedialStudents} (${100 - passRate}%)</strong>
      <span>Remedial (&lt; KKM)</span>
    </div>
    <div class="stat-item">
      <strong>${avgScore}</strong>
      <span>Rata-Rata</span>
    </div>
    <div class="stat-item">
      <strong>${maxScore}</strong>
      <span>Tertinggi</span>
    </div>
    <div class="stat-item">
      <strong>${minScore}</strong>
      <span>Terendah</span>
    </div>
  </div>

  <div class="signatures">
    <div class="sig-block">
      <p style="margin: 0;">Mengetahui,<br/>Kepala Madrasah</p>
      <div class="sig-space"></div>
      <p class="sig-name">${systemSettings.headmasterName}</p>
      <p class="sig-nip">NIP. ${systemSettings.headmasterNip}</p>
    </div>

    <div class="sig-block">
      <p style="margin: 0;">${systemSettings.city}, ${new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}<br/>Guru Mata Pelajaran / Pengawas,</p>
      <div class="sig-space"></div>
      <p class="sig-name">${activeExam.authorName || currentUser?.name || 'Siti Fatimah, S.Pd.I'}</p>
      <p class="sig-nip">NIP. ${currentUser?.nisnOrNip || '198604122010012015'}</p>
    </div>
  </div>

  <script>
    // Automatically trigger print on load if opened standalone
    window.addEventListener('load', function() {
      // Small timeout to allow styles to render
      setTimeout(function() {
        if (window.location.search.includes('print=true')) {
          window.print();
        }
      }, 300);
    });
  </script>
</body>
</html>`;
  };

  // 4. PRINT PDF VIA HIDDEN IFRAME (Safe against popup blocker!)
  const handlePrintPdfSafe = () => {
    if (!activeExam) return;

    const html = generateOfficialReportHtml();
    
    // Create hidden iframe in DOM
    const iframe = document.createElement('iframe');
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
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        
        // Cleanup after print dialog closes
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 1000);
      }, 300);
    }

    addAuditLog(
      'EXPORT_REPORT_PDF', 
      'exam', 
      `Mencetak Berita Acara & Rekap Nilai PDF: ${activeExam.subject} (${activeExam.code}) - ${examSessions.length} peserta`, 
      'info'
    );
  };

  // 5. DOWNLOAD STANDALONE HTML FILE (Opens in any browser and can be saved as PDF)
  const handleDownloadReportHtml = () => {
    if (!activeExam) return;

    const html = generateOfficialReportHtml();
    const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const dateStr = new Date().toISOString().split('T')[0];
    const safeSubject = activeExam.subject.replace(/[^a-zA-Z0-9]/g, '_');
    link.download = `Berita_Acara_Nilai_${safeSubject}_${activeExam.code}_${dateStr}.html`;
    link.click();
    URL.revokeObjectURL(url);

    addAuditLog(
      'EXPORT_REPORT_PDF', 
      'exam', 
      `Mengunduh Dokumen Mandiri Berita Acara Nilai: ${activeExam.subject}`, 
      'info'
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 border border-emerald-200 text-emerald-800 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-emerald-700 font-extrabold text-[11px] uppercase tracking-wider">
                <span>Ekspor & Rekapitulasi Nilai Ujian</span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-slate-900">
                Ekspor Hasil Ujian per Mata Pelajaran
              </h3>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl cursor-pointer transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. SELECTION CONTROLS: MAPEL & ROMBEL */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-5">
          
          {/* Mapel / Exam Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
              <span>Mata Pelajaran / Paket Ujian:</span>
            </label>
            <select
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 focus:border-emerald-500 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-hidden focus:ring-3 focus:ring-emerald-100 cursor-pointer transition"
            >
              {examsList.map(ex => (
                <option key={ex.id} value={ex.id}>
                  {ex.subject} — {ex.title} ({ex.code})
                </option>
              ))}
            </select>
          </div>

          {/* Rombel / Class Filter */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-indigo-600" />
              <span>Rombongan Belajar (Kelas):</span>
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 focus:border-indigo-500 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-hidden focus:ring-3 focus:ring-indigo-100 cursor-pointer transition"
            >
              <option value="all">Semua Rombel (Gabungan)</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.academicYear})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 2. EXAM QUICK STATS PREVIEW */}
        {activeExam && (
          <div className="bg-gradient-to-br from-slate-50 to-emerald-50/40 p-4 rounded-2xl border border-slate-200/80 mb-5">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-200/60 text-xs">
              <div>
                <span className="font-extrabold text-slate-900 text-sm">{activeExam.subject}</span>
                <span className="text-slate-500 ml-1.5">({activeExam.title})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-md text-[10px]">
                  Kode: {activeExam.code}
                </span>
                <span className="px-2 py-0.5 bg-emerald-100 border border-emerald-200 text-emerald-800 font-bold rounded-md text-[10px]">
                  KKM: {kkm}
                </span>
                <span className="px-2 py-0.5 bg-indigo-100 border border-indigo-200 text-indigo-800 font-bold rounded-md text-[10px]">
                  Guru: {activeExam.authorName || 'Guru Mapel'}
                </span>
              </div>
            </div>

            {/* Quick KPI Counters */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-3">
              <div className="bg-white p-2.5 rounded-xl border border-slate-200/60 text-center">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Peserta Selesai</div>
                <div className="text-base font-black text-slate-900 mt-0.5">
                  {totalStudents} Siswa
                </div>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200/60 text-center">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Rata-Rata Nilai</div>
                <div className="text-base font-black text-indigo-600 mt-0.5">
                  {avgScore}
                </div>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200/60 text-center">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Nilai Tertinggi</div>
                <div className="text-base font-black text-emerald-600 mt-0.5">
                  {maxScore}
                </div>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200/60 text-center">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Ketuntasan KKM</div>
                <div className="text-base font-black text-teal-700 mt-0.5">
                  {passRate}% ({passedStudents}/{totalStudents})
                </div>
              </div>
            </div>

            {totalStudents === 0 && (
              <div className="mt-3 p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  Belum ada siswa yang menyelesaikan ujian pada mata pelajaran/rombel ini. File ekspor akan berisi template dan kolom resmi kosong.
                </span>
              </div>
            )}
          </div>
        )}

        {/* 3. FORMAT SELECTION TABS */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <button
            type="button"
            onClick={() => setSelectedFormat('excel')}
            className={`p-4 rounded-2xl border text-left cursor-pointer transition flex flex-col justify-between ${
              selectedFormat === 'excel'
                ? 'bg-emerald-50/80 border-emerald-400 ring-2 ring-emerald-200 shadow-sm'
                : 'bg-white border-slate-200 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <FileSpreadsheet className={`w-7 h-7 ${selectedFormat === 'excel' ? 'text-emerald-700' : 'text-slate-400'}`} />
              {selectedFormat === 'excel' && (
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">
                  ✓
                </span>
              )}
            </div>
            <div>
              <div className="font-extrabold text-slate-900 text-xs">Spreadsheet Excel (.xlsx / .csv)</div>
              <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                Buku kerja lengkap Ms. Excel & Google Sheets dengan multi-sheet nilai & statistik.
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setSelectedFormat('pdf')}
            className={`p-4 rounded-2xl border text-left cursor-pointer transition flex flex-col justify-between ${
              selectedFormat === 'pdf'
                ? 'bg-rose-50/80 border-rose-400 ring-2 ring-rose-200 shadow-sm'
                : 'bg-white border-slate-200 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <FileText className={`w-7 h-7 ${selectedFormat === 'pdf' ? 'text-rose-700' : 'text-slate-400'}`} />
              {selectedFormat === 'pdf' && (
                <span className="w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px]">
                  ✓
                </span>
              )}
            </div>
            <div>
              <div className="font-extrabold text-slate-900 text-xs">Dokumen PDF Resmi & Cetak</div>
              <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                Format Berita Acara standar Kemenag dengan Kop Madrasah dan lembar tanda tangan.
              </div>
            </div>
          </button>
        </div>

        {/* 4. EXPORT OPTIONS CHECKLIST */}
        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2.5 text-xs mb-6">
          <div className="flex items-center gap-2 text-slate-700">
            <input
              type="checkbox"
              id="includeViolations"
              checked={includeViolations}
              onChange={(e) => setIncludeViolations(e.target.checked)}
              className="rounded text-emerald-600 cursor-pointer w-4 h-4"
            />
            <label htmlFor="includeViolations" className="cursor-pointer select-none font-semibold">
              Sertakan kolom riwayat pelanggaran anti-cheat / integritas ujian
            </label>
          </div>

          <div className="flex items-center gap-2 text-slate-700">
            <input
              type="checkbox"
              id="onlyCompleted"
              checked={onlyCompleted}
              onChange={(e) => setOnlyCompleted(e.target.checked)}
              className="rounded text-emerald-600 cursor-pointer w-4 h-4"
            />
            <label htmlFor="onlyCompleted" className="cursor-pointer select-none font-semibold">
              Hanya sertakan santri yang telah menyelesaikan ujian (Status: Selesai / Terkunci)
            </label>
          </div>
        </div>

        {/* 5. ACTION BUTTONS */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold cursor-pointer transition"
          >
            Batal
          </button>

          <div className="flex flex-wrap items-center gap-2">
            {selectedFormat === 'excel' ? (
              <>
                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition"
                  title="Unduh format CSV"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>Format CSV</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportXlsx}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold rounded-xl text-xs flex items-center gap-2 shadow-md shadow-emerald-200 cursor-pointer transition"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Unduh File Excel (.xlsx)</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleDownloadReportHtml}
                  className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition"
                  title="Unduh file dokumen mandiri (HTML & PDF)"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>Unduh Dokumen Offline</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrintPdfSafe}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-extrabold rounded-xl text-xs flex items-center gap-2 shadow-md shadow-rose-200 cursor-pointer transition"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak / Ekspor PDF Resmi</span>
                </button>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
