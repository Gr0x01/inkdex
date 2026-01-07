'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Server, AlertTriangle, XCircle, Play, Square, RotateCcw } from 'lucide-react';

interface MinerStatus {
  timestamp: string;
  miner_running: boolean;
  pid: number | null;
  uptime_hours: number | null;
  artists_processed: number;
  current_batch: string | null;
  last_artist: string | null;
  errors_recent: number;
  rate_limited: boolean;
  last_update?: string;
}

const VULTR_STATUS_URL = '/api/admin/vultr/status';
const VULTR_CONTROL_URL = '/api/admin/vultr/control';

export default function VultrMinerStatus() {
  const [status, setStatus] = useState<MinerStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);
  const [controlling, setControlling] = useState<string | null>(null);
  const [controlMessage, setControlMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(VULTR_STATUS_URL, {
        cache: 'no-store',
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      setStatus(data);
      setLastFetch(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect');
    } finally {
      setLoading(false);
    }
  }, []);

  const sendControl = async (action: 'start' | 'stop' | 'restart') => {
    setControlling(action);
    setControlMessage(null);

    try {
      const res = await fetch(VULTR_CONTROL_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Control action failed');
      }

      setControlMessage({ type: 'success', text: data.message });
      // Refresh status after action
      setTimeout(fetchStatus, 2000);
    } catch (err) {
      setControlMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to send command',
      });
    } finally {
      setControlling(null);
    }
  };

  useEffect(() => {
    fetchStatus();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  // Clear control message after 5 seconds
  useEffect(() => {
    if (controlMessage) {
      const timer = setTimeout(() => setControlMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [controlMessage]);

  return (
    <div className="bg-paper border border-ink/10 p-3">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <Server className="w-3.5 h-3.5 text-gray-500" />
          <h3 className="font-heading text-[13px] font-semibold text-ink">
            Vultr Miner (International)
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {lastFetch && (
            <span className="text-[10px] text-gray-400 font-mono">
              {lastFetch.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={fetchStatus}
            disabled={loading}
            className="p-1 hover:bg-ink/5 transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-3 h-3 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Control message */}
      {controlMessage && (
        <div
          className={`mb-3 p-2 text-[11px] font-body ${
            controlMessage.type === 'success'
              ? 'bg-status-success/10 text-status-success'
              : 'bg-status-error/10 text-status-error'
          }`}
        >
          {controlMessage.text}
        </div>
      )}

      {error ? (
        <div className="flex items-center gap-2 text-status-error text-xs">
          <XCircle className="w-3.5 h-3.5" />
          <span>Offline or unreachable: {error}</span>
        </div>
      ) : status ? (
        <div className="space-y-3">
          {/* Status indicator + controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {status.miner_running ? (
                <>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 bg-status-success rounded-full animate-pulse" />
                    <span className="text-xs font-body text-status-success">Running</span>
                  </div>
                  {status.rate_limited && (
                    <div className="flex items-center gap-1 text-status-warning">
                      <AlertTriangle className="w-3 h-3" />
                      <span className="text-[10px]">Rate Limited</span>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-gray-400 rounded-full" />
                  <span className="text-xs font-body text-gray-500">Stopped</span>
                </div>
              )}
            </div>

            {/* Control buttons */}
            <div className="flex items-center gap-1">
              {status.miner_running ? (
                <>
                  <button
                    onClick={() => sendControl('stop')}
                    disabled={controlling !== null}
                    className="flex items-center gap-1 px-2 py-1 bg-status-error/10 text-status-error
                             text-[10px] font-body hover:bg-status-error/20 disabled:opacity-50 transition-colors"
                    title="Stop miner"
                  >
                    {controlling === 'stop' ? (
                      <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                    ) : (
                      <Square className="w-2.5 h-2.5" />
                    )}
                    Stop
                  </button>
                  <button
                    onClick={() => sendControl('restart')}
                    disabled={controlling !== null}
                    className="flex items-center gap-1 px-2 py-1 bg-ink/5 text-ink
                             text-[10px] font-body hover:bg-ink/10 disabled:opacity-50 transition-colors"
                    title="Restart miner"
                  >
                    {controlling === 'restart' ? (
                      <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                    ) : (
                      <RotateCcw className="w-2.5 h-2.5" />
                    )}
                    Restart
                  </button>
                </>
              ) : (
                <button
                  onClick={() => sendControl('start')}
                  disabled={controlling !== null}
                  className="flex items-center gap-1 px-2 py-1 bg-status-success/10 text-status-success
                           text-[10px] font-body hover:bg-status-success/20 disabled:opacity-50 transition-colors"
                  title="Start miner"
                >
                  {controlling === 'start' ? (
                    <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                  ) : (
                    <Play className="w-2.5 h-2.5" />
                  )}
                  Start
                </button>
              )}
            </div>
          </div>

          {/* Metrics grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <MetricItem
              label="Uptime"
              value={status.uptime_hours ? `${status.uptime_hours}h` : '—'}
            />
            <MetricItem
              label="Processed"
              value={status.artists_processed}
            />
            <MetricItem
              label="Current Batch"
              value={status.current_batch || '—'}
            />
            <MetricItem
              label="Recent Errors"
              value={status.errors_recent}
              variant={status.errors_recent > 10 ? 'warning' : 'default'}
            />
          </div>

          {/* Current artist */}
          {status.last_artist && (
            <div className="text-[11px] text-gray-500 font-mono">
              Last: @{status.last_artist}
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2 text-gray-500 text-xs">
          <RefreshCw className="w-3 h-3 animate-spin" />
          <span>Loading...</span>
        </div>
      )}

      {/* Server info */}
      <div className="mt-3 pt-2 border-t border-ink/5 text-[10px] text-gray-400 font-mono">
        66.42.100.208 (Los Angeles)
      </div>
    </div>
  );
}

function MetricItem({
  label,
  value,
  variant = 'default'
}: {
  label: string;
  value: string | number;
  variant?: 'default' | 'warning';
}) {
  return (
    <div>
      <p className="font-mono text-[9px] text-gray-500 uppercase tracking-wider">{label}</p>
      <p className={`text-[13px] font-heading font-semibold tabular-nums ${
        variant === 'warning' ? 'text-status-warning' : 'text-ink'
      }`}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
    </div>
  );
}
