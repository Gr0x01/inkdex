'use client';

/**
 * Portfolio Manager Component
 *
 * Client component for managing portfolio images:
 * - Display grid with delete on hover
 * - Count indicator (16/20)
 * - Re-import button
 * - Upgrade prompt (Free tier at 20/20)
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { getPortfolioImageUrl } from '@/lib/utils/images';
import { ProBadge } from '@/components/badges/ProBadge';
import { DndContext, DragEndEvent, closestCenter } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import SortableImageCard from './SortableImageCard';
import { Pin, Crown } from 'lucide-react';
import { MAX_PINNED_IMAGES } from '@/lib/constants/portfolio';

interface PortfolioImage {
  id: string;
  instagram_url: string;
  storage_original_path: string | null;
  storage_thumb_320: string | null;
  storage_thumb_640: string | null;
  storage_thumb_1280: string | null;
  hidden: boolean;
  is_pinned: boolean;
  pinned_position: number | null;
  import_source: string;
}

interface PortfolioManagerProps {
  artistId: string;
  artistHandle: string;
  isPro: boolean;
  initialImages: PortfolioImage[];
  visibleCount: number;
  isAtLimit: boolean;
}

export default function PortfolioManager({
  artistId,
  artistHandle,
  isPro,
  initialImages,
  visibleCount,
  isAtLimit,
}: PortfolioManagerProps) {
  const router = useRouter();
  const [images, setImages] = useState(initialImages);
  const [deleting, setDeleting] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [reorderMode, setReorderMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pinningInProgress, setPinningInProgress] = useState<Set<string>>(new Set());

  // Cleanup reorder mode on unmount to prevent state leak
  useEffect(() => {
    return () => {
      if (reorderMode) {
        setReorderMode(false);
        setImages(initialImages);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reorderMode]);

  // Filter visible images only (hidden images not shown in Free tier)
  const visibleImages = images.filter((img) => !img.hidden);
  const currentCount = visibleImages.length;

  // Separate pinned and unpinned images for pro users
  const pinnedImages = visibleImages
    .filter((img) => img.is_pinned)
    .sort((a, b) => (a.pinned_position || 0) - (b.pinned_position || 0));
  const unpinnedImages = visibleImages.filter((img) => !img.is_pinned);

  async function handleDelete(imageId: string) {
    if (!confirm('Delete this image from your portfolio?')) {
      return;
    }

    try {
      setDeleting((prev) => new Set(prev).add(imageId));
      setError(null);

      const response = await fetch('/api/dashboard/portfolio/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete image');
      }

      // Optimistic update: remove from state immediately
      setImages((prev) => prev.filter((img) => img.id !== imageId));

      // Refresh server component to update count
      router.refresh();
    } catch (err: any) {
      console.error('[Portfolio] Delete failed:', err);
      setError(err.message || 'Failed to delete image');
      setDeleting((prev) => {
        const newSet = new Set(prev);
        newSet.delete(imageId);
        return newSet;
      });
    }
  }

  function handleReimport() {
    router.push(`/dashboard/portfolio/import?pro=${isPro ? '1' : '0'}`);
  }

  function handleDragEnd(event: DragEndEvent) {
    try {
      const { active, over } = event;

      if (!over || active.id === over.id) {
        return;
      }

      // Find positions in pinned array
      const oldIndex = pinnedImages.findIndex((img) => img.id === active.id);
      const newIndex = pinnedImages.findIndex((img) => img.id === over.id);

      if (oldIndex === -1 || newIndex === -1) {
        console.error('[DnD] Invalid indices:', { oldIndex, newIndex });
        return;
      }

      // Optimistically update UI
      const reorderedPinned = arrayMove(pinnedImages, oldIndex, newIndex);

      // Update positions
      const updatedPinned = reorderedPinned.map((img, idx) => ({
        ...img,
        pinned_position: idx,
      }));

      // Merge with unpinned images
      const updatedImages = [...updatedPinned, ...unpinnedImages, ...images.filter(img => img.hidden)];
      setImages(updatedImages);
    } catch (error) {
      console.error('[DnD] Drag end failed:', error);
      setError('Failed to reorder. Please try again.');
      // Reset to last known good state
      setImages(initialImages);
    }
  }

  async function handleTogglePin(imageId: string) {
    // Prevent duplicate requests
    if (pinningInProgress.has(imageId)) return;

    const image = images.find((img) => img.id === imageId);
    if (!image) return;

    // Mark as in-progress
    setPinningInProgress((prev) => new Set(prev).add(imageId));

    try {
      if (image.is_pinned) {
        // Unpinning - optimistic update
        const updatedImages = images.map((img) =>
          img.id === imageId
            ? { ...img, is_pinned: false, pinned_position: null }
            : img
        );
        setImages(updatedImages);

        // Persist immediately
        const response = await fetch('/api/dashboard/portfolio/reorder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            updates: [{ imageId, is_pinned: false, pinned_position: null }],
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to unpin image');
        }
      } else {
        // Pinning - check limit
        if (pinnedImages.length >= MAX_PINNED_IMAGES) {
          setError(`Maximum ${MAX_PINNED_IMAGES} images can be pinned`);
          setTimeout(() => setError(null), 3000);
          return;
        }

        // Optimistic update
        const newPosition = pinnedImages.length;
        const updatedImages = images.map((img) =>
          img.id === imageId
            ? { ...img, is_pinned: true, pinned_position: newPosition }
            : img
        );
        setImages(updatedImages);

        // Persist immediately
        const response = await fetch('/api/dashboard/portfolio/reorder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            updates: [{ imageId, is_pinned: true, pinned_position: newPosition }],
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to pin image');
        }
      }

      // Refresh to get server state
      router.refresh();
    } catch (err: any) {
      console.error('[Portfolio] Toggle pin failed:', err);
      setError(err.message || 'Failed to update pin status');
      // Rollback optimistic update
      setImages(initialImages);
    } finally {
      // Remove from in-progress set
      setPinningInProgress((prev) => {
        const next = new Set(prev);
        next.delete(imageId);
        return next;
      });
    }
  }

  async function handleSaveReorder() {
    try {
      setSaving(true);
      setError(null);

      // Prepare updates for all pinned images
      const updates = pinnedImages.map((img) => ({
        imageId: img.id,
        is_pinned: img.is_pinned,
        pinned_position: img.pinned_position,
      }));

      const response = await fetch('/api/dashboard/portfolio/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save changes');
      }

      // Exit reorder mode and refresh
      setReorderMode(false);
      router.refresh();
    } catch (err: any) {
      console.error('[Portfolio] Save reorder failed:', err);
      setError(err.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  }

  function handleCancelReorder() {
    // Reset to initial state
    setImages(initialImages);
    setReorderMode(false);
    setError(null);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-900 to-black text-white">
      <div className="mx-auto max-w-7xl px-6 py-16">
        {/* Header */}
        <div className="mb-12 flex items-start justify-between">
          <div>
            <div className="mb-3 flex items-center gap-3">
              <h1 className="text-3xl font-bold">Portfolio Management</h1>
              {isPro && <ProBadge variant="inline" size="md" />}
            </div>
            <p className="text-neutral-400">@{artistHandle}</p>
          </div>
          <a
            href="/dashboard"
            className="rounded-lg border border-neutral-700 px-4 py-2 text-sm transition-colors hover:border-neutral-500"
          >
            Back to Dashboard
          </a>
        </div>

        {/* Count indicator + Actions */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {isPro ? (
              <p className="text-lg">
                <span className="font-semibold">{currentCount}</span>{' '}
                <span className="text-neutral-400">images</span>
              </p>
            ) : (
              <p className="text-lg">
                <span className="font-semibold">{currentCount}/20</span>{' '}
                <span className="text-neutral-400">images</span>
              </p>
            )}
            {!isPro && isAtLimit && (
              <span className="rounded-full bg-amber-500/10 px-3 py-1 text-sm text-amber-400">
                At Free tier limit
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {isPro && currentCount > 0 && !reorderMode && (
              <button
                onClick={() => setReorderMode(true)}
                className="rounded-lg border border-amber-600 bg-amber-500/10 px-6 py-3 text-sm font-semibold text-amber-400 transition-colors hover:bg-amber-500/20"
              >
                <Pin className="mr-2 inline h-4 w-4" />
                Reorder Portfolio
              </button>
            )}
            {reorderMode && (
              <>
                <button
                  onClick={handleCancelReorder}
                  disabled={saving}
                  className="rounded-lg border border-neutral-700 px-6 py-3 text-sm font-semibold text-neutral-400 transition-colors hover:border-neutral-500 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveReorder}
                  disabled={saving}
                  className="rounded-lg bg-amber-500 px-6 py-3 text-sm font-semibold text-black transition-colors hover:bg-amber-400 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </>
            )}
            {!reorderMode && (isPro || currentCount < 20) && (
              <button
                onClick={handleReimport}
                className="rounded-lg bg-white px-6 py-3 text-sm font-semibold text-black transition-colors hover:bg-neutral-200"
              >
                Re-import from Instagram
              </button>
            )}
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-900/20 bg-red-950/10 p-4">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Upgrade CTA (Free tier at 20/20) */}
        {!isPro && isAtLimit && (
          <div className="mb-8 rounded-lg border border-amber-900/20 bg-amber-950/10 p-6">
            <h3 className="mb-2 text-lg font-semibold text-amber-400">
              Upgrade to Pro for Unlimited Portfolio
            </h3>
            <p className="mb-4 text-sm text-neutral-300">
              Free tier is limited to 20 images. Upgrade to Pro ($15/month) for unlimited
              portfolio images, auto-sync, and pinning features.
            </p>
            <button className="rounded-lg bg-amber-500 px-6 py-2 text-sm font-semibold text-black transition-colors hover:bg-amber-400">
              Upgrade to Pro
            </button>
          </div>
        )}

        {/* Pro Benefits Callout */}
        {isPro && (
          <div className="mb-6 rounded-lg border border-amber-600/20 bg-amber-500/5 p-4">
            <div className="mb-2 flex items-center gap-2">
              <Crown className="h-4 w-4 text-amber-500" />
              <h3 className="text-sm font-semibold text-amber-400">Pro Features Active</h3>
            </div>
            <ul className="space-y-1 text-sm text-neutral-300">
              <li>✓ Unlimited portfolio images</li>
              <li>✓ Pin your best work (up to {MAX_PINNED_IMAGES})</li>
              <li>✓ Crown badge on profile</li>
              <li>✓ Drag-drop portfolio reordering</li>
            </ul>
          </div>
        )}

        {/* Portfolio grid */}
        {visibleImages.length === 0 ? (
          <div className="flex flex-col items-center justify-center space-y-6 py-12">
            <div className="text-center">
              <p className="mb-2 text-lg text-neutral-300">No portfolio images yet</p>
              <p className="text-sm text-neutral-500">
                Import images from your Instagram to get started
              </p>
            </div>
            <button
              onClick={handleReimport}
              className="rounded-lg bg-white px-6 py-3 text-sm font-semibold text-black transition-colors hover:bg-neutral-200"
            >
              Import from Instagram
            </button>
          </div>
        ) : (
          <>
            {/* Pinned Images Section (Pro + Reorder Mode) */}
            {isPro && pinnedImages.length > 0 && (
              <div className="mb-8">
                <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-amber-400">
                  <Pin className="h-5 w-5" />
                  Pinned Images ({pinnedImages.length}/{MAX_PINNED_IMAGES})
                </h2>
                <DndContext
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={pinnedImages.map((img) => img.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                      {pinnedImages.map((image) => (
                        <SortableImageCard
                          key={image.id}
                          image={image}
                          reorderMode={reorderMode}
                          onDelete={handleDelete}
                          onUnpin={handleTogglePin}
                          deleting={deleting.has(image.id)}
                          pinning={pinningInProgress.has(image.id)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
            )}

            {/* Unpinned Images Section */}
            {unpinnedImages.length > 0 && (
              <>
                {isPro && pinnedImages.length > 0 && (
                  <h2 className="mb-4 text-lg font-semibold text-neutral-400">
                    Other Images
                  </h2>
                )}
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                  {unpinnedImages.map((image) => {
                    const isDeleting = deleting.has(image.id);
                    const isPinning = pinningInProgress.has(image.id);
                    const thumbnailUrl = getPortfolioImageUrl(image);
                    const canPin = isPro && pinnedImages.length < MAX_PINNED_IMAGES;

                    return (
                      <div
                        key={image.id}
                        className={`group relative aspect-square overflow-hidden rounded-lg bg-neutral-800 ${
                          isDeleting ? 'opacity-50' : ''
                        }`}
                      >
                        {/* Image */}
                        <Image
                          src={thumbnailUrl}
                          alt="Portfolio image"
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        />

                        {/* Pin Button (Pro + Reorder Mode) */}
                        {reorderMode && canPin && !isDeleting && (
                          <button
                            onClick={() => handleTogglePin(image.id)}
                            disabled={isPinning}
                            className="absolute left-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-amber-500 opacity-0 transition-opacity hover:bg-amber-400 group-hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
                            aria-label="Pin image"
                          >
                            {isPinning ? (
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
                            ) : (
                              <Pin className="h-4 w-4 text-black" aria-hidden="true" />
                            )}
                          </button>
                        )}

                        {/* Delete button (hover) */}
                        {!reorderMode && !isDeleting && (
                          <button
                            onClick={() => handleDelete(image.id)}
                            className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-red-600 opacity-0 transition-opacity hover:bg-red-500 group-hover:opacity-100"
                            title="Delete image"
                          >
                            <svg
                              className="h-5 w-5 text-white"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        )}

                        {/* Deleting spinner */}
                        {isDeleting && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-700 border-t-white" />
                          </div>
                        )}

                        {/* Import source indicator */}
                        <div className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-1 text-xs text-neutral-300 opacity-0 transition-opacity group-hover:opacity-100">
                          {image.import_source === 'oauth_onboarding' && 'Onboarding'}
                          {image.import_source === 'manual_import' && 'Manual'}
                          {image.import_source === 'scrape' && 'Scraped'}
                          {image.import_source === 'oauth_sync' && 'Auto-sync'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}

        {/* Footer help text */}
        {visibleImages.length > 0 && (
          <div className="mt-8 text-center text-sm text-neutral-500">
            Hover over images to delete. Re-import to replace your entire portfolio.
          </div>
        )}
      </div>
    </div>
  );
}
