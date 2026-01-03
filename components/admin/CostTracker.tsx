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
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Cost Tracking</h3>
            <p className="text-sm text-gray-500">Estimated vs actual API usage</p>
          </div>
        </div>
        <button
          onClick={fetchLiveCosts}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900
                   bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Database Estimates */}
        <div>
          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-4">
            Database Estimates
          </h4>
          <div className="space-y-3">
            <CostRow label="Apify" value={formatCurrency(estimatedApify)} />
            <CostRow label="OpenAI" value={formatCurrency(estimatedOpenAI)} />
            <div className="border-t border-gray-100 pt-3">
              <CostRow label="Total" value={formatCurrency(estimatedTotal)} bold />
            </div>
            <CostRow label="Per Artist" value={formatCurrency(costPerArtist)} muted />
          </div>
        </div>

        {/* Live API Costs */}
        <div>
          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-4">
            Live API Usage (This Month)
          </h4>

          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm mb-4 p-3 bg-red-50 rounded-lg">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          {loading && !liveCosts ? (
            <div className="text-gray-500 text-sm">Loading...</div>
          ) : liveCosts ? (
            <div className="space-y-3">
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
              <div className="border-t border-gray-100 pt-3">
                <CostRow label="Total" value={formatCurrency(liveCosts.total.usage)} bold />
              </div>
              <p className="text-xs text-gray-400 mt-3">
                Last updated: {formatDate(liveCosts.apify.lastUpdated)}
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
      <span className={`text-sm ${muted ? 'text-gray-400' : 'text-gray-600'}`}>{label}</span>
      <div className="text-right">
        <span
          className={`text-sm tabular-nums ${
            bold ? 'font-semibold text-gray-900' : muted ? 'text-gray-400' : 'text-gray-700'
          }`}
        >
          {value}
        </span>
        {error && <p className="text-xs text-amber-600 mt-0.5">{error}</p>}
      </div>
    </div>
  );
}
