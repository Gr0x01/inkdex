'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Upload, Download, ExternalLink } from 'lucide-react';
import StatsCard from './StatsCard';
import OutreachFunnel from './OutreachFunnel';
import AdminSelect from './AdminSelect';
import StyleMatchesPanel from './StyleMatchesPanel';

interface OutreachStats {
  funnel: {
    pending: number;
    generated: number;
    posted: number;
    dm_sent: number;
    responded: number;
    claimed: number;
    converted: number;
    skipped: number;
  };
  totals: {
    total: number;
    claimRate: number;
    conversionRate: number;
  };
  recent: {
    claimedLast7Days: number;
    postedLast7Days: number;
  };
}

interface AirtableStatus {
  configured: boolean;
  baseId: string | null;
  lastSync: {
    timestamp: string;
  } | null;
}

// Follower range presets
const FOLLOWER_RANGES = [
  { value: '5k-10k', label: '5K–10K', min: 5000, max: 10000 },
  { value: '10k-25k', label: '10K–25K', min: 10000, max: 25000 },
  { value: '25k-50k', label: '25K–50K', min: 25000, max: 50000 },
  { value: '50k-100k', label: '50K–100K', min: 50000, max: 100000 },
];

const LIMIT_OPTIONS = [
  { value: '5', label: '5' },
  { value: '10', label: '10' },
  { value: '20', label: '20' },
];

export default function MarketingDashboard() {
  const [stats, setStats] = useState<OutreachStats | null>(null);
  const [airtableStatus, setAirtableStatus] = useState<AirtableStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Action states
  const [pushLoading, setPushLoading] = useState(false);
  const [pullLoading, setPullLoading] = useState(false);
  const [followerRange, setFollowerRange] = useState('5k-10k');
  const [limit, setLimit] = useState('10');
  const [lastAction, setLastAction] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [statsRes, statusRes] = await Promise.all([
        fetch('/api/admin/marketing/stats'),
        fetch('/api/admin/airtable/status'),
      ]);

      if (!statsRes.ok) {
        throw new Error('Failed to fetch marketing data');
      }

      const [statsData, statusData] = await Promise.all([
        statsRes.json(),
        statusRes.ok ? statusRes.json() : null,
      ]);

      setStats(statsData);
      setAirtableStatus(statusData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePush = async () => {
    const range = FOLLOWER_RANGES.find((r) => r.value === followerRange);
    if (!range) return;

    setPushLoading(true);
    setLastAction(null);

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

      const data = await res.json();
      setLastAction(`Pushed ${data.pushed || 0} artists`);
      await fetchData();
    } catch (err) {
      setLastAction(`Error: ${err instanceof Error ? err.message : 'Push failed'}`);
    } finally {
      setPushLoading(false);
    }
  };

  const handlePull = async () => {
    setPullLoading(true);
    setLastAction(null);

    try {
      const res = await fetch('/api/admin/airtable/pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const data = await res.json();
      setLastAction(`Synced ${data.processed || 0} records`);
      await fetchData();
    } catch (err) {
      setLastAction(`Error: ${err instanceof Error ? err.message : 'Sync failed'}`);
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

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffMs / 86400000)}d ago`;
  };

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2 text-gray-500">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span className="text-sm font-body">Loading...</span>
        </div>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-status-error text-sm font-body">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-bold text-ink">
            Marketing Outreach
          </h1>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-ink text-sm font-body
                   hover:bg-gray-100 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {stats && (
        <>
          {/* Stats Section */}
          <div className="space-y-4">
            {/* Funnel */}
            <OutreachFunnel funnel={stats.funnel} />

            {/* Key Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatsCard
                label="Total Outreach"
                value={stats.totals.total}
                compact
              />
              <StatsCard
                label="Claim Rate"
                value={`${stats.totals.claimRate.toFixed(1)}%`}
                subValue="of DM'd artists"
                variant={stats.totals.claimRate > 20 ? 'success' : 'default'}
                compact
              />
              <StatsCard
                label="Claims (7d)"
                value={stats.recent.claimedLast7Days}
                variant={stats.recent.claimedLast7Days > 0 ? 'success' : 'default'}
                compact
              />
              <StatsCard
                label="Posts (7d)"
                value={stats.recent.postedLast7Days}
                compact
              />
            </div>
          </div>

          {/* Actions Section */}
          <div className="bg-paper border border-ink/10 p-4">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              {/* Push */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-gray-500 uppercase tracking-wider">Push</span>
                <AdminSelect
                  value={followerRange}
                  onChange={setFollowerRange}
                  options={FOLLOWER_RANGES.map((r) => ({ value: r.value, label: r.label }))}
                  className="w-28"
                />
                <AdminSelect
                  value={limit}
                  onChange={setLimit}
                  options={LIMIT_OPTIONS}
                  className="w-16"
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
                  Push
                </button>
              </div>

              {/* Divider */}
              <div className="hidden sm:block w-px h-6 bg-ink/10" />

              {/* Pull */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-gray-500 uppercase tracking-wider">Sync</span>
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
                  Pull
                </button>
                {airtableStatus?.lastSync && (
                  <span className="text-[11px] text-gray-400 font-mono">
                    {formatRelativeTime(airtableStatus.lastSync.timestamp)}
                  </span>
                )}
              </div>

              {/* Divider */}
              <div className="hidden sm:block w-px h-6 bg-ink/10" />

              {/* Open Airtable */}
              {airtableStatus?.configured && (
                <a
                  href="https://airtable.com/appaGh4aKp9sEswAW"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-[13px] text-gray-500 hover:text-ink transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  Open Airtable
                </a>
              )}

              {/* Last Action Feedback */}
              {lastAction && (
                <>
                  <div className="hidden sm:block w-px h-6 bg-ink/10" />
                  <span className={`text-[12px] font-body ${lastAction.startsWith('Error') ? 'text-status-error' : 'text-status-success'}`}>
                    {lastAction}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Style Matches Section */}
          <StyleMatchesPanel />
        </>
      )}
    </div>
  );
}
