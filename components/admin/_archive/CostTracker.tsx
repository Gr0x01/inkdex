'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, AlertCircle } from 'lucide-react';

interface CostData {
  apify: {
    usage: number;
    currency: string;
    error?: string;
    lastUpdated: string;
  };
  openai: {
    usage: number;
    currency: string;
    error?: string;
    lastUpdated: string;
  };
  total: {
    usage: number;
    currency: string;
    hasErrors: boolean;
  };
}

interface CostTrackerProps {
  estimatedApify: number;
  estimatedOpenAI: number;
  estimatedTotal: number;
  costPerArtist: number;
}

export default function CostTracker({
  estimatedApify,
  estimatedOpenAI,
  estimatedTotal,
  costPerArtist,
}: CostTrackerProps) {
  const [liveCosts, setLiveCosts] = useState<CostData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLiveCosts = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/mining/costs/live');
      if (!response.ok) {
        throw new Error('Failed to fetch live costs');
      }
      const data = await response.json();
      setLiveCosts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveCosts();
  }, []);

  const formatCurrency = (value: number) => {
    return `$${value.toFixed(4)}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString();
  };

  return (
    <div className="bg-paper border border-ink/10 p-3">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-heading text-[13px] font-semibold text-ink">Cost Tracking</h3>
        <button
          onClick={fetchLiveCosts}
          disabled={loading}
          className="flex items-center gap-1 px-1.5 py-0.5 text-[11px] text-gray-500 hover:text-ink
                   bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50 font-mono"
        >
          <RefreshCw className={`w-2.5 h-2.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Database Estimates */}
        <div>
          <p className="font-mono text-[9px] text-gray-500 uppercase tracking-wider mb-2">
            Database Estimates
          </p>
          <div className="space-y-1.5">
            <CostRow label="Apify" value={formatCurrency(estimatedApify)} />
            <CostRow label="OpenAI" value={formatCurrency(estimatedOpenAI)} />
            <div className="border-t border-ink/10 pt-1.5">
              <CostRow label="Total" value={formatCurrency(estimatedTotal)} bold />
            </div>
            <CostRow label="Per Artist" value={formatCurrency(costPerArtist)} muted />
          </div>
        </div>

        {/* Live API Costs */}
        <div>
          <p className="font-mono text-[9px] text-gray-500 uppercase tracking-wider mb-2">
            Live API Usage (This Month)
          </p>

          {error && (
            <div className="flex items-center gap-1 text-status-error text-[11px] mb-2 p-1.5 bg-status-error/10">
              <AlertCircle className="w-3 h-3" />
              {error}
            </div>
          )}

          {loading && !liveCosts ? (
            <div className="text-gray-500 text-[12px] font-body">Loading...</div>
          ) : liveCosts ? (
            <div className="space-y-1.5">
              <CostRow
                label="Apify"
                value={formatCurrency(liveCosts.apify.usage)}
                error={liveCosts.apify.error}
              />
              <CostRow
                label="OpenAI"
                value={formatCurrency(liveCosts.openai.usage)}
                error={liveCosts.openai.error}
              />
              <div className="border-t border-ink/10 pt-1.5">
                <CostRow label="Total" value={formatCurrency(liveCosts.total.usage)} bold />
              </div>
              <p className="font-mono text-[9px] text-gray-400 mt-1.5">
                Updated: {formatDate(liveCosts.apify.lastUpdated)}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function CostRow({
  label,
  value,
  bold = false,
  muted = false,
  error,
}: {
  label: string;
  value: string;
  bold?: boolean;
  muted?: boolean;
  error?: string;
}) {
  return (
    <div className="flex justify-between items-center">
      <span className={`text-[12px] font-body ${muted ? 'text-gray-400' : 'text-gray-600'}`}>{label}</span>
      <div className="text-right">
        <span
          className={`text-[13px] font-mono tabular-nums ${
            bold ? 'font-semibold text-ink' : muted ? 'text-gray-400' : 'text-ink'
          }`}
        >
          {value}
        </span>
        {error && <p className="text-[9px] text-status-warning mt-0.5">{error}</p>}
      </div>
    </div>
  );
}
