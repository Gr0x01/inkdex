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

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DndContext, DragEndEvent, closestCenter } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import SortableImageCard from './SortableImageCard';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { Crown, CloudDownload, AlertCircle } from 'lucide-react';
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
  const [pinningInProgress, setPinningInProgress] = useState<Set<string>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Filter visible images only (hidden images not shown in Free tier)
  const visibleImages = images.filter((img) => !img.hidden);
  const currentCount = visibleImages.length;

  // Separate pinned and unpinned images for pro users
  const pinnedImages = visibleImages
    .filter((img) => img.is_pinned)
    .sort((a, b) => (a.pinned_position || 0) - (b.pinned_position || 0));
  const unpinnedImages = visibleImages.filter((img) => !img.is_pinned);

  function handleDeleteRequest(imageId: string) {
    setDeleteConfirm(imageId);
  }

  async function handleDeleteConfirm() {
    const imageId = deleteConfirm;
    if (!imageId) return;

    setDeleteConfirm(null);

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
    } catch (err: unknown) {
      console.error('[Portfolio] Delete failed:', err);
      const message = err instanceof Error ? err.message : 'Failed to delete image';
      setError(message);
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

  // Unused props kept for interface compatibility
  void artistId;
  void visibleCount;

  return (
    <div className="max-w-7xl">{/* Content wrapper */}

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
                <CloudDownload className="w-8 h-8 text-gray-400" />
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
            {/* Pinned Images Section - visible for all users */}
            {pinnedImages.length > 0 && (
              <section className="mb-12">
                <div className="flex items-center gap-2 mb-5 pb-3 border-b border-gray-200">
                  <h2 className="font-heading text-lg">
                    Pinned Images
                  </h2>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-gray-500">
                    {pinnedImages.length}/{MAX_PINNED_IMAGES}
                  </span>
                </div>

                {/* Pro users can drag to reorder, free users just see pinned images */}
                {isPro ? (
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
                            isPro={isPro}
                            canPin={false}
                            onDelete={handleDeleteRequest}
                            onTogglePin={handleTogglePin}
                            deleting={deleting.has(image.id)}
                            pinning={pinningInProgress.has(image.id)}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {pinnedImages.map((image) => (
                      <SortableImageCard
                        key={image.id}
                        image={image}
                        isPro={isPro}
                        canPin={false}
                        onDelete={handleDeleteRequest}
                        onTogglePin={handleTogglePin}
                        deleting={deleting.has(image.id)}
                        pinning={pinningInProgress.has(image.id)}
                      />
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* Unpinned Images Section */}
            {unpinnedImages.length > 0 && (
              <section>
                {pinnedImages.length > 0 && (
                  <div className="mb-5 pb-3 border-b border-gray-200">
                    <h2 className="font-heading text-lg">All Images</h2>
                  </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {unpinnedImages.map((image) => (
                    <SortableImageCard
                      key={image.id}
                      image={image}
                      isPro={isPro}
                      canPin={pinnedImages.length < MAX_PINNED_IMAGES}
                      onDelete={handleDeleteRequest}
                      onTogglePin={handleTogglePin}
                      deleting={deleting.has(image.id)}
                      pinning={pinningInProgress.has(image.id)}
                    />
                  ))}
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

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm !== null}
        title="Remove Image"
        message="This image will be permanently removed from your portfolio. This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Keep"
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
}
