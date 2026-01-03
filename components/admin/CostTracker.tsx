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
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">Cost Tracking</h3>
        <button
          onClick={fetchLiveCosts}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-neutral-400 hover:text-white
                     bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Database Estimates */}
        <div>
          <h4 className="text-xs uppercase tracking-wider text-neutral-500 mb-4">
            Database Estimates
          </h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-neutral-400">Apify</span>
              <span className="text-white font-mono">{formatCurrency(estimatedApify)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-neutral-400">OpenAI</span>
              <span className="text-white font-mono">{formatCurrency(estimatedOpenAI)}</span>
            </div>
            <div className="border-t border-neutral-800 pt-3 flex justify-between items-center">
              <span className="text-neutral-400 font-medium">Total</span>
              <span className="text-white font-mono font-bold">{formatCurrency(estimatedTotal)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-neutral-500 text-sm">Cost per artist</span>
              <span className="text-neutral-400 font-mono text-sm">{formatCurrency(costPerArtist)}</span>
            </div>
          </div>
        </div>

        {/* Live API Costs */}
        <div>
          <h4 className="text-xs uppercase tracking-wider text-neutral-500 mb-4">
            Live API Usage (This Month)
          </h4>

          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm mb-4">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          {loading && !liveCosts ? (
            <div className="text-neutral-500 text-sm">Loading...</div>
          ) : liveCosts ? (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-neutral-400">Apify</span>
                <div className="text-right">
                  <span className="text-white font-mono">
                    {formatCurrency(liveCosts.apify.usage)}
                  </span>
                  {liveCosts.apify.error && (
                    <p className="text-xs text-amber-500 mt-0.5">{liveCosts.apify.error}</p>
                  )}
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-400">OpenAI</span>
                <div className="text-right">
                  <span className="text-white font-mono">
                    {formatCurrency(liveCosts.openai.usage)}
                  </span>
                  {liveCosts.openai.error && (
                    <p className="text-xs text-amber-500 mt-0.5">{liveCosts.openai.error}</p>
                  )}
                </div>
              </div>
              <div className="border-t border-neutral-800 pt-3 flex justify-between items-center">
                <span className="text-neutral-400 font-medium">Total</span>
                <span className="text-white font-mono font-bold">
                  {formatCurrency(liveCosts.total.usage)}
                </span>
              </div>
              <p className="text-xs text-neutral-600 mt-2">
                Last updated: {formatDate(liveCosts.apify.lastUpdated)}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
