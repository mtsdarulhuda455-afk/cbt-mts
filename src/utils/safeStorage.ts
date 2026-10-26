/**
 * Safe LocalStorage Wrapper with Automatic Quota Management and Fallback
 * Prevents QuotaExceededError from ever throwing or crashing the CBT application.
 */

const memoryFallback = new Map<string, string>();

/**
 * Strips heavy transient fields (e.g. camera webcam snapshots) from sessions
 * before persisting to localStorage to keep payload under quota.
 */
export function sanitizeSessionsForStorage(sessions: any[]): any[] {
  if (!Array.isArray(sessions)) return [];
  return sessions.map(session => {
    if (!session || typeof session !== 'object') return session;
    const { cameraSnapshot, ...rest } = session;
    return {
      ...rest,
      // Keep last 15 violation logs per session to avoid infinite payload growth
      violationLogs: Array.isArray(rest.violationLogs) ? rest.violationLogs.slice(-15) : []
    };
  });
}

export const safeStorage = {
  getItem(key: string): string | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const item = window.localStorage.getItem(key);
        if (item !== null) return item;
      }
    } catch (e) {
      console.warn(`[safeStorage] Error reading key "${key}":`, e);
    }
    return memoryFallback.get(key) || null;
  },

  setItem(key: string, value: string): boolean {
    // Keep in-memory cache synchronized as immediate fallback
    memoryFallback.set(key, value);

    if (typeof window === 'undefined' || !window.localStorage) {
      return true;
    }

    try {
      window.localStorage.setItem(key, value);
      return true;
    } catch (error: any) {
      const isQuota =
        error?.name === 'QuotaExceededError' ||
        error?.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
        error?.code === 22 ||
        error?.code === 1014 ||
        (error?.message && error.message.toLowerCase().includes('quota'));

      if (isQuota) {
        console.warn(`[safeStorage] Storage quota exceeded on "${key}". Performing auto-prune...`);
        return this.handleQuotaExceeded(key, value);
      } else {
        console.warn(`[safeStorage] Error saving "${key}":`, error);
        return false;
      }
    }
  },

  removeItem(key: string): void {
    memoryFallback.delete(key);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch (e) {
      console.warn(`[safeStorage] Error removing key "${key}":`, e);
    }
  },

  clear(): void {
    memoryFallback.clear();
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.clear();
      }
    } catch (e) {
      console.warn('[safeStorage] Error clearing storage:', e);
    }
  },

  handleQuotaExceeded(targetKey: string, targetValue: string): boolean {
    if (typeof window === 'undefined' || !window.localStorage) return false;

    try {
      // 1. Immediately remove non-critical or bloated cache items
      const nonCriticalPrefixes = [
        'eduexam_cbt_v1_audit_logs',
        'cbt_token_',
        'debug',
        'temp'
      ];

      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (k && nonCriticalPrefixes.some(prefix => k.startsWith(prefix))) {
          window.localStorage.removeItem(k);
        }
      }

      // Try saving again
      try {
        window.localStorage.setItem(targetKey, targetValue);
        return true;
      } catch {}

      // 2. If target is sessions, sanitize, strip camera snapshots, and keep only active + recent
      if (targetKey.includes('sessions')) {
        try {
          const parsed = JSON.parse(targetValue);
          if (Array.isArray(parsed)) {
            const sanitized = sanitizeSessionsForStorage(parsed);
            // Keep active sessions and at most 15 completed sessions
            const active = sanitized.filter(s => s.status === 'in_progress');
            const finished = sanitized.filter(s => s.status !== 'in_progress').slice(-15);
            const trimmed = [...active, ...finished];
            const sanitizedStr = JSON.stringify(trimmed);

            window.localStorage.setItem(targetKey, sanitizedStr);
            return true;
          }
        } catch {}
      }

      // 3. If target is audit_logs, retain only last 20 logs
      if (targetKey.includes('audit_logs')) {
        try {
          const parsed = JSON.parse(targetValue);
          if (Array.isArray(parsed)) {
            const trimmed = parsed.slice(-20);
            window.localStorage.setItem(targetKey, JSON.stringify(trimmed));
            return true;
          }
        } catch {}
      }

      // 4. If target is attendance, retain only last 30 records
      if (targetKey.includes('attendance') && !targetKey.includes('attendance_settings')) {
        try {
          const parsed = JSON.parse(targetValue);
          if (Array.isArray(parsed)) {
            const trimmed = parsed.slice(-30);
            window.localStorage.setItem(targetKey, JSON.stringify(trimmed));
            return true;
          }
        } catch {}
      }

      // 5. Keep in memoryFallback without throwing
      console.warn(`[safeStorage] Persisting "${targetKey}" in memory fallback to prevent crashes.`);
      return false;
    } catch (recoveryErr) {
      console.warn(`[safeStorage] Auto-recovery failed for "${targetKey}":`, recoveryErr);
      return false;
    }
  }
};
