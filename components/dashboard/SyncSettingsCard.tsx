'use client';

/**
 * SyncSettingsCard
 *
 * Pro-only card for managing Instagram auto-sync settings.
 * Shows sync status, toggle, and manual sync button.
 */

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, ToggleLeft, ToggleRight, AlertCircle, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { SyncStatusBadge } from './SyncStatusBadge';
import { ProBadge } from '@/components/badges/ProBadge';

interface SyncLog {
  id: string;
  syncType: 'auto' | 'manual';
  imagesFetched: number;
  imagesAdded: number;
  imagesSkipped: number;
  status: 'success' | 'partial' | 'failed';
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
}

interface SyncStatus {
  isPro: boolean;
  autoSyncEnabled: boolean;
  lastSyncAt: string | null;
  syncDisabledReason: string | null;
  consecutiveFailures: number;
  recentLogs: SyncLog[];
}

export function SyncSettingsCard() {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  // Fetch status on mount
  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/dashboard/sync/status');
      if (!response.ok) {
        throw new Error('Failed to fetch sync status');
      }
      const data = await response.json();
      setStatus(data);
      setError(null);
    } catch (err) {
      console.error('[SyncSettingsCard] Fetch error:', err);
      setError('Failed to load sync status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Toggle auto-sync
  const handleToggle = async () => {
    if (!status) return;

    setToggling(true);
    setError(null);

    try {
      const response = await fetch('/api/dashboard/sync/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoSyncEnabled: !status.autoSyncEnabled }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update settings');
      }

      // Refresh status
      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle auto-sync');
    } finally {
      setToggling(false);
    }
  };

  // Trigger manual sync
  const handleManualSync = async () => {
    setSyncing(true);
    setError(null);

    try {
      const response = await fetch('/api/dashboard/sync/trigger', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Sync failed');
      }

      // Refresh status to show new logs
      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  // Determine current sync status
  const getSyncStatus = (): 'synced' | 'syncing' | 'failed' | 'disabled' | 'never' => {
    if (syncing) return 'syncing';
    if (!status) return 'never';
    if (!status.autoSyncEnabled) return 'disabled';
    if (status.consecutiveFailures > 0) return 'failed';
    if (!status.lastSyncAt) return 'never';
    return 'synced';
  };

  // Loading state
  if (loading) {
    return (
      <section className="border border-gray-200 bg-white p-6">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="font-heading text-xl">Instagram Sync</h2>
          <ProBadge variant="badge" size="sm" />
        </div>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-100 rounded w-1/2" />
          <div className="h-10 bg-gray-100 rounded" />
        </div>
      </section>
    );
  }

  // Not Pro state
  if (status && !status.isPro) {
    return (
      <section className="border border-gray-200 bg-white p-6">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="font-heading text-xl">Instagram Sync</h2>
          <ProBadge variant="badge" size="sm" />
        </div>
        <p className="font-body text-sm text-gray-600 mb-4">
          Automatically sync new tattoo posts from Instagram daily.
        </p>
        <a
          href="/dashboard/upgrade"
          className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-amber-700 hover:text-amber-800 transition-colors"
        >
          Upgrade to Pro
          <span className="text-xs">→</span>
        </a>
      </section>
    );
  }

  return (
    <section className="border border-gray-200 bg-white p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="font-heading text-xl">Instagram Sync</h2>
          <ProBadge variant="badge" size="sm" />
        </div>
        <SyncStatusBadge status={getSyncStatus()} lastSyncAt={status?.lastSyncAt} />
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-start gap-2 mb-4 p-3 bg-red-50 border border-red-200">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="font-body text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Disabled reason warning */}
      {status?.syncDisabledReason && (
        <div className="flex items-start gap-2 mb-4 p-3 bg-amber-50 border border-amber-200">
          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-body text-sm text-amber-800">
              Auto-sync was disabled due to repeated failures.
            </p>
            <p className="font-mono text-[10px] text-amber-600 mt-1">
              Re-enable below to try again.
            </p>
          </div>
        </div>
      )}

      {/* Auto-sync toggle */}
      <div className="flex items-center justify-between py-3 border-b border-gray-100">
        <div>
          <p className="font-body text-sm font-medium text-ink">Auto-sync</p>
          <p className="font-body text-xs text-gray-500 mt-0.5">
            Sync new posts daily at 2am UTC
          </p>
        </div>
        <button
          onClick={handleToggle}
          disabled={toggling}
          className="text-ink hover:text-gray-600 transition-colors disabled:opacity-50"
          aria-label={status?.autoSyncEnabled ? 'Disable auto-sync' : 'Enable auto-sync'}
        >
          {status?.autoSyncEnabled ? (
            <ToggleRight className="w-10 h-6 text-emerald-600" />
          ) : (
            <ToggleLeft className="w-10 h-6 text-gray-400" />
          )}
        </button>
      </div>

      {/* Manual sync button */}
      <div className="flex items-center justify-between py-3 border-b border-gray-100">
        <div>
          <p className="font-body text-sm font-medium text-ink">Manual sync</p>
          <p className="font-body text-xs text-gray-500 mt-0.5">
            Sync now (1 per hour)
          </p>
        </div>
        <button
          onClick={handleManualSync}
          disabled={syncing}
          className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 bg-white hover:border-gray-400 hover:shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
          <span className="font-mono text-[10px] uppercase tracking-wider">
            {syncing ? 'Syncing...' : 'Sync Now'}
          </span>
        </button>
      </div>

      {/* Last sync info */}
      {status?.lastSyncAt && (
        <div className="flex items-center gap-2 py-3 text-gray-500">
          <Clock className="w-3.5 h-3.5" />
          <span className="font-mono text-[10px] uppercase tracking-wider">
            Last synced: {formatDate(status.lastSyncAt)}
          </span>
        </div>
      )}

      {/* Sync history toggle */}
      {status?.recentLogs && status.recentLogs.length > 0 && (
        <div className="mt-2">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-gray-500 hover:text-ink transition-colors"
          >
            {showHistory ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {showHistory ? 'Hide' : 'Show'} sync history
          </button>

          {/* History table */}
          {showHistory && (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="font-mono text-[9px] uppercase tracking-wider text-gray-500 py-2">
                      Date
                    </th>
                    <th className="font-mono text-[9px] uppercase tracking-wider text-gray-500 py-2">
                      Type
                    </th>
                    <th className="font-mono text-[9px] uppercase tracking-wider text-gray-500 py-2 text-right">
                      Added
                    </th>
                    <th className="font-mono text-[9px] uppercase tracking-wider text-gray-500 py-2 text-right">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {status.recentLogs.map((log) => (
                    <tr key={log.id} className="border-b border-gray-50">
                      <td className="font-mono text-[10px] text-gray-700 py-2">
                        {formatDate(log.startedAt)}
                      </td>
                      <td className="font-mono text-[10px] text-gray-700 py-2 capitalize">
                        {log.syncType}
                      </td>
                      <td className="font-mono text-[10px] text-gray-700 py-2 text-right">
                        {log.imagesAdded}
                      </td>
                      <td className="font-mono text-[10px] py-2 text-right">
                        <span
                          className={
                            log.status === 'success'
                              ? 'text-emerald-600'
                              : log.status === 'failed'
                                ? 'text-red-600'
                                : 'text-amber-600'
                          }
                        >
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
