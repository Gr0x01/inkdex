'use client';

/**
 * SyncSettingsCard - Editorial Minimal Design
 *
 * Pro-only compact horizontal section for Instagram auto-sync settings.
 * Matches the editorial design system with clean typography and minimal styling.
 *
 * Design Philosophy:
 * - Horizontal layout matching "Pinned Images" section pattern
 * - Editorial typography (Libre Baskerville + JetBrains Mono)
 * - Border separator instead of card background
 * - Compact spacing and clean information hierarchy
 */

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import Link from 'next/link';
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
  filterNonTattoo: boolean;
  lastSyncAt: string | null;
  syncDisabledReason: string | null;
  consecutiveFailures: number;
  recentLogs: SyncLog[];
}

interface SyncSettingsCardProps {
  /**
   * Optional initial status for Storybook stories.
   * If provided, component won't fetch from API on mount.
   */
  initialStatus?: SyncStatus;
  /**
   * Optional mock fetch function for Storybook.
   * If provided, this will be used instead of real API calls.
   */
  onFetch?: () => Promise<SyncStatus>;
}

export function SyncSettingsCard({ initialStatus, onFetch }: SyncSettingsCardProps = {}) {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [togglingFilter, setTogglingFilter] = useState(false);
  const [_error, setError] = useState<string | null>(null);
  const [_showHistory, _setShowHistory] = useState(false);

  // Fetch status on mount
  const fetchStatus = useCallback(async () => {
    try {
      // Use mock fetch if provided (for Storybook)
      if (onFetch) {
        const data = await onFetch();
        setStatus(data);
        setError(null);
      } else {
        const response = await fetch('/api/dashboard/sync/status');
        if (!response.ok) {
          throw new Error('Failed to fetch sync status');
        }
        const data = await response.json();
        setStatus(data);
        setError(null);
      }
    } catch (err) {
      console.error('[SyncSettingsCard] Fetch error:', err);
      setError('Failed to load sync status');
    } finally {
      setLoading(false);
    }
  }, [onFetch]);

  useEffect(() => {
    // Use initial status if provided (for Storybook)
    if (initialStatus) {
      setStatus(initialStatus);
      setLoading(false);
    } else {
      fetchStatus();
    }
  }, [fetchStatus, initialStatus]);

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

  // Toggle filter non-tattoo content
  const handleFilterToggle = async () => {
    if (!status) return;

    setTogglingFilter(true);
    setError(null);

    try {
      const response = await fetch('/api/dashboard/sync/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filterNonTattoo: !status.filterNonTattoo }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update settings');
      }

      // Refresh status
      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle filter');
    } finally {
      setTogglingFilter(false);
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
  const _formatDate = (dateString: string) => {
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
      <section className="mb-12">
        <div className="flex items-center justify-between pb-3 border-b border-gray-200 mb-4">
          <div className="flex items-center gap-2">
            <h2 className="font-heading text-lg">Instagram Sync</h2>
            <ProBadge variant="badge" size="sm" />
          </div>
        </div>
        <div className="animate-pulse space-y-2">
          <div className="h-3 bg-gray-100 rounded w-1/3" />
          <div className="h-3 bg-gray-100 rounded w-1/4" />
        </div>
      </section>
    );
  }

  // Not Pro state
  if (status && !status.isPro) {
    return (
      <section className="mb-12">
        <div className="flex items-center justify-between pb-3 border-b border-gray-200 mb-3">
          <div className="flex items-center gap-2">
            <h2 className="font-heading text-lg">Instagram Sync</h2>
            <ProBadge variant="badge" size="sm" />
          </div>
        </div>
        <p className="font-body text-sm text-gray-600 mb-3">
          Automatically sync new tattoo posts from Instagram daily.
        </p>
        <Link
          href="/dashboard/upgrade"
          className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-purple-600 hover:text-purple-700 transition-colors"
        >
          Upgrade to Pro
          <span className="text-xs">→</span>
        </Link>
      </section>
    );
  }

  return (
    <>
      {/* Sync Status Badge */}
      <SyncStatusBadge status={getSyncStatus()} lastSyncAt={status?.lastSyncAt} />

      {/* Two-column grid for toggles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        {/* Auto-sync Toggle */}
        <div className="flex items-center gap-2">
          <label className="font-mono text-[10px] uppercase tracking-wider text-gray-600">
            Auto-Sync
          </label>
          <button
            onClick={handleToggle}
            disabled={toggling}
            className="relative inline-flex border-2 border-ink overflow-hidden h-7 w-20"
            role="switch"
            aria-checked={status?.autoSyncEnabled}
            aria-label="Toggle auto-sync"
          >
            {/* Sliding Background */}
            <div
              className="absolute top-0 bottom-0 bg-ink transition-all duration-300 ease-out"
              style={{
                width: '50%',
                left: status?.autoSyncEnabled ? '50%' : '0'
              }}
            />

            {/* OFF Label */}
            <span
              className={`relative z-10 w-1/2 font-mono text-[9px] uppercase tracking-wider transition-colors duration-300 text-center flex items-center justify-center ${
                !status?.autoSyncEnabled ? 'text-paper' : 'text-ink'
              }`}
            >
              OFF
            </span>

            {/* Divider */}
            <div className="absolute top-0 bottom-0 left-1/2 -ml-[1px] w-[2px] bg-ink z-10" />

            {/* ON Label */}
            <span
              className={`relative z-10 w-1/2 font-mono text-[9px] uppercase tracking-wider transition-colors duration-300 text-center flex items-center justify-center ${
                status?.autoSyncEnabled ? 'text-paper' : 'text-ink'
              }`}
            >
              ON
            </span>
          </button>
        </div>

        {/* Filter Toggle */}
        <div className="flex items-center gap-2">
          <label className="font-mono text-[10px] uppercase tracking-wider text-gray-600">
            Filter Content
          </label>
          <button
            onClick={handleFilterToggle}
            disabled={togglingFilter}
            className="relative inline-flex border-2 border-ink overflow-hidden h-7 w-20"
            role="switch"
            aria-checked={status?.filterNonTattoo}
            aria-label="Toggle filter non-tattoo content"
          >
            {/* Sliding Background */}
            <div
              className="absolute top-0 bottom-0 bg-ink transition-all duration-300 ease-out"
              style={{
                width: '50%',
                left: status?.filterNonTattoo ? '50%' : '0'
              }}
            />

            {/* OFF Label */}
            <span
              className={`relative z-10 w-1/2 font-mono text-[9px] uppercase tracking-wider transition-colors duration-300 text-center flex items-center justify-center ${
                !status?.filterNonTattoo ? 'text-paper' : 'text-ink'
              }`}
            >
              OFF
            </span>

            {/* Divider */}
            <div className="absolute top-0 bottom-0 left-1/2 -ml-[1px] w-[2px] bg-ink z-10" />

            {/* ON Label */}
            <span
              className={`relative z-10 w-1/2 font-mono text-[9px] uppercase tracking-wider transition-colors duration-300 text-center flex items-center justify-center ${
                status?.filterNonTattoo ? 'text-paper' : 'text-ink'
              }`}
            >
              ON
            </span>
          </button>
        </div>
      </div>

      {/* Manual Sync Button */}
      <div
        className="group relative inline-block transition-all duration-200"
        style={{
          background: syncing ? 'transparent' : 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
          padding: '2px'
        }}
      >
        <button
          onClick={handleManualSync}
          disabled={syncing}
          className="relative inline-flex items-center justify-center h-7 w-7 sm:w-auto sm:h-auto sm:px-3 sm:py-1.5 sm:gap-1.5
                     bg-gradient-to-r from-[#f09433] via-[#dc2743] to-[#bc1888]
                     group-hover:bg-paper
                     text-white font-mono text-[10px] uppercase tracking-wider
                     transition-all duration-200
                     disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gradient-to-r disabled:from-[#f09433] disabled:via-[#dc2743] disabled:to-[#bc1888]"
        >
          <RefreshCw className={`w-2.5 h-2.5 ${syncing ? 'animate-spin' : ''} group-hover:text-[#dc2743] transition-colors duration-200`} />
          <span className="hidden sm:inline group-hover:bg-gradient-to-r group-hover:from-[#f09433] group-hover:via-[#dc2743] group-hover:to-[#bc1888] group-hover:bg-clip-text group-hover:text-transparent transition-all duration-200">
            {syncing ? 'Syncing...' : 'Sync Now'}
          </span>
        </button>
      </div>
    </>
  );
}
