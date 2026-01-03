'use client';

import { useState, useEffect } from 'react';
import StatsCard from './StatsCard';

interface Stats {
  total: number;
  unclaimed: number;
  claimed: number;
  pro: number;
}

export default function ArtistStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/admin/artists/stats');
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (err) {
        console.error('Failed to fetch artist stats:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (loading || !stats) {
    return (
      <div className="grid grid-cols-4 gap-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-paper border border-ink/10 p-3 animate-pulse">
            <div className="h-3 w-16 bg-gray-100 mb-2" />
            <div className="h-6 w-12 bg-gray-100" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-2">
      <StatsCard
        label="Total"
        value={stats.total}
        compact
      />
      <StatsCard
        label="Unclaimed"
        value={stats.unclaimed}
        subValue={`${((stats.unclaimed / stats.total) * 100).toFixed(0)}%`}
        compact
      />
      <StatsCard
        label="Free"
        value={stats.claimed}
        subValue={`${((stats.claimed / stats.total) * 100).toFixed(0)}%`}
        compact
      />
      <StatsCard
        label="Pro"
        value={stats.pro}
        subValue={`${((stats.pro / stats.total) * 100).toFixed(0)}%`}
        variant={stats.pro > 0 ? 'success' : 'default'}
        compact
      />
    </div>
  );
}
