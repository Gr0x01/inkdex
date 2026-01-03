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
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      icon: CheckCircle,
    },
    running: {
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      icon: Clock,
    },
    pending: {
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      icon: Clock,
    },
    failed: {
      bg: 'bg-red-50',
      text: 'text-red-700',
      icon: XCircle,
    },
    cancelled: {
      bg: 'bg-gray-50',
      text: 'text-gray-700',
      icon: XCircle,
    },
  };

  const { bg, text, icon: Icon } = config[status as keyof typeof config] || config.pending;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${bg} ${text}`}>
      <Icon className="w-3.5 h-3.5" />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function TypeBadge({ type }: { type: 'hashtag' | 'follower' }) {
  if (type === 'hashtag') {
    return (
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
          <Hash className="w-4 h-4 text-amber-600" />
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
        <Users className="w-4 h-4 text-blue-600" />
      </div>
    </div>
  );
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
      <div className="p-12 text-center">
        <p className="text-gray-500">Loading runs...</p>
      </div>
    );
  }

  if (runs.length === 0) {
    return (
      <div className="p-12 text-center">
        <p className="text-gray-500">No mining runs found</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Source
            </th>
            <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Scraped
            </th>
            <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Inserted
            </th>
            <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Cost
            </th>
            <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Duration
            </th>
            <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Date
            </th>
            <th className="px-6 py-4 w-10"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {runs.map((run) => (
            <Fragment key={run.id}>
              <tr
                className={`hover:bg-gray-50/50 cursor-pointer transition-colors ${
                  expandedId === run.id ? 'bg-gray-50/50' : ''
                }`}
                onClick={() => setExpandedId(expandedId === run.id ? null : run.id)}
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <TypeBadge type={run.type} />
                    <span className="text-sm font-medium text-gray-900">{run.identifier}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <StatusBadge status={run.status} />
                </td>
                <td className="px-6 py-4 text-right text-sm text-gray-600 tabular-nums">
                  {run.stats.scraped.toLocaleString()}
                </td>
                <td className="px-6 py-4 text-right text-sm text-gray-600 tabular-nums">
                  {run.stats.inserted.toLocaleString()}
                </td>
                <td className="px-6 py-4 text-right text-sm text-gray-600 tabular-nums">
                  ${(run.costs.apify + run.costs.openai).toFixed(4)}
                </td>
                <td className="px-6 py-4 text-right text-sm text-gray-500">
                  {formatDuration(run.startedAt, run.completedAt)}
                </td>
                <td className="px-6 py-4 text-right text-sm text-gray-500">
                  {formatDate(run.createdAt)}
                </td>
                <td className="px-6 py-4 text-right">
                  {run.error ? (
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  ) : expandedId === run.id ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </td>
              </tr>

              {/* Expanded details */}
              {expandedId === run.id && (
                <tr className="bg-gray-50/30">
                  <td colSpan={8} className="px-6 py-5">
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                      <DetailItem label="Bio Filter Passed" value={run.stats.bioPass} />
                      <DetailItem label="Image Filter Passed" value={run.stats.imagePass} />
                      <DetailItem label="Duplicates Skipped" value={run.stats.duplicates || 0} />
                      {run.type === 'follower' && (
                        <DetailItem label="Private Skipped" value={run.stats.private || 0} />
                      )}
                      <DetailItem label="Apify Cost" value={`$${run.costs.apify.toFixed(4)}`} />
                      <DetailItem label="OpenAI Cost" value={`$${run.costs.openai.toFixed(4)}`} />
                    </div>

                    {run.error && (
                      <div className="mt-4 p-4 bg-red-50 border border-red-100 rounded-xl">
                        <p className="text-red-700 text-sm">{run.error}</p>
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
      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-sm font-medium text-gray-900 tabular-nums">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
    </div>
  );
}
