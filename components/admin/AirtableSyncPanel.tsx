'use client';

/**
 * Airtable Sync Panel
 *
 * Admin panel component for managing Airtable integration:
 * - Push artists to Airtable (with selection criteria)
 * - Pull updates from Airtable
 * - View sync status and history
 */

import { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw,
  Upload,
  Download,
  ExternalLink,
  CheckCircle,
  XCircle,
  Clock,
  ChevronDown,
  AlertCircle,
} from 'lucide-react';
import AdminSelect from './AdminSelect';

interface SyncStatus {
  configured: boolean;
  baseId: string | null;
  lastSync: {
    timestamp: string;
    direction: string;
    processed: number;
    created: number;
    updated: number;
    hasErrors: boolean;
  } | null;
  stats24h: {
    syncs: number;
    pushes: number;
    pulls: number;
    recordsProcessed: number;
  };
  recentSyncs: Array<{
    id: string;
    type: string;
    direction: string;
    processed: number;
    created: number;
    updated: number;
    hasErrors: boolean;
    triggeredBy: string;
    startedAt: string;
    completedAt: string | null;
  }>;
}

interface PushResult {
  success: boolean;
  pushed: number;
  created: number;
  updated: number;
  errors?: Array<{ handle: string; error: string }>;
  message?: string;
}

interface PullResult {
  success: boolean;
  processed: number;
  updated: number;
  featured_added: number;
  featured_removed: number;
  errors?: Array<{ handle: string; error: string }>;
}

// Follower range presets
const FOLLOWER_RANGES = [
  { value: '5k-10k', label: '5K–10K', min: 5000, max: 10000 },
  { value: '10k-25k', label: '10K–25K', min: 10000, max: 25000 },
  { value: '25k-50k', label: '25K–50K', min: 25000, max: 50000 },
  { value: '50k-100k', label: '50K–100K', min: 50000, max: 100000 },
];

const LIMIT_OPTIONS = [
  { value: '5', label: '5 artists' },
  { value: '10', label: '10 artists' },
  { value: '20', label: '20 artists' },
  { value: '50', label: '50 artists' },
];

export default function AirtableSyncPanel() {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [pushLoading, setPushLoading] = useState(false);
  const [pullLoading, setPullLoading] = useState(false);
  const [followerRange, setFollowerRange] = useState('5k-10k');
  const [limit, setLimit] = useState('10');
  const [showHistory, setShowHistory] = useState(false);
  const [lastResult, setLastResult] = useState<{
    type: 'push' | 'pull';
    data: PushResult | PullResult;
  } | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/airtable/status');
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (error) {
      console.error('Failed to fetch Airtable status:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handlePush = async () => {
    const range = FOLLOWER_RANGES.find((r) => r.value === followerRange);
    if (!range) return;

    setPushLoading(true);
    setLastResult(null);

    try {
      const res = await fetch('/api/admin/airtable/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          criteria: {
            minFollowers: range.min,
            maxFollowers: range.max,
            limit: parseInt(limit),
          },
        }),
      });

      const data: PushResult = await res.json();
      setLastResult({ type: 'push', data });
      await fetchStatus();
    } catch (error) {
      console.error('Push failed:', error);
      setLastResult({
        type: 'push',
        data: {
          success: false,
          pushed: 0,
          created: 0,
          updated: 0,
          errors: [{ handle: 'system', error: String(error) }],
        },
      });
    } finally {
      setPushLoading(false);
    }
  };

  const handlePull = async () => {
    setPullLoading(true);
    setLastResult(null);

    try {
      const res = await fetch('/api/admin/airtable/pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const data: PullResult = await res.json();
      setLastResult({ type: 'pull', data });
      await fetchStatus();
    } catch (error) {
      console.error('Pull failed:', error);
      setLastResult({
        type: 'pull',
        data: {
          success: false,
          processed: 0,
          updated: 0,
          featured_added: 0,
          featured_removed: 0,
          errors: [{ handle: 'system', error: String(error) }],
        },
      });
    } finally {
      setPullLoading(false);
    }
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  if (loading) {
    return (
      <div className="bg-paper border border-ink/10 p-4">
        <div className="flex items-center gap-2 text-gray-500">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          <span className="text-sm font-body">Loading Airtable status...</span>
        </div>
      </div>
    );
  }

  if (!status?.configured) {
    return (
      <div className="bg-paper border border-ink/10 p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-body text-ink">Airtable not configured</p>
            <p className="text-xs text-gray-500 font-body mt-0.5">
              Add AIRTABLE_PAT, AIRTABLE_BASE_ID, and AIRTABLE_OUTREACH_TABLE_ID to
              your environment.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-paper border border-ink/10">
      {/* Header */}
      <div className="px-4 py-3 border-b border-ink/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-status-success" />
          <span className="text-sm font-body text-ink font-medium">
            Airtable Connected
          </span>
          <span className="text-[11px] font-mono text-gray-400">
            {status.baseId}
          </span>
        </div>
        <a
          href={`https://airtable.com/${status.baseId?.replace('...', '')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-ink transition-colors"
        >
          <ExternalLink className="w-3 h-3" />
          Open
        </a>
      </div>

      {/* Actions */}
      <div className="p-4 space-y-4">
        {/* Push Section */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Upload className="w-3.5 h-3.5 text-gray-500" />
            <span className="text-xs font-mono text-gray-500 uppercase tracking-wider">
              Push to Airtable
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <AdminSelect
              value={followerRange}
              onChange={setFollowerRange}
              options={FOLLOWER_RANGES.map((r) => ({
                value: r.value,
                label: r.label,
              }))}
              className="w-28"
            />
            <AdminSelect
              value={limit}
              onChange={setLimit}
              options={LIMIT_OPTIONS}
              className="w-28"
            />
            <button
              onClick={handlePush}
              disabled={pushLoading}
              className="h-[30px] flex items-center gap-1.5 px-3 bg-ink text-paper text-[13px] font-body
                       hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              {pushLoading ? (
                <RefreshCw className="w-3 h-3 animate-spin" />
              ) : (
                <Upload className="w-3 h-3" />
              )}
              Push Artists
            </button>
          </div>
        </div>

        {/* Pull Section */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Download className="w-3.5 h-3.5 text-gray-500" />
            <span className="text-xs font-mono text-gray-500 uppercase tracking-wider">
              Pull from Airtable
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePull}
              disabled={pullLoading}
              className="h-[30px] flex items-center gap-1.5 px-3 bg-paper border border-ink/20 text-ink text-[13px] font-body
                       hover:border-ink/40 transition-colors disabled:opacity-50"
            >
              {pullLoading ? (
                <RefreshCw className="w-3 h-3 animate-spin" />
              ) : (
                <Download className="w-3 h-3" />
              )}
              Sync Now
            </button>
            {status.lastSync && (
              <span className="text-xs text-gray-500 font-body">
                Last sync: {formatRelativeTime(status.lastSync.timestamp)}
              </span>
            )}
          </div>
        </div>

        {/* Last Result */}
        {lastResult && (
          <div
            className={`p-3 border ${
              lastResult.data.success
                ? 'border-status-success/30 bg-status-success/5'
                : 'border-status-error/30 bg-status-error/5'
            }`}
          >
            <div className="flex items-start gap-2">
              {lastResult.data.success ? (
                <CheckCircle className="w-4 h-4 text-status-success flex-shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 text-status-error flex-shrink-0" />
              )}
              <div className="text-xs font-body">
                {lastResult.type === 'push' ? (
                  <p>
                    Pushed {(lastResult.data as PushResult).pushed} artists
                    {(lastResult.data as PushResult).created > 0 &&
                      ` (${(lastResult.data as PushResult).created} new)`}
                    {(lastResult.data as PushResult).updated > 0 &&
                      ` (${(lastResult.data as PushResult).updated} updated)`}
                  </p>
                ) : (
                  <p>
                    Processed {(lastResult.data as PullResult).processed} records,
                    updated {(lastResult.data as PullResult).updated}
                    {(lastResult.data as PullResult).featured_added > 0 &&
                      `, +${(lastResult.data as PullResult).featured_added} featured`}
                    {(lastResult.data as PullResult).featured_removed > 0 &&
                      `, -${(lastResult.data as PullResult).featured_removed} unfeatured`}
                  </p>
                )}
                {lastResult.data.errors && lastResult.data.errors.length > 0 && (
                  <p className="text-status-error mt-1">
                    {lastResult.data.errors.length} error(s)
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs text-gray-500 font-mono">
          <span>24h: {status.stats24h.syncs} syncs</span>
          <span>{status.stats24h.recordsProcessed} records</span>
        </div>
      </div>

      {/* History Toggle */}
      <button
        onClick={() => setShowHistory(!showHistory)}
        className="w-full px-4 py-2 border-t border-ink/10 flex items-center justify-between
                   text-xs text-gray-500 font-body hover:bg-gray-50 transition-colors"
      >
        <span>Sync History</span>
        <ChevronDown
          className={`w-3 h-3 transition-transform ${showHistory ? 'rotate-180' : ''}`}
        />
      </button>

      {/* History */}
      {showHistory && status.recentSyncs.length > 0 && (
        <div className="border-t border-ink/10 divide-y divide-ink/5">
          {status.recentSyncs.slice(0, 5).map((sync) => (
            <div key={sync.id} className="px-4 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {sync.direction === 'push' ? (
                  <Upload className="w-3 h-3 text-gray-400" />
                ) : (
                  <Download className="w-3 h-3 text-gray-400" />
                )}
                <span className="text-xs font-body text-ink">
                  {sync.processed} records
                </span>
                {sync.hasErrors && (
                  <span className="text-[10px] text-status-error">errors</span>
                )}
              </div>
              <div className="flex items-center gap-2 text-[11px] text-gray-400 font-mono">
                <span>{sync.triggeredBy}</span>
                <Clock className="w-2.5 h-2.5" />
                <span>{formatRelativeTime(sync.startedAt)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
