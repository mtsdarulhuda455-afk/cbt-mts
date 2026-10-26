<?php
/**
 * EduExam CBT Pro - Auto Installer & Extractor for Hostinger
 * Mengekstrak paket cbt-hostinger-siap-upload.zip ke web root Hostinger
 */
error_reporting(E_ALL);
ini_set('display_errors', '1');

header('Content-Type: text/html; charset=UTF-8');
header('Cache-Control: no-cache, no-store, must-revalidate');

$targetDir = __DIR__;
// If executed inside /public or /api, determine root directory
if (basename($targetDir) === 'api') {
    $targetDir = dirname($targetDir, 2);
} elseif (basename($targetDir) === 'public') {
    $targetDir = dirname($targetDir);
}

$zipCandidates = [
    __DIR__ . '/cbt-hostinger-siap-upload.zip',
    __DIR__ . '/public/cbt-hostinger-siap-upload.zip',
    $targetDir . '/public/cbt-hostinger-siap-upload.zip',
    $targetDir . '/cbt-hostinger-siap-upload.zip',
    __DIR__ . '/../public/cbt-hostinger-siap-upload.zip',
    __DIR__ . '/../cbt-hostinger-siap-upload.zip',
    __DIR__ . '/dist/cbt-hostinger-siap-upload.zip',
    __DIR__ . '/dist/git/cbt-hostinger-siap-upload.zip',
];

$zipFile = null;
foreach ($zipCandidates as $candidate) {
    if (file_exists($candidate) && filesize($candidate) > 100000) {
        $zipFile = $candidate;
        break;
    }
}

$action = $_GET['run'] ?? ($_GET['auto'] ?? '');
$success = false;
$error = null;
$extractedCount = 0;

if ($action === 'extract' || $action === '1') {
    if (!$zipFile) {
        $error = "File cbt-hostinger-siap-upload.zip tidak ditemukan. Pastikan file zip sudah di-upload ke server Hostinger.";
    } elseif (!class_exists('ZipArchive')) {
        $error = "Ekstensi PHP ZipArchive tidak aktif. Silakan ekstrak berkas zip melalui Hostinger File Manager.";
    } else {
        $zip = new ZipArchive();
        if ($zip->open($zipFile) === TRUE) {
            $extractedCount = $zip->numFiles;
            $zip->extractTo($targetDir);
            $zip->close();
            $success = true;

            // Also copy .htaccess if needed
            if (file_exists($targetDir . '/public/.htaccess') && !file_exists($targetDir . '/.htaccess')) {
                @copy($targetDir . '/public/.htaccess', $targetDir . '/.htaccess');
            }
        } else {
            $error = "Gagal membuka berkas zip: " . $zipFile;
        }
    }
}
?>
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Instalasi Otomatis EduExam CBT Pro</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { box-sizing: border-box; }
    body { background: #0f172a; color: #f8fafc; font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; }
    .card { background: #1e293b; border: 1px solid #334155; border-radius: 20px; max-width: 540px; width: 100%; padding: 32px; text-align: center; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); }
    .icon { width: 64px; height: 64px; margin: 0 auto 16px; background: linear-gradient(135deg, #4f46e5, #06b6d4); border-radius: 18px; display: flex; align-items: center; justify-content: center; font-size: 30px; box-shadow: 0 10px 25px -5px rgba(79,70,229,0.4); }
    .btn { display: inline-block; padding: 14px 28px; background: #4f46e5; color: white; border-radius: 12px; font-weight: 600; text-decoration: none; border: none; cursor: pointer; font-size: 14px; margin-top: 14px; transition: all 0.2s; }
    .btn:hover { background: #4338ca; }
    .btn-success { background: #10b981; }
    .btn-success:hover { background: #059669; }
    .badge { display: inline-block; padding: 4px 12px; background: rgba(79, 70, 229, 0.2); color: #818cf8; border: 1px solid rgba(99, 102, 241, 0.3); border-radius: 999px; font-size: 12px; font-weight: 600; margin-bottom: 14px; }
    .file-box { background: rgba(15, 23, 42, 0.8); border: 1px solid rgba(148, 163, 184, 0.2); border-radius: 12px; padding: 14px; margin: 16px 0; text-align: left; font-size: 13px; font-family: monospace; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">⚡</div>
    <span class="badge">Hostinger 1-Click Auto Installer</span>
    <h2 style="margin: 0 0 8px 0; font-size: 22px;">EduExam CBT Pro</h2>
    <p style="color: #94a3b8; font-size: 13px; margin: 0 0 20px 0;">Pemasangan Modul Kompilasi Produksi (PHP 8.2+ & SQLite/MySQL)</p>

    <?php if ($success): ?>
      <div style="background: rgba(16, 185, 129, 0.15); border: 1px solid #10b981; border-radius: 14px; padding: 18px; margin: 16px 0; color: #a7f3d0; font-size: 14px; line-height: 1.6;">
        <div style="font-size: 24px; margin-bottom: 6px;">🎉</div>
        <strong style="color: #ffffff; font-size: 16px;">Instalasi Berhasil Sempurna!</strong><br>
        Sebanyak <strong><?= $extractedCount ?> berkas</strong> (termasuk <code>assets/</code>, <code>api/</code>, <code>index.html</code>, dan <code>.htaccess</code>) telah terpasang ke <code><?= htmlspecialchars($targetDir) ?></code>.
      </div>
      <a href="./" class="btn btn-success" style="font-size: 16px; padding: 16px 32px;">🚀 Buka Aplikasi CBT Sekarang</a>
    <?php else: ?>
      <?php if ($error): ?>
        <div style="background: rgba(239, 68, 68, 0.15); border: 1px solid #ef4444; border-radius: 12px; padding: 14px; margin: 14px 0; color: #fca5a5; font-size: 13px;">
          ⚠️ <?= htmlspecialchars($error) ?>
        </div>
      <?php endif; ?>

      <p style="color: #cbd5e1; font-size: 13px; line-height: 1.6; text-align: left;">
        Skrip ini secara otomatis mengekstrak berkas produksi yang telah siap ke folder web Anda sehingga aplikasi langsung aktif tanpa loading berputar:
      </p>

      <div class="file-box">
        <div><strong>Status Paket ZIP:</strong> <?= $zipFile ? '<span style="color:#34d399">✅ Siap di server (' . round(filesize($zipFile)/1024) . ' KB)</span>' : '<span style="color:#f87171">❌ Belum ditemukan</span>' ?></div>
        <?php if ($zipFile): ?>
          <div style="color: #94a3b8; margin-top: 4px; font-size: 11px;">Path: <?= htmlspecialchars($zipFile) ?></div>
        <?php endif; ?>
        <div style="margin-top: 6px;"><strong>Target Ekstrak:</strong> <code style="color:#a5b4fc;"><?= htmlspecialchars($targetDir) ?></code></div>
      </div>

      <?php if ($zipFile): ?>
        <a href="?run=extract" class="btn" style="width: 100%;">⚡ Pasang & Ekstrak Sekarang (1 Klik)</a>
      <?php else: ?>
        <p style="color: #f87171; font-size: 13px; margin-top: 14px;">
          Silakan upload file <code>cbt-hostinger-siap-upload.zip</code> ke folder <code>public_html</code> terlebih dahulu, lalu refresh halaman ini.
        </p>
      <?php endif; ?>
    <?php endif; ?>
  </div>
</body>
</html>
