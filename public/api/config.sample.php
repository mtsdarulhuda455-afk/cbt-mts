<?php
declare(strict_types=1);

/**
 * ============================================================================
 * EduExam CBT Pro - Konfigurasi Database MySQL Hostinger (PHP 8.2)
 * ============================================================================
 * 
 * PETUNJUK PENGGUNAAN:
 * 1. Buka hPanel Hostinger -> menu "Kelola Database" / "MySQL Databases".
 * 2. Buat database baru (misal: u123456789_cbt) dan buat user database.
 * 3. Buka phpMyAdmin di Hostinger, pilih database tersebut, lalu klik "Import"
 *    dan pilih file "cbt_database.sql" yang ada di folder ini.
 * 4. Salin / ganti nama file ini menjadi "config.php" di dalam folder "api/".
 * 5. Sesuaikan nama database, user, dan password di bawah ini.
 * 
 * CATATAN PENTING:
 * Jika file config.php tidak ada atau database MySQL belum diatur, sistem CBT
 * akan otomatis menggunakan penyimpanan file JSON terpusat (data/database_master.json)
 * yang tetap bekerja 100% aman untuk seluruh perangkat tanpa error.
 * ============================================================================
 */

return [
    'db_enabled'  => true,
    'db_host'     => 'localhost',
    'db_name'     => 'u123456789_cbt',        // Ganti dengan Nama Database Hostinger Anda
    'db_user'     => 'u123456789_cbtuser',    // Ganti dengan Username Database Hostinger Anda
    'db_pass'     => 'PasswordDatabaseHostinger', // Ganti dengan Password Database Hostinger Anda
    'db_port'     => 3306,
    'db_charset'  => 'utf8mb4'
];
