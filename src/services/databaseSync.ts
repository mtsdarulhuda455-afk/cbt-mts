import { 
  User, 
  ClassGroup, 
  Exam, 
  StudentExamSession, 
  SystemSettings,
  AttendanceRecord,
  SystemAuditLog
} from '../types/cbt';
import { 
  saveCentralDatabaseSnapshot, 
  fetchCentralDatabaseSnapshot, 
  pushAllToFirestore,
  isFirestoreQuotaExhausted,
  firebaseConfig
} from './firebase';

export interface UnifiedDatabasePayload {
  users: User[];
  classes: ClassGroup[];
  exams: Exam[];
  sessions: StudentExamSession[];
  settings: SystemSettings;
  attendance?: AttendanceRecord[];
  attendanceSettings?: any;
  apiConfig?: any;
  auditLogs?: SystemAuditLog[];
}

export const FIRESTORE_UPGRADE_URL = `https://console.firebase.google.com/project/${firebaseConfig.projectId}/firestore/databases/${firebaseConfig.firestoreDatabaseId}/data?openUpgradeDialog=true`;

/**
 * Returns an absolute URL pointing to the API relative to the app's current directory path.
 * This ensures API calls succeed whether deployed at domain root or any subfolder (e.g. /cbt/).
 */
export function getRelativeApiUrl(endpoint: string): string {
  const clean = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  if (typeof window !== 'undefined' && window.location) {
    const pathname = window.location.pathname;
    const baseDir = pathname.endsWith('.html') || pathname.endsWith('.php')
      ? pathname.substring(0, pathname.lastIndexOf('/') + 1)
      : (pathname.endsWith('/') ? pathname : pathname + '/');
    return `${window.location.origin}${baseDir}${clean}`;
  }
  return `/${clean}`;
}

/**
 * Fetch unified master database from Server API (Priority 1) or Cloud Firestore (Priority 2)
 */
export async function fetchUnifiedDatabase(): Promise<{
  source: 'server' | 'firestore' | 'none';
  data: UnifiedDatabasePayload | null;
  message?: string;
}> {
  // Priority 1: Fetch from Server Disk API with 3.5s timeout (never hangs app initialization)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(getRelativeApiUrl('api/database/latest'), {
      headers: { 'Accept': 'application/json' },
      signal: controller.signal
    }).finally(() => clearTimeout(timeoutId));

    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data && Array.isArray(json.data.users) && json.data.users.length > 0) {
        console.log(`⚡ [Unified Sync] Database berhasil dimuat dari Server Pusat: ${json.data.users.length} akun.`);
        return {
          source: 'server',
          data: json.data as UnifiedDatabasePayload,
          message: `Berhasil memuat database dari Server Pusat (${json.data.users.length} akun)`
        };
      }
    }
  } catch (serverErr) {
    console.warn('[Unified Sync] Server API tidak dapat dijangkau atau waktu habis (timeout):', serverErr);
  }

  // Priority 2: Fetch from Firebase Firestore with 3s timeout
  if (!isFirestoreQuotaExhausted()) {
    try {
      const snapPromise = fetchCentralDatabaseSnapshot();
      const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000));
      const snap = await Promise.race([snapPromise, timeoutPromise]);

      if (snap && snap.users && snap.users.length > 0) {
        console.log(`⚡ [Unified Sync] Database berhasil dimuat dari Firebase Cloud: ${snap.users.length} akun.`);
        return {
          source: 'firestore',
          data: snap as unknown as UnifiedDatabasePayload,
          message: `Berhasil memuat database dari Cloud Firebase (${snap.users.length} akun)`
        };
      }
    } catch (fbErr) {
      console.warn('[Unified Sync] Notice reading from Firestore:', fbErr);
    }
  }

  return { source: 'none', data: null, message: 'Belum ada data di server maupun cloud' };
}

/**
 * Save unified master database to both Server Disk API and Cloud Firestore
 */
export async function saveUnifiedDatabase(data: UnifiedDatabasePayload): Promise<{
  success: boolean;
  serverSynced: boolean;
  cloudSynced: boolean;
  message: string;
}> {
  let serverSynced = false;
  let cloudSynced = false;

  // 1. Save to Server Disk (Instant shared persistence for any device accessing this link!)
  try {
    const res = await fetch(getRelativeApiUrl('api/database/sync'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success) {
        serverSynced = true;
      }
    }
  } catch (serverErr) {
    console.warn('[Unified Sync] Gagal menyimpan ke Server API:', serverErr);
  }

  // 2. Save to Firebase Firestore (Dual redundancy)
  if (!isFirestoreQuotaExhausted()) {
    try {
      const snapRes = await saveCentralDatabaseSnapshot(data);
      if (snapRes.success) {
        cloudSynced = true;
      }
      // Also push collection documents in background
      pushAllToFirestore(data).catch(() => {});
    } catch (fbErr) {
      console.warn('[Unified Sync] Notice saving to Firestore:', fbErr);
    }
  }

  // 3. Broadcast to other open tabs on this browser
  try {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const bc = new BroadcastChannel('eduexam_cbt_channel');
      bc.postMessage({
        type: 'DATABASE_RESTORED',
        timestamp: Date.now()
      });
      bc.close();
    }
  } catch { /* ignore */ }

  const success = serverSynced || cloudSynced;
  const userCount = data.users?.length || 0;

  let message = '';
  if (serverSynced && cloudSynced) {
    message = `Basis data berhasil disimpan ke Server Pusat dan Cloud Firebase (${userCount} akun). Semua perangkat lain langsung tersinkronkan!`;
  } else if (serverSynced) {
    message = `Basis data berhasil disimpan ke Server Pusat (${userCount} akun). Seluruh perangkat di tautan ini langsung dapat mengaksesnya!`;
  } else if (cloudSynced) {
    message = `Basis data berhasil disinkronkan ke Cloud Firebase (${userCount} akun).`;
  } else {
    message = `Basis data tersimpan secara lokal di peramban ini (${userCount} akun).`;
  }

  return { success, serverSynced, cloudSynced, message };
}

/**
 * Trigger full server-side sync with Firebase Cloud Firestore
 */
export async function syncServerWithFirebase(): Promise<{
  success: boolean;
  message: string;
  counts?: { users: number; classes: number; exams: number };
}> {
  try {
    const res = await fetch(getRelativeApiUrl('api/database/sync-firebase'), {
      method: 'POST',
      headers: { 'Accept': 'application/json' }
    });
    const json = await res.json();
    return json;
  } catch (err: any) {
    return {
      success: false,
      message: `Gagal memicu sinkronisasi Firebase: ${err?.message || err}`
    };
  }
}
