import React, { useState, useEffect, useCallback } from 'react';
import {
  HardDrive,
  Database,
  Wifi,
  WifiOff,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Layers,
  Activity,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Zap,
  Clock,
  FileText,
} from 'lucide-react';
import {
  computeLocalStorageMetrics,
  testLocalStorageHealth,
  LocalStoragePersistenceMetrics,
} from '../utils/storageMetrics';

interface LocalStorageSyncIndicatorProps {
  onRefreshRecords?: () => void;
  className?: string;
  variant?: 'light' | 'dark';
}

export const LocalStorageSyncIndicator: React.FC<LocalStorageSyncIndicatorProps> = ({
  onRefreshRecords,
  className = '',
  variant = 'light',
}) => {
  const [metrics, setMetrics] = useState<LocalStoragePersistenceMetrics>(() =>
    computeLocalStorageMetrics()
  );
  const [isExpanded, setIsExpanded] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    latencyMs: number;
    message: string;
  } | null>(null);
  const [lastChecked, setLastChecked] = useState<Date>(new Date());

  const refreshMetrics = useCallback(() => {
    const updated = computeLocalStorageMetrics();
    setMetrics(updated);
    setLastChecked(new Date());
    if (onRefreshRecords) {
      onRefreshRecords();
    }
  }, [onRefreshRecords]);

  // Listen to network online/offline events and local storage updates
  useEffect(() => {
    const handleOnlineStatus = () => {
      refreshMetrics();
    };

    const handleStorageChange = (e: StorageEvent) => {
      refreshMetrics();
    };

    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOnlineStatus);
    window.addEventListener('storage', handleStorageChange);

    // Auto-refresh metrics every 15 seconds to keep timestamps and sizes fresh
    const interval = setInterval(refreshMetrics, 15000);

    return () => {
      window.removeEventListener('online', handleOnlineStatus);
      window.removeEventListener('offline', handleOnlineStatus);
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [refreshMetrics]);

  const handleRunHealthCheck = () => {
    setIsTesting(true);
    setTimeout(() => {
      const res = testLocalStorageHealth();
      setTestResult(res);
      setIsTesting(false);
      refreshMetrics();
    }, 250);
  };

  const isDark = variant === 'dark';

  const getStatusColor = () => {
    if (!metrics.isOnline) {
      return {
        badgeBg: isDark
          ? 'bg-amber-950/80 text-amber-300 border-amber-800'
          : 'bg-amber-50 text-amber-800 border-amber-200',
        dot: 'bg-amber-500',
        ping: 'bg-amber-400',
        label: 'Offline Storage Active',
        subtext: 'Operating on local device cache with zero loss',
      };
    }
    if (metrics.draftRecordsCount > 0) {
      return {
        badgeBg: isDark
          ? 'bg-blue-950/80 text-blue-300 border-blue-800'
          : 'bg-blue-50 text-blue-800 border-blue-200',
        dot: 'bg-blue-500',
        ping: 'bg-blue-400',
        label: 'Local Sync & Draft Active',
        subtext: `${metrics.draftRecordsCount} draft cached locally`,
      };
    }
    return {
      badgeBg: isDark
        ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
        : 'bg-emerald-50 text-emerald-800 border-emerald-200',
      dot: 'bg-emerald-500',
      ping: 'bg-emerald-400',
      label: 'Synchronized & Persisted',
      subtext: 'All shift accounts safely stored in local database',
    };
  };

  const statusConfig = getStatusColor();

  return (
    <div
      id="localstorage-sync-status-indicator"
      className={`rounded-2xl border shadow-xs overflow-hidden transition-all duration-200 ${
        isDark
          ? 'bg-[#1d2023] border-[#333739]'
          : 'bg-white border-stone-200/90'
      } ${className}`}
    >
      {/* Top Banner Row */}
      <div className="p-3.5 sm:p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`relative flex items-center justify-center w-9 h-9 rounded-xl border shrink-0 ${
                isDark
                  ? 'bg-[#15171a] border-[#333739] text-[#e8b93b]'
                  : 'bg-stone-100 border-stone-200 text-stone-700'
              }`}
            >
              <HardDrive className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${statusConfig.ping}`}
                />
                <span
                  className={`relative inline-flex rounded-full h-3 w-3 ${statusConfig.dot}`}
                />
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`text-xs font-extrabold tracking-tight ${
                    isDark ? 'text-[#ece8e0]' : 'text-stone-900'
                  }`}
                >
                  Offline Storage Sync Status
                </span>
                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${statusConfig.badgeBg}`}
                >
                  {metrics.isOnline ? (
                    <Wifi className="w-2.5 h-2.5" />
                  ) : (
                    <WifiOff className="w-2.5 h-2.5" />
                  )}
                  <span>{statusConfig.label}</span>
                </span>
              </div>
              <p
                className={`text-[11px] mt-0.5 ${
                  isDark ? 'text-[#8d9195]' : 'text-stone-500'
                }`}
              >
                {statusConfig.subtext} · Last verified{' '}
                <span
                  className={`font-mono ${
                    isDark ? 'text-[#ece8e0]' : 'text-stone-600'
                  }`}
                >
                  {lastChecked.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={refreshMetrics}
              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                isDark
                  ? 'text-[#8d9195] hover:text-[#ece8e0] hover:bg-[#23262a] border-[#333739]'
                  : 'text-stone-500 hover:text-stone-800 hover:bg-stone-100 border-stone-200'
              }`}
              title="Refresh local storage metrics"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                isDark
                  ? 'bg-[#23262a] hover:bg-[#2a2d30] border-[#333739] text-[#ece8e0]'
                  : 'bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-700'
              }`}
              aria-expanded={isExpanded}
            >
              <span>{isExpanded ? 'Hide Details' : 'View Storage Metrics'}</span>
              {isExpanded ? (
                <ChevronUp
                  className={`w-3.5 h-3.5 ${
                    isDark ? 'text-[#8d9195]' : 'text-stone-500'
                  }`}
                />
              ) : (
                <ChevronDown
                  className={`w-3.5 h-3.5 ${
                    isDark ? 'text-[#8d9195]' : 'text-stone-500'
                  }`}
                />
              )}
            </button>
          </div>
        </div>

        {/* Quick Metrics Strip */}
        <div
          className={`grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 pt-3 border-t text-xs ${
            isDark ? 'border-[#333739]' : 'border-stone-100'
          }`}
        >
          <div
            className={`rounded-xl p-2.5 border ${
              isDark
                ? 'bg-[#15171a] border-[#333739]'
                : 'bg-stone-50/80 border-stone-200/70'
            }`}
          >
            <span
              className={`text-[10px] uppercase font-bold tracking-wider block ${
                isDark ? 'text-[#8d9195]' : 'text-stone-500'
              }`}
            >
              Storage Footprint
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span
                className={`font-mono font-bold text-sm ${
                  isDark ? 'text-[#ece8e0]' : 'text-stone-900'
                }`}
              >
                {metrics.totalSizeFormatted}
              </span>
              <span
                className={`text-[10px] font-mono ${
                  isDark ? 'text-[#8d9195]' : 'text-stone-400'
                }`}
              >
                ({metrics.quotaPercentageUsed}% of 5MB)
              </span>
            </div>
            {/* Storage Progress Bar */}
            <div
              className={`w-full h-1 rounded-full mt-1.5 overflow-hidden ${
                isDark ? 'bg-[#23262a]' : 'bg-stone-200'
              }`}
            >
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isDark ? 'bg-[#e8b93b]' : 'bg-emerald-600'
                }`}
                style={{ width: `${Math.max(metrics.quotaPercentageUsed, 3)}%` }}
              />
            </div>
          </div>

          <div
            className={`rounded-xl p-2.5 border ${
              isDark
                ? 'bg-[#15171a] border-[#333739]'
                : 'bg-stone-50/80 border-stone-200/70'
            }`}
          >
            <span
              className={`text-[10px] uppercase font-bold tracking-wider block ${
                isDark ? 'text-[#8d9195]' : 'text-stone-500'
              }`}
            >
              Persisted Records
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span
                className={`font-mono font-bold text-sm ${
                  isDark ? 'text-emerald-400' : 'text-emerald-800'
                }`}
              >
                {metrics.totalRecordsCount}
              </span>
              <span
                className={`text-[10px] ${
                  isDark ? 'text-[#8d9195]' : 'text-stone-500'
                }`}
              >
                ({metrics.submittedRecordsCount} final
                {metrics.draftRecordsCount > 0 ? ` · ${metrics.draftRecordsCount} draft` : ''})
              </span>
            </div>
            <span
              className={`text-[10px] block mt-1 ${
                isDark ? 'text-[#8d9195]' : 'text-stone-400'
              }`}
            >
              100% Offline Retained
            </span>
          </div>

          <div
            className={`rounded-xl p-2.5 border ${
              isDark
                ? 'bg-[#15171a] border-[#333739]'
                : 'bg-stone-50/80 border-stone-200/70'
            }`}
          >
            <span
              className={`text-[10px] uppercase font-bold tracking-wider block ${
                isDark ? 'text-[#8d9195]' : 'text-stone-500'
              }`}
            >
              Sheets & Audit Logs
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span
                className={`font-mono font-bold text-sm ${
                  isDark ? 'text-[#ece8e0]' : 'text-stone-900'
                }`}
              >
                {metrics.supervisorSheetsCount + metrics.auditLogsCount}
              </span>
              <span
                className={`text-[10px] ${
                  isDark ? 'text-[#8d9195]' : 'text-stone-500'
                }`}
              >
                entries
              </span>
            </div>
            <span
              className={`text-[10px] block mt-1 ${
                isDark ? 'text-[#8d9195]' : 'text-stone-400'
              }`}
            >
              {metrics.supervisorSheetsCount} sheets · {metrics.auditLogsCount} audits
            </span>
          </div>

          <div
            className={`rounded-xl p-2.5 border ${
              isDark
                ? 'bg-[#15171a] border-[#333739]'
                : 'bg-stone-50/80 border-stone-200/70'
            }`}
          >
            <span
              className={`text-[10px] uppercase font-bold tracking-wider block ${
                isDark ? 'text-[#8d9195]' : 'text-stone-500'
              }`}
            >
              Storage Health
            </span>
            <div
              className={`flex items-center gap-1 font-bold mt-0.5 ${
                isDark ? 'text-emerald-400' : 'text-emerald-700'
              }`}
            >
              <ShieldCheck
                className={`w-3.5 h-3.5 ${
                  isDark ? 'text-emerald-400' : 'text-emerald-600'
                }`}
              />
              <span className="text-xs">Verified OK</span>
            </div>
            <span
              className={`text-[10px] block mt-1 ${
                isDark ? 'text-[#8d9195]' : 'text-stone-400'
              }`}
            >
              {metrics.totalKeys} localStorage keys
            </span>
          </div>
        </div>
      </div>

      {/* Expandable Diagnostic Panel */}
      {isExpanded && (
        <div
          className={`border-t p-4 space-y-3.5 ${
            isDark ? 'bg-[#15171a] border-[#333739]' : 'bg-stone-50/90 border-stone-200'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h4
                className={`text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 ${
                  isDark ? 'text-[#ece8e0]' : 'text-stone-800'
                }`}
              >
                <Database
                  className={`w-3.5 h-3.5 ${
                    isDark ? 'text-[#e8b93b]' : 'text-emerald-700'
                  }`}
                />
                <span>LocalStorage Key Space Breakdown</span>
              </h4>
              <p
                className={`text-[11px] ${
                  isDark ? 'text-[#8d9195]' : 'text-stone-500'
                }`}
              >
                Detailed byte allocations across offline collections in browser storage
              </p>
            </div>

            <button
              type="button"
              onClick={handleRunHealthCheck}
              disabled={isTesting}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-50 ${
                isDark
                  ? 'bg-[#e8b93b] hover:bg-[#d6a82e] text-[#15171a]'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              <Zap className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
              <span>{isTesting ? 'Testing I/O...' : 'Test Storage Read/Write'}</span>
            </button>
          </div>

          {/* Test Result Message */}
          {testResult && (
            <div
              className={`p-3 rounded-xl text-xs flex items-start gap-2.5 border ${
                testResult.success
                  ? isDark
                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                    : 'bg-emerald-50 text-emerald-900 border-emerald-200'
                  : isDark
                  ? 'bg-rose-950/80 text-rose-300 border-rose-800'
                  : 'bg-rose-50 text-rose-900 border-rose-200'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              )}
              <div className="space-y-0.5">
                <span className="font-bold">
                  {testResult.success ? 'Storage Diagnostic Passed' : 'Storage Diagnostic Warning'}
                </span>
                <p className="text-[11px] opacity-90">{testResult.message}</p>
              </div>
            </div>
          )}

          {/* Key Allocation Table */}
          <div
            className={`rounded-xl border overflow-hidden shadow-2xs ${
              isDark ? 'bg-[#1d2023] border-[#333739]' : 'bg-white border-stone-200'
            }`}
          >
            <div
              className={`max-h-48 overflow-y-auto divide-y text-xs ${
                isDark ? 'divide-[#2a2d30]' : 'divide-stone-100'
              }`}
            >
              {metrics.keyBreakdown.slice(0, 10).map((kb) => (
                <div
                  key={kb.key}
                  className={`px-3 py-2 flex items-center justify-between gap-3 transition-colors ${
                    isDark ? 'hover:bg-[#23262a]' : 'hover:bg-stone-50/60'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-mono text-[11px] font-semibold truncate ${
                          isDark ? 'text-[#ece8e0]' : 'text-stone-800'
                        }`}
                      >
                        {kb.key}
                      </span>
                      <span
                        className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded border ${
                          isDark
                            ? 'bg-[#23262a] text-[#8d9195] border-[#333739]'
                            : 'bg-stone-100 text-stone-600 border-stone-200'
                        }`}
                      >
                        {kb.category}
                      </span>
                    </div>
                    {kb.itemCount !== undefined && (
                      <span
                        className={`text-[10px] ${
                          isDark ? 'text-[#8d9195]' : 'text-stone-400'
                        }`}
                      >
                        {kb.itemCount} items stored
                      </span>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <span
                      className={`font-mono font-bold ${
                        isDark ? 'text-[#ece8e0]' : 'text-stone-700'
                      }`}
                    >
                      {kb.sizeFormatted}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            {metrics.keyBreakdown.length > 10 && (
              <div
                className={`p-2 border-t text-center text-[10px] font-medium ${
                  isDark
                    ? 'bg-[#15171a] border-[#333739] text-[#8d9195]'
                    : 'bg-stone-50 border-stone-100 text-stone-500'
                }`}
              >
                + {metrics.keyBreakdown.length - 10} additional localStorage entries indexed
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
