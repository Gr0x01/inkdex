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
        <div className="flex items-center gap-2 text-gray-500">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span className="text-sm font-body">Loading mining data...</span>
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

  // Build conversion funnel data
  const funnelSteps = stats
    ? [
        {
          label: 'Posts/Followers Scraped',
          value: stats.hashtag.postsScraped + stats.follower.followersScraped,
          color: '#8B8985', // gray-500
        },
        {
          label: 'Unique Handles Found',
          value: stats.hashtag.handlesFound,
          color: '#4A4845', // gray-700
        },
        {
          label: 'Bio Filter Passed',
          value: stats.hashtag.bioFilterPassed + stats.follower.bioFilterPassed,
          color: '#2A2826', // gray-900
        },
        {
          label: 'Image Filter Passed',
          value: stats.hashtag.imageFilterPassed + stats.follower.imageFilterPassed,
          color: '#1A1A1A', // ink
        },
        {
          label: 'Artists Inserted',
          value: stats.totals.artistsInserted,
          color: '#10b981', // status-success
        },
      ]
    : [];

  const tabs: { id: TabType; label: string; icon: React.ElementType }[] = [
    { id: 'all', label: 'All', icon: RefreshCw },
    { id: 'hashtag', label: 'Hashtag', icon: Hash },
    { id: 'follower', label: 'Follower', icon: Users },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-bold text-ink">
            Mining Pipeline
          </h1>
          <p className="text-sm text-gray-500 font-body mt-0.5">
            Hashtag and follower discovery
          </p>
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

      {stats && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatsCard
              label="Running"
              value={stats.hashtag.running + stats.follower.running}
              variant={
                stats.hashtag.running + stats.follower.running > 0
                  ? 'warning'
                  : 'default'
              }
              compact
            />
            <StatsCard
              label="Completed"
              value={stats.hashtag.completed + stats.follower.completed}
              variant="success"
              compact
            />
            <StatsCard
              label="Failed"
              value={stats.hashtag.failed + stats.follower.failed}
              variant={
                stats.hashtag.failed + stats.follower.failed > 0
                  ? 'error'
                  : 'default'
              }
              compact
            />
            <StatsCard
              label="Artists"
              value={stats.totals.artistsInserted}
              subValue={`$${stats.totals.costPerArtist.toFixed(4)}/artist`}
              compact
            />
          </div>

          {/* Pipeline breakdown cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* Hashtag Mining Card */}
            <div className="bg-paper border border-ink/10 p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Hash className="w-3.5 h-3.5 text-gray-500" />
                <h3 className="font-heading text-[13px] font-semibold text-ink">Hashtag Mining</h3>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <MetricItem label="Posts Scraped" value={stats.hashtag.postsScraped} />
                <MetricItem label="Artists Inserted" value={stats.hashtag.artistsInserted} />
                <MetricItem label="Apify Cost" value={`$${stats.hashtag.estimatedApifyCost.toFixed(4)}`} />
                <MetricItem label="OpenAI Cost" value={`$${stats.hashtag.estimatedOpenAICost.toFixed(4)}`} />
              </div>
            </div>

            {/* Follower Mining Card */}
            <div className="bg-paper border border-ink/10 p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Users className="w-3.5 h-3.5 text-gray-500" />
                <h3 className="font-heading text-[13px] font-semibold text-ink">Follower Mining</h3>
              </div>
              <div className="grid grid-cols-2 gap-2">
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
          <div className="bg-paper border border-ink/10">
            {/* Tabs */}
            <div className="border-b border-ink/10 px-2">
              <nav className="flex gap-3">
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
                        flex items-center gap-1 py-2 border-b text-[13px] font-body transition-colors -mb-px
                        ${
                          isActive
                            ? 'border-ink text-ink'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                        }
                      `}
                    >
                      <Icon className="w-2.5 h-2.5" />
                      {tab.label}
                      <span className="font-mono text-[11px] text-gray-400">
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
      <p className="font-mono text-[9px] text-gray-500 uppercase tracking-wider">{label}</p>
      <p className="text-[13px] font-heading font-semibold text-ink tabular-nums">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
    </div>
  );
}
