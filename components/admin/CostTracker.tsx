'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, AlertCircle, DollarSign } from 'lucide-react';

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
    <div className="bg-neutral-900/30 border border-neutral-800/50 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-emerald-500" />
          <h3 className="text-xs font-mono uppercase tracking-wider text-emerald-400">
            Cost Tracking
          </h3>
        </div>
        <button
          onClick={fetchLiveCosts}
          disabled={loading}
          className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-mono
                   text-neutral-500 hover:text-neutral-300
                   bg-neutral-800/30 hover:bg-neutral-800/50
                   rounded transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Database Estimates */}
        <div className="space-y-2">
          <h4 className="text-[10px] uppercase tracking-wider text-neutral-600 font-mono">
            Database Estimates
          </h4>
          <div className="space-y-1.5">
            <CostRow label="Apify" value={formatCurrency(estimatedApify)} />
            <CostRow label="OpenAI" value={formatCurrency(estimatedOpenAI)} />
            <div className="border-t border-neutral-800/50 pt-1.5">
              <CostRow label="Total" value={formatCurrency(estimatedTotal)} bold />
            </div>
            <CostRow
              label="Per Artist"
              value={formatCurrency(costPerArtist)}
              muted
            />
          </div>
        </div>

        {/* Live API Costs */}
        <div className="space-y-2">
          <h4 className="text-[10px] uppercase tracking-wider text-neutral-600 font-mono">
            Live API Usage (Month)
          </h4>

          {error && (
            <div className="flex items-center gap-1.5 text-red-400 text-[10px] font-mono">
              <AlertCircle className="w-3 h-3" />
              {error}
            </div>
          )}

          {loading && !liveCosts ? (
            <div className="text-neutral-600 text-xs font-mono">Loading...</div>
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
              <div className="border-t border-neutral-800/50 pt-1.5">
                <CostRow
                  label="Total"
                  value={formatCurrency(liveCosts.total.usage)}
                  bold
                />
              </div>
              <p className="text-[9px] text-neutral-700 font-mono mt-2">
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
      <span className={`text-xs ${muted ? 'text-neutral-600' : 'text-neutral-500'}`}>
        {label}
      </span>
      <div className="text-right">
        <span
          className={`text-xs font-mono ${
            bold ? 'text-white font-medium' : muted ? 'text-neutral-500' : 'text-neutral-300'
          }`}
        >
          {value}
        </span>
        {error && (
          <p className="text-[9px] text-amber-500/70 mt-0.5">{error}</p>
        )}
      </div>
    </div>
  );
}
