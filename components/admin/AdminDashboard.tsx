'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Users, Image, Activity, Crown, Star, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import StatsCard from './StatsCard';

interface DashboardData {
  artists: {
    total: number;
    unclaimed: number;
    claimed: number;
    pro: number;
    featured: number;
  };
  content: {
    totalImages: number;
    imagesWithEmbeddings: number;
  };
  mining: {
    hashtag: { total: number; completed: number; failed: number; running: number };
    follower: { total: number; completed: number; failed: number; running: number };
    totalCost: number;
    costPerArtist: number;
    totalArtistsInserted: number;
  };
  activity: {
    totalSearches: number;
    uniqueCities: number;
    recentClaims: {
      id: string;
      name: string;
      instagramHandle: string;
      claimedAt: string;
    }[];
  };
  scraping: {
    completed: number;
    pending: number;
    running: number;
    failed: number;
  };
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/dashboard');
      if (!response.ok) throw new Error('Failed to fetch dashboard data');

      const result = await response.json();
      setData(result);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2 text-gray-500">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          <span className="text-sm font-body">Loading dashboard...</span>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-status-error text-sm font-body">Error: {error}</div>
      </div>
    );
  }

  if (!data) return null;

  const unclaimedPercent = data.artists.total > 0
    ? Math.round((data.artists.unclaimed / data.artists.total) * 100)
    : 0;

  const totalMiningRuns = data.mining.hashtag.total + data.mining.follower.total;
  const runningRuns = data.mining.hashtag.running + data.mining.follower.running;
  const completedRuns = data.mining.hashtag.completed + data.mining.follower.completed;
  const failedRuns = data.mining.hashtag.failed + data.mining.follower.failed;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-bold text-ink">Dashboard</h1>
          <p className="text-sm text-gray-500 font-body mt-0.5">Platform overview</p>
        </div>
        <div className="flex items-center gap-3">
          {lastRefresh && (
            <span className="text-xs text-gray-500 font-mono">
              {lastRefresh.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-paper border-2 border-ink/10
                     text-ink text-sm font-body hover:border-ink/30 transition-colors
                     disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Hero Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatsCard
          label="Total Artists"
          value={data.artists.total}
          compact
        />
        <StatsCard
          label="Portfolio Images"
          value={data.content.totalImages}
          compact
        />
        <StatsCard
          label="Searches"
          value={data.activity.totalSearches}
          compact
        />
        <StatsCard
          label="Cities"
          value={data.activity.uniqueCities}
          compact
        />
      </div>

      {/* Two Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Artists Breakdown */}
        <div className="bg-paper border-2 border-ink/10 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-gray-500" />
              <h3 className="font-heading text-[13px] font-semibold text-ink">Artists</h3>
            </div>
            <Link
              href="/admin/artists"
              className="text-[11px] text-gray-500 hover:text-ink flex items-center gap-0.5 transition-colors"
            >
              View all <ArrowRight className="w-2.5 h-2.5" />
            </Link>
          </div>

          {/* Tier Distribution Bar */}
          <div className="mb-3">
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden flex">
              <div
                className="bg-gray-400 h-full"
                style={{ width: `${unclaimedPercent}%` }}
                title={`Unclaimed: ${data.artists.unclaimed}`}
              />
              <div
                className="bg-status-success h-full"
                style={{ width: `${data.artists.total > 0 ? (data.artists.claimed / data.artists.total) * 100 : 0}%` }}
                title={`Free: ${data.artists.claimed}`}
              />
              <div
                className="bg-status-warning h-full"
                style={{ width: `${data.artists.total > 0 ? (data.artists.pro / data.artists.total) * 100 : 0}%` }}
                title={`Pro: ${data.artists.pro}`}
              />
            </div>
            <div className="flex items-center gap-3 mt-1.5 text-[11px]">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-sm" />
                <span className="text-gray-500">Unclaimed</span>
                <span className="font-mono text-ink">{data.artists.unclaimed}</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-status-success rounded-sm" />
                <span className="text-gray-500">Free</span>
                <span className="font-mono text-ink">{data.artists.claimed}</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-status-warning rounded-sm" />
                <span className="text-gray-500">Pro</span>
                <span className="font-mono text-ink">{data.artists.pro}</span>
              </span>
            </div>
          </div>

          {/* Featured & Pro counts */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-ink/5">
            <div className="flex items-center gap-1">
              <Star className="w-2.5 h-2.5 text-status-warning" />
              <span className="text-gray-500">Featured</span>
              <span className="font-mono text-ink ml-auto">{data.artists.featured}</span>
            </div>
            <div className="flex items-center gap-1">
              <Crown className="w-2.5 h-2.5 text-status-warning" />
              <span className="text-gray-500">Pro</span>
              <span className="font-mono text-ink ml-auto">{data.artists.pro}</span>
            </div>
          </div>
        </div>

        {/* Pipeline Health */}
        <div className="bg-paper border-2 border-ink/10 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-gray-500" />
              <h3 className="font-heading text-[13px] font-semibold text-ink">Mining Pipeline</h3>
            </div>
            <Link
              href="/admin/mining"
              className="text-[11px] text-gray-500 hover:text-ink flex items-center gap-0.5 transition-colors"
            >
              View all <ArrowRight className="w-2.5 h-2.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <MetricRow label="Total Runs" value={totalMiningRuns} />
            <MetricRow
              label="Running"
              value={runningRuns}
              variant={runningRuns > 0 ? 'warning' : 'default'}
            />
            <MetricRow label="Completed" value={completedRuns} variant="success" />
            <MetricRow
              label="Failed"
              value={failedRuns}
              variant={failedRuns > 0 ? 'error' : 'default'}
            />
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 mt-2 border-t border-ink/5">
            <div>
              <span className="font-mono text-[10px] text-gray-500 uppercase tracking-wider">Cost/Artist</span>
              <p className="font-mono text-ink font-medium">${data.mining.costPerArtist.toFixed(4)}</p>
            </div>
            <div>
              <span className="font-mono text-[10px] text-gray-500 uppercase tracking-wider">Total Cost</span>
              <p className="font-mono text-ink font-medium">${data.mining.totalCost.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content Pipeline & Quick Links */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Content Pipeline */}
        <div className="bg-paper border-2 border-ink/10 p-4">
          <div className="flex items-center gap-1.5 mb-3">
            <Image className="w-3.5 h-3.5 text-gray-500" />
            <h3 className="font-heading text-[13px] font-semibold text-ink">Content Pipeline</h3>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <MetricRow label="Scraping Done" value={data.scraping.completed} variant="success" />
            <MetricRow
              label="Scraping Pending"
              value={data.scraping.pending}
              variant={data.scraping.pending > 0 ? 'warning' : 'default'}
            />
            <MetricRow label="With Embeddings" value={data.content.imagesWithEmbeddings} />
            <MetricRow
              label="Scraping Failed"
              value={data.scraping.failed}
              variant={data.scraping.failed > 0 ? 'error' : 'default'}
            />
          </div>
        </div>

        {/* Recent Claims */}
        <div className="bg-paper border-2 border-ink/10 p-4">
          <div className="flex items-center gap-1.5 mb-3">
            <Crown className="w-3.5 h-3.5 text-gray-500" />
            <h3 className="font-heading text-[13px] font-semibold text-ink">Recent Claims</h3>
          </div>

          {data.activity.recentClaims.length === 0 ? (
            <p className="text-gray-400 text-[12px]">No recent claims</p>
          ) : (
            <div className="space-y-1.5">
              {data.activity.recentClaims.map((claim) => (
                <div key={claim.id} className="flex items-center justify-between">
                  <div className="min-w-0">
                    <span className="text-ink text-[13px] truncate block">{claim.name}</span>
                    <span className="text-gray-400 font-mono text-[11px]">@{claim.instagramHandle}</span>
                  </div>
                  <span className="text-gray-400 text-[11px] font-mono flex-shrink-0">
                    {new Date(claim.claimedAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

// Helper component for metric rows
function MetricRow({
  label,
  value,
  variant = 'default',
}: {
  label: string;
  value: number;
  variant?: 'default' | 'success' | 'warning' | 'error';
}) {
  const valueColor = {
    default: 'text-ink',
    success: 'text-status-success',
    warning: 'text-status-warning',
    error: 'text-status-error',
  }[variant];

  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-500 text-[12px]">{label}</span>
      <span className={`font-mono text-[13px] tabular-nums ${valueColor}`}>
        {value.toLocaleString()}
      </span>
    </div>
  );
}
