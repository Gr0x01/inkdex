'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Play, Image, Cpu, Database, RotateCcw } from 'lucide-react';
import StatsCard from './StatsCard';
import PipelineRunsTable from './PipelineRunsTable';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

interface PipelineStatus {
  artists: {
    total: number;
    withoutImages: number;
    withImages: number;
    pendingEmbeddings: number;
    complete: number;
  };
  images: {
    total: number;
    withEmbeddings: number;
    withoutEmbeddings: number;
  };
  scrapingJobs: {
    total: number;
    pending: number;
    running: number;
    completed: number;
    failed: number;
  };
  recentRuns: PipelineRun[];
}

interface PipelineRun {
  id: string;
  jobType: string;
  status: string;
  totalItems: number;
  processedItems: number;
  failedItems: number;
  triggeredBy: string;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  errorMessage: string | null;
  lastHeartbeatAt: string | null;
  isStale: boolean;
}

type JobType = 'scraping' | 'processing' | 'embeddings';

interface ConfirmState {
  isOpen: boolean;
  jobType: JobType | 'retry' | null;
  title: string;
  message: string;
}

const JOB_DESCRIPTIONS: Record<JobType | 'retry', { title: string; message: string }> = {
  scraping: {
    title: 'Start Scraping Job',
    message: 'This will scrape Instagram images for all pending artists. This operation uses Apify credits and may take several hours for large batches. Continue?',
  },
  processing: {
    title: 'Start Processing Job',
    message: 'This will process and upload images to storage. Continue?',
  },
  embeddings: {
    title: 'Generate Embeddings',
    message: 'This will generate CLIP embeddings for all images without embeddings. This requires GPU resources and may take significant time. Continue?',
  },
  retry: {
    title: 'Retry Failed Jobs',
    message: 'This will reset all failed scraping jobs to pending status so they can be retried. Continue?',
  },
};

export default function PipelineDashboard() {
  const [status, setStatus] = useState<PipelineStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [triggering, setTriggering] = useState<JobType | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [triggerMessage, setTriggerMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState>({
    isOpen: false,
    jobType: null,
    title: '',
    message: '',
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/pipeline/status');
      if (!res.ok) throw new Error('Failed to fetch pipeline status');

      const data = await res.json();
      setStatus(data);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    // Auto-refresh every 30 seconds (with caching, 30s is sufficient for status updates)
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Show confirmation dialog before triggering job
  const requestTriggerJob = (jobType: JobType) => {
    const desc = JOB_DESCRIPTIONS[jobType];
    setConfirmState({
      isOpen: true,
      jobType,
      title: desc.title,
      message: desc.message,
    });
  };

  // Show confirmation dialog before retrying failed jobs
  const requestRetryJobs = () => {
    const desc = JOB_DESCRIPTIONS.retry;
    setConfirmState({
      isOpen: true,
      jobType: 'retry',
      title: desc.title,
      message: desc.message,
    });
  };

  // Close confirmation dialog
  const closeConfirm = () => {
    setConfirmState((prev) => ({ ...prev, isOpen: false }));
  };

  // Handle confirmed action
  const handleConfirm = async () => {
    const { jobType } = confirmState;
    closeConfirm();

    if (!jobType) return;

    if (jobType === 'retry') {
      await executeRetry();
    } else {
      await executeTriggerJob(jobType);
    }
  };

  const executeTriggerJob = async (jobType: JobType) => {
    setTriggering(jobType);
    setTriggerMessage(null);

    try {
      const res = await fetch('/api/admin/pipeline/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobType, scope: 'pending' }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to trigger job');
      }

      setTriggerMessage({ type: 'success', text: data.message });
      // Refresh data to show new run
      fetchData();
    } catch (err) {
      setTriggerMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to trigger job',
      });
    } finally {
      setTriggering(null);
    }
  };

  const executeRetry = async () => {
    setRetrying(true);
    setTriggerMessage(null);

    try {
      const res = await fetch('/api/admin/pipeline/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: 'scraping' }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to retry jobs');
      }

      setTriggerMessage({ type: 'success', text: data.message });
      fetchData();
    } catch (err) {
      setTriggerMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to retry jobs',
      });
    } finally {
      setRetrying(false);
    }
  };

  const handleCancelRun = async (runId: string) => {
    try {
      const res = await fetch('/api/admin/pipeline/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to cancel job');
      }

      setTriggerMessage({ type: 'success', text: 'Job cancelled successfully' });
      fetchData();
    } catch (err) {
      setTriggerMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to cancel job',
      });
    }
  };

  if (loading && !status) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2 text-gray-500">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span className="text-sm font-body">Loading pipeline status...</span>
        </div>
      </div>
    );
  }

  if (error && !status) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-status-error text-sm font-body">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-bold text-ink">
            Content Pipeline
          </h1>
          <p className="text-sm text-gray-500 font-body mt-0.5">
            Scraping, processing, and embedding generation
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

      {/* Trigger message */}
      {triggerMessage && (
        <div
          className={`p-3 text-sm font-body ${
            triggerMessage.type === 'success'
              ? 'bg-status-success/10 text-status-success border border-status-success/20'
              : 'bg-status-error/10 text-status-error border border-status-error/20'
          }`}
        >
          {triggerMessage.text}
        </div>
      )}

      {status && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatsCard
              label="Total Artists"
              value={status.artists.total}
              compact
            />
            <StatsCard
              label="Need Scraping"
              value={status.artists.withoutImages}
              variant={status.artists.withoutImages > 0 ? 'warning' : 'default'}
              compact
            />
            <StatsCard
              label="Total Images"
              value={status.images.total}
              compact
            />
            <StatsCard
              label="Failed Jobs"
              value={status.scrapingJobs.failed}
              variant={status.scrapingJobs.failed > 0 ? 'error' : 'default'}
              compact
            />
          </div>

          {/* Pipeline Stage Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {/* Need Scraping Card */}
            <div className="bg-paper border border-ink/10 p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Image className="w-3.5 h-3.5 text-gray-500" />
                <h3 className="font-heading text-[13px] font-semibold text-ink">Need Images</h3>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <MetricItem label="Artists" value={status.artists.withoutImages} />
                <MetricItem label="Pending Jobs" value={status.scrapingJobs.pending} />
              </div>
              <button
                onClick={() => requestTriggerJob('scraping')}
                disabled={triggering === 'scraping' || status.artists.withoutImages === 0}
                className="flex items-center gap-1 px-2 py-1 bg-ink text-paper text-[11px] font-body
                         hover:bg-ink/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {triggering === 'scraping' ? (
                  <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                ) : (
                  <Play className="w-2.5 h-2.5" />
                )}
                Start Scraping
              </button>
            </div>

            {/* Need Embeddings Card */}
            <div className="bg-paper border border-ink/10 p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Cpu className="w-3.5 h-3.5 text-gray-500" />
                <h3 className="font-heading text-[13px] font-semibold text-ink">Need Embeddings</h3>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <MetricItem label="Images" value={status.images.withoutEmbeddings} />
                <MetricItem label="Total" value={status.images.total} />
              </div>
              <button
                onClick={() => requestTriggerJob('embeddings')}
                disabled={triggering === 'embeddings' || status.images.withoutEmbeddings === 0}
                className="flex items-center gap-1 px-2 py-1 bg-ink text-paper text-[11px] font-body
                         hover:bg-ink/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {triggering === 'embeddings' ? (
                  <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                ) : (
                  <Play className="w-2.5 h-2.5" />
                )}
                Generate Embeddings
              </button>
            </div>

            {/* Searchable Card */}
            <div className="bg-paper border border-ink/10 p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Database className="w-3.5 h-3.5 text-gray-500" />
                <h3 className="font-heading text-[13px] font-semibold text-ink">Searchable</h3>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <MetricItem label="With Embeddings" value={status.images.withEmbeddings} />
                <MetricItem
                  label="Coverage"
                  value={
                    status.images.total > 0
                      ? `${((status.images.withEmbeddings / status.images.total) * 100).toFixed(1)}%`
                      : '—'
                  }
                />
              </div>
            </div>
          </div>

          {/* Scraping Jobs Summary */}
          <div className="bg-paper border border-ink/10 p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-heading text-[13px] font-semibold text-ink">
                Scraping Jobs
              </h3>
              {status.scrapingJobs.failed > 0 && (
                <button
                  onClick={requestRetryJobs}
                  disabled={retrying}
                  className="flex items-center gap-1 px-2 py-1 bg-status-error/10 text-status-error text-[11px] font-body
                           hover:bg-status-error/20 disabled:opacity-50 transition-colors"
                >
                  {retrying ? (
                    <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                  ) : (
                    <RotateCcw className="w-2.5 h-2.5" />
                  )}
                  Retry {status.scrapingJobs.failed} Failed
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
              <MetricItem label="Total" value={status.scrapingJobs.total} />
              <MetricItem label="Pending" value={status.scrapingJobs.pending} />
              <MetricItem label="Running" value={status.scrapingJobs.running} />
              <MetricItem label="Completed" value={status.scrapingJobs.completed} />
              <MetricItem label="Failed" value={status.scrapingJobs.failed} />
            </div>
          </div>

          {/* Recent Runs */}
          <div className="bg-paper border border-ink/10">
            <div className="border-b border-ink/10 px-2 py-2">
              <h3 className="font-heading text-[13px] font-semibold text-ink">
                Recent Pipeline Runs
              </h3>
            </div>
            <PipelineRunsTable
              runs={status.recentRuns}
              loading={loading && status.recentRuns.length === 0}
              onCancel={handleCancelRun}
            />
          </div>
        </>
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        confirmLabel="Start"
        cancelLabel="Cancel"
        onConfirm={handleConfirm}
        onCancel={closeConfirm}
      />
    </div>
  );
}

// Helper component for metrics (matches MiningDashboard pattern)
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
