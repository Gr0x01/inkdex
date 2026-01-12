'use client';

import { useState, Fragment } from 'react';
import {
  ChevronDown,
  ChevronUp,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  Loader2,
  Image,
  Cpu,
  Cog,
  X,
  Heart,
} from 'lucide-react';

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

interface PipelineRunsTableProps {
  runs: PipelineRun[];
  loading?: boolean;
  onCancel?: (runId: string) => void;
}

function StatusBadge({ status, isStale }: { status: string; isStale?: boolean }) {
  const config = {
    completed: {
      bg: 'bg-status-success/10',
      text: 'text-status-success',
      icon: CheckCircle,
    },
    running: {
      bg: 'bg-status-warning/10',
      text: 'text-status-warning',
      icon: Loader2,
      animate: true,
    },
    pending: {
      bg: 'bg-gray-100',
      text: 'text-gray-500',
      icon: Clock,
    },
    failed: {
      bg: 'bg-status-error/10',
      text: 'text-status-error',
      icon: XCircle,
    },
    cancelled: {
      bg: 'bg-gray-100',
      text: 'text-gray-500',
      icon: XCircle,
    },
  };

  const statusConfig = config[status as keyof typeof config] || config.pending;
  const Icon = statusConfig.icon;
  const animate = 'animate' in statusConfig && statusConfig.animate;

  return (
    <div className="flex items-center gap-1">
      <span
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wide ${statusConfig.bg} ${statusConfig.text}`}
      >
        <Icon className={`w-2.5 h-2.5 ${animate ? 'animate-spin' : ''}`} />
        {status}
      </span>
      {isStale && (
        <span
          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wide bg-status-error/10 text-status-error"
          title="No heartbeat - job may be stuck"
        >
          <AlertTriangle className="w-2.5 h-2.5" />
          Stale
        </span>
      )}
    </div>
  );
}

function JobTypeBadge({ jobType }: { jobType: string }) {
  const icons: Record<string, typeof Image> = {
    scraping: Image,
    processing: Cog,
    embeddings: Cpu,
  };
  const Icon = icons[jobType] || Cog;
  return <Icon className="w-2.5 h-2.5 text-gray-400" />;
}

function formatJobType(jobType: string): string {
  const labels: Record<string, string> = {
    scraping: 'Scraping',
    processing: 'Processing',
    embeddings: 'Embeddings',
  };
  return labels[jobType] || jobType;
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDuration(startedAt: string | null, completedAt: string | null) {
  if (!startedAt) return '—';
  const start = new Date(startedAt);
  const end = completedAt ? new Date(completedAt) : new Date();
  const durationMs = end.getTime() - start.getTime();

  const minutes = Math.floor(durationMs / 60000);
  const seconds = Math.floor((durationMs % 60000) / 1000);

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

export default function PipelineRunsTable({ runs, loading, onCancel }: PipelineRunsTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const handleCancel = async (runId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCancelling(runId);
    if (onCancel) {
      await onCancel(runId);
    }
    setCancelling(null);
  };

  if (loading) {
    return (
      <div className="px-2 py-6 text-center text-gray-500 font-body text-[13px]">
        Loading runs...
      </div>
    );
  }

  if (runs.length === 0) {
    return (
      <div className="px-2 py-6 text-center text-gray-500 font-body text-[13px]">
        No pipeline runs found
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b border-ink/10 bg-gray-50">
            <th className="px-2 py-2 text-left font-mono text-[10px] uppercase tracking-wider text-gray-500">
              Job
            </th>
            <th className="px-2 py-2 text-center font-mono text-[10px] uppercase tracking-wider text-gray-500">
              Status
            </th>
            <th className="px-2 py-2 text-right font-mono text-[10px] uppercase tracking-wider text-gray-500">
              Progress
            </th>
            <th className="px-2 py-2 text-right font-mono text-[10px] uppercase tracking-wider text-gray-500">
              Failed
            </th>
            <th className="px-2 py-2 text-right font-mono text-[10px] uppercase tracking-wider text-gray-500">
              Duration
            </th>
            <th className="px-2 py-2 text-right font-mono text-[10px] uppercase tracking-wider text-gray-500">
              Date
            </th>
            <th className="px-2 py-2 w-8"></th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => (
            <Fragment key={run.id}>
              <tr
                className={`border-b border-ink/5 hover:bg-gray-50/50 cursor-pointer transition-colors ${
                  expandedId === run.id ? 'bg-gray-50/50' : ''
                }`}
                onClick={() => setExpandedId(expandedId === run.id ? null : run.id)}
              >
                <td className="px-2 py-1.5">
                  <div className="flex items-center gap-1.5">
                    <JobTypeBadge jobType={run.jobType} />
                    <span className="text-ink font-body">{formatJobType(run.jobType)}</span>
                  </div>
                </td>
                <td className="px-2 py-1.5 text-center">
                  <StatusBadge status={run.status} isStale={run.isStale} />
                </td>
                <td className="px-2 py-1.5 text-right font-mono text-ink tabular-nums">
                  {run.processedItems > 0 || run.totalItems > 0
                    ? `${run.processedItems}/${run.totalItems}`
                    : '—'}
                </td>
                <td className={`px-2 py-1.5 text-right font-mono tabular-nums ${run.failedItems > 0 ? 'text-status-error' : 'text-gray-400'}`}>
                  {run.failedItems > 0 ? run.failedItems : '—'}
                </td>
                <td className="px-2 py-1.5 text-right font-mono text-gray-500">
                  {formatDuration(run.startedAt, run.completedAt)}
                </td>
                <td className="px-2 py-1.5 text-right font-mono text-gray-500 text-[11px]">
                  {formatDate(run.createdAt)}
                </td>
                <td className="px-2 py-1.5 text-right">
                  {run.errorMessage ? (
                    <AlertCircle className="w-3.5 h-3.5 text-status-error" />
                  ) : expandedId === run.id ? (
                    <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                  )}
                </td>
              </tr>

              {/* Expanded details */}
              {expandedId === run.id && (
                <tr className="bg-gray-50/30">
                  <td colSpan={7} className="px-2 py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-6">
                        <DetailItem label="Triggered By" value={run.triggeredBy.split('@')[0]} />
                        <DetailItem
                          label="Success"
                          value={run.processedItems - run.failedItems}
                        />
                        {run.processedItems > 0 && (
                          <DetailItem
                            label="Success Rate"
                            value={`${Math.round(((run.processedItems - run.failedItems) / run.processedItems) * 100)}%`}
                          />
                        )}
                        {/* Heartbeat indicator for running jobs */}
                        {run.status === 'running' && (
                          <div>
                            <p className="font-mono text-[9px] text-gray-500 uppercase tracking-wider flex items-center gap-1">
                              <Heart className={`w-2 h-2 ${run.isStale ? 'text-status-error' : 'text-status-success animate-pulse'}`} />
                              Heartbeat
                            </p>
                            <p className={`text-[13px] font-heading font-semibold tabular-nums ${run.isStale ? 'text-status-error' : 'text-ink'}`}>
                              {run.lastHeartbeatAt
                                ? formatDate(run.lastHeartbeatAt)
                                : 'No heartbeat yet'}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Cancel button */}
                      {(run.status === 'pending' || run.status === 'running') && (
                        <button
                          onClick={(e) => handleCancel(run.id, e)}
                          disabled={cancelling === run.id}
                          className="flex items-center gap-1.5 px-2 py-1 bg-status-error/10 text-status-error text-[11px] font-body
                                   hover:bg-status-error/20 disabled:opacity-50 transition-colors"
                        >
                          {cancelling === run.id ? (
                            <>
                              <Loader2 className="w-2.5 h-2.5 animate-spin" />
                              Cancelling...
                            </>
                          ) : (
                            <>
                              <X className="w-2.5 h-2.5" />
                              Cancel Job
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    {run.errorMessage && (
                      <div className="mt-2 p-2 bg-status-error/10 border border-status-error/20">
                        <p className="text-status-error text-[12px] font-body">{run.errorMessage}</p>
                      </div>
                    )}
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="font-mono text-[9px] text-gray-500 uppercase tracking-wider">{label}</p>
      <p className="text-[13px] font-heading font-semibold text-ink tabular-nums">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
    </div>
  );
}
