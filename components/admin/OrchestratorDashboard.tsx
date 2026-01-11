'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Server,
  RefreshCw,
  AlertTriangle,
  History,
  Play,
  RotateCcw,
  StopCircle,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
} from 'lucide-react';

// Types
interface Worker {
  id: string;
  worker_name: string;
  vultr_instance_id: string | null;
  ip_address: string | null;
  status: 'provisioning' | 'active' | 'rotating' | 'offline' | 'terminated';
  last_heartbeat_at: string | null;
  started_at: string | null;
  current_city_slug: string | null;
  current_artist_handle: string | null;
  artists_processed: number;
  images_processed: number;
  consecutive_401s: number;
  total_401s_lifetime: number;
  last_error: string | null;
  uptime_seconds: number | null;
}

interface RateLimitEvent {
  id: string;
  workerId: string;
  workerName: string;
  ipAddress: string;
  errorCode: string;
  errorMessage: string;
  artistHandle: string;
  createdAt: string;
}

interface HistoryEvent {
  id: string;
  action: string;
  workerId: string | null;
  workerName: string | null;
  oldInstanceId: string | null;
  newInstanceId: string | null;
  oldIp: string | null;
  newIp: string | null;
  reason: string | null;
  details: Record<string, unknown> | null;
  createdAt: string;
}

interface FleetStatus {
  workers: Worker[];
  summary: {
    totalWorkers: number;
    activeWorkers: number;
    rotatingWorkers: number;
    offlineWorkers: number;
  };
  queue: {
    cities_pending: number;
    cities_in_progress: number;
    cities_completed: number;
    artists_pending: number;
    artists_in_progress: number;
    artists_completed: number;
    artists_failed: number;
    total_images_scraped: number;
  };
}

type TabType = 'fleet' | 'rate-limits' | 'history';

export default function OrchestratorDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('fleet');
  const [status, setStatus] = useState<FleetStatus | null>(null);
  const [rateLimits, setRateLimits] = useState<RateLimitEvent[]>([]);
  const [history, setHistory] = useState<HistoryEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [statusRes, rateLimitsRes, historyRes] = await Promise.all([
        fetch('/api/admin/orchestrator/status'),
        fetch('/api/admin/orchestrator/rate-limits?limit=50'),
        fetch('/api/admin/orchestrator/history?limit=50'),
      ]);

      if (!statusRes.ok) throw new Error('Failed to fetch status');

      const statusData = await statusRes.json();
      setStatus(statusData);

      if (rateLimitsRes.ok) {
        const rateLimitsData = await rateLimitsRes.json();
        setRateLimits(rateLimitsData.events || []);
      }

      if (historyRes.ok) {
        const historyData = await historyRes.json();
        setHistory(historyData.history || []);
      }

      setLastRefresh(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000); // 15 second refresh
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleAction = async (action: string, workerId?: string, workerName?: string) => {
    const actionKey = workerId || 'spawn';
    setActionInProgress(actionKey);

    try {
      const body: { action: string; workerId?: string; workerName?: string } = { action };
      if (workerId) body.workerId = workerId;
      if (workerName) body.workerName = workerName;

      const res = await fetch('/api/admin/orchestrator/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Action failed');
      }

      // Refresh data
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionInProgress(null);
    }
  };

  const formatUptime = (seconds: number | null) => {
    if (!seconds) return '-';
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${mins}m`;
  };

  const formatTime = (timestamp: string | null) => {
    if (!timestamp) return '-';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (timestamp: string | null) => {
    if (!timestamp) return '-';
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const tabs: { id: TabType; label: string; icon: React.ElementType; count?: number }[] = [
    { id: 'fleet', label: 'Worker Fleet', icon: Server, count: status?.summary.activeWorkers },
    { id: 'rate-limits', label: 'Rate Limits', icon: AlertTriangle, count: rateLimits.length },
    { id: 'history', label: 'History', icon: History, count: history.length },
  ];

  if (loading && !status) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-lg font-semibold text-ink">Orchestrator</h1>
          <p className="text-[13px] text-gray-500">
            Manage distributed scraper workers
          </p>
        </div>
        <div className="flex items-center gap-2">
          {lastRefresh && (
            <span className="text-[11px] text-gray-400">
              Updated {formatTime(lastRefresh.toISOString())}
            </span>
          )}
          <button
            onClick={fetchData}
            className="p-1.5 text-gray-500 hover:text-ink hover:bg-gray-100 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-status-error/10 border border-status-error/20 px-3 py-2 flex items-center gap-2">
          <XCircle className="w-4 h-4 text-status-error" />
          <span className="text-[13px] text-status-error">{error}</span>
        </div>
      )}

      {/* Summary Stats */}
      {status && (
        <div className="grid grid-cols-4 gap-3">
          <StatCard
            label="Active Workers"
            value={status.summary.activeWorkers}
            variant={status.summary.activeWorkers > 0 ? 'success' : 'default'}
          />
          <StatCard label="Cities Pending" value={status.queue.cities_pending} />
          <StatCard label="Artists Pending" value={status.queue.artists_pending} />
          <StatCard
            label="Total Images"
            value={status.queue.total_images_scraped.toLocaleString()}
          />
        </div>
      )}

      {/* Tabs */}
      <div className="bg-paper border border-ink/10">
        <div className="border-b border-ink/10 px-2">
          <nav className="flex gap-4">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-1.5 py-2 border-b-2 text-[13px] font-body transition-colors -mb-px
                    ${isActive ? 'border-ink text-ink' : 'border-transparent text-gray-500 hover:text-gray-700'}
                  `}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                  {tab.count !== undefined && (
                    <span className="font-mono text-[11px] text-gray-400">{tab.count}</span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-3">
          {activeTab === 'fleet' && (
            <FleetTab
              workers={status?.workers || []}
              onAction={handleAction}
              actionInProgress={actionInProgress}
              formatUptime={formatUptime}
            />
          )}
          {activeTab === 'rate-limits' && <RateLimitsTab events={rateLimits} formatDate={formatDate} />}
          {activeTab === 'history' && <HistoryTab events={history} formatDate={formatDate} />}
        </div>
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({
  label,
  value,
  variant = 'default',
}: {
  label: string;
  value: string | number;
  variant?: 'default' | 'success' | 'warning' | 'error';
}) {
  const variantStyles = {
    default: 'text-ink',
    success: 'text-status-success',
    warning: 'text-status-warning',
    error: 'text-status-error',
  };

  return (
    <div className="bg-paper border border-ink/10 p-3">
      <p className="font-mono text-[9px] text-gray-500 uppercase tracking-wider">{label}</p>
      <p className={`text-lg font-heading font-semibold tabular-nums ${variantStyles[variant]}`}>
        {value}
      </p>
    </div>
  );
}

// Fleet Tab
function FleetTab({
  workers,
  onAction,
  actionInProgress,
  formatUptime,
}: {
  workers: Worker[];
  onAction: (action: string, workerId?: string) => void;
  actionInProgress: string | null;
  formatUptime: (seconds: number | null) => string;
}) {
  return (
    <div className="space-y-3">
      {/* Spawn Button */}
      <div className="flex justify-end">
        <button
          onClick={() => onAction('spawn')}
          disabled={actionInProgress === 'spawn'}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] bg-ink text-paper hover:bg-ink/90 disabled:opacity-50 transition-colors"
        >
          {actionInProgress === 'spawn' ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Play className="w-3.5 h-3.5" />
          )}
          Spawn Worker
        </button>
      </div>

      {/* Workers Table */}
      {workers.length === 0 ? (
        <div className="text-center py-8 text-gray-500 text-[13px]">
          No workers registered. Click "Spawn Worker" to create one.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-ink/10">
                <th className="text-left py-2 px-2 font-mono text-[9px] text-gray-500 uppercase">
                  Name
                </th>
                <th className="text-left py-2 px-2 font-mono text-[9px] text-gray-500 uppercase">
                  IP
                </th>
                <th className="text-left py-2 px-2 font-mono text-[9px] text-gray-500 uppercase">
                  Status
                </th>
                <th className="text-left py-2 px-2 font-mono text-[9px] text-gray-500 uppercase">
                  401s
                </th>
                <th className="text-left py-2 px-2 font-mono text-[9px] text-gray-500 uppercase">
                  Current
                </th>
                <th className="text-left py-2 px-2 font-mono text-[9px] text-gray-500 uppercase">
                  Artists
                </th>
                <th className="text-left py-2 px-2 font-mono text-[9px] text-gray-500 uppercase">
                  Uptime
                </th>
                <th className="text-right py-2 px-2 font-mono text-[9px] text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {workers.map((worker) => (
                <tr key={worker.id} className="border-b border-ink/5 hover:bg-gray-50">
                  <td className="py-2 px-2 font-mono">{worker.worker_name}</td>
                  <td className="py-2 px-2 font-mono text-gray-500">
                    {worker.ip_address || '-'}
                  </td>
                  <td className="py-2 px-2">
                    <StatusBadge status={worker.status} />
                  </td>
                  <td className="py-2 px-2">
                    <span
                      className={`font-mono ${
                        worker.consecutive_401s >= 2
                          ? 'text-status-warning font-medium'
                          : 'text-gray-500'
                      }`}
                    >
                      {worker.consecutive_401s}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-gray-500">
                    {worker.current_artist_handle
                      ? `@${worker.current_artist_handle}`
                      : worker.current_city_slug || '-'}
                  </td>
                  <td className="py-2 px-2 font-mono tabular-nums">
                    {worker.artists_processed}
                  </td>
                  <td className="py-2 px-2 font-mono text-gray-500">
                    {formatUptime(worker.uptime_seconds)}
                  </td>
                  <td className="py-2 px-2">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => onAction('rotate', worker.id)}
                        disabled={
                          actionInProgress === worker.id ||
                          worker.status !== 'active'
                        }
                        className="p-1 text-gray-400 hover:text-ink hover:bg-gray-100 disabled:opacity-50 transition-colors"
                        title="Rotate (new IP)"
                      >
                        {actionInProgress === worker.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <RotateCcw className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <button
                        onClick={() => onAction('shutdown', worker.id)}
                        disabled={
                          actionInProgress === worker.id ||
                          worker.status !== 'active'
                        }
                        className="p-1 text-gray-400 hover:text-status-error hover:bg-gray-100 disabled:opacity-50 transition-colors"
                        title="Shutdown"
                      >
                        <StopCircle className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Status Badge
function StatusBadge({ status }: { status: Worker['status'] }) {
  const config: Record<
    Worker['status'],
    { bg: string; text: string; icon: React.ElementType }
  > = {
    active: { bg: 'bg-status-success/10', text: 'text-status-success', icon: CheckCircle },
    provisioning: { bg: 'bg-status-warning/10', text: 'text-status-warning', icon: Clock },
    rotating: { bg: 'bg-status-warning/10', text: 'text-status-warning', icon: RotateCcw },
    offline: { bg: 'bg-gray-100', text: 'text-gray-500', icon: XCircle },
    terminated: { bg: 'bg-gray-100', text: 'text-gray-400', icon: XCircle },
  };

  const { bg, text, icon: Icon } = config[status];

  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wide ${bg} ${text}`}
    >
      <Icon className="w-2.5 h-2.5" />
      {status}
    </span>
  );
}

// Rate Limits Tab
function RateLimitsTab({ events, formatDate }: { events: RateLimitEvent[]; formatDate: (timestamp: string | null) => string }) {
  if (events.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 text-[13px]">
        No rate limit events recorded.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b border-ink/10">
            <th className="text-left py-2 px-2 font-mono text-[9px] text-gray-500 uppercase">
              Time
            </th>
            <th className="text-left py-2 px-2 font-mono text-[9px] text-gray-500 uppercase">
              Worker
            </th>
            <th className="text-left py-2 px-2 font-mono text-[9px] text-gray-500 uppercase">
              IP
            </th>
            <th className="text-left py-2 px-2 font-mono text-[9px] text-gray-500 uppercase">
              Code
            </th>
            <th className="text-left py-2 px-2 font-mono text-[9px] text-gray-500 uppercase">
              Artist
            </th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr key={event.id} className="border-b border-ink/5">
              <td className="py-2 px-2 text-gray-500">{formatDate(event.createdAt)}</td>
              <td className="py-2 px-2 font-mono">{event.workerName || '-'}</td>
              <td className="py-2 px-2 font-mono text-gray-500">{event.ipAddress || '-'}</td>
              <td className="py-2 px-2">
                <span className="font-mono text-status-error">{event.errorCode}</span>
              </td>
              <td className="py-2 px-2 text-gray-500">
                {event.artistHandle ? `@${event.artistHandle}` : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// History Tab
function HistoryTab({ events, formatDate }: { events: HistoryEvent[]; formatDate: (timestamp: string | null) => string }) {
  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      worker_spawn: 'Spawn',
      worker_rotate: 'Rotate',
      worker_shutdown: 'Shutdown',
      spawn_requested: 'Spawn Requested',
      rotate_requested: 'Rotate Requested',
      shutdown_requested: 'Shutdown Requested',
      terminate_requested: 'Terminate Requested',
      spawn_failed: 'Spawn Failed',
    };
    return labels[action] || action;
  };

  if (events.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 text-[13px]">
        No orchestrator actions recorded.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b border-ink/10">
            <th className="text-left py-2 px-2 font-mono text-[9px] text-gray-500 uppercase">
              Time
            </th>
            <th className="text-left py-2 px-2 font-mono text-[9px] text-gray-500 uppercase">
              Action
            </th>
            <th className="text-left py-2 px-2 font-mono text-[9px] text-gray-500 uppercase">
              Worker
            </th>
            <th className="text-left py-2 px-2 font-mono text-[9px] text-gray-500 uppercase">
              IP
            </th>
            <th className="text-left py-2 px-2 font-mono text-[9px] text-gray-500 uppercase">
              Reason
            </th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr key={event.id} className="border-b border-ink/5">
              <td className="py-2 px-2 text-gray-500">{formatDate(event.createdAt)}</td>
              <td className="py-2 px-2 font-mono">{getActionLabel(event.action)}</td>
              <td className="py-2 px-2 font-mono">{event.workerName || '-'}</td>
              <td className="py-2 px-2 font-mono text-gray-500">
                {event.newIp || event.oldIp || '-'}
              </td>
              <td className="py-2 px-2 text-gray-500 truncate max-w-[200px]">
                {event.reason || '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
