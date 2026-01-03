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
      text: 'text-status-success',
      icon: CheckCircle,
    },
    running: {
      text: 'text-status-warning',
      icon: Clock,
    },
    pending: {
      text: 'text-gray-500',
      icon: Clock,
    },
    failed: {
      text: 'text-status-error',
      icon: XCircle,
    },
    cancelled: {
      text: 'text-gray-500',
      icon: XCircle,
    },
  };

  const { text, icon: Icon } = config[status as keyof typeof config] || config.pending;

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-mono ${text}`}>
      <Icon className="w-3 h-3" />
      {status}
    </span>
  );
}

function TypeBadge({ type }: { type: 'hashtag' | 'follower' }) {
  if (type === 'hashtag') {
    return <Hash className="w-3.5 h-3.5 text-gray-500" />;
  }
  return <Users className="w-3.5 h-3.5 text-gray-500" />;
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
      <div className="p-8 text-center">
        <p className="text-gray-500 text-sm font-body">Loading runs...</p>
      </div>
    );
  }

  if (runs.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500 text-sm font-body">No mining runs found</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b-2 border-ink/10">
            <th className="px-4 py-3 text-left font-mono text-[10px] text-gray-500 uppercase tracking-[0.15em]">
              Source
            </th>
            <th className="px-4 py-3 text-left font-mono text-[10px] text-gray-500 uppercase tracking-[0.15em]">
              Status
            </th>
            <th className="px-4 py-3 text-right font-mono text-[10px] text-gray-500 uppercase tracking-[0.15em]">
              Scraped
            </th>
            <th className="px-4 py-3 text-right font-mono text-[10px] text-gray-500 uppercase tracking-[0.15em]">
              Inserted
            </th>
            <th className="px-4 py-3 text-right font-mono text-[10px] text-gray-500 uppercase tracking-[0.15em]">
              Cost
            </th>
            <th className="px-4 py-3 text-right font-mono text-[10px] text-gray-500 uppercase tracking-[0.15em]">
              Duration
            </th>
            <th className="px-4 py-3 text-right font-mono text-[10px] text-gray-500 uppercase tracking-[0.15em]">
              Date
            </th>
            <th className="px-4 py-3 w-8"></th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => (
            <Fragment key={run.id}>
              <tr
                className={`border-b border-ink/5 hover:bg-gray-100/50 cursor-pointer transition-colors ${
                  expandedId === run.id ? 'bg-gray-100/50' : ''
                }`}
                onClick={() => setExpandedId(expandedId === run.id ? null : run.id)}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <TypeBadge type={run.type} />
                    <span className="text-sm font-body text-ink">{run.identifier}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={run.status} />
                </td>
                <td className="px-4 py-3 text-right text-sm text-gray-700 font-mono tabular-nums">
                  {run.stats.scraped.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right text-sm text-gray-700 font-mono tabular-nums">
                  {run.stats.inserted.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right text-sm text-gray-700 font-mono tabular-nums">
                  ${(run.costs.apify + run.costs.openai).toFixed(4)}
                </td>
                <td className="px-4 py-3 text-right text-sm text-gray-500 font-mono">
                  {formatDuration(run.startedAt, run.completedAt)}
                </td>
                <td className="px-4 py-3 text-right text-sm text-gray-500 font-mono">
                  {formatDate(run.createdAt)}
                </td>
                <td className="px-4 py-3 text-right">
                  {run.error ? (
                    <AlertCircle className="w-4 h-4 text-status-error" />
                  ) : expandedId === run.id ? (
                    <ChevronUp className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  )}
                </td>
              </tr>

              {/* Expanded details */}
              {expandedId === run.id && (
                <tr className="bg-gray-100/30">
                  <td colSpan={8} className="px-4 py-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
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
                      <div className="mt-3 p-3 bg-status-error/10 border border-status-error/20">
                        <p className="text-status-error text-sm font-body">{run.error}</p>
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
      <p className="font-mono text-[10px] text-gray-500 uppercase tracking-[0.15em]">{label}</p>
      <p className="text-sm font-heading font-semibold text-ink tabular-nums">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
    </div>
  );
}
