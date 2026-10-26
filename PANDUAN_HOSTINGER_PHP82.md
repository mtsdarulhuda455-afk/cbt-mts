# 🚀 PANDUAN DEPLOY KE HOSTINGER (MINIMAL PHP 8.2 / 8.3 / 8.4 / 8.5+ & IMPORT SQL MYSQL)

Folder `dist/git` ini telah dipersiapkan secara lengkap dan langsung bisa di-upload ke Hostinger (baik melalui **Hostinger Git Deployment** maupun **File Manager / cPanel / hPanel**).

Sistem CBT ini dirancang **kompatibel ke atas (forward-compatible)**: mendukung **minimal PHP 8.2** serta versi di atasnya (**PHP 8.3, PHP 8.4, PHP 8.5, dan seterusnya**) sehingga Anda **tidak perlu mengupdate kode atau konfigurasi lagi** saat versi PHP di Hostinger dinaikkan!

---

## 📦 Isi Lengkap Folder `dist/git`:
1. `cbt_database.sql` &rarr; **File database SQL siap import ke phpMyAdmin Hostinger**.
2. `api/` &rarr; Backend sinkronisasi berbasis **Minimal PHP 8.2 (8.2 / 8.3 / 8.4 / 8.5+)** (mendukung MySQL PDO & cadangan JSON).
3. `api/config.sample.php` &rarr; Contoh konfigurasi koneksi MySQL ke database Hostinger Anda.
4. `data/database_master.json` &rarr; Cadangan master database offline-first (100% data akun, ujian, santri, rombel).
5. `index.html` & `assets/` &rarr; Frontend web aplikasi CBT terkompilasi produksi.
6. `.htaccess` &rarr; Konfigurasi fleksibel otomatis mengenali PHP 8.2, 8.3, 8.4, 8.5+ dan mengatur routing SPA React.

---

## ⚡ 1. Pengaturan Versi PHP di Hostinger hPanel
Sistem memerlukan **minimal PHP 8.2** (Anda bebas memilih **PHP 8.2, 8.3, 8.4, atau 8.5**):

1. Buka dashboard **Hostinger hPanel**.
2. Masuk ke menu **Tingkat Lanjut (Advanced)** &rarr; **Konfigurasi PHP (PHP Configuration)**.
3. Pilih **PHP 8.2** atau versi lebih tinggi (**PHP 8.3**, **PHP 8.4**, **PHP 8.5**) lalu klik **Simpan (Save)**.
4. File `.htaccess` di folder ini dikonfigurasi dinamis dan fleksibel sehingga mengenali versi PHP aktif yang Anda pilih di hPanel tanpa perlu merubah apapun lagi di masa mendatang.

---

## 🗄️ 2. Cara Import Database SQL ke phpMyAdmin Hostinger (Tinggal Import!)

1. Di **Hostinger hPanel**, masuk ke menu **Database** &rarr; **Kelola Database (MySQL Databases)**.
2. Buat database baru:
   - Nama Database: misalnya `u123456789_cbt`
   - Username: misalnya `u123456789_cbtuser`
   - Password: catat password yang Anda buat.
3. Klik **Buat (Create)**.
4. Pada daftar database, klik tombol **Masuk ke phpMyAdmin (Enter phpMyAdmin)**.
5. Di phpMyAdmin:
   - Klik nama database Anda di panel sebelah kiri.
   - Klik tab **Import** di menu atas.
   - Klik **Choose File / Telusuri File**, lalu pilih file **`cbt_database.sql`** yang ada di folder ini.
   - Biarkan format tetap **SQL**, lalu klik tombol **Import / Kirim (Go)** di bagian paling bawah.
6. **Selesai!** Seluruh tabel (`cbt_users`, `cbt_classes`, `cbt_exams`, `cbt_sessions`, `cbt_attendance`, `cbt_settings`) dan seluruh data master awal telah terpasang 100%.

---

## ⚙️ 3. Menghubungkan Backend PHP ke Database MySQL Hostinger

1. Buka folder **`api/`** di Hostinger File Manager.
2. Salin / ganti nama file **`config.sample.php`** menjadi **`config.php`**.
3. Edit isinya dan sesuaikan dengan data database Hostinger Anda:
   ```php
   return [
       'db_enabled'  => true,
       'db_host'     => 'localhost',
       'db_name'     => 'u123456789_cbt',        // Nama Database Anda
       'db_user'     => 'u123456789_cbtuser',    // Username Database Anda
       'db_pass'     => 'PasswordDatabaseAnda',  // Password Database Anda
       'db_port'     => 3306,
       'db_charset'  => 'utf8mb4'
   ];
   ```
4. Simpan file tersebut.

> **Tips Fleksibel:** Jika Anda belum sempat membuat database MySQL di Hostinger, aplikasi tetap dapat langsung berjalan menggunakan mode **JSON File Storage** (`data/database_master.json`) tanpa konfigurasi apapun!

---

## 📁 4. Cara Upload ke Hostinger

### Opsi A: Melalui File Manager (Paling Cepat & Praktis)
1. Masuk ke **File Manager** di Hostinger hPanel.
2. Buka folder **`public_html`**.
3. Upload seluruh file dan folder yang ada di dalam `dist/git`:
   - `index.html`
   - `assets/`
   - `api/`
   - `data/`
   - `cbt_database.sql`
   - `.htaccess` *(pastikan hidden file ikut terupload)*
4. Pastikan folder `data/` memiliki izin permissions **755** (atau **777**).

---

### Opsi B: Melalui Hostinger Git (Deployment Otomatis)
1. Buka hPanel Hostinger &rarr; pilih menu **Tingkat Lanjut (Advanced)** &rarr; **Git**.
2. Masukkan URL repository Git Anda.
3. Tentukan folder tujuan deploy: `public_html`.
4. Klik **Deploy**.

---

## 🔍 5. Uji Coba & Verifikasi
Setelah di-upload:
1. Buka web Anda: `https://domain-anda.com/`
2. Tes endpoint kesehatan: `https://domain-anda.com/api/health`
   - Mengembalikan respon:
     ```json
     {
       "status": "ok",
       "php_version": "8.x.x",
       "php_min_version": "8.2",
       "php_compatibility": "Minimal PHP 8.2 (Mendukung PHP 8.2, 8.3, 8.4, 8.5+)",
       "is_php_supported": true,
       "mysql_connected": true,
       "storage_mode": "MySQL (Hostinger PDO)"
     }
     ```
3. Login ke sistem CBT:
   - **Admin:** Ketik manual `admin` / `admin123`
   - **Guru:** Ketik manual `guru` / `guru123`
   - **Siswa:** Pilih kelas/nama santri dari scroll & masukkan password `siswa123`

---

## 💡 6. Pemecahan Kendala (Troubleshooting)

### A. Layar Berputar / Loading Terus Setelah Re-upload?
1. **Penyebab:** Browser masih menyimpan cache file JavaScript lama dari sesi sebelumnya.
2. **Solusi:**
   - Tekan **CTRL + F5** (Windows) atau **CMD + Shift + R** (Mac) untuk Hard Refresh.
   - Atau buka melalui **Jendela Pribadi / Incognito / Private Tab**.
   - Pada layar pemuatan kini otomatis dilengkapi tombol darurat **"Muat Ulang Halaman"** dan **"Masuk Mode Standalone"** jika pemuatan memakan waktu lebih dari 3.5 detik.

### B. File `.htaccess` Tidak Terlihat di File Manager Hostinger?
- Di Hostinger File Manager, klik ikon **Pengaturan (Settings / Gerigi)** di pojok kanan atas, lalu aktifkan centang **"Show Hidden Files (dotfiles)"**. Pastikan file `.htaccess` ter-upload ke `public_html`.
