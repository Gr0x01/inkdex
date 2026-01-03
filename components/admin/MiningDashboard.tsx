'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Hash, Users } from 'lucide-react';
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

type TabType = 'all' | 'hashtag' | 'follower';

export default function MiningDashboard() {
  const [stats, setStats] = useState<MiningStats | null>(null);
  const [runs, setRuns] = useState<MiningRun[]>([]);
  const [cities, setCities] = useState<{ cities: CityData[]; total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('all');

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

  // Filter runs by tab
  const filteredRuns = runs.filter((run) => {
    if (activeTab === 'all') return true;
    return run.type === activeTab;
  });

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-gray-500">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span className="text-sm">Loading mining data...</span>
        </div>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500 text-sm">Error: {error}</div>
      </div>
    );
  }

  // Build conversion funnel data
  const funnelSteps = stats
    ? [
        {
          label: 'Posts/Followers Scraped',
          value: stats.hashtag.postsScraped + stats.follower.followersScraped,
          color: '#9ca3af',
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

  const tabs: { id: TabType; label: string; icon: React.ElementType }[] = [
    { id: 'all', label: 'All Runs', icon: RefreshCw },
    { id: 'hashtag', label: 'Hashtag Mining', icon: Hash },
    { id: 'follower', label: 'Follower Mining', icon: Users },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 font-[family-name:var(--font-space-grotesk)]">
            Mining Pipeline
          </h1>
          <p className="text-gray-500 mt-1">
            Monitor hashtag and follower discovery operations
          </p>
        </div>
        <div className="flex items-center gap-4">
          {lastRefresh && (
            <span className="text-sm text-gray-400">
              Updated {lastRefresh.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200
                     text-gray-700 rounded-xl hover:bg-gray-50 transition-colors
                     disabled:opacity-50 shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {stats && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard
              label="Running Jobs"
              value={stats.hashtag.running + stats.follower.running}
              variant={
                stats.hashtag.running + stats.follower.running > 0
                  ? 'warning'
                  : 'default'
              }
              accentColor="bg-amber-500"
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
              accentColor="bg-emerald-500"
            />
          </div>

          {/* Pipeline breakdown cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Hashtag Mining Card */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                  <Hash className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Hashtag Mining</h3>
                  <p className="text-sm text-gray-500">Posts and profiles from hashtags</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <MetricItem label="Posts Scraped" value={stats.hashtag.postsScraped} />
                <MetricItem label="Artists Inserted" value={stats.hashtag.artistsInserted} />
                <MetricItem label="Apify Cost" value={`$${stats.hashtag.estimatedApifyCost.toFixed(4)}`} />
                <MetricItem label="OpenAI Cost" value={`$${stats.hashtag.estimatedOpenAICost.toFixed(4)}`} />
              </div>
            </div>

            {/* Follower Mining Card */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Follower Mining</h3>
                  <p className="text-sm text-gray-500">Artists from seed account followers</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <MetricItem label="Followers Scraped" value={stats.follower.followersScraped} />
                <MetricItem label="Artists Inserted" value={stats.follower.artistsInserted} />
                <MetricItem label="Skipped (Private)" value={stats.follower.skippedPrivate} />
                <MetricItem
                  label="Total Cost"
                  value={`$${(stats.follower.estimatedApifyCost + stats.follower.estimatedOpenAICost).toFixed(4)}`}
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

          {/* Runs Table with Tabs */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Tabs */}
            <div className="border-b border-gray-100 px-6">
              <nav className="flex gap-6">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  const count =
                    tab.id === 'all'
                      ? runs.length
                      : runs.filter((r) => r.type === tab.id).length;

                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`
                        flex items-center gap-2 py-4 border-b-2 text-sm font-medium transition-colors
                        ${
                          isActive
                            ? 'border-emerald-500 text-emerald-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                        }
                      `}
                    >
                      <Icon className="w-4 h-4" />
                      {tab.label}
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs ${
                          isActive
                            ? 'bg-emerald-50 text-emerald-600'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Table */}
            <MiningRunsTable runs={filteredRuns} loading={loading && runs.length === 0} />
          </div>
        </>
      )}
    </div>
  );
}

// Helper component for metrics
function MetricItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-lg font-semibold text-gray-900 tabular-nums">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
    </div>
  );
}
