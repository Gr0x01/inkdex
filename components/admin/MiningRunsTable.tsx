'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Hash, Users, AlertCircle } from 'lucide-react';

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
  const styles = {
    completed: 'bg-green-500/10 text-green-500 border-green-500/20',
    running: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    pending: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    failed: 'bg-red-500/10 text-red-500 border-red-500/20',
    cancelled: 'bg-neutral-500/10 text-neutral-500 border-neutral-500/20',
  };

  return (
    <span
      className={`px-2 py-0.5 text-xs font-medium rounded border ${
        styles[status as keyof typeof styles] || styles.pending
      }`}
    >
      {status}
    </span>
  );
}

function TypeIcon({ type }: { type: 'hashtag' | 'follower' }) {
  return type === 'hashtag' ? (
    <Hash className="w-4 h-4 text-amber-500" />
  ) : (
    <Users className="w-4 h-4 text-blue-500" />
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
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-8 text-center">
        <p className="text-neutral-500">Loading runs...</p>
      </div>
    );
  }

  if (runs.length === 0) {
    return (
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-8 text-center">
        <p className="text-neutral-500">No mining runs found</p>
      </div>
    );
  }

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-neutral-800">
            <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-neutral-500 font-medium">
              Source
            </th>
            <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-neutral-500 font-medium">
              Status
            </th>
            <th className="px-4 py-3 text-right text-xs uppercase tracking-wider text-neutral-500 font-medium">
              Scraped
            </th>
            <th className="px-4 py-3 text-right text-xs uppercase tracking-wider text-neutral-500 font-medium">
              Inserted
            </th>
            <th className="px-4 py-3 text-right text-xs uppercase tracking-wider text-neutral-500 font-medium">
              Cost
            </th>
            <th className="px-4 py-3 text-right text-xs uppercase tracking-wider text-neutral-500 font-medium">
              Duration
            </th>
            <th className="px-4 py-3 text-right text-xs uppercase tracking-wider text-neutral-500 font-medium">
              Date
            </th>
            <th className="px-4 py-3 w-10"></th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => (
            <>
              <tr
                key={run.id}
                className={`border-b border-neutral-800/50 hover:bg-neutral-800/30 cursor-pointer transition-colors ${
                  expandedId === run.id ? 'bg-neutral-800/30' : ''
                }`}
                onClick={() => setExpandedId(expandedId === run.id ? null : run.id)}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <TypeIcon type={run.type} />
                    <span className="text-white font-medium">{run.identifier}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={run.status} />
                </td>
                <td className="px-4 py-3 text-right text-neutral-300 tabular-nums">
                  {run.stats.scraped.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right text-neutral-300 tabular-nums">
                  {run.stats.inserted.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right text-neutral-300 font-mono text-sm">
                  ${(run.costs.apify + run.costs.openai).toFixed(4)}
                </td>
                <td className="px-4 py-3 text-right text-neutral-400 text-sm">
                  {formatDuration(run.startedAt, run.completedAt)}
                </td>
                <td className="px-4 py-3 text-right text-neutral-400 text-sm">
                  {formatDate(run.createdAt)}
                </td>
                <td className="px-4 py-3 text-right">
                  {run.error ? (
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  ) : expandedId === run.id ? (
                    <ChevronUp className="w-4 h-4 text-neutral-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-neutral-500" />
                  )}
                </td>
              </tr>

              {/* Expanded details */}
              {expandedId === run.id && (
                <tr key={`${run.id}-details`} className="bg-neutral-800/20">
                  <td colSpan={8} className="px-4 py-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-neutral-500 text-xs uppercase tracking-wider mb-1">
                          Bio Filter Passed
                        </p>
                        <p className="text-white tabular-nums">
                          {run.stats.bioPass.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-neutral-500 text-xs uppercase tracking-wider mb-1">
                          Image Filter Passed
                        </p>
                        <p className="text-white tabular-nums">
                          {run.stats.imagePass.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-neutral-500 text-xs uppercase tracking-wider mb-1">
                          Duplicates Skipped
                        </p>
                        <p className="text-white tabular-nums">
                          {(run.stats.duplicates || 0).toLocaleString()}
                        </p>
                      </div>
                      {run.type === 'follower' && (
                        <div>
                          <p className="text-neutral-500 text-xs uppercase tracking-wider mb-1">
                            Private Skipped
                          </p>
                          <p className="text-white tabular-nums">
                            {(run.stats.private || 0).toLocaleString()}
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-neutral-500 text-xs uppercase tracking-wider mb-1">
                          Apify Cost
                        </p>
                        <p className="text-white font-mono">${run.costs.apify.toFixed(4)}</p>
                      </div>
                      <div>
                        <p className="text-neutral-500 text-xs uppercase tracking-wider mb-1">
                          OpenAI Cost
                        </p>
                        <p className="text-white font-mono">${run.costs.openai.toFixed(4)}</p>
                      </div>
                    </div>

                    {run.error && (
                      <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                        <p className="text-red-400 text-sm font-mono">{run.error}</p>
                      </div>
                    )}
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}
