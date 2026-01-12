'use client';

import { useState } from 'react';
import { RefreshCw, Ban, RotateCcw, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface ScrapingJob {
  id: string;
  status: string;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
  result_data: { images_scraped?: number } | null;
}

interface PipelineState {
  pipeline_status: string | null;
  scraping_blacklisted: boolean;
  blacklist_reason: string | null;
  last_scraped_at: string | null;
}

interface ScrapingStatusCardProps {
  artistId: string;
  artistHandle?: string; // For future use in UI
  initialPipelineState: PipelineState | null;
  initialScrapingHistory: ScrapingJob[];
  onStatusChange?: () => void;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  pending: { label: 'Pending', color: 'bg-gray-100 text-gray-600', icon: Clock },
  scraping: { label: 'Scraping', color: 'bg-blue-100 text-blue-600', icon: RefreshCw },
  pending_embeddings: { label: 'Needs Embeddings', color: 'bg-yellow-100 text-yellow-600', icon: Clock },
  complete: { label: 'Complete', color: 'bg-green-100 text-green-600', icon: CheckCircle },
  failed: { label: 'Failed', color: 'bg-red-100 text-red-600', icon: XCircle },
  retry_requested: { label: 'Retry Requested', color: 'bg-orange-100 text-orange-600', icon: RotateCcw },
  rejected: { label: 'Rejected', color: 'bg-gray-200 text-gray-600', icon: Ban },
};

export default function ScrapingStatusCard({
  artistId,
  initialPipelineState,
  initialScrapingHistory,
  onStatusChange,
}: ScrapingStatusCardProps) {
  const [pipelineState, setPipelineState] = useState(initialPipelineState);
  const [scrapingHistory] = useState(initialScrapingHistory);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const status = pipelineState?.pipeline_status || 'pending';
  const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const StatusIcon = statusConfig.icon;

  const handleRescrape = async () => {
    setLoading('rescrape');
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/admin/pipeline/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobType: 'scraping',
          scope: 'specific',
          artistIds: [artistId],
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to trigger rescrape');
      }

      setPipelineState((prev) => ({
        ...prev!,
        pipeline_status: 'scraping',
        scraping_blacklisted: false,
      }));
      setSuccess('Scraping started');
      onStatusChange?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rescrape');
    } finally {
      setLoading(null);
    }
  };

  const handleBlacklist = async () => {
    const reason = prompt('Enter reason for blacklisting (e.g., "Repost account", "Not a tattoo artist"):');
    if (!reason) return;

    setLoading('blacklist');
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/admin/artists/${artistId}/blacklist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blacklist: true, reason }),
      });

      if (!res.ok) throw new Error('Failed to blacklist');

      const data = await res.json();
      setPipelineState((prev) => ({
        ...prev!,
        pipeline_status: 'rejected',
        scraping_blacklisted: true,
        blacklist_reason: reason,
      }));
      setSuccess(data.message || 'Blacklisted');
      onStatusChange?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to blacklist');
    } finally {
      setLoading(null);
    }
  };

  const handleUnblacklist = async () => {
    setLoading('unblacklist');
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/admin/artists/${artistId}/blacklist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blacklist: false }),
      });

      if (!res.ok) throw new Error('Failed to unblacklist');

      setPipelineState((prev) => ({
        ...prev!,
        pipeline_status: 'pending',
        scraping_blacklisted: false,
        blacklist_reason: null,
      }));
      setSuccess('Unblacklisted - ready for scraping');
      onStatusChange?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unblacklist');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="bg-paper border border-ink/10 p-4">
      <h2 className="font-mono text-[10px] uppercase tracking-wider text-gray-500 mb-3">
        Scraping Status
      </h2>

      {/* Status indicator */}
      <div className="flex items-center gap-3 mb-4">
        <div className={`flex items-center gap-1.5 px-2 py-1 text-[11px] font-mono uppercase ${statusConfig.color}`}>
          <StatusIcon className="w-3 h-3" />
          {statusConfig.label}
        </div>

        {pipelineState?.last_scraped_at && (
          <span className="text-[11px] text-gray-400 font-mono">
            Last: {new Date(pipelineState.last_scraped_at).toLocaleDateString()}
          </span>
        )}
      </div>

      {/* Blacklist reason */}
      {pipelineState?.scraping_blacklisted && pipelineState.blacklist_reason && (
        <div className="mb-4 px-2 py-1.5 bg-gray-50 border-l-2 border-gray-300">
          <span className="text-[11px] text-gray-600 font-body">
            Reason: {pipelineState.blacklist_reason}
          </span>
        </div>
      )}

      {/* Error/Success messages */}
      {error && (
        <div className="mb-3 px-2 py-1.5 bg-red-50 text-red-600 text-[11px] font-body flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {error}
        </div>
      )}
      {success && (
        <div className="mb-3 px-2 py-1.5 bg-green-50 text-green-600 text-[11px] font-body flex items-center gap-1">
          <CheckCircle className="w-3 h-3" />
          {success}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2 mb-4">
        {!pipelineState?.scraping_blacklisted && status !== 'scraping' && (
          <button
            onClick={handleRescrape}
            disabled={loading !== null}
            className="flex items-center gap-1 px-2 py-1 text-[11px] font-mono uppercase
                       bg-ink text-paper hover:bg-ink/80 disabled:opacity-50 transition-colors"
          >
            {loading === 'rescrape' ? (
              <RefreshCw className="w-3 h-3 animate-spin" />
            ) : (
              <RotateCcw className="w-3 h-3" />
            )}
            Rescrape
          </button>
        )}

        {pipelineState?.scraping_blacklisted ? (
          <button
            onClick={handleUnblacklist}
            disabled={loading !== null}
            className="flex items-center gap-1 px-2 py-1 text-[11px] font-mono uppercase
                       bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {loading === 'unblacklist' ? (
              <RefreshCw className="w-3 h-3 animate-spin" />
            ) : (
              <CheckCircle className="w-3 h-3" />
            )}
            Unblacklist
          </button>
        ) : (
          <button
            onClick={handleBlacklist}
            disabled={loading !== null}
            className="flex items-center gap-1 px-2 py-1 text-[11px] font-mono uppercase
                       bg-paper border border-red-200 text-red-500 hover:bg-red-50 disabled:opacity-50 transition-colors"
          >
            {loading === 'blacklist' ? (
              <RefreshCw className="w-3 h-3 animate-spin" />
            ) : (
              <Ban className="w-3 h-3" />
            )}
            Blacklist
          </button>
        )}
      </div>

      {/* Scraping History */}
      {scrapingHistory.length > 0 && (
        <div>
          <h3 className="font-mono text-[9px] uppercase tracking-wider text-gray-400 mb-2">
            Recent Scraping Jobs
          </h3>
          <div className="space-y-1">
            {scrapingHistory.slice(0, 5).map((job) => (
              <div key={job.id} className="flex items-center gap-2 text-[11px] font-mono">
                <span className={`w-2 h-2 rounded-full ${
                  job.status === 'completed' ? 'bg-green-500' :
                  job.status === 'failed' ? 'bg-red-500' :
                  job.status === 'running' ? 'bg-blue-500' :
                  'bg-gray-300'
                }`} />
                <span className="text-gray-400">
                  {new Date(job.created_at).toLocaleDateString()}
                </span>
                <span className={`${
                  job.status === 'completed' ? 'text-green-600' :
                  job.status === 'failed' ? 'text-red-600' :
                  'text-gray-500'
                }`}>
                  {job.status}
                </span>
                {job.status === 'completed' && job.result_data?.images_scraped != null && (
                  <span className="text-gray-400">({job.result_data.images_scraped} imgs)</span>
                )}
                {job.status === 'failed' && job.error_message && (
                  <span className="text-red-400 truncate max-w-[200px]" title={job.error_message}>
                    {job.error_message}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {scrapingHistory.length === 0 && !pipelineState?.last_scraped_at && (
        <p className="text-[11px] text-gray-400 font-body">
          No scraping history yet
        </p>
      )}
    </div>
  );
}
