<?php
declare(strict_types=1);

/**
 * Direct entry point for /api/health.php
 */
$_GET['action'] = 'health';
require_once __DIR__ . '/index.php';
