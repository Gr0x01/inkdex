'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Check, Trash2, Loader2, ExternalLink, RefreshCw } from 'lucide-react';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

interface ReviewImage {
  id: string;
  artistId: string;
  confidence: number;
  thumbnailUrl: string | null;
  createdAt: string;
  artist: {
    name: string;
    handle: string;
    slug: string;
    isClaimed: boolean;
  };
}

interface Stats {
  total: number;
  remaining: number;
  kept: number;
  unverified: number;
}

export default function ImageReviewPage() {
  const [images, setImages] = useState<ReviewImage[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [confidenceRange, setConfidenceRange] = useState<[number, number]>([0, 0.5]);
  const [offset, setOffset] = useState(0);

  const LIMIT = 48;

  const fetchImages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        limit: LIMIT.toString(),
        offset: offset.toString(),
        minConfidence: confidenceRange[0].toString(),
        maxConfidence: confidenceRange[1].toString(),
      });

      const res = await fetch(`/api/admin/images/review?${params}`);
      const data = await res.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      setImages(data.images || []);
      setStats(data.stats);
      setSelectedIds(new Set());
    } catch (err) {
      setError('Failed to fetch images');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [offset, confidenceRange]);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === images.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(images.map((img) => img.id)));
    }
  };

  const handleKeep = async () => {
    if (selectedIds.size === 0) return;

    setActing(true);
    try {
      const res = await fetch('/api/admin/images/review/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'keep',
          imageIds: Array.from(selectedIds),
        }),
      });

      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setImages((prev) => prev.filter((img) => !selectedIds.has(img.id)));
        setSelectedIds(new Set());
        fetchImages();
      }
    } catch (err) {
      setError('Failed to keep images');
      console.error(err);
    } finally {
      setActing(false);
    }
  };

  const handleDelete = async () => {
    if (selectedIds.size === 0) return;

    setActing(true);
    setShowDeleteDialog(false);
    try {
      const res = await fetch('/api/admin/images/review/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          imageIds: Array.from(selectedIds),
        }),
      });

      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setImages((prev) => prev.filter((img) => !selectedIds.has(img.id)));
        setSelectedIds(new Set());
        fetchImages();
      }
    } catch (err) {
      setError('Failed to delete images');
      console.error(err);
    } finally {
      setActing(false);
    }
  };

  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key.toLowerCase()) {
        case 'k':
          e.preventDefault();
          handleKeep();
          break;
        case 'd':
          e.preventDefault();
          if (selectedIds.size > 0) {
            setShowDeleteDialog(true);
          }
          break;
        case 'a':
          e.preventDefault();
          toggleSelectAll();
          break;
        case 'r':
          e.preventDefault();
          fetchImages();
          break;
      }
    };

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [selectedIds, handleKeep, fetchImages]);

  const getConfidenceColor = (confidence: number) => {
    if (confidence < 0.25) return 'bg-red-500';
    if (confidence < 0.35) return 'bg-orange-500';
    if (confidence < 0.45) return 'bg-yellow-500';
    return 'bg-lime-500';
  };

  return (
    <div className="min-h-screen bg-paper">
      {/* Header */}
      <div className="border-b border-ink/10 bg-paper sticky top-0 z-20">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-xl font-black text-ink tracking-tight">
                IMAGE REVIEW
              </h1>
              <p className="font-mono text-[10px] text-gray-500 uppercase tracking-widest mt-0.5">
                Flagged {Math.round(confidenceRange[0] * 100)}-{Math.round(confidenceRange[1] * 100)}% confidence
              </p>
            </div>

            {/* Keyboard shortcuts */}
            <div className="hidden md:flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-gray-400">
                <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 text-[10px] font-mono">A</kbd>
                <span className="text-[10px] font-mono uppercase">Select</span>
              </div>
              <div className="flex items-center gap-1.5 text-gray-400">
                <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 text-[10px] font-mono">K</kbd>
                <span className="text-[10px] font-mono uppercase">Keep</span>
              </div>
              <div className="flex items-center gap-1.5 text-gray-400">
                <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 text-[10px] font-mono">D</kbd>
                <span className="text-[10px] font-mono uppercase">Delete</span>
              </div>
              <div className="flex items-center gap-1.5 text-gray-400">
                <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 text-[10px] font-mono">R</kbd>
                <span className="text-[10px] font-mono uppercase">Refresh</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats bar */}
        {stats && (
          <div className="px-6 py-3 border-t border-ink/5 bg-gray-100/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-amber-500"></span>
                  <span className="font-mono text-[11px] text-gray-600">
                    <span className="font-semibold text-ink">{stats.total.toLocaleString()}</span> flagged
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-emerald-500"></span>
                  <span className="font-mono text-[11px] text-gray-600">
                    <span className="font-semibold text-ink">{stats.kept.toLocaleString()}</span> verified
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-gray-400"></span>
                  <span className="font-mono text-[11px] text-gray-600">
                    <span className="font-semibold text-ink">{stats.unverified.toLocaleString()}</span> pending
                  </span>
                </div>
              </div>

              {selectedIds.size > 0 && (
                <div className="font-mono text-[11px] text-ink bg-ink/5 px-2 py-1">
                  {selectedIds.size} selected
                </div>
              )}
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="px-6 py-3 border-t border-ink/5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <select
              value={`${confidenceRange[0]}-${confidenceRange[1]}`}
              onChange={(e) => {
                const [min, max] = e.target.value.split('-').map(Number);
                setConfidenceRange([min, max]);
                setOffset(0);
              }}
              className="bg-paper border-2 border-ink/20 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wide focus:border-ink focus:outline-none transition-colors"
            >
              <option value="0-0.5">All Flagged (0-50%)</option>
              <option value="0-0.3">Low (0-30%)</option>
              <option value="0.3-0.4">Mid-Low (30-40%)</option>
              <option value="0.4-0.5">Mid-High (40-50%)</option>
            </select>

            <button
              onClick={toggleSelectAll}
              className="px-3 py-1.5 border-2 border-ink/20 font-mono text-[11px] uppercase tracking-wide hover:border-ink hover:bg-ink hover:text-paper transition-all"
            >
              {selectedIds.size === images.length && images.length > 0 ? 'Deselect' : 'Select All'}
            </button>

            <button
              onClick={fetchImages}
              disabled={loading}
              className="p-1.5 border-2 border-ink/20 hover:border-ink hover:bg-ink hover:text-paper transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleKeep}
              disabled={selectedIds.size === 0 || acting}
              className="flex items-center gap-2 px-4 py-1.5 bg-emerald-600 text-paper font-mono text-[11px] uppercase tracking-wide hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              Keep {selectedIds.size > 0 && `(${selectedIds.size})`}
            </button>
            <button
              onClick={() => setShowDeleteDialog(true)}
              disabled={selectedIds.size === 0 || acting}
              className="flex items-center gap-2 px-4 py-1.5 bg-red-600 text-paper font-mono text-[11px] uppercase tracking-wide hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete {selectedIds.size > 0 && `(${selectedIds.size})`}
            </button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mx-6 mt-4 px-4 py-3 bg-red-50 border-2 border-red-200 font-mono text-[12px] text-red-700">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      )}

      {/* Grid */}
      {!loading && images.length > 0 && (
        <div className="p-4">
          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-2">
            {images.map((image) => {
              const isSelected = selectedIds.has(image.id);
              return (
                <div
                  key={image.id}
                  onClick={() => toggleSelect(image.id)}
                  className={`
                    group relative cursor-pointer transition-all duration-150
                    ${isSelected ? 'ring-2 ring-ink ring-offset-2' : 'hover:ring-1 hover:ring-ink/30'}
                  `}
                >
                  {/* Image */}
                  <div className="aspect-square bg-gray-100 relative overflow-hidden">
                    {image.thumbnailUrl ? (
                      <Image
                        src={image.thumbnailUrl}
                        alt={`Image from ${image.artist.handle}`}
                        fill
                        className={`object-cover transition-all duration-200 ${
                          isSelected ? 'brightness-90' : 'group-hover:scale-105'
                        }`}
                        sizes="(max-width: 640px) 25vw, (max-width: 768px) 20vw, (max-width: 1024px) 16vw, 12.5vw"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300 font-mono text-[10px]">
                        NO IMG
                      </div>
                    )}

                    {/* Selection overlay */}
                    {isSelected && (
                      <div className="absolute inset-0 bg-ink/20 flex items-center justify-center">
                        <div className="w-6 h-6 bg-ink flex items-center justify-center">
                          <Check className="w-4 h-4 text-paper" />
                        </div>
                      </div>
                    )}

                    {/* Confidence bar */}
                    <div className="absolute bottom-0 left-0 right-0 h-1">
                      <div
                        className={`h-full ${getConfidenceColor(image.confidence)}`}
                        style={{ width: `${image.confidence * 100 * 2}%` }}
                      />
                    </div>

                    {/* Claimed badge */}
                    {image.artist.isClaimed && (
                      <div className="absolute top-1 left-1 px-1 py-0.5 bg-amber-500 text-[8px] font-mono font-bold text-ink uppercase">
                        Claimed
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="py-1.5 px-1 bg-paper border-t border-ink/10">
                    <div className="flex items-center justify-between gap-1">
                      <span
                        className={`font-mono text-[10px] font-bold ${
                          image.confidence < 0.3
                            ? 'text-red-600'
                            : image.confidence < 0.4
                              ? 'text-orange-600'
                              : 'text-yellow-600'
                        }`}
                      >
                        {Math.round(image.confidence * 100)}%
                      </span>
                      <Link
                        href={`/artist/${image.artist.slug}`}
                        target="_blank"
                        onClick={(e) => e.stopPropagation()}
                        className="text-gray-400 hover:text-ink transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                    <div className="font-mono text-[9px] text-gray-500 truncate">
                      @{image.artist.handle}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-center gap-4 mt-8 pb-4">
            <button
              onClick={() => setOffset(Math.max(0, offset - LIMIT))}
              disabled={offset === 0}
              className="px-4 py-2 border-2 border-ink/20 font-mono text-[11px] uppercase tracking-wide hover:border-ink hover:bg-ink hover:text-paper disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              Previous
            </button>
            <span className="font-mono text-[11px] text-gray-500">
              {offset + 1}–{Math.min(offset + LIMIT, stats?.total || 0)} of {stats?.total?.toLocaleString() || 0}
            </span>
            <button
              onClick={() => setOffset(offset + LIMIT)}
              disabled={offset + LIMIT >= (stats?.total || 0)}
              className="px-4 py-2 border-2 border-ink/20 font-mono text-[11px] uppercase tracking-wide hover:border-ink hover:bg-ink hover:text-paper disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && images.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 px-6">
          <div className="w-16 h-16 bg-gray-100 flex items-center justify-center mb-4">
            <Check className="w-8 h-8 text-gray-300" />
          </div>
          <h2 className="font-display text-lg font-black text-ink mb-2">ALL CLEAR</h2>
          <p className="font-body text-sm text-gray-500 text-center max-w-md mb-6">
            No flagged images to review. Run the cleanup script to classify images first.
          </p>
          <code className="px-4 py-2 bg-gray-100 font-mono text-[11px] text-gray-600">
            npx tsx scripts/maintenance/cleanup-non-tattoo-images.ts
          </code>
        </div>
      )}

      {/* Delete confirmation */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onCancel={() => setShowDeleteDialog(false)}
        onConfirm={handleDelete}
        title="Delete Images"
        message={`Permanently delete ${selectedIds.size} images? Images from claimed artists will be skipped.`}
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}
