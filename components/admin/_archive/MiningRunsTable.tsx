'use client';

import { useState, Fragment } from 'react';
import { ChevronDown, ChevronUp, Hash, Users, AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react';

interface MiningRun {
  id: string;
  type: 'hashtag' | 'follower';
  identifier: string;
  status: string;
  stats: {
    scraped: number;
    bioPass: number;
    imagePass: number;
    inserted: number;
    duplicates?: number;
    private?: number;
  };
  costs: {
    apify: number;
    openai: number;
  };
  error?: string;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

interface MiningRunsTableProps {
  runs: MiningRun[];
  loading?: boolean;
}

function StatusBadge({ status }: { status: string }) {
  const config = {
    completed: {
      bg: 'bg-status-success/10',
      text: 'text-status-success',
      icon: CheckCircle,
    },
    running: {
      bg: 'bg-status-warning/10',
      text: 'text-status-warning',
      icon: Clock,
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

  const { bg, text, icon: Icon } = config[status as keyof typeof config] || config.pending;

  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wide ${bg} ${text}`}>
      <Icon className="w-2.5 h-2.5" />
      {status}
    </span>
  );
}

function TypeBadge({ type }: { type: 'hashtag' | 'follower' }) {
  if (type === 'hashtag') {
    return <Hash className="w-2.5 h-2.5 text-gray-400" />;
  }
  return <Users className="w-2.5 h-2.5 text-gray-400" />;
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

export default function MiningRunsTable({ runs, loading }: MiningRunsTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
        No mining runs found
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b border-ink/10 bg-gray-50">
            <th className="px-2 py-2 text-left font-mono text-[10px] uppercase tracking-wider text-gray-500">
              Source
            </th>
            <th className="px-2 py-2 text-center font-mono text-[10px] uppercase tracking-wider text-gray-500">
              Status
            </th>
            <th className="px-2 py-2 text-right font-mono text-[10px] uppercase tracking-wider text-gray-500">
              Scraped
            </th>
            <th className="px-2 py-2 text-right font-mono text-[10px] uppercase tracking-wider text-gray-500">
              Inserted
            </th>
            <th className="px-2 py-2 text-right font-mono text-[10px] uppercase tracking-wider text-gray-500">
              Cost
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
                    <TypeBadge type={run.type} />
                    <span className="text-ink font-body">{run.identifier}</span>
                  </div>
                </td>
                <td className="px-2 py-1.5 text-center">
                  <StatusBadge status={run.status} />
                </td>
                <td className="px-2 py-1.5 text-right font-mono text-ink tabular-nums">
                  {run.stats.scraped.toLocaleString()}
                </td>
                <td className="px-2 py-1.5 text-right font-mono text-ink tabular-nums">
                  {run.stats.inserted.toLocaleString()}
                </td>
                <td className="px-2 py-1.5 text-right font-mono text-ink tabular-nums">
                  ${(run.costs.apify + run.costs.openai).toFixed(4)}
                </td>
                <td className="px-2 py-1.5 text-right font-mono text-gray-500">
                  {formatDuration(run.startedAt, run.completedAt)}
                </td>
                <td className="px-2 py-1.5 text-right font-mono text-gray-500 text-[11px]">
                  {formatDate(run.createdAt)}
                </td>
                <td className="px-2 py-1.5 text-right">
                  {run.error ? (
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
                  <td colSpan={8} className="px-2 py-3">
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                      <DetailItem label="Bio Pass" value={run.stats.bioPass} />
                      <DetailItem label="Image Pass" value={run.stats.imagePass} />
                      <DetailItem label="Duplicates" value={run.stats.duplicates || 0} />
                      {run.type === 'follower' && (
                        <DetailItem label="Private" value={run.stats.private || 0} />
                      )}
                      <DetailItem label="Apify" value={`$${run.costs.apify.toFixed(4)}`} />
                      <DetailItem label="OpenAI" value={`$${run.costs.openai.toFixed(4)}`} />
                    </div>

                    {run.error && (
                      <div className="mt-2 p-2 bg-status-error/10 border border-status-error/20">
                        <p className="text-status-error text-[12px] font-body">{run.error}</p>
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
