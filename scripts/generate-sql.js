import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const dbJsonPath = path.join(rootDir, 'data', 'database_master.json');
if (!fs.existsSync(dbJsonPath)) {
  console.error('File data/database_master.json tidak ditemukan!');
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(dbJsonPath, 'utf-8'));

function sqlEscape(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'boolean') return val ? '1' : '0';
  if (typeof val === 'number') return isNaN(val) ? 'NULL' : String(val);
  if (typeof val === 'object') {
    val = JSON.stringify(val);
  }
  const str = String(val)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\0/g, '\\0')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r');
  return `'${str}'`;
}

function toSqlTimestampNumber(val) {
  if (val === null || val === undefined || val === '') return 'NULL';
  if (typeof val === 'number') return isNaN(val) ? 'NULL' : String(Math.floor(val));
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (/^\d+$/.test(trimmed)) return trimmed;
    const parsed = Date.parse(trimmed);
    if (!isNaN(parsed)) return String(parsed);
  }
  return String(Date.now());
}

let sql = `-- ============================================================================
-- EduExam CBT Pro - Master Database Schema & Initial Data
-- Platform: Hostinger Web Hosting (MySQL 5.7+ / 8.0+ / MariaDB 10.3+)
-- PHP Runtime: Minimum PHP 8.2 (Supports PHP 8.2, 8.3, 8.4, 8.5+)
-- Encoding: UTF-8 Unicode (utf8mb4 / utf8mb4_unicode_ci)
-- Generated: ${new Date().toISOString()}
-- ============================================================================

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

-- ----------------------------------------------------------------------------
-- Table structure for: cbt_system_snapshots
-- (Stores unified atomic database snapshots for instant multi-device sync)
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS \`cbt_system_snapshots\`;
CREATE TABLE \`cbt_system_snapshots\` (
  \`snapshot_key\` VARCHAR(64) NOT NULL,
  \`data_json\` LONGTEXT NOT NULL,
  \`users_count\` INT DEFAULT 0,
  \`classes_count\` INT DEFAULT 0,
  \`exams_count\` INT DEFAULT 0,
  \`sessions_count\` INT DEFAULT 0,
  \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`snapshot_key\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Table structure for: cbt_users
-- (Administrators, Teachers/Proctors, and Students)
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS \`cbt_users\`;
CREATE TABLE \`cbt_users\` (
  \`id\` VARCHAR(64) NOT NULL,
  \`name\` VARCHAR(191) NOT NULL,
  \`username\` VARCHAR(100) NOT NULL,
  \`password\` VARCHAR(191) NOT NULL,
  \`role\` ENUM('admin','teacher','student') NOT NULL DEFAULT 'student',
  \`nisn_or_nip\` VARCHAR(64) DEFAULT NULL,
  \`school_name\` VARCHAR(191) DEFAULT 'MTs. Darul Huda',
  \`mfa_secret\` VARCHAR(32) DEFAULT NULL,
  \`is_mfa_verified\` TINYINT(1) DEFAULT 1,
  \`whatsapp_number\` VARCHAR(32) DEFAULT NULL,
  \`subject_or_position\` VARCHAR(191) DEFAULT NULL,
  \`barcode\` VARCHAR(64) DEFAULT NULL,
  \`class_id\` VARCHAR(64) DEFAULT NULL,
  \`class_name\` VARCHAR(100) DEFAULT NULL,
  \`parent_name\` VARCHAR(191) DEFAULT NULL,
  \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uniq_username\` (\`username\`),
  KEY \`idx_role\` (\`role\`),
  KEY \`idx_class_id\` (\`class_id\`),
  KEY \`idx_nisn\` (\`nisn_or_nip\`),
  KEY \`idx_barcode\` (\`barcode\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Table structure for: cbt_classes
-- (Classrooms and Study Groups)
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS \`cbt_classes\`;
CREATE TABLE \`cbt_classes\` (
  \`id\` VARCHAR(64) NOT NULL,
  \`name\` VARCHAR(100) NOT NULL,
  \`grade\` VARCHAR(32) NOT NULL,
  \`total_students\` INT DEFAULT 0,
  \`academic_year\` VARCHAR(32) DEFAULT '2026/2027',
  \`homeroom_teacher\` VARCHAR(191) DEFAULT NULL,
  \`major_or_track\` VARCHAR(100) DEFAULT NULL,
  \`room_location\` VARCHAR(191) DEFAULT NULL,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Table structure for: cbt_exams
-- (Exam Packages, Questions Bank, and Rules)
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS \`cbt_exams\`;
CREATE TABLE \`cbt_exams\` (
  \`id\` VARCHAR(64) NOT NULL,
  \`code\` VARCHAR(64) NOT NULL,
  \`title\` VARCHAR(255) NOT NULL,
  \`subject\` VARCHAR(100) NOT NULL,
  \`academic_year\` VARCHAR(32) DEFAULT '2026/2027',
  \`semester\` VARCHAR(32) DEFAULT 'Genap',
  \`duration_minutes\` INT NOT NULL DEFAULT 60,
  \`passing_grade\` INT NOT NULL DEFAULT 75,
  \`total_questions\` INT NOT NULL DEFAULT 0,
  \`classes_allowed\` TEXT DEFAULT NULL,
  \`randomize_questions\` TINYINT(1) DEFAULT 1,
  \`randomize_options\` TINYINT(1) DEFAULT 1,
  \`max_violations_allowed\` INT DEFAULT 3,
  \`status\` VARCHAR(32) NOT NULL DEFAULT 'active',
  \`token\` VARCHAR(32) NOT NULL,
  \`author_id\` VARCHAR(64) DEFAULT NULL,
  \`author_name\` VARCHAR(191) DEFAULT NULL,
  \`author_username\` VARCHAR(100) DEFAULT NULL,
  \`start_time\` VARCHAR(64) DEFAULT NULL,
  \`end_time\` VARCHAR(64) DEFAULT NULL,
  \`exam_date\` VARCHAR(32) DEFAULT NULL,
  \`exam_start_time\` VARCHAR(32) DEFAULT NULL,
  \`exam_end_time\` VARCHAR(32) DEFAULT NULL,
  \`questions_json\` LONGTEXT DEFAULT NULL,
  \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  KEY \`idx_code\` (\`code\`),
  KEY \`idx_status\` (\`status\`),
  KEY \`idx_token\` (\`token\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Table structure for: cbt_sessions
-- (Student Exam Submissions, Answers, and Scores)
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS \`cbt_sessions\`;
CREATE TABLE \`cbt_sessions\` (
  \`id\` VARCHAR(64) NOT NULL,
  \`exam_id\` VARCHAR(64) NOT NULL,
  \`student_id\` VARCHAR(64) NOT NULL,
  \`student_name\` VARCHAR(191) NOT NULL,
  \`nisn\` VARCHAR(64) DEFAULT NULL,
  \`class_id\` VARCHAR(64) DEFAULT NULL,
  \`class_name\` VARCHAR(100) DEFAULT NULL,
  \`status\` VARCHAR(32) NOT NULL DEFAULT 'in_progress',
  \`score\` DECIMAL(6,2) DEFAULT 0.00,
  \`correct_count\` INT DEFAULT 0,
  \`wrong_count\` INT DEFAULT 0,
  \`unanswered_count\` INT DEFAULT 0,
  \`is_passed\` TINYINT(1) DEFAULT 0,
  \`violations_count\` INT DEFAULT 0,
  \`current_question_index\` INT DEFAULT 0,
  \`time_remaining_seconds\` INT DEFAULT 0,
  \`start_time\` BIGINT DEFAULT NULL,
  \`end_time\` BIGINT DEFAULT NULL,
  \`submitted_at\` VARCHAR(64) DEFAULT NULL,
  \`ip_address\` VARCHAR(64) DEFAULT NULL,
  \`device_info\` VARCHAR(255) DEFAULT NULL,
  \`is_online\` TINYINT(1) DEFAULT 1,
  \`answers_json\` LONGTEXT DEFAULT NULL,
  \`randomized_questions_json\` LONGTEXT DEFAULT NULL,
  \`violation_logs_json\` LONGTEXT DEFAULT NULL,
  \`camera_snapshot\` MEDIUMTEXT DEFAULT NULL,
  \`camera_active\` TINYINT(1) DEFAULT 0,
  \`last_camera_update\` BIGINT DEFAULT NULL,
  \`last_sync_timestamp\` BIGINT DEFAULT NULL,
  PRIMARY KEY (\`id\`),
  KEY \`idx_exam_id\` (\`exam_id\`),
  KEY \`idx_student_id\` (\`student_id\`),
  KEY \`idx_session_status\` (\`status\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Table structure for: cbt_attendance
-- (Barcode Presensi Santri & Guru)
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS \`cbt_attendance\`;
CREATE TABLE \`cbt_attendance\` (
  \`id\` VARCHAR(64) NOT NULL,
  \`user_id\` VARCHAR(64) NOT NULL,
  \`user_name\` VARCHAR(191) NOT NULL,
  \`user_role\` VARCHAR(32) NOT NULL,
  \`nisn_or_nip\` VARCHAR(64) DEFAULT NULL,
  \`class_name\` VARCHAR(100) DEFAULT NULL,
  \`date\` VARCHAR(32) NOT NULL,
  \`clock_in_time\` VARCHAR(32) DEFAULT NULL,
  \`clock_out_time\` VARCHAR(32) DEFAULT NULL,
  \`status\` VARCHAR(32) NOT NULL DEFAULT 'present',
  \`notes\` TEXT DEFAULT NULL,
  \`whatsapp_target\` VARCHAR(32) DEFAULT NULL,
  \`whatsapp_recipient_type\` VARCHAR(32) DEFAULT NULL,
  \`whatsapp_recipient_name\` VARCHAR(191) DEFAULT NULL,
  \`whatsapp_notified_in\` TINYINT(1) DEFAULT 0,
  \`whatsapp_notified_out\` TINYINT(1) DEFAULT 0,
  \`whatsapp_message_in\` TEXT DEFAULT NULL,
  \`whatsapp_message_out\` TEXT DEFAULT NULL,
  \`scanner_source\` VARCHAR(100) DEFAULT NULL,
  \`timestamp\` BIGINT NOT NULL,
  PRIMARY KEY (\`id\`),
  KEY \`idx_att_user\` (\`user_id\`),
  KEY \`idx_att_date\` (\`date\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Table structure for: cbt_settings
-- (System Configurations)
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS \`cbt_settings\`;
CREATE TABLE \`cbt_settings\` (
  \`setting_key\` VARCHAR(100) NOT NULL,
  \`setting_value\` LONGTEXT NOT NULL,
  \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`setting_key\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Table structure for: cbt_audit_logs
-- (Audit Trail & Activity Logs)
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS \`cbt_audit_logs\`;
CREATE TABLE \`cbt_audit_logs\` (
  \`id\` VARCHAR(64) NOT NULL,
  \`timestamp\` BIGINT NOT NULL,
  \`actor_id\` VARCHAR(64) DEFAULT NULL,
  \`actor_name\` VARCHAR(191) DEFAULT NULL,
  \`actor_role\` VARCHAR(32) DEFAULT NULL,
  \`action\` VARCHAR(100) NOT NULL,
  \`category\` VARCHAR(100) DEFAULT NULL,
  \`details\` TEXT DEFAULT NULL,
  \`level\` VARCHAR(32) DEFAULT 'info',
  PRIMARY KEY (\`id\`),
  KEY \`idx_log_time\` (\`timestamp\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

`;

// Insert System Snapshot
sql += `\n-- ----------------------------------------------------------------------------\n`;
sql += `-- Dumping data for table: cbt_system_snapshots\n`;
sql += `-- ----------------------------------------------------------------------------\n`;
sql += `INSERT INTO \`cbt_system_snapshots\` (\`snapshot_key\`, \`data_json\`, \`users_count\`, \`classes_count\`, \`exams_count\`, \`sessions_count\`) VALUES (\n`;
sql += `  'latest_database',\n`;
sql += `  ${sqlEscape(JSON.stringify(data))},\n`;
sql += `  ${data.users?.length || 0},\n`;
sql += `  ${data.classes?.length || 0},\n`;
sql += `  ${data.exams?.length || 0},\n`;
sql += `  ${data.sessions?.length || 0}\n`;
sql += `) ON DUPLICATE KEY UPDATE \`data_json\` = VALUES(\`data_json\`), \`users_count\` = VALUES(\`users_count\`), \`classes_count\` = VALUES(\`classes_count\`), \`exams_count\` = VALUES(\`exams_count\`), \`sessions_count\` = VALUES(\`sessions_count\`);\n\n`;

// Insert Users
if (data.users && data.users.length > 0) {
  sql += `-- ----------------------------------------------------------------------------\n`;
  sql += `-- Dumping data for table: cbt_users\n`;
  sql += `-- ----------------------------------------------------------------------------\n`;
  sql += `INSERT INTO \`cbt_users\` (\`id\`, \`name\`, \`username\`, \`password\`, \`role\`, \`nisn_or_nip\`, \`school_name\`, \`mfa_secret\`, \`is_mfa_verified\`, \`whatsapp_number\`, \`subject_or_position\`, \`barcode\`, \`class_id\`, \`class_name\`, \`parent_name\`) VALUES\n`;
  const userRows = data.users.map(u => {
    return `(${sqlEscape(u.id)}, ${sqlEscape(u.name)}, ${sqlEscape(u.username)}, ${sqlEscape(u.password)}, ${sqlEscape(u.role)}, ${sqlEscape(u.nisnOrNip)}, ${sqlEscape(u.schoolName || 'MTs. Darul Huda')}, ${sqlEscape(u.mfaSecret)}, ${u.isMfaVerified ? 1 : 0}, ${sqlEscape(u.whatsappNumber)}, ${sqlEscape(u.subjectOrPosition)}, ${sqlEscape(u.barcode)}, ${sqlEscape(u.classId)}, ${sqlEscape(u.className)}, ${sqlEscape(u.parentName)})`;
  });
  sql += userRows.join(',\n') + ';\n\n';
}

// Insert Classes
if (data.classes && data.classes.length > 0) {
  sql += `-- ----------------------------------------------------------------------------\n`;
  sql += `-- Dumping data for table: cbt_classes\n`;
  sql += `-- ----------------------------------------------------------------------------\n`;
  sql += `INSERT INTO \`cbt_classes\` (\`id\`, \`name\`, \`grade\`, \`total_students\`, \`academic_year\`, \`homeroom_teacher\`, \`major_or_track\`, \`room_location\`) VALUES\n`;
  const classRows = data.classes.map(c => {
    return `(${sqlEscape(c.id)}, ${sqlEscape(c.name)}, ${sqlEscape(c.grade)}, ${c.totalStudents || 0}, ${sqlEscape(c.academicYear)}, ${sqlEscape(c.homeroomTeacher)}, ${sqlEscape(c.majorOrTrack)}, ${sqlEscape(c.roomLocation)})`;
  });
  sql += classRows.join(',\n') + ';\n\n';
}

// Insert Exams
if (data.exams && data.exams.length > 0) {
  sql += `-- ----------------------------------------------------------------------------\n`;
  sql += `-- Dumping data for table: cbt_exams\n`;
  sql += `-- ----------------------------------------------------------------------------\n`;
  sql += `INSERT INTO \`cbt_exams\` (\`id\`, \`code\`, \`title\`, \`subject\`, \`academic_year\`, \`semester\`, \`duration_minutes\`, \`passing_grade\`, \`total_questions\`, \`classes_allowed\`, \`randomize_questions\`, \`randomize_options\`, \`max_violations_allowed\`, \`status\`, \`token\`, \`author_id\`, \`author_name\`, \`author_username\`, \`start_time\`, \`end_time\`, \`exam_date\`, \`exam_start_time\`, \`exam_end_time\`, \`questions_json\`) VALUES\n`;
  const examRows = data.exams.map(e => {
    const classesAllowedStr = Array.isArray(e.classesAllowed) ? e.classesAllowed.join(',') : String(e.classesAllowed || '');
    return `(${sqlEscape(e.id)}, ${sqlEscape(e.code)}, ${sqlEscape(e.title)}, ${sqlEscape(e.subject)}, ${sqlEscape(e.academicYear)}, ${sqlEscape(e.semester)}, ${e.durationMinutes || 60}, ${e.passingGrade || 75}, ${e.totalQuestions || e.questions?.length || 0}, ${sqlEscape(classesAllowedStr)}, ${e.randomizeQuestions ? 1 : 0}, ${e.randomizeOptions ? 1 : 0}, ${e.maxViolationsAllowed || 3}, ${sqlEscape(e.status || 'active')}, ${sqlEscape(e.token)}, ${sqlEscape(e.authorId)}, ${sqlEscape(e.authorName)}, ${sqlEscape(e.authorUsername)}, ${sqlEscape(e.startTime)}, ${sqlEscape(e.endTime)}, ${sqlEscape(e.examDate)}, ${sqlEscape(e.examStartTime)}, ${sqlEscape(e.examEndTime)}, ${sqlEscape(JSON.stringify(e.questions || []))})`;
  });
  sql += examRows.join(',\n') + ';\n\n';
}

// Insert Sessions
if (data.sessions && data.sessions.length > 0) {
  sql += `-- ----------------------------------------------------------------------------\n`;
  sql += `-- Dumping data for table: cbt_sessions\n`;
  sql += `-- ----------------------------------------------------------------------------\n`;
  sql += `INSERT INTO \`cbt_sessions\` (\`id\`, \`exam_id\`, \`student_id\`, \`student_name\`, \`nisn\`, \`class_id\`, \`class_name\`, \`status\`, \`score\`, \`correct_count\`, \`wrong_count\`, \`unanswered_count\`, \`is_passed\`, \`violations_count\`, \`current_question_index\`, \`time_remaining_seconds\`, \`start_time\`, \`end_time\`, \`submitted_at\`, \`ip_address\`, \`device_info\`, \`is_online\`, \`answers_json\`, \`randomized_questions_json\`, \`violation_logs_json\`, \`camera_snapshot\`, \`camera_active\`, \`last_camera_update\`, \`last_sync_timestamp\`) VALUES\n`;
  const sessionRows = data.sessions.map(s => {
    return `(${sqlEscape(s.id)}, ${sqlEscape(s.examId)}, ${sqlEscape(s.studentId)}, ${sqlEscape(s.studentName)}, ${sqlEscape(s.nisn)}, ${sqlEscape(s.classId)}, ${sqlEscape(s.className)}, ${sqlEscape(s.status)}, ${s.score || 0}, ${s.correctCount || 0}, ${s.wrongCount || 0}, ${s.unansweredCount || 0}, ${s.isPassed ? 1 : 0}, ${s.violationsCount || 0}, ${s.currentQuestionIndex || 0}, ${s.timeRemainingSeconds || 0}, ${toSqlTimestampNumber(s.startTime)}, ${toSqlTimestampNumber(s.endTime)}, ${sqlEscape(s.submittedAt)}, ${sqlEscape(s.ipAddress)}, ${sqlEscape(s.deviceInfo)}, ${s.isOnline ? 1 : 0}, ${sqlEscape(JSON.stringify(s.answers || {}))}, ${sqlEscape(JSON.stringify(s.randomizedQuestions || []))}, ${sqlEscape(JSON.stringify(s.violationLogs || []))}, ${sqlEscape(s.cameraSnapshot)}, ${s.cameraActive ? 1 : 0}, ${toSqlTimestampNumber(s.lastCameraUpdate)}, ${toSqlTimestampNumber(s.lastSyncTimestamp)})`;
  });
  sql += sessionRows.join(',\n') + ';\n\n';
}

// Insert Attendance
if (data.attendance && data.attendance.length > 0) {
  sql += `-- ----------------------------------------------------------------------------\n`;
  sql += `-- Dumping data for table: cbt_attendance\n`;
  sql += `-- ----------------------------------------------------------------------------\n`;
  sql += `INSERT INTO \`cbt_attendance\` (\`id\`, \`user_id\`, \`user_name\`, \`user_role\`, \`nisn_or_nip\`, \`class_name\`, \`date\`, \`clock_in_time\`, \`clock_out_time\`, \`status\`, \`notes\`, \`whatsapp_target\`, \`whatsapp_recipient_type\`, \`whatsapp_recipient_name\`, \`whatsapp_notified_in\`, \`whatsapp_notified_out\`, \`whatsapp_message_in\`, \`whatsapp_message_out\`, \`scanner_source\`, \`timestamp\`) VALUES\n`;
  const attRows = data.attendance.map(a => {
    return `(${sqlEscape(a.id)}, ${sqlEscape(a.userId)}, ${sqlEscape(a.userName)}, ${sqlEscape(a.userRole)}, ${sqlEscape(a.nisnOrNip)}, ${sqlEscape(a.className)}, ${sqlEscape(a.date)}, ${sqlEscape(a.clockInTime)}, ${sqlEscape(a.clockOutTime)}, ${sqlEscape(a.status)}, ${sqlEscape(a.notes)}, ${sqlEscape(a.whatsappTarget)}, ${sqlEscape(a.whatsappRecipientType)}, ${sqlEscape(a.whatsappRecipientName)}, ${a.whatsappNotifiedIn ? 1 : 0}, ${a.whatsappNotifiedOut ? 1 : 0}, ${sqlEscape(a.whatsappMessageIn)}, ${sqlEscape(a.whatsappMessageOut)}, ${sqlEscape(a.scannerSource)}, ${toSqlTimestampNumber(a.timestamp)})`;
  });
  sql += attRows.join(',\n') + ';\n\n';
}

// Insert Settings
if (data.settings) {
  sql += `-- ----------------------------------------------------------------------------\n`;
  sql += `-- Dumping data for table: cbt_settings\n`;
  sql += `-- ----------------------------------------------------------------------------\n`;
  sql += `INSERT INTO \`cbt_settings\` (\`setting_key\`, \`setting_value\`) VALUES\n`;
  sql += `  ('main_config', ${sqlEscape(JSON.stringify(data.settings))}),\n`;
  sql += `  ('attendance_settings', ${sqlEscape(JSON.stringify(data.attendanceSettings || {}))}),\n`;
  sql += `  ('api_config', ${sqlEscape(JSON.stringify(data.apiConfig || {}))})\n`;
  sql += `ON DUPLICATE KEY UPDATE \`setting_value\` = VALUES(\`setting_value\`);\n\n`;
}

// Insert Audit Logs
if (data.auditLogs && data.auditLogs.length > 0) {
  sql += `-- ----------------------------------------------------------------------------\n`;
  sql += `-- Dumping data for table: cbt_audit_logs\n`;
  sql += `-- ----------------------------------------------------------------------------\n`;
  sql += `INSERT INTO \`cbt_audit_logs\` (\`id\`, \`timestamp\`, \`actor_id\`, \`actor_name\`, \`actor_role\`, \`action\`, \`category\`, \`details\`, \`level\`) VALUES\n`;
  const logRows = data.auditLogs.map(l => {
    return `(${sqlEscape(l.id)}, ${toSqlTimestampNumber(l.timestamp)}, ${sqlEscape(l.actorId)}, ${sqlEscape(l.actorName)}, ${sqlEscape(l.actorRole)}, ${sqlEscape(l.action)}, ${sqlEscape(l.category)}, ${sqlEscape(l.details)}, ${sqlEscape(l.level || 'info')})`;
  });
  sql += logRows.join(',\n') + ';\n\n';
}

sql += `/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;\n`;
sql += `/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;\n`;
sql += `/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;\n`;
sql += `/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;\n`;
sql += `/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;\n`;
sql += `/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;\n`;
sql += `/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;\n`;

// Write to public/cbt_database.sql and root cbt_database.sql
const targetPublicSql = path.join(rootDir, 'public', 'cbt_database.sql');
const targetRootSql = path.join(rootDir, 'cbt_database.sql');

fs.writeFileSync(targetPublicSql, sql, 'utf-8');
fs.writeFileSync(targetRootSql, sql, 'utf-8');

console.log(`✅ [SQL Generator] File SQL berhasil dibuat: cbt_database.sql (${Math.round(sql.length / 1024)} KB)!`);
