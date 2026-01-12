'use client';

import { useState, useEffect, useCallback } from 'react';
import { AlertCircle, RotateCcw, Ban, ExternalLink, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import InputDialog from '@/components/ui/InputDialog';

interface FailedArtist {
  id: string;
  artistId: string;
  name: string;
  handle: string;
  errorMessage: string;
  failedAt: string;
  lastScrapedAt: string | null;
}

interface FailedScrapingPanelProps {
  failedCount: number;
  onRetryAll: () => void;
  onRetryComplete: () => void;
  retrying: boolean;
}

export default function FailedScrapingPanel({
  failedCount,
  onRetryAll,
  onRetryComplete,
  retrying,
}: FailedScrapingPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [artists, setArtists] = useState<FailedArtist[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [blacklistDialog, setBlacklistDialog] = useState<{
    isOpen: boolean;
    artistId?: string; // Single artist ID, or undefined for bulk
    isBulk: boolean;
  }>({ isOpen: false, isBulk: false });

  const fetchFailedArtists = useCallback(async () => {
    if (!expanded) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/pipeline/retry?target=scraping&limit=100');
      if (!res.ok) throw new Error('Failed to fetch failed artists');

      const data = await res.json();
      setArtists(data.artists || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [expanded]);

  useEffect(() => {
    if (expanded) {
      fetchFailedArtists();
    }
  }, [expanded, fetchFailedArtists]);

  // Refresh when retry completes
  useEffect(() => {
    if (!retrying && expanded) {
      fetchFailedArtists();
    }
  }, [retrying, expanded, fetchFailedArtists]);

  const handleRetrySelected = async () => {
    if (selectedIds.size === 0) return;

    setActionLoading('retry');
    try {
      const res = await fetch('/api/admin/pipeline/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: 'scraping',
          artistIds: Array.from(selectedIds),
        }),
      });

      if (!res.ok) throw new Error('Failed to retry selected artists');

      setSelectedIds(new Set());
      fetchFailedArtists();
      onRetryComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to retry');
    } finally {
      setActionLoading(null);
    }
  };

  const handleBlacklistSelected = () => {
    if (selectedIds.size === 0) return;
    setBlacklistDialog({ isOpen: true, isBulk: true });
  };

  const executeBlacklistBulk = async (reason: string) => {
    setBlacklistDialog({ isOpen: false, isBulk: false });
    setActionLoading('blacklist');
    try {
      const res = await fetch('/api/admin/artists/bulk-blacklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          artistIds: Array.from(selectedIds),
          reason,
        }),
      });

      if (!res.ok) throw new Error('Failed to blacklist selected artists');

      setSelectedIds(new Set());
      fetchFailedArtists();
      onRetryComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to blacklist');
    } finally {
      setActionLoading(null);
    }
  };

  const handleBlacklist = (artistId: string) => {
    setBlacklistDialog({ isOpen: true, artistId, isBulk: false });
  };

  const executeBlacklistSingle = async (reason: string) => {
    const artistId = blacklistDialog.artistId;
    setBlacklistDialog({ isOpen: false, isBulk: false });
    if (!artistId) return;

    setActionLoading(artistId);
    try {
      const res = await fetch(`/api/admin/artists/${artistId}/blacklist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blacklist: true, reason }),
      });

      if (!res.ok) throw new Error('Failed to blacklist artist');

      fetchFailedArtists();
      onRetryComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to blacklist');
    } finally {
      setActionLoading(null);
    }
  };

  const handleBlacklistConfirm = (reason: string) => {
    if (blacklistDialog.isBulk) {
      executeBlacklistBulk(reason);
    } else {
      executeBlacklistSingle(reason);
    }
  };

  const handleRetryOne = async (artistId: string) => {
    setActionLoading(artistId);
    try {
      const res = await fetch('/api/admin/pipeline/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: 'scraping',
          artistIds: [artistId],
        }),
      });

      if (!res.ok) throw new Error('Failed to retry artist');

      fetchFailedArtists();
      onRetryComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to retry');
    } finally {
      setActionLoading(null);
    }
  };

  const toggleSelect = (artistId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(artistId)) {
        next.delete(artistId);
      } else {
        next.add(artistId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === artists.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(artists.map((a) => a.artistId)));
    }
  };

  if (failedCount === 0) return null;

  return (
    <div className="bg-paper border border-status-error/30">
      {/* Header - always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-status-error/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-status-error" />
          <h3 className="font-heading text-[13px] font-semibold text-ink">
            Failed Scraping ({failedCount})
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {!expanded && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRetryAll();
              }}
              disabled={retrying}
              className="flex items-center gap-1 px-2 py-1 bg-status-error/10 text-status-error text-[11px] font-body
                       hover:bg-status-error/20 disabled:opacity-50 transition-colors"
            >
              {retrying ? (
                <RefreshCw className="w-2.5 h-2.5 animate-spin" />
              ) : (
                <RotateCcw className="w-2.5 h-2.5" />
              )}
              Retry All
            </button>
          )}
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-status-error/20">
          {/* Actions bar */}
          <div className="flex items-center justify-between px-3 py-2 bg-gray-50/50 border-b border-ink/5">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selectedIds.size === artists.length && artists.length > 0}
                onChange={toggleSelectAll}
                className="w-3.5 h-3.5"
              />
              <span className="text-[11px] text-gray-500 font-body">
                {selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Select all'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {selectedIds.size > 0 && (
                <>
                  <button
                    onClick={handleRetrySelected}
                    disabled={actionLoading !== null}
                    className="flex items-center gap-1 px-2 py-1 bg-ink text-paper text-[11px] font-body
                             hover:bg-ink/80 disabled:opacity-50 transition-colors"
                  >
                    <RotateCcw className="w-2.5 h-2.5" />
                    Retry Selected
                  </button>
                  <button
                    onClick={handleBlacklistSelected}
                    disabled={actionLoading !== null}
                    className="flex items-center gap-1 px-2 py-1 bg-status-error/10 text-status-error text-[11px] font-body
                             hover:bg-status-error/20 disabled:opacity-50 transition-colors"
                  >
                    <Ban className="w-2.5 h-2.5" />
                    Blacklist Selected
                  </button>
                </>
              )}
              <button
                onClick={onRetryAll}
                disabled={retrying || actionLoading !== null}
                className="flex items-center gap-1 px-2 py-1 bg-status-error/10 text-status-error text-[11px] font-body
                         hover:bg-status-error/20 disabled:opacity-50 transition-colors"
              >
                {retrying ? (
                  <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                ) : (
                  <RotateCcw className="w-2.5 h-2.5" />
                )}
                Retry All
              </button>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="px-3 py-2 bg-status-error/10 text-status-error text-[11px] font-body">
              {error}
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-4 h-4 animate-spin text-gray-400" />
            </div>
          )}

          {/* Artists list */}
          {!loading && artists.length > 0 && (
            <div className="divide-y divide-ink/5 max-h-[400px] overflow-y-auto">
              {artists.map((artist) => (
                <div
                  key={artist.artistId}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50/50"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(artist.artistId)}
                    onChange={() => toggleSelect(artist.artistId)}
                    className="w-3.5 h-3.5"
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-body text-[13px] text-ink truncate">
                        {artist.name || artist.handle}
                      </span>
                      <span className="text-[11px] text-gray-400 font-mono">
                        @{artist.handle}
                      </span>
                    </div>
                    <p className="text-[11px] text-status-error font-body truncate">
                      {artist.errorMessage}
                    </p>
                    <p className="text-[10px] text-gray-400 font-mono">
                      Failed: {new Date(artist.failedAt).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleRetryOne(artist.artistId)}
                      disabled={actionLoading !== null}
                      title="Retry this artist"
                      className="p-1.5 text-gray-500 hover:text-ink hover:bg-gray-100 transition-colors disabled:opacity-50"
                    >
                      {actionLoading === artist.artistId ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <RotateCcw className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      onClick={() => handleBlacklist(artist.artistId)}
                      disabled={actionLoading !== null}
                      title="Blacklist (never scrape again)"
                      className="p-1.5 text-gray-500 hover:text-status-error hover:bg-status-error/10 transition-colors disabled:opacity-50"
                    >
                      <Ban className="w-3.5 h-3.5" />
                    </button>
                    <Link
                      href={`/admin/artists/${artist.id}`}
                      title="View artist details"
                      className="p-1.5 text-gray-500 hover:text-ink hover:bg-gray-100 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!loading && artists.length === 0 && (
            <div className="py-8 text-center text-[11px] text-gray-500 font-body">
              No failed artists to display
            </div>
          )}
        </div>
      )}

      {/* Blacklist Dialog */}
      <InputDialog
        isOpen={blacklistDialog.isOpen}
        title={blacklistDialog.isBulk ? `Blacklist ${selectedIds.size} Artist(s)` : 'Blacklist Artist'}
        message={
          blacklistDialog.isBulk
            ? 'These artists will be permanently excluded from scraping. Their existing images will be deleted.'
            : 'This artist will be permanently excluded from scraping. Their existing images will be deleted.'
        }
        inputLabel="Reason"
        inputPlaceholder="e.g., Account deleted, Private account"
        confirmLabel="Blacklist"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleBlacklistConfirm}
        onCancel={() => setBlacklistDialog({ isOpen: false, isBulk: false })}
      />
    </div>
  );
}
