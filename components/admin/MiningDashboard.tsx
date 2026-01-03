'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Clock } from 'lucide-react';
import StatsCard from './StatsCard';
import CostTracker from './CostTracker';
import MiningRunsTable from './MiningRunsTable';
import ConversionFunnel from './ConversionFunnel';
import CityDistribution from './CityDistribution';

interface MiningStats {
  hashtag: {
    total: number;
    completed: number;
    failed: number;
    running: number;
    postsScraped: number;
    handlesFound: number;
    bioFilterPassed: number;
    imageFilterPassed: number;
    artistsInserted: number;
    estimatedApifyCost: number;
    estimatedOpenAICost: number;
  };
  follower: {
    total: number;
    completed: number;
    failed: number;
    running: number;
    followersScraped: number;
    bioFilterPassed: number;
    imageFilterPassed: number;
    artistsInserted: number;
    skippedPrivate: number;
    estimatedApifyCost: number;
    estimatedOpenAICost: number;
  };
  totals: {
    artistsInserted: number;
    estimatedApifyCost: number;
    estimatedOpenAICost: number;
    estimatedTotalCost: number;
    costPerArtist: number;
  };
}

interface MiningRun {
  id: string;
  type: 'hashtag' | 'follower';
  identifier: string;
  status: string;
  stats: {
    scraped: number;
    bioPass: number;
    imagePass: number;
    inserted: number;
    duplicates?: number;
    private?: number;
  };
  costs: {
    apify: number;
    openai: number;
  };
  error?: string;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

interface CityData {
  city: string;
  count: number;
}

export default function MiningDashboard() {
  const [stats, setStats] = useState<MiningStats | null>(null);
  const [runs, setRuns] = useState<MiningRun[]>([]);
  const [cities, setCities] = useState<{ cities: CityData[]; total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [statsRes, runsRes, citiesRes] = await Promise.all([
        fetch('/api/admin/mining/stats'),
        fetch('/api/admin/mining/runs?limit=20'),
        fetch('/api/admin/mining/cities'),
      ]);

      if (!statsRes.ok || !runsRes.ok || !citiesRes.ok) {
        throw new Error('Failed to fetch mining data');
      }

      const [statsData, runsData, citiesData] = await Promise.all([
        statsRes.json(),
        runsRes.json(),
        citiesRes.json(),
      ]);

      setStats(statsData);
      setRuns(runsData.runs);
      setCities(citiesData);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-neutral-500">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span className="text-sm font-mono">Loading pipeline data...</span>
        </div>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-400 font-mono text-sm">Error: {error}</div>
      </div>
    );
  }

  // Build conversion funnel data
  const funnelSteps = stats
    ? [
        {
          label: 'Posts/Followers Scraped',
          value: stats.hashtag.postsScraped + stats.follower.followersScraped,
          color: '#6b7280',
        },
        {
          label: 'Unique Handles Found',
          value: stats.hashtag.handlesFound,
          color: '#8b5cf6',
        },
        {
          label: 'Bio Filter Passed',
          value: stats.hashtag.bioFilterPassed + stats.follower.bioFilterPassed,
          color: '#3b82f6',
        },
        {
          label: 'Image Filter Passed',
          value: stats.hashtag.imageFilterPassed + stats.follower.imageFilterPassed,
          color: '#10b981',
        },
        {
          label: 'Artists Inserted',
          value: stats.totals.artistsInserted,
          color: '#f59e0b',
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Header - Compact, utilitarian */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white font-[family-name:var(--font-space-grotesk)] tracking-tight">
            Mining Pipeline
          </h1>
          <p className="text-xs text-neutral-500 font-mono mt-0.5">
            Hashtag and follower discovery operations
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastRefresh && (
            <div className="flex items-center gap-1.5 text-[10px] text-neutral-600 font-mono">
              <Clock className="w-3 h-3" />
              {lastRefresh.toLocaleTimeString()}
            </div>
          )}
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono
                     bg-neutral-800/50 hover:bg-neutral-800 border border-neutral-700/50
                     text-neutral-300 rounded transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {stats && (
        <>
          {/* Stats Cards - Tighter grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatsCard
              label="Running"
              value={stats.hashtag.running + stats.follower.running}
              variant={
                stats.hashtag.running + stats.follower.running > 0
                  ? 'warning'
                  : 'default'
              }
            />
            <StatsCard
              label="Completed"
              value={stats.hashtag.completed + stats.follower.completed}
              variant="success"
            />
            <StatsCard
              label="Failed"
              value={stats.hashtag.failed + stats.follower.failed}
              variant={
                stats.hashtag.failed + stats.follower.failed > 0
                  ? 'error'
                  : 'default'
              }
            />
            <StatsCard
              label="Discovered"
              value={stats.totals.artistsInserted}
              subValue={`$${stats.totals.costPerArtist.toFixed(4)}/artist`}
            />
          </div>

          {/* Pipeline breakdown - Side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* Hashtag Mining */}
            <div className="bg-neutral-900/30 border border-neutral-800/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                <h3 className="text-xs font-mono uppercase tracking-wider text-amber-500">
                  Hashtag Mining
                </h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Metric label="Posts Scraped" value={stats.hashtag.postsScraped} />
                <Metric label="Artists Inserted" value={stats.hashtag.artistsInserted} />
                <Metric label="Apify Cost" value={`$${stats.hashtag.estimatedApifyCost.toFixed(4)}`} mono />
                <Metric label="OpenAI Cost" value={`$${stats.hashtag.estimatedOpenAICost.toFixed(4)}`} mono />
              </div>
            </div>

            {/* Follower Mining */}
            <div className="bg-neutral-900/30 border border-neutral-800/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                <h3 className="text-xs font-mono uppercase tracking-wider text-blue-500">
                  Follower Mining
                </h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Metric label="Followers Scraped" value={stats.follower.followersScraped} />
                <Metric label="Artists Inserted" value={stats.follower.artistsInserted} />
                <Metric label="Skipped (Private)" value={stats.follower.skippedPrivate} />
                <Metric
                  label="Total Cost"
                  value={`$${(stats.follower.estimatedApifyCost + stats.follower.estimatedOpenAICost).toFixed(4)}`}
                  mono
                />
              </div>
            </div>
          </div>

          {/* Conversion Funnel */}
          <ConversionFunnel steps={funnelSteps} />

          {/* Cost Tracker */}
          <CostTracker
            estimatedApify={stats.totals.estimatedApifyCost}
            estimatedOpenAI={stats.totals.estimatedOpenAICost}
            estimatedTotal={stats.totals.estimatedTotalCost}
            costPerArtist={stats.totals.costPerArtist}
          />

          {/* City Distribution */}
          {cities && (
            <CityDistribution cities={cities.cities} total={cities.total} />
          )}

          {/* Recent Runs */}
          <div>
            <h3 className="text-sm font-medium text-white font-[family-name:var(--font-space-grotesk)] mb-3">
              Recent Runs
            </h3>
            <MiningRunsTable runs={runs} loading={loading && runs.length === 0} />
          </div>
        </>
      )}
    </div>
  );
}

// Helper component for metrics
function Metric({
  label,
  value,
  mono = false
}: {
  label: string;
  value: string | number;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] text-neutral-500 uppercase tracking-wider font-mono">{label}</p>
      <p className={`text-sm text-white tabular-nums ${mono ? 'font-mono' : ''}`}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
    </div>
  );
}
