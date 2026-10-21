import { User, AttendanceType, AttendanceStatus } from '../types/cbt';

/**
 * Utility functions for Waktu Indonesia Barat (WIB / UTC+7)
 * Sesuai kebutuhan reset waktu dan pencatatan presensi MTs. Darul Huda
 */

export const getWibDate = (date: Date = new Date()): string => {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(date); // Format: YYYY-MM-DD
  } catch {
    // Fallback if timezone not supported
    const wibOffset = 7 * 60; // minutes
    const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
    const wibDate = new Date(utc + (wibOffset * 60000));
    return wibDate.toISOString().split('T')[0];
  }
};

export const getWibTime = (date: Date = new Date()): string => {
  try {
    const formatter = new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    return formatter.format(date).replace(/\./g, ':');
  } catch {
    const wibOffset = 7 * 60;
    const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
    const wibDate = new Date(utc + (wibOffset * 60000));
    return wibDate.toTimeString().split(' ')[0];
  }
};

export const getWibDateIndonesian = (dateStr?: string): string => {
  if (!dateStr) return '';
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return new Intl.DateTimeFormat('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'Asia/Jakarta',
    }).format(date);
  } catch {
    return dateStr;
  }
};

export const getMonthNameIndonesian = (monthIndex: number): string => {
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  return months[monthIndex] || '';
};

/**
 * Format nomor WhatsApp ke format internasional 62xxx
 */
export const cleanWhatsappNumber = (phone?: string): string => {
  if (!phone) return '';
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1);
  } else if (!cleaned.startsWith('62')) {
    cleaned = '62' + cleaned;
  }
  return cleaned;
};

/**
 * Generate tautan WhatsApp Web / App dengan pesan terenkripsi
 */
export const createWhatsappLink = (phone: string, text: string): string => {
  const cleanPhone = cleanWhatsappNumber(phone);
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
};

/**
 * Barcode Khusus Lembaga (MTs. Darul Huda)
 * Digunakan untuk presensi mandiri guru / tenaga pendidik saat tiba di madrasah
 */
export const INSTITUTION_BARCODE_DEFAULT = 'DARUL-HUDA-LEMBAGA-PRESENSI-MTS';

export const isInstitutionBarcode = (barcode: string): boolean => {
  if (!barcode) return false;
  const clean = barcode.trim().toUpperCase();
  return (
    clean === INSTITUTION_BARCODE_DEFAULT ||
    (clean.includes('DARUL-HUDA') && (clean.includes('LEMBAGA') || clean.includes('PRESENSI') || clean.includes('INSTITUSI')))
  );
};

/**
 * Format Pesan WhatsApp Kehadiran Siswa untuk Wali Murid
 */
export const buildStudentWhatsappMessage = (
  student: User,
  type: AttendanceType,
  timeWib: string,
  dateWib: string,
  schoolName: string = 'MTs. Darul Huda',
  status: AttendanceStatus = 'hadir'
): string => {
  const dateFormatted = getWibDateIndonesian(dateWib);
  const wali = student.parentName ? `Yth. ${student.parentName}` : 'Yth. Bapak/Ibu Wali Santri';
  const statusLabel = status === 'terlambat' ? '⚠️ Terlambat' : '✅ Hadir Tepat Waktu';

  if (type === 'masuk') {
    return `*NOTIFIKASI KEHADIRAN (MASUK)*\n*${schoolName.toUpperCase()}*\n\n` +
      `Assalamu'alaikum Wr. Wb.\n` +
      `${wali},\n\n` +
      `Alhamdulillah, ananda kami:\n` +
      `👤 *Nama:* ${student.name}\n` +
      `💳 *NISN:* ${student.nisnOrNip}\n` +
      `🏫 *Kelas:* ${student.className || '-'}\n` +
      `📅 *Hari/Tanggal:* ${dateFormatted}\n` +
      `⏰ *Waktu Masuk:* ${timeWib} WIB\n` +
      `📌 *Status:* ${statusLabel}\n\n` +
      `Telah tiba di madrasah dan melakukan presensi barcode masuk dengan aman dan tertib.\n\n` +
      `Terima kasih atas kerja sama dan doa Bapak/Ibu sekalian.\n` +
      `_Wassalamu'alaikum Wr. Wb._\n\n` +
      `_Pesan otomatis Sistem Presensi Digital ${schoolName}_`;
  } else {
    return `*NOTIFIKASI KEPULANGAN SANTRI*\n*${schoolName.toUpperCase()}*\n\n` +
      `Assalamu'alaikum Wr. Wb.\n` +
      `${wali},\n\n` +
      `Diberitahukan bahwa ananda kami:\n` +
      `👤 *Nama:* ${student.name}\n` +
      `💳 *NISN:* ${student.nisnOrNip}\n` +
      `🏫 *Kelas:* ${student.className || '-'}\n` +
      `📅 *Hari/Tanggal:* ${dateFormatted}\n` +
      `⏰ *Waktu Pulang:* ${timeWib} WIB\n` +
      `📌 *Status:* Selesai Kegiatan KBM Madrasah\n\n` +
      `Telah melakukan presensi barcode kepulangan dan bersiap meninggalkan madrasah untuk kembali ke rumah. Semoga selamat sampai tujuan.\n\n` +
      `_Wassalamu'alaikum Wr. Wb._\n\n` +
      `_Pesan otomatis Sistem Presensi Digital ${schoolName}_`;
  }
};

/**
 * Format Pesan WhatsApp Kehadiran Guru untuk WhatsApp Pribadi Guru
 */
export const buildTeacherWhatsappMessage = (
  teacher: User,
  type: AttendanceType,
  timeWib: string,
  dateWib: string,
  schoolName: string = 'MTs. Darul Huda',
  status: AttendanceStatus = 'hadir'
): string => {
  const dateFormatted = getWibDateIndonesian(dateWib);
  const statusLabel = status === 'terlambat' ? '⚠️ Terlambat' : '✅ Tepat Waktu';

  if (type === 'masuk') {
    return `*PRESENSI MASUK PENDIDIK & TENAGA KEPENDIDIKAN*\n*${schoolName.toUpperCase()}*\n\n` +
      `Assalamu'alaikum Wr. Wb.\n` +
      `Yth. *${teacher.name}*\n` +
      `🆔 *NIP / ID:* ${teacher.nisnOrNip}\n` +
      `📚 *Tugas / Mapel:* ${teacher.subjectOrPosition || 'Pendidik'}\n` +
      `📅 *Hari/Tanggal:* ${dateFormatted}\n` +
      `⏰ *Waktu Masuk:* ${timeWib} WIB\n` +
      `📌 *Status Presensi:* ${statusLabel}\n\n` +
      `Presensi barcode kehadiran masuk Anda telah berhasil diverifikasi oleh sistem CBT & Kepegawaian ${schoolName}.\n\n` +
      `Selamat bertugas mendidik putra-putri madrasah dengan penuh keikhlasan dan semangat!\n\n` +
      `_Wassalamu'alaikum Wr. Wb._\n\n` +
      `_Sistem Presensi & Kepegawaian ${schoolName}_`;
  } else {
    return `*PRESENSI KEPULANGAN PENDIDIK*\n*${schoolName.toUpperCase()}*\n\n` +
      `Assalamu'alaikum Wr. Wb.\n` +
      `Yth. *${teacher.name}*\n` +
      `🆔 *NIP / ID:* ${teacher.nisnOrNip}\n` +
      `📅 *Hari/Tanggal:* ${dateFormatted}\n` +
      `⏰ *Waktu Pulang:* ${timeWib} WIB\n` +
      `📌 *Status Presensi:* Presensi Kepulangan Tercatat\n\n` +
      `Jazakumullah khairan katsiran atas dedikasi dan pengabdian luar biasa Bapak/Ibu guru dalam mendidik santri hari ini di ${schoolName}.\n\n` +
      `Selamat beristirahat dan sampai jumpa esok hari dalam keadaan sehat wal afiat.\n\n` +
      `_Wassalamu'alaikum Wr. Wb._\n\n` +
      `_Sistem Presensi & Kepegawaian ${schoolName}_`;
  }
};

/**
 * Operasi perhitungan waktu WIB (menambahkan menit ke format HH:mm)
 */
export const addMinutesToTime = (timeStr: string, minutes: number): string => {
  if (!timeStr) return '07:45';
  const parts = timeStr.split(':').map(Number);
  const h = parts[0] || 0;
  const m = parts[1] || 0;
  const totalMinutes = h * 60 + m + minutes;
  const newH = Math.floor(totalMinutes / 60) % 24;
  const newM = totalMinutes % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
};

/**
 * Memeriksa apakah waktu saat ini (HH:mm atau HH:mm:ss) telah melewati atau sama dengan target waktu
 */
export const isTimeAfterOrEqual = (currentTime: string, targetTime: string): boolean => {
  if (!currentTime || !targetTime) return false;
  return currentTime.slice(0, 5) >= targetTime.slice(0, 5);
};

/**
 * Pesan WhatsApp: PEMBERITAHUAN SANTRI BELUM ABSEN MASUK (30 Menit Setelah Jam Masuk)
 * Dikirimkan ke nomor WhatsApp Wali Murid
 */
export const buildUnclockedInStudentMessage = (
  student: User,
  dateWib: string,
  schoolName: string = 'MTs. Darul Huda',
  jamMasuk: string = '07:15',
  checkTimeWib?: string
): string => {
  const dateFormatted = getWibDateIndonesian(dateWib);
  const currentTime = checkTimeWib || getWibTime();
  const wali = student.parentName ? `Yth. ${student.parentName}` : 'Yth. Bapak/Ibu Wali Santri';

  return `*PEMBERITAHUAN: BELUM ABSEN MASUK SANTRI*\n` +
    `*${schoolName.toUpperCase()}*\n\n` +
    `Assalamu'alaikum Wr. Wb.\n` +
    `${wali},\n\n` +
    `Diberitahukan bahwa hingga saat ini pukul *${currentTime} WIB* (lebih dari 30 menit setelah batas jam masuk madrasah *${jamMasuk} WIB*), ananda kami:\n\n` +
    `👤 *Nama Siswa:* ${student.name}\n` +
    `💳 *NISN:* ${student.nisnOrNip}\n` +
    `🏫 *Kelas:* ${student.className || '-'}\n` +
    `📅 *Hari/Tanggal:* ${dateFormatted}\n` +
    `⚠️ *Status Presensi:* *BELUM TERCATAT ABSEN MASUK*\n\n` +
    `Mohon kerja sama Bapak/Ibu untuk mengonfirmasi keberadaan ananda:\n` +
    `1. Apabila ananda berhalangan hadir karena Sakit / Izin keluarga, mohon segera membalas pesan ini untuk pembaruan data piket.\n` +
    `2. Apabila ananda sudah berangkat, mohon pastikan ananda segera melapor ke pos piket presensi untuk memindai barcode kartu santri.\n\n` +
    `Terima kasih atas perhatian dan kerja sama Bapak/Ibu wali santri sekalian.\n` +
    `_Wassalamu'alaikum Wr. Wb._\n\n` +
    `_Peringatan Otomatis Sistem Presensi Digital ${schoolName}_`;
};

/**
 * Pesan WhatsApp: PENGINGAT GURU BELUM ABSEN MASUK (30 Menit Setelah Jam Masuk)
 * Dikirimkan ke nomor WhatsApp Pribadi Guru
 */
export const buildUnclockedInTeacherMessage = (
  teacher: User,
  dateWib: string,
  schoolName: string = 'MTs. Darul Huda',
  jamMasuk: string = '07:15',
  checkTimeWib?: string
): string => {
  const dateFormatted = getWibDateIndonesian(dateWib);
  const currentTime = checkTimeWib || getWibTime();

  return `*PENGINGAT PRESENSI: BELUM ABSEN MASUK PENDIDIK*\n` +
    `*${schoolName.toUpperCase()}*\n\n` +
    `Assalamu'alaikum Wr. Wb.\n` +
    `Yth. Ustadz/Ustadzah *${teacher.name}*\n` +
    `🆔 *NIP / ID:* ${teacher.nisnOrNip}\n` +
    `📚 *Tugas / Mapel:* ${teacher.subjectOrPosition || 'Dewan Guru'}\n` +
    `📅 *Hari/Tanggal:* ${dateFormatted}\n\n` +
    `Sistem mencatat hingga pukul *${currentTime} WIB* (30 menit setelah batas waktu masuk *${jamMasuk} WIB*), Anda *BELUM MELAKUKAN PRESENSI BARCODE MASUK* hari ini di ${schoolName}.\n\n` +
    `📌 *Petunjuk Tindak Lanjut:*\n` +
    `- Jika telah tiba di madrasah, silakan segera melakukan presensi mandiri dengan scan *Barcode Lembaga* via kamera HP (Android/iOS) atau scanner eksternal di kantor.\n` +
    `- Jika berhalangan hadir atau sedang tugas dinas luar madrasah, mohon konfirmasi ke pihak Kurikulum / Tim Piket Kepegawaian.\n\n` +
    `Terima kasih atas dedikasi dan kedisiplinan Ustadz/Ustadzah sekalian.\n` +
    `_Wassalamu'alaikum Wr. Wb._\n\n` +
    `_Sistem Presensi & Kepegawaian ${schoolName}_`;
};

/**
 * Pesan WhatsApp: PEMBERITAHUAN SANTRI BELUM ABSEN PULANG (30 Menit Setelah Jam Pulang)
 * Dikirimkan ke nomor WhatsApp Wali Murid
 */
export const buildUnclockedOutStudentMessage = (
  student: User,
  dateWib: string,
  schoolName: string = 'MTs. Darul Huda',
  jamPulang: string = '13:30',
  checkTimeWib?: string
): string => {
  const dateFormatted = getWibDateIndonesian(dateWib);
  const currentTime = checkTimeWib || getWibTime();
  const wali = student.parentName ? `Yth. ${student.parentName}` : 'Yth. Bapak/Ibu Wali Santri';

  return `*PEMBERITAHUAN: BELUM ABSEN PULANG SANTRI*\n` +
    `*${schoolName.toUpperCase()}*\n\n` +
    `Assalamu'alaikum Wr. Wb.\n` +
    `${wali},\n\n` +
    `Diberitahukan bahwa hingga saat ini pukul *${currentTime} WIB* (30 menit setelah jam kepulangan KBM madrasah *${jamPulang} WIB*), ananda kami:\n\n` +
    `👤 *Nama Siswa:* ${student.name}\n` +
    `💳 *NISN:* ${student.nisnOrNip}\n` +
    `🏫 *Kelas:* ${student.className || '-'}\n` +
    `📅 *Hari/Tanggal:* ${dateFormatted}\n` +
    `⚠️ *Status:* *BELUM MELAKUKAN PRESENSI BARCODE KEPULANGAN*\n\n` +
    `📌 *Informasi:*\n` +
    `- Apabila ananda masih mengikuti kegiatan ekstrakurikuler, bimbingan olimpiade, atau tahfidz di madrasah, mohon ingatkan ananda untuk scan barcode pulang sebelum keluar madrasah.\n` +
    `- Apabila ananda telah tiba di rumah, mohon pastikan ananda selalu membiasakan diri scan kartu barcode kepulangan demi rekapitulasi kehadiran madrasah yang akurat.\n\n` +
    `Terima kasih atas kerja sama dan perhatian Bapak/Ibu wali santri.\n` +
    `_Wassalamu'alaikum Wr. Wb._\n\n` +
    `_Peringatan Otomatis Sistem Presensi Digital ${schoolName}_`;
};

/**
 * Pesan WhatsApp: PENGINGAT GURU BELUM ABSEN PULANG (30 Menit Setelah Jam Pulang)
 * Dikirimkan ke nomor WhatsApp Pribadi Guru
 */
export const buildUnclockedOutTeacherMessage = (
  teacher: User,
  dateWib: string,
  schoolName: string = 'MTs. Darul Huda',
  jamPulang: string = '13:30',
  checkTimeWib?: string
): string => {
  const dateFormatted = getWibDateIndonesian(dateWib);
  const currentTime = checkTimeWib || getWibTime();

  return `*PENGINGAT PRESENSI: BELUM ABSEN KEPULANGAN PENDIDIK*\n` +
    `*${schoolName.toUpperCase()}*\n\n` +
    `Assalamu'alaikum Wr. Wb.\n` +
    `Yth. Ustadz/Ustadzah *${teacher.name}*\n` +
    `🆔 *NIP / ID:* ${teacher.nisnOrNip}\n` +
    `📅 *Hari/Tanggal:* ${dateFormatted}\n\n` +
    `Sistem mencatat hingga pukul *${currentTime} WIB* (30 menit setelah jam kepulangan dinas *${jamPulang} WIB*), Anda *BELUM MELAKUKAN PRESENSI KEPULANGAN* hari ini di ${schoolName}.\n\n` +
    `📌 *Petunjuk:*\n` +
    `- Mohon luangkan waktu sejenak untuk memindai barcode kepulangan melalui pos scanner madrasah atau via kamera HP (Barcode Lembaga) sebelum meninggalkan madrasah.\n` +
    `- Presensi kepulangan sangat penting untuk kelengkapan akumulasi jam kerja dan pelaporan kedisiplinan pendidik madrasah.\n\n` +
    `Jazakumullah khairan katsiran atas dedikasi dan pengabdian Anda mendidik santri hari ini.\n` +
    `_Wassalamu'alaikum Wr. Wb._\n\n` +
    `_Sistem Presensi & Kepegawaian ${schoolName}_`;
};

/**
 * Web Audio API synthesizer for Barcode Scanner audio feedback
 */
class AudioManager {
  private ctx: AudioContext | null = null;

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  playSuccessBeep() {
    try {
      this.initCtx();
      if (!this.ctx) return;
      
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, now);
      osc.frequency.exponentialRampToValueAtTime(1800, now + 0.08);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.12);
    } catch {
      // Ignore audio failure
    }
  }

  playErrorBuzz() {
    try {
      this.initCtx();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.setValueAtTime(220, now + 0.1);

      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.25);
    } catch {
      // Ignore audio failure
    }
  }

  playAlreadyClockedTone() {
    try {
      this.initCtx();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      // Friendly double bell chime (informative pleasant tone)
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(659.25, now); // E5
      gain1.gain.setValueAtTime(0.3, now);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
      osc1.connect(gain1);
      gain1.connect(this.ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.18);

      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(880, now + 0.14); // A5
      gain2.gain.setValueAtTime(0.35, now + 0.14);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.38);
      osc2.connect(gain2);
      gain2.connect(this.ctx.destination);
      osc2.start(now + 0.14);
      osc2.stop(now + 0.38);
    } catch {
      // Ignore audio failure
    }
  }
}

export const scanAudio = new AudioManager();
