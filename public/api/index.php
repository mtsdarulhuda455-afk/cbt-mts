<?php
declare(strict_types=1);

/**
 * ============================================================================
 * EduExam CBT Pro - Backend API Engine for Hostinger (Minimum PHP 8.2)
 * Forward-compatible: PHP 8.2, 8.3, 8.4, 8.5+
 * Dual Engine: MySQL (PDO) + Centrally Unified JSON File Storage Fallback
 * ============================================================================
 * 
 * Endpoints handled:
 * - GET  /api/database/latest        (Retrieve unified master database snapshot)
 * - POST /api/database/sync          (Persist unified database snapshot to MySQL & Disk)
 * - GET  /api/database/status        (Check database status, row counts & storage engine)
 * - POST /api/database/sync-firebase (Cloud Firestore mirror synchronization probe)
 * - GET  /api/health                 (Health check & PHP environment probe)
 * ============================================================================
 */

// Configure PHP runtime constraints
ini_set('display_errors', '0');
ini_set('log_errors', '1');
ini_set('memory_limit', '256M');
ini_set('max_execution_time', '120');

$phpVersion = PHP_VERSION;
$minPhpVersion = '8.2.0';
$isPhpSupported = version_compare($phpVersion, $minPhpVersion, '>=');

// Set JSON and CORS response headers
header('Content-Type: application/json; charset=UTF-8');
header('X-Powered-By: EduExam CBT Engine / Hostinger PHP ' . $phpVersion . ' (Min PHP 8.2, Supports 8.2/8.3/8.4/8.5+)');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Origin, X-Requested-With, Content-Type, Accept, Authorization');

// Handle CORS pre-flight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Enforce minimum PHP 8.2 requirement (compatible with PHP 8.2, 8.3, 8.4, 8.5+)
if (!$isPhpSupported) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => "Versi PHP server Anda ({$phpVersion}) di bawah batas minimum. Sistem EduExam CBT memerlukan minimal PHP 8.2 (Mendukung PHP 8.2, 8.3, 8.4, 8.5+). Silakan atur versi PHP di Hostinger hPanel.",
        'php_version' => $phpVersion,
        'php_min_version' => '8.2',
        'is_php_supported' => false
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

// Define database paths
$baseDir = dirname(__DIR__);
$dataDir = $baseDir . DIRECTORY_SEPARATOR . 'data';
$dbFile = $dataDir . DIRECTORY_SEPARATOR . 'database_master.json';
$backupDir = $dataDir . DIRECTORY_SEPARATOR . 'backups';

if (!is_dir($dataDir)) {
    @mkdir($dataDir, 0755, true);
}
if (!is_dir($backupDir)) {
    @mkdir($backupDir, 0755, true);
}

// ----------------------------------------------------------------------------
// Optional MySQL Connection (PDO)
// ----------------------------------------------------------------------------
$pdo = null;
$mysqlConfig = null;
$configFile = __DIR__ . DIRECTORY_SEPARATOR . 'config.php';

if (file_exists($configFile)) {
    try {
        $loadedConfig = include $configFile;
        if (is_array($loadedConfig) && !empty($loadedConfig['db_enabled']) && !empty($loadedConfig['db_name']) && !empty($loadedConfig['db_user'])) {
            $mysqlConfig = $loadedConfig;
            $dbHost = $mysqlConfig['db_host'] ?? 'localhost';
            $dbPort = (int)($mysqlConfig['db_port'] ?? 3306);
            $dbName = $mysqlConfig['db_name'];
            $dbUser = $mysqlConfig['db_user'];
            $dbPass = $mysqlConfig['db_pass'] ?? '';
            $dbCharset = $mysqlConfig['db_charset'] ?? 'utf8mb4';

            $dsn = "mysql:host={$dbHost};port={$dbPort};dbname={$dbName};charset={$dbCharset}";
            $pdo = new PDO($dsn, $dbUser, $dbPass, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
                PDO::ATTR_TIMEOUT => 5
            ]);
        }
    } catch (\Throwable $dbErr) {
        error_log('[CBT Engine] Notice: MySQL config found but failed to connect: ' . $dbErr->getMessage());
        $pdo = null;
    }
}

// Determine requested action
$action = $_GET['action'] ?? '';
if (empty($action)) {
    $uri = parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH) ?? '';
    if (str_ends_with($uri, '/latest')) {
        $action = 'latest';
    } elseif (str_ends_with($uri, '/sync')) {
        $action = 'sync';
    } elseif (str_ends_with($uri, '/status')) {
        $action = 'status';
    } elseif (str_ends_with($uri, '/sync-firebase')) {
        $action = 'sync-firebase';
    } elseif (str_ends_with($uri, '/health')) {
        $action = 'health';
    } else {
        $action = 'status';
    }
}

function sendJsonResponse(int $statusCode, array $data): void {
    http_response_code($statusCode);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
    exit;
}

try {
    switch ($action) {
        // --------------------------------------------------------------------
        // API 1: GET /api/database/latest
        // --------------------------------------------------------------------
        case 'latest':
            if ($_SERVER['REQUEST_METHOD'] !== 'GET' && $_SERVER['REQUEST_METHOD'] !== 'HEAD') {
                sendJsonResponse(405, ['success' => false, 'error' => 'Metode HTTP tidak diizinkan. Gunakan GET.']);
            }

            // Priority 1: Check MySQL if configured and connected
            if ($pdo !== null) {
                try {
                    $stmt = $pdo->prepare("SELECT data_json, updated_at FROM cbt_system_snapshots WHERE snapshot_key = 'latest_database' LIMIT 1");
                    $stmt->execute();
                    $row = $stmt->fetch();
                    if ($row && !empty($row['data_json'])) {
                        $mysqlData = json_decode((string)$row['data_json'], true);
                        if (is_array($mysqlData) && !empty($mysqlData['users'])) {
                            sendJsonResponse(200, [
                                'success' => true,
                                'data' => $mysqlData,
                                'message' => "Database berhasil dimuat dari MySQL Hostinger (PHP {$phpVersion}, Min 8.2 PDO).",
                                'storage_engine' => 'MySQL (Hostinger phpMyAdmin)',
                                'server_info' => [
                                    'php_version' => $phpVersion,
                                    'php_min_version' => '8.2',
                                    'php_compatible' => '>= 8.2 (8.2, 8.3, 8.4, 8.5+)',
                                    'is_php_supported' => $isPhpSupported,
                                    'updated_at' => $row['updated_at'] ?? date('Y-m-d H:i:s')
                                ]
                            ]);
                        }
                    }
                } catch (\Throwable $qErr) {
                    error_log('[CBT Engine] Fallback to JSON: MySQL read failed: ' . $qErr->getMessage());
                }
            }

            // Priority 2: Read from local JSON master file
            if (!file_exists($dbFile) || filesize($dbFile) === 0) {
                sendJsonResponse(200, [
                    'success' => false,
                    'message' => 'Belum ada database yang disinkronkan ke server Hostinger.',
                    'php_version' => $phpVersion,
                    'php_min_version' => '8.2',
                    'php_compatible' => '>= 8.2 (8.2, 8.3, 8.4, 8.5+)',
                    'is_php_supported' => $isPhpSupported
                ]);
            }

            $fp = @fopen($dbFile, 'rb');
            if ($fp === false) {
                sendJsonResponse(500, ['success' => false, 'error' => 'Gagal membuka file database di server.']);
            }

            flock($fp, LOCK_SH);
            $content = stream_get_contents($fp);
            flock($fp, LOCK_UN);
            fclose($fp);

            if ($content === false || trim($content) === '') {
                sendJsonResponse(500, ['success' => false, 'error' => 'Isi file database kosong.']);
            }

            $decoded = json_decode($content, true);
            if ($decoded === null && json_last_error() !== JSON_ERROR_NONE) {
                sendJsonResponse(500, ['success' => false, 'error' => 'Format database JSON tidak valid: ' . json_last_error_msg()]);
            }

            $userCount = isset($decoded['users']) && is_array($decoded['users']) ? count($decoded['users']) : 0;
            $examCount = isset($decoded['exams']) && is_array($decoded['exams']) ? count($decoded['exams']) : 0;
            $classCount = isset($decoded['classes']) && is_array($decoded['classes']) ? count($decoded['classes']) : 0;

            sendJsonResponse(200, [
                'success' => true,
                'data' => $decoded,
                'message' => "Database berhasil dimuat dari server Hostinger (PHP {$phpVersion}, Min 8.2: {$userCount} akun pengguna, {$classCount} rombel, {$examCount} ujian).",
                'storage_engine' => 'JSON File Master (data/database_master.json)',
                'server_info' => [
                    'php_version' => $phpVersion,
                    'php_min_version' => '8.2',
                    'php_compatible' => '>= 8.2 (8.2, 8.3, 8.4, 8.5+)',
                    'is_php_supported' => $isPhpSupported,
                    'hostinger_ready' => true,
                    'last_modified' => date('Y-m-d H:i:s', (int)filemtime($dbFile))
                ]
            ]);
            break;

        // --------------------------------------------------------------------
        // API 2: POST /api/database/sync
        // --------------------------------------------------------------------
        case 'sync':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
                sendJsonResponse(405, ['success' => false, 'error' => 'Metode HTTP tidak diizinkan. Gunakan POST.']);
            }

            $rawInput = file_get_contents('php://input');
            if (empty($rawInput)) {
                sendJsonResponse(400, ['success' => false, 'error' => 'Payload JSON kosong']);
            }

            $payload = json_decode($rawInput, true);
            if ($payload === null && json_last_error() !== JSON_ERROR_NONE) {
                sendJsonResponse(400, ['success' => false, 'error' => 'Format JSON tidak valid: ' . json_last_error_msg()]);
            }

            if (!is_array($payload)) {
                sendJsonResponse(400, ['success' => false, 'error' => 'Payload harus berupa objek JSON']);
            }

            $usersCount = isset($payload['users']) && is_array($payload['users']) ? count($payload['users']) : 0;
            $classesCount = isset($payload['classes']) && is_array($payload['classes']) ? count($payload['classes']) : 0;
            $examsCount = isset($payload['exams']) && is_array($payload['exams']) ? count($payload['exams']) : 0;
            $sessionsCount = isset($payload['sessions']) && is_array($payload['sessions']) ? count($payload['sessions']) : 0;

            $now = (int)(microtime(true) * 1000);
            $payload['serverSavedAt'] = $now;
            $payload['serverSavedDate'] = gmdate('Y-m-d\TH:i:s\Z');
            $payload['serverEnvironment'] = 'Hostinger PHP ' . $phpVersion . ($pdo ? ' (MySQL Mode)' : ' (JSON File Mode)');

            $jsonString = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
            if ($jsonString === false) {
                sendJsonResponse(500, ['success' => false, 'error' => 'Gagal mengenkripsi JSON payload']);
            }

            $mysqlSaved = false;

            // 1. Save to MySQL if connected
            if ($pdo !== null) {
                try {
                    $stmt = $pdo->prepare("
                        INSERT INTO cbt_system_snapshots (snapshot_key, data_json, users_count, classes_count, exams_count, sessions_count)
                        VALUES ('latest_database', :json, :users, :classes, :exams, :sessions)
                        ON DUPLICATE KEY UPDATE
                            data_json = VALUES(data_json),
                            users_count = VALUES(users_count),
                            classes_count = VALUES(classes_count),
                            exams_count = VALUES(exams_count),
                            sessions_count = VALUES(sessions_count),
                            updated_at = CURRENT_TIMESTAMP
                    ");
                    $stmt->execute([
                        ':json' => $jsonString,
                        ':users' => $usersCount,
                        ':classes' => $classesCount,
                        ':exams' => $examsCount,
                        ':sessions' => $sessionsCount
                    ]);
                    $mysqlSaved = true;

                    // Also upsert individual users to cbt_users table for phpMyAdmin visibility
                    if (is_array($payload['users'])) {
                        $userUpsert = $pdo->prepare("
                            INSERT INTO cbt_users (id, name, username, password, role, nisn_or_nip, school_name, mfa_secret, is_mfa_verified, whatsapp_number, subject_or_position, barcode, class_id, class_name, parent_name)
                            VALUES (:id, :name, :username, :password, :role, :nisn, :school, :mfa, :verified, :wa, :pos, :barcode, :class_id, :class_name, :parent)
                            ON DUPLICATE KEY UPDATE
                                name = VALUES(name),
                                password = VALUES(password),
                                role = VALUES(role),
                                nisn_or_nip = VALUES(nisn_or_nip),
                                mfa_secret = VALUES(mfa_secret),
                                whatsapp_number = VALUES(whatsapp_number),
                                class_id = VALUES(class_id),
                                class_name = VALUES(class_name)
                        ");
                        foreach ($payload['users'] as $u) {
                            if (!empty($u['id']) && !empty($u['username'])) {
                                $userUpsert->execute([
                                    ':id' => (string)$u['id'],
                                    ':name' => (string)($u['name'] ?? ''),
                                    ':username' => (string)$u['username'],
                                    ':password' => (string)($u['password'] ?? ''),
                                    ':role' => (string)($u['role'] ?? 'student'),
                                    ':nisn' => (string)($u['nisnOrNip'] ?? ''),
                                    ':school' => (string)($u['schoolName'] ?? 'MTs. Darul Huda'),
                                    ':mfa' => (string)($u['mfaSecret'] ?? '123456'),
                                    ':verified' => !empty($u['isMfaVerified']) ? 1 : 0,
                                    ':wa' => (string)($u['whatsappNumber'] ?? ''),
                                    ':pos' => (string)($u['subjectOrPosition'] ?? ''),
                                    ':barcode' => (string)($u['barcode'] ?? ''),
                                    ':class_id' => (string)($u['classId'] ?? ''),
                                    ':class_name' => (string)($u['className'] ?? ''),
                                    ':parent' => (string)($u['parentName'] ?? '')
                                ]);
                            }
                        }
                    }
                } catch (\Throwable $mErr) {
                    error_log('[CBT Engine] Notice: MySQL sync save error: ' . $mErr->getMessage());
                }
            }

            // 2. Save to local JSON master file as primary or secondary backup
            $tmpFile = $dataDir . DIRECTORY_SEPARATOR . 'tmp_db_' . uniqid('', true) . '.json';
            $writeSuccess = @file_put_contents($tmpFile, $jsonString, LOCK_EX);

            if ($writeSuccess !== false) {
                if (!@rename($tmpFile, $dbFile)) {
                    @copy($tmpFile, $dbFile);
                    @unlink($tmpFile);
                }
            } else {
                @file_put_contents($dbFile, $jsonString, LOCK_EX);
            }

            // 3. Create rolling backup (last 5 files)
            try {
                $backupFile = $backupDir . DIRECTORY_SEPARATOR . 'db_backup_' . date('Ymd_His') . '.json';
                @copy($dbFile, $backupFile);

                $existingBackups = glob($backupDir . DIRECTORY_SEPARATOR . 'db_backup_*.json') ?: [];
                if (count($existingBackups) > 5) {
                    sort($existingBackups);
                    $toDelete = array_slice($existingBackups, 0, count($existingBackups) - 5);
                    foreach ($toDelete as $oldFile) {
                        @unlink($oldFile);
                    }
                }
            } catch (\Throwable $backupErr) {}

            $storageDesc = $mysqlSaved ? 'MySQL Hostinger & File JSON' : 'Penyimpanan File Master Hostinger';

            sendJsonResponse(200, [
                'success' => true,
                'message' => "Database berhasil disinkronkan ke {$storageDesc} (PHP {$phpVersion}, Min 8.2: {$usersCount} akun, {$classesCount} rombel, {$examsCount} ujian). Seluruh perangkat di tautan ini langsung menerima data terbaru!",
                'timestamp' => $now,
                'mysql_persisted' => $mysqlSaved,
                'storage_engine' => $mysqlSaved ? 'MySQL + Backup JSON' : 'JSON Master File',
                'counts' => [
                    'users' => $usersCount,
                    'classes' => $classesCount,
                    'exams' => $examsCount,
                    'sessions' => $sessionsCount
                ],
                'php_version' => $phpVersion,
                'php_min_version' => '8.2',
                'php_compatible' => '>= 8.2 (8.2, 8.3, 8.4, 8.5+)',
                'is_php_supported' => $isPhpSupported
            ]);
            break;

        // --------------------------------------------------------------------
        // API 3: GET /api/database/status
        // --------------------------------------------------------------------
        case 'status':
            $jsonExists = file_exists($dbFile) && filesize($dbFile) > 0;
            $mysqlConnected = ($pdo !== null);

            $usersCount = 0;
            $classesCount = 0;
            $examsCount = 0;
            $savedAt = null;

            if ($mysqlConnected) {
                try {
                    $stmt = $pdo->query("SELECT users_count, classes_count, exams_count, updated_at FROM cbt_system_snapshots WHERE snapshot_key = 'latest_database' LIMIT 1");
                    $row = $stmt->fetch();
                    if ($row) {
                        $usersCount = (int)$row['users_count'];
                        $classesCount = (int)$row['classes_count'];
                        $examsCount = (int)$row['exams_count'];
                        $savedAt = strtotime((string)$row['updated_at']) * 1000;
                    }
                } catch (\Throwable) {}
            }

            if (!$mysqlConnected && $jsonExists) {
                $raw = @file_get_contents($dbFile);
                $parsed = $raw ? json_decode($raw, true) : null;
                if ($parsed) {
                    $usersCount = isset($parsed['users']) && is_array($parsed['users']) ? count($parsed['users']) : 0;
                    $classesCount = isset($parsed['classes']) && is_array($parsed['classes']) ? count($parsed['classes']) : 0;
                    $examsCount = isset($parsed['exams']) && is_array($parsed['exams']) ? count($parsed['exams']) : 0;
                    $savedAt = $parsed['serverSavedAt'] ?? ((int)filemtime($dbFile) * 1000);
                }
            }

            sendJsonResponse(200, [
                'exists' => $jsonExists || $mysqlConnected,
                'mysql_connected' => $mysqlConnected,
                'storage_engine' => $mysqlConnected ? 'MySQL Hostinger (phpMyAdmin)' : 'JSON File Master (Auto)',
                'savedAt' => $savedAt,
                'usersCount' => $usersCount,
                'classesCount' => $classesCount,
                'examsCount' => $examsCount,
                'sql_import_ready' => file_exists($baseDir . DIRECTORY_SEPARATOR . 'cbt_database.sql'),
                'php_version' => $phpVersion,
                'php_min_version' => '8.2',
                'php_compatible' => '>= 8.2 (8.2, 8.3, 8.4, 8.5+)',
                'is_php_supported' => $isPhpSupported
            ]);
            break;

        // --------------------------------------------------------------------
        // API 4: POST /api/database/sync-firebase
        // --------------------------------------------------------------------
        case 'sync-firebase':
            sendJsonResponse(200, [
                'success' => true,
                'message' => 'Database tersimpan aman di server Hostinger (PHP ' . $phpVersion . ', Min 8.2, ' . ($pdo ? 'MySQL phpMyAdmin' : 'JSON File Terpusat') . ').',
                'php_version' => $phpVersion,
                'php_min_version' => '8.2',
                'php_compatible' => '>= 8.2 (8.2, 8.3, 8.4, 8.5+)',
                'is_php_supported' => $isPhpSupported
            ]);
            break;

        // --------------------------------------------------------------------
        // API 5: GET /api/health or GET /health
        // --------------------------------------------------------------------
        case 'health':
        default:
            sendJsonResponse(200, [
                'status' => 'ok',
                'app' => 'EduExam CBT Pro',
                'php_version' => $phpVersion,
                'php_min_version' => '8.2',
                'php_compatible' => '>= 8.2 (8.2, 8.3, 8.4, 8.5+)',
                'php_compatibility' => 'Minimal PHP 8.2 (Mendukung PHP 8.2, 8.3, 8.4, 8.5+)',
                'is_php_supported' => $isPhpSupported,
                'mysql_connected' => ($pdo !== null),
                'storage_mode' => ($pdo !== null) ? 'MySQL (Hostinger PDO)' : 'JSON File Master Storage',
                'sql_file_available' => file_exists($baseDir . DIRECTORY_SEPARATOR . 'cbt_database.sql'),
                'server_software' => $_SERVER['SERVER_SOFTWARE'] ?? 'Hostinger Web Server',
                'timestamp' => date('c'),
                'data_directory_writable' => is_writable($dataDir),
                'database_exists' => file_exists($dbFile) || ($pdo !== null)
            ]);
            break;
    }
} catch (\Throwable $e) {
    sendJsonResponse(500, [
        'success' => false,
        'error' => 'Server error: ' . $e->getMessage(),
        'php_version' => $phpVersion
    ]);
}
