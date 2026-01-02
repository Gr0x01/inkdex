'use client';

/**
 * Portfolio Manager Component - Dashboard Design
 *
 * Clean, functional workspace for portfolio management
 * Utilitarian design with clear hierarchy and task focus
 *
 * Features:
 * - Sticky toolbar that condenses on scroll
 * - Image count tracker always visible
 * - Smooth transitions between expanded/condensed states
 */

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { getPortfolioImageUrl } from '@/lib/utils/images';
import { DndContext, DragEndEvent, closestCenter } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import SortableImageCard from './SortableImageCard';
import DashboardToolbar from './DashboardToolbar';
import { Pin, Crown, Upload, AlertCircle } from 'lucide-react';
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
  const [isScrolled, setIsScrolled] = useState(false);

  // Ref for the sentinel element that triggers sticky mode
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for scroll-based sticky toolbar
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // When sentinel leaves viewport (scrolled past), enable condensed mode
        setIsScrolled(!entry.isIntersecting);
      },
      { threshold: 0, rootMargin: '-1px 0px 0px 0px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

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
    if (!confirm('Remove this image from your portfolio?')) {
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

      setImages((prev) => prev.filter((img) => img.id !== imageId));
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

      const oldIndex = pinnedImages.findIndex((img) => img.id === active.id);
      const newIndex = pinnedImages.findIndex((img) => img.id === over.id);

      if (oldIndex === -1 || newIndex === -1) {
        console.error('[DnD] Invalid indices:', { oldIndex, newIndex });
        return;
      }

      const reorderedPinned = arrayMove(pinnedImages, oldIndex, newIndex);
      const updatedPinned = reorderedPinned.map((img, idx) => ({
        ...img,
        pinned_position: idx,
      }));

      const updatedImages = [...updatedPinned, ...unpinnedImages, ...images.filter(img => img.hidden)];
      setImages(updatedImages);
    } catch (error) {
      console.error('[DnD] Drag end failed:', error);
      setError('Failed to reorder. Please try again.');
      setImages(initialImages);
    }
  }

  async function handleTogglePin(imageId: string) {
    if (pinningInProgress.has(imageId)) return;

    const image = images.find((img) => img.id === imageId);
    if (!image) return;

    setPinningInProgress((prev) => new Set(prev).add(imageId));

    try {
      if (image.is_pinned) {
        const updatedImages = images.map((img) =>
          img.id === imageId
            ? { ...img, is_pinned: false, pinned_position: null }
            : img
        );
        setImages(updatedImages);

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
        if (pinnedImages.length >= MAX_PINNED_IMAGES) {
          setError(`Maximum ${MAX_PINNED_IMAGES} images can be pinned`);
          setTimeout(() => setError(null), 3000);
          return;
        }

        const newPosition = pinnedImages.length;
        const updatedImages = images.map((img) =>
          img.id === imageId
            ? { ...img, is_pinned: true, pinned_position: newPosition }
            : img
        );
        setImages(updatedImages);

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

      router.refresh();
    } catch (err: any) {
      console.error('[Portfolio] Toggle pin failed:', err);
      setError(err.message || 'Failed to update pin status');
      setImages(initialImages);
    } finally {
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
    setImages(initialImages);
    setReorderMode(false);
    setError(null);
  }

  // Unused props kept for interface compatibility
  void artistId;
  void visibleCount;

  return (
    <div className="min-h-screen bg-paper">
      {/* Subtle grain texture */}
      <div className="grain-overlay fixed inset-0 pointer-events-none opacity-10" />

      {/* Sticky Toolbar */}
      <DashboardToolbar
        handle={artistHandle}
        isPro={isPro}
        isScrolled={isScrolled}
      >
        {/* Image Counter - hidden on mobile */}
        <span className="hidden sm:inline font-mono text-xs text-gray-500">
          {currentCount} {isPro ? 'images' : '/ 20'}
        </span>

        {reorderMode ? (
          <>
            <button
              onClick={handleCancelReorder}
              disabled={saving}
              className="px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-gray-600 hover:text-ink transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveReorder}
              disabled={saving}
              className="px-3 py-1.5 bg-ink text-paper rounded font-mono text-[10px] uppercase tracking-wider hover:bg-gray-900 transition-colors"
            >
              {saving ? '...' : 'Save'}
            </button>
          </>
        ) : (
          <>
            {isPro && currentCount > 0 && (
              <button
                onClick={() => setReorderMode(true)}
                className="p-2 border border-amber-400 rounded text-amber-600 hover:bg-amber-50 transition-colors"
                title="Reorder Portfolio"
              >
                <Pin className="w-3.5 h-3.5" />
              </button>
            )}
            {(isPro || currentCount < 20) && (
              <button
                onClick={handleReimport}
                className="p-2 bg-ink text-paper rounded hover:bg-gray-900 transition-colors"
                title="Re-import from Instagram"
              >
                <Upload className="w-3.5 h-3.5" />
              </button>
            )}
          </>
        )}
      </DashboardToolbar>

      <div className="container mx-auto px-2 sm:px-6 pt-4 pb-8 max-w-7xl relative z-10">
        {/* Sentinel for intersection observer - triggers sticky toolbar */}
        <div ref={sentinelRef} className="absolute top-0 h-px w-full" />

        {/* Error Alert */}
        {error && (
          <div className="mb-6 flex items-start gap-3 border-l-4 border-error bg-error/5 p-4 rounded">
            <AlertCircle className="w-5 h-5 text-error flex-shrink-0 mt-0.5" />
            <p className="font-body text-sm text-error">{error}</p>
          </div>
        )}

        {/* Upgrade Banner - Free Tier at Limit */}
        {!isPro && isAtLimit && (
          <div className="mb-8 bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg border-2 border-amber-400 p-6 text-center">
            <Crown className="w-10 h-10 text-amber-600 mx-auto mb-3" />
            <h3 className="font-heading text-xl mb-2 text-ink">Portfolio Limit Reached</h3>
            <p className="font-body text-sm text-gray-700 mb-4 max-w-md mx-auto">
              You've hit the 20-image free tier limit. Upgrade to Pro for unlimited images and premium features.
            </p>
            <button className="btn btn-primary">
              Upgrade to Pro — $15/month
            </button>
          </div>
        )}

        {/* Empty State */}
        {visibleImages.length === 0 ? (
          <div className="py-20 text-center border-2 border-dashed border-gray-300 rounded-lg bg-gray-50/30">
            <div className="max-w-sm mx-auto">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                <Upload className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="font-heading text-xl mb-2 text-ink">No Portfolio Images</h3>
              <p className="font-body text-sm text-gray-600 mb-6">
                Import images from Instagram to start building your portfolio.
              </p>
              <button onClick={handleReimport} className="btn btn-primary text-xs">
                Import from Instagram
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Pinned Images Section */}
            {isPro && pinnedImages.length > 0 && (
              <section className="mb-12">
                <div className="flex items-center gap-2 mb-5 pb-3 border-b border-gray-200">
                  <Pin className="w-4 h-4 text-amber-600" />
                  <h2 className="font-heading text-lg">
                    Pinned Images
                  </h2>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-gray-500">
                    {pinnedImages.length}/{MAX_PINNED_IMAGES}
                  </span>
                </div>

                <DndContext
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={pinnedImages.map((img) => img.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
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
              </section>
            )}

            {/* Unpinned Images Section */}
            {unpinnedImages.length > 0 && (
              <section>
                {isPro && pinnedImages.length > 0 && (
                  <div className="mb-5 pb-3 border-b border-gray-200">
                    <h2 className="font-heading text-lg">All Images</h2>
                  </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {unpinnedImages.map((image) => {
                    const isDeleting = deleting.has(image.id);
                    const isPinning = pinningInProgress.has(image.id);
                    const thumbnailUrl = getPortfolioImageUrl(image);
                    const canPin = isPro && pinnedImages.length < MAX_PINNED_IMAGES;

                    return (
                      <div
                        key={image.id}
                        className={`group relative aspect-square overflow-hidden border border-gray-200 hover:border-gray-400 transition-all bg-gray-50 ${
                          isDeleting ? 'opacity-50' : 'hover:shadow-md'
                        }`}
                      >
                        <Image
                          src={thumbnailUrl}
                          alt="Portfolio image"
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        />

                        {/* Subtle hover overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                        {/* Pin Button (Reorder Mode) */}
                        {reorderMode && canPin && !isDeleting && (
                          <button
                            onClick={() => handleTogglePin(image.id)}
                            disabled={isPinning}
                            className="absolute left-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-amber-500 text-ink opacity-0 transition-all hover:bg-amber-400 group-hover:opacity-100 shadow-md"
                            aria-label="Pin image"
                          >
                            {isPinning ? (
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-ink border-t-transparent" />
                            ) : (
                              <Pin className="h-4 w-4" />
                            )}
                          </button>
                        )}

                        {/* Delete Button */}
                        {!reorderMode && !isDeleting && (
                          <button
                            onClick={() => handleDelete(image.id)}
                            className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-error text-white opacity-0 transition-all hover:bg-error/90 group-hover:opacity-100 shadow-md"
                            title="Delete image"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}

                        {/* Deleting Spinner */}
                        {isDeleting && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-white" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </>
        )}

        {/* Footer Help */}
        {visibleImages.length > 0 && (
          <footer className="mt-12 pt-6 border-t border-gray-200 text-center">
            <p className="font-mono text-[10px] uppercase tracking-wider text-gray-500">
              Hover to manage images • Re-import replaces entire portfolio
            </p>
          </footer>
        )}
      </div>
    </div>
  );
}
