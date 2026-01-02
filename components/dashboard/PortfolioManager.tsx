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

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { getPortfolioImageUrl } from '@/lib/utils/images';

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

  // Filter visible images only (hidden images not shown in Free tier)
  const visibleImages = images.filter((img) => !img.hidden);
  const currentCount = visibleImages.length;

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
    router.push('/dashboard/portfolio/import');
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-900 to-black text-white">
      <div className="mx-auto max-w-7xl px-6 py-16">
        {/* Header */}
        <div className="mb-12 flex items-start justify-between">
          <div>
            <h1 className="mb-3 text-3xl font-bold">Portfolio Management</h1>
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
            <p className="text-lg">
              <span className="font-semibold">{currentCount}/20</span>{' '}
              <span className="text-neutral-400">images</span>
            </p>
            {!isPro && isAtLimit && (
              <span className="rounded-full bg-amber-500/10 px-3 py-1 text-sm text-amber-400">
                At Free tier limit
              </span>
            )}
          </div>

          {currentCount < 20 && (
            <button
              onClick={handleReimport}
              className="rounded-lg bg-white px-6 py-3 text-sm font-semibold text-black transition-colors hover:bg-neutral-200"
            >
              Re-import from Instagram
            </button>
          )}
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
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {visibleImages.map((image) => {
              const isDeleting = deleting.has(image.id);
              const thumbnailUrl = getPortfolioImageUrl(image);

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

                  {/* Delete button (hover) */}
                  {!isDeleting && (
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
