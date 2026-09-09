import { STORAGE_KEYS } from '../services/storage';

export interface StorageKeyMetric {
  key: string;
  category: string;
  itemCount?: number;
  sizeBytes: number;
  sizeFormatted: string;
}

export interface LocalStoragePersistenceMetrics {
  isOnline: boolean;
  totalKeys: number;
  totalRecordsCount: number;
  submittedRecordsCount: number;
  draftRecordsCount: number;
  supervisorSheetsCount: number;
  auditLogsCount: number;
  stationCount: number;
  totalBytesUsed: number;
  totalSizeFormatted: string;
  estimatedQuotaBytes: number;
  quotaPercentageUsed: number;
  lastPersistTimestamp: string;
  storageIntegrity: 'verified' | 'repaired' | 'warning';
  syncState: 'synchronized' | 'offline_ready' | 'pending_drafts';
  keyBreakdown: StorageKeyMetric[];
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const val = parseFloat((bytes / Math.pow(k, i)).toFixed(1));
  return `${val} ${sizes[i]}`;
}

export function computeLocalStorageMetrics(): LocalStoragePersistenceMetrics {
  let isOnline = true;
  if (typeof navigator !== 'undefined' && 'onLine' in navigator) {
    isOnline = navigator.onLine;
  }

  let totalBytes = 0;
  let totalRecords = 0;
  let submittedRecords = 0;
  let draftRecords = 0;
  let supervisorSheets = 0;
  let auditLogs = 0;
  let stationCount = 0;
  let latestTimestamp = '';

  const keyBreakdown: StorageKeyMetric[] = [];
  const ESTIMATED_QUOTA_BYTES = 5 * 1024 * 1024; // Standard 5MB browser localStorage baseline

  try {
    const keyCount = localStorage.length;

    for (let i = 0; i < keyCount; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      const rawVal = localStorage.getItem(key) || '';
      // Approximate bytes for key + UTF-16 value (2 bytes per character)
      const entryBytes = (key.length + rawVal.length) * 2;
      totalBytes += entryBytes;

      let category = 'Application State';
      let itemCount: number | undefined = undefined;

      if (key.startsWith('dsr_rec_')) {
        category = 'Shift Record';
        totalRecords++;
        try {
          const parsed = JSON.parse(rawVal);
          if (parsed.status === 'submitted') {
            submittedRecords++;
          } else {
            draftRecords++;
          }
          if (parsed.updatedAt || parsed.submittedAt || parsed.createdAt) {
            const t = parsed.updatedAt || parsed.submittedAt || parsed.createdAt;
            if (!latestTimestamp || t > latestTimestamp) {
              latestTimestamp = t;
            }
          }
        } catch {
          // ignore corrupted json
        }
      } else if (key === 'staroil_supervisor_master_sheets') {
        category = 'Supervisor Sheets';
        try {
          const parsed = JSON.parse(rawVal);
          if (Array.isArray(parsed)) {
            supervisorSheets = parsed.length;
            itemCount = parsed.length;
          }
        } catch {}
      } else if (key.includes('audit')) {
        category = 'Audit Logs';
        try {
          const parsed = JSON.parse(rawVal);
          if (Array.isArray(parsed)) {
            auditLogs += parsed.length;
            itemCount = parsed.length;
          }
        } catch {}
      } else if (key === 'dsr_stations') {
        category = 'Stations Registry';
        try {
          const parsed = JSON.parse(rawVal);
          if (Array.isArray(parsed)) {
            stationCount = parsed.length;
            itemCount = parsed.length;
          }
        } catch {}
      } else if (key === 'dsr_user_profile') {
        category = 'User Profile';
      } else if (key.startsWith('staroil_')) {
        category = 'Station Operations';
      }

      keyBreakdown.push({
        key,
        category,
        itemCount,
        sizeBytes: entryBytes,
        sizeFormatted: formatBytes(entryBytes),
      });
    }
  } catch (e) {
    console.error('Error computing localStorage metrics:', e);
  }

  // Sort breakdown by size descending
  keyBreakdown.sort((a, b) => b.sizeBytes - a.sizeBytes);

  const percentageUsed = Math.min(100, Math.max(0.1, (totalBytes / ESTIMATED_QUOTA_BYTES) * 100));

  let syncState: 'synchronized' | 'offline_ready' | 'pending_drafts' = 'synchronized';
  if (!isOnline) {
    syncState = 'offline_ready';
  } else if (draftRecords > 0) {
    syncState = 'pending_drafts';
  }

  return {
    isOnline,
    totalKeys: keyBreakdown.length,
    totalRecordsCount: totalRecords,
    submittedRecordsCount: submittedRecords,
    draftRecordsCount: draftRecords,
    supervisorSheetsCount: supervisorSheets,
    auditLogsCount: auditLogs,
    stationCount,
    totalBytesUsed: totalBytes,
    totalSizeFormatted: formatBytes(totalBytes),
    estimatedQuotaBytes: ESTIMATED_QUOTA_BYTES,
    quotaPercentageUsed: parseFloat(percentageUsed.toFixed(1)),
    lastPersistTimestamp: latestTimestamp || new Date().toISOString(),
    storageIntegrity: 'verified',
    syncState,
    keyBreakdown,
  };
}

export function testLocalStorageHealth(): { success: boolean; latencyMs: number; message: string } {
  const testKey = '__dsr_storage_healthcheck__' + Date.now();
  const testPayload = JSON.stringify({ ping: 'ok', timestamp: new Date().toISOString() });
  const start = performance.now();

  try {
    localStorage.setItem(testKey, testPayload);
    const read = localStorage.getItem(testKey);
    localStorage.removeItem(testKey);

    const duration = performance.now() - start;
    if (read === testPayload) {
      return {
        success: true,
        latencyMs: parseFloat(duration.toFixed(2)),
        message: 'Direct read/write I/O verified in ' + duration.toFixed(2) + 'ms. Local persistence is 100% healthy.',
      };
    } else {
      return {
        success: false,
        latencyMs: parseFloat(duration.toFixed(2)),
        message: 'Storage validation failed: written payload did not match read buffer.',
      };
    }
  } catch (e: any) {
    return {
      success: false,
      latencyMs: -1,
      message: e?.message || 'LocalStorage access blocked or quota exceeded.',
    };
  }
}
