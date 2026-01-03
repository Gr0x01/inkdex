'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
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
        <div className="text-neutral-500">Loading mining data...</div>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-400">Error: {error}</div>
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
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Mining Dashboard</h1>
          <p className="text-neutral-500 mt-1">
            Monitor hashtag and follower mining operations
          </p>
        </div>
        <div className="flex items-center gap-4">
          {lastRefresh && (
            <span className="text-xs text-neutral-500">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700
                       text-white rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {stats && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatsCard
              label="Running Jobs"
              value={stats.hashtag.running + stats.follower.running}
              variant={
                stats.hashtag.running + stats.follower.running > 0
                  ? 'warning'
                  : 'default'
              }
            />
            <StatsCard
              label="Completed Jobs"
              value={stats.hashtag.completed + stats.follower.completed}
              variant="success"
            />
            <StatsCard
              label="Failed Jobs"
              value={stats.hashtag.failed + stats.follower.failed}
              variant={
                stats.hashtag.failed + stats.follower.failed > 0
                  ? 'error'
                  : 'default'
              }
            />
            <StatsCard
              label="Artists Discovered"
              value={stats.totals.artistsInserted}
              subValue={`$${stats.totals.costPerArtist.toFixed(4)} per artist`}
            />
          </div>

          {/* Hashtag vs Follower breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5">
              <h3 className="text-sm uppercase tracking-wider text-amber-500 mb-4">
                Hashtag Mining
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-neutral-500">Posts Scraped</p>
                  <p className="text-white font-medium tabular-nums">
                    {stats.hashtag.postsScraped.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-neutral-500">Artists Inserted</p>
                  <p className="text-white font-medium tabular-nums">
                    {stats.hashtag.artistsInserted.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-neutral-500">Apify Cost</p>
                  <p className="text-white font-mono">
                    ${stats.hashtag.estimatedApifyCost.toFixed(4)}
                  </p>
                </div>
                <div>
                  <p className="text-neutral-500">OpenAI Cost</p>
                  <p className="text-white font-mono">
                    ${stats.hashtag.estimatedOpenAICost.toFixed(4)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5">
              <h3 className="text-sm uppercase tracking-wider text-blue-500 mb-4">
                Follower Mining
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-neutral-500">Followers Scraped</p>
                  <p className="text-white font-medium tabular-nums">
                    {stats.follower.followersScraped.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-neutral-500">Artists Inserted</p>
                  <p className="text-white font-medium tabular-nums">
                    {stats.follower.artistsInserted.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-neutral-500">Skipped (Private)</p>
                  <p className="text-white font-medium tabular-nums">
                    {stats.follower.skippedPrivate.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-neutral-500">Total Cost</p>
                  <p className="text-white font-mono">
                    $
                    {(
                      stats.follower.estimatedApifyCost +
                      stats.follower.estimatedOpenAICost
                    ).toFixed(4)}
                  </p>
                </div>
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
            <h3 className="text-lg font-semibold text-white mb-4">Recent Runs</h3>
            <MiningRunsTable runs={runs} loading={loading && runs.length === 0} />
          </div>
        </>
      )}
    </div>
  );
}
