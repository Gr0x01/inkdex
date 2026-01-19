'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Play, Image, Cpu, Database, ArrowRight, ArrowDown } from 'lucide-react';
import PipelineRunsTable from './PipelineRunsTable';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import FailedScrapingPanel from './FailedScrapingPanel';

interface PipelineStatus {
  artists: {
    total: number;
    withoutImages: number;
    blacklisted: number;
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
    message: 'This will scrape Instagram images for pending artists. This operation uses ScrapingDog credits. Continue?',
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
  const [scrapingLimit, setScrapingLimit] = useState<number>(100);

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
    let message = desc.message;
    // Add limit info for scraping jobs
    if (jobType === 'scraping' && scrapingLimit) {
      message = `This will scrape Instagram images for up to ${scrapingLimit.toLocaleString()} artists. This operation uses ScrapingDog credits. Continue?`;
    }
    setConfirmState({
      isOpen: true,
      jobType,
      title: desc.title,
      message,
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
      const payload: { jobType: JobType; scope: string; limit?: number } = { jobType, scope: 'pending' };
      // Add limit for scraping jobs
      if (jobType === 'scraping' && scrapingLimit) {
        payload.limit = scrapingLimit;
      }

      const res = await fetch('/api/admin/pipeline/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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
          {/* Pipeline Flow: SCRAPE → EMBED → READY */}
          <div className="flex flex-col lg:flex-row lg:items-stretch gap-3 lg:gap-0">
            {/* SCRAPE Card */}
            <div className="flex-1 bg-paper border border-ink/10 p-4">
              <div className="flex items-center gap-1.5 mb-2">
                <Image className="w-4 h-4 text-gray-500" />
                <h3 className="font-heading text-xs font-semibold text-ink uppercase tracking-wide">Scrape</h3>
              </div>
              <p className="text-3xl font-heading font-bold text-ink tabular-nums mb-1">
                {status.artists.withoutImages.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 font-body mb-4">artists need images</p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={scrapingLimit}
                  onChange={(e) => setScrapingLimit(Math.max(1, Math.min(10000, parseInt(e.target.value) || 100)))}
                  min={1}
                  max={10000}
                  className="w-20 px-2 py-1.5 text-xs font-mono border border-ink/20 bg-paper text-ink
                           focus:outline-none focus:border-ink/40"
                  title="Number of artists to scrape"
                />
                <button
                  onClick={() => requestTriggerJob('scraping')}
                  disabled={triggering === 'scraping' || status.artists.withoutImages === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-ink text-paper text-xs font-body
                           hover:bg-ink/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {triggering === 'scraping' ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : (
                    <Play className="w-3 h-3" />
                  )}
                  Start
                </button>
              </div>
            </div>

            {/* Arrow: SCRAPE → EMBED */}
            <div className="flex items-center justify-center px-3 py-2 lg:py-0">
              <ArrowRight className="hidden lg:block w-5 h-5 text-gray-300" />
              <ArrowDown className="block lg:hidden w-5 h-5 text-gray-300" />
            </div>

            {/* EMBED Card */}
            <div className="flex-1 bg-paper border border-ink/10 p-4">
              <div className="flex items-center gap-1.5 mb-2">
                <Cpu className="w-4 h-4 text-gray-500" />
                <h3 className="font-heading text-xs font-semibold text-ink uppercase tracking-wide">Embed</h3>
              </div>
              <p className="text-3xl font-heading font-bold text-ink tabular-nums mb-1">
                {status.images.withoutEmbeddings.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 font-body mb-4">images need embeddings</p>
              <button
                onClick={() => requestTriggerJob('embeddings')}
                disabled={triggering === 'embeddings' || status.images.withoutEmbeddings === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-ink text-paper text-xs font-body
                         hover:bg-ink/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {triggering === 'embeddings' ? (
                  <RefreshCw className="w-3 h-3 animate-spin" />
                ) : (
                  <Play className="w-3 h-3" />
                )}
                Generate
              </button>
            </div>

            {/* Arrow: EMBED → READY */}
            <div className="flex items-center justify-center px-3 py-2 lg:py-0">
              <ArrowRight className="hidden lg:block w-5 h-5 text-gray-300" />
              <ArrowDown className="block lg:hidden w-5 h-5 text-gray-300" />
            </div>

            {/* READY Card */}
            <div className="flex-1 bg-paper border border-ink/10 p-4">
              <div className="flex items-center gap-1.5 mb-2">
                <Database className="w-4 h-4 text-status-success" />
                <h3 className="font-heading text-xs font-semibold text-ink uppercase tracking-wide">Ready</h3>
              </div>
              <p className="text-3xl font-heading font-bold text-status-success tabular-nums mb-1">
                {status.images.withEmbeddings.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 font-body">
                searchable ({status.images.total > 0 ? ((status.images.withEmbeddings / status.images.total) * 100).toFixed(1) : '0'}% coverage)
              </p>
            </div>
          </div>

          {/* Secondary Stats */}
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs font-body text-gray-500">
            <span>{status.artists.withImages.toLocaleString()} have images</span>
            <span className="text-gray-300">•</span>
            <span>{status.artists.blacklisted.toLocaleString()} blacklisted</span>
            <span className="text-gray-300">•</span>
            <span>{status.artists.total.toLocaleString()} total artists</span>
          </div>

          {/* Failed Scraping Panel */}
          <FailedScrapingPanel
            failedCount={status.scrapingJobs.failed}
            onRetryAll={requestRetryJobs}
            onRetryComplete={fetchData}
            retrying={retrying}
          />

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
