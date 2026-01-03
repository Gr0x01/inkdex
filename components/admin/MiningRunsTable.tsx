'use client';

import { useState, Fragment } from 'react';
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
    completed: 'text-emerald-500 bg-emerald-500/10',
    running: 'text-amber-500 bg-amber-500/10',
    pending: 'text-blue-500 bg-blue-500/10',
    failed: 'text-red-500 bg-red-500/10',
    cancelled: 'text-neutral-500 bg-neutral-500/10',
  };

  return (
    <span
      className={`px-1.5 py-0.5 text-[10px] font-mono uppercase rounded ${
        styles[status as keyof typeof styles] || styles.pending
      }`}
    >
      {status}
    </span>
  );
}

function TypeIcon({ type }: { type: 'hashtag' | 'follower' }) {
  return type === 'hashtag' ? (
    <Hash className="w-3.5 h-3.5 text-amber-500/70" />
  ) : (
    <Users className="w-3.5 h-3.5 text-blue-500/70" />
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
      <div className="bg-neutral-900/30 border border-neutral-800/50 rounded-lg p-6 text-center">
        <p className="text-neutral-600 text-xs font-mono">Loading runs...</p>
      </div>
    );
  }

  if (runs.length === 0) {
    return (
      <div className="bg-neutral-900/30 border border-neutral-800/50 rounded-lg p-6 text-center">
        <p className="text-neutral-600 text-xs font-mono">No mining runs found</p>
      </div>
    );
  }

  return (
    <div className="bg-neutral-900/30 border border-neutral-800/50 rounded-lg overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-neutral-800/50">
            <th className="px-3 py-2 text-left text-[10px] uppercase tracking-wider text-neutral-600 font-mono font-normal">
              Source
            </th>
            <th className="px-3 py-2 text-left text-[10px] uppercase tracking-wider text-neutral-600 font-mono font-normal">
              Status
            </th>
            <th className="px-3 py-2 text-right text-[10px] uppercase tracking-wider text-neutral-600 font-mono font-normal">
              Scraped
            </th>
            <th className="px-3 py-2 text-right text-[10px] uppercase tracking-wider text-neutral-600 font-mono font-normal">
              Added
            </th>
            <th className="px-3 py-2 text-right text-[10px] uppercase tracking-wider text-neutral-600 font-mono font-normal">
              Cost
            </th>
            <th className="px-3 py-2 text-right text-[10px] uppercase tracking-wider text-neutral-600 font-mono font-normal">
              Time
            </th>
            <th className="px-3 py-2 text-right text-[10px] uppercase tracking-wider text-neutral-600 font-mono font-normal">
              Date
            </th>
            <th className="px-3 py-2 w-8"></th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => (
            <Fragment key={run.id}>
              <tr
                className={`border-b border-neutral-800/30 hover:bg-neutral-800/20 cursor-pointer transition-colors ${
                  expandedId === run.id ? 'bg-neutral-800/20' : ''
                }`}
                onClick={() => setExpandedId(expandedId === run.id ? null : run.id)}
              >
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1.5">
                    <TypeIcon type={run.type} />
                    <span className="text-xs text-neutral-300">{run.identifier}</span>
                  </div>
                </td>
                <td className="px-3 py-2">
                  <StatusBadge status={run.status} />
                </td>
                <td className="px-3 py-2 text-right text-xs text-neutral-400 tabular-nums font-mono">
                  {run.stats.scraped.toLocaleString()}
                </td>
                <td className="px-3 py-2 text-right text-xs text-neutral-400 tabular-nums font-mono">
                  {run.stats.inserted.toLocaleString()}
                </td>
                <td className="px-3 py-2 text-right text-xs text-neutral-400 font-mono">
                  ${(run.costs.apify + run.costs.openai).toFixed(4)}
                </td>
                <td className="px-3 py-2 text-right text-xs text-neutral-500 font-mono">
                  {formatDuration(run.startedAt, run.completedAt)}
                </td>
                <td className="px-3 py-2 text-right text-xs text-neutral-500">
                  {formatDate(run.createdAt)}
                </td>
                <td className="px-3 py-2 text-right">
                  {run.error ? (
                    <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                  ) : expandedId === run.id ? (
                    <ChevronUp className="w-3.5 h-3.5 text-neutral-600" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-neutral-600" />
                  )}
                </td>
              </tr>

              {/* Expanded details */}
              {expandedId === run.id && (
                <tr className="bg-neutral-800/10">
                  <td colSpan={8} className="px-3 py-3">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <DetailItem label="Bio Pass" value={run.stats.bioPass} />
                      <DetailItem label="Image Pass" value={run.stats.imagePass} />
                      <DetailItem label="Duplicates" value={run.stats.duplicates || 0} />
                      {run.type === 'follower' && (
                        <DetailItem label="Private" value={run.stats.private || 0} />
                      )}
                      <DetailItem label="Apify" value={`$${run.costs.apify.toFixed(4)}`} mono />
                      <DetailItem label="OpenAI" value={`$${run.costs.openai.toFixed(4)}`} mono />
                    </div>

                    {run.error && (
                      <div className="mt-3 p-2 bg-red-500/10 border border-red-500/20 rounded">
                        <p className="text-red-400 text-[10px] font-mono">{run.error}</p>
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

function DetailItem({
  label,
  value,
  mono = false
}: {
  label: string;
  value: string | number;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-[9px] text-neutral-600 uppercase tracking-wider font-mono mb-0.5">
        {label}
      </p>
      <p className={`text-xs text-neutral-300 tabular-nums ${mono ? 'font-mono' : ''}`}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
    </div>
  );
}
