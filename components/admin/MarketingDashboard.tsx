'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, FileText, Users, MessageSquare, Send, Download } from 'lucide-react';
import StatsCard from './StatsCard';
import OutreachTable from './OutreachTable';
import OutreachFunnel from './OutreachFunnel';

interface OutreachStats {
  funnel: {
    pending: number;
    generated: number;
    posted: number;
    dm_sent: number;
    claimed: number;
    converted: number;
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

interface OutreachRecord {
  id: string;
  artist_id: string;
  campaign_name: string;
  status: 'pending' | 'generated' | 'posted' | 'dm_sent' | 'claimed' | 'converted';
  post_text: string | null;
  post_images: string[] | null;
  generated_at: string | null;
  posted_at: string | null;
  dm_sent_at: string | null;
  claimed_at: string | null;
  created_at: string;
  artists: {
    id: string;
    name: string;
    instagram_handle: string;
    city: string | null;
    state: string | null;
    follower_count: number | null;
    slug: string;
  } | null;
}


type TabType = 'all' | 'pending' | 'generated' | 'posted' | 'dm_sent';

export default function MarketingDashboard() {
  const [stats, setStats] = useState<OutreachStats | null>(null);
  const [records, setRecords] = useState<OutreachRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [statsRes, recordsRes] = await Promise.all([
        fetch('/api/admin/marketing/stats'),
        fetch('/api/admin/marketing/outreach?limit=100'),
      ]);

      if (!statsRes.ok || !recordsRes.ok) {
        throw new Error('Failed to fetch marketing data');
      }

      const [statsData, recordsData] = await Promise.all([
        statsRes.json(),
        recordsRes.json(),
      ]);

      setStats(statsData);
      setRecords(recordsData.records || []);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter records by tab
  const filteredRecords = records.filter((record) => {
    if (activeTab === 'all') return true;
    return record.status === activeTab;
  });

  // Select new candidates
  const selectCandidates = async (limit: number = 20) => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/marketing/outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to select candidates');
      }

      const data = await res.json();
      alert(`Selected ${data.inserted} new candidates`);
      fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error selecting candidates');
    } finally {
      setActionLoading(false);
    }
  };

  // Generate posts for selected records
  // Generate post for a single artist
  const generatePost = async (id: string) => {
    const res = await fetch('/api/admin/marketing/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ outreachIds: [id] }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to generate post');
    }

    await fetchData();
  };

  // Update status
  const updateStatus = async (id: string, status: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/marketing/outreach/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update status');
      }

      fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error updating status');
    } finally {
      setActionLoading(false);
    }
  };

  // Export generated posts as Buffer CSV
  const exportBufferCSV = () => {
    const generatedRecords = records.filter(
      (r) => r.status === 'generated' && r.post_text && r.post_images?.length
    );

    if (generatedRecords.length === 0) {
      alert('No generated posts to export');
      return;
    }

    // CSV header
    const rows = ['"Text","Image URL","Tags","Posting Time"'];

    // Add each post - one row per image for carousel effect
    for (const record of generatedRecords) {
      const text = (record.post_text || '').replace(/"/g, '""');
      const images = record.post_images || [];

      // First image gets the caption, rest are just images
      images.forEach((imageUrl, i) => {
        const rowText = i === 0 ? text : '';
        rows.push(`"${rowText}","${imageUrl}",,`);
      });
    }

    // Download CSV
    const csv = rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `buffer-posts-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2 text-gray-500">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span className="text-sm font-body">Loading marketing data...</span>
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

  const tabs: { id: TabType; label: string; icon: React.ElementType; count: number }[] = [
    { id: 'all', label: 'All', icon: Users, count: records.length },
    { id: 'pending', label: 'Pending', icon: FileText, count: stats?.funnel.pending || 0 },
    { id: 'generated', label: 'Generated', icon: FileText, count: stats?.funnel.generated || 0 },
    { id: 'posted', label: 'Posted', icon: Send, count: stats?.funnel.posted || 0 },
    { id: 'dm_sent', label: 'DM Sent', icon: MessageSquare, count: stats?.funnel.dm_sent || 0 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-bold text-ink">
            Marketing Outreach
          </h1>
          <p className="text-sm text-gray-500 font-body mt-0.5">
            Artist outreach campaigns
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

          {/* Funnel */}
          <OutreachFunnel funnel={stats.funnel} />

          {/* Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => selectCandidates(20)}
              disabled={actionLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-ink text-paper text-sm font-body
                       hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              <Users className="w-3.5 h-3.5" />
              Select 20 Candidates
            </button>

            <button
              onClick={exportBufferCSV}
              disabled={!records.some((r) => r.status === 'generated')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-paper border-2 border-ink/20
                       text-ink text-sm font-body hover:border-ink/40 transition-colors disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV for Buffer
            </button>
          </div>

          {/* Tabs + Table */}
          <div className="bg-paper border border-ink/10">
            {/* Tabs */}
            <div className="border-b border-ink/10 px-2">
              <nav className="flex gap-3">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;

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
                        {tab.count}
                      </span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Table */}
            <OutreachTable
              records={filteredRecords}
              onUpdateStatus={updateStatus}
              onGenerate={generatePost}
              loading={loading && records.length === 0}
            />
          </div>
        </>
      )}
    </div>
  );
}
