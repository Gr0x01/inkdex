'use client';

/**
 * Portfolio Import Flow
 *
 * Auto-fetches Instagram images on mount, allows selection (max 20 for Free, 100 for Pro),
 * and replaces existing portfolio atomically
 */

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { MAX_FREE_TIER_IMAGES, MAX_PRO_TIER_IMAGES } from '@/lib/constants/portfolio';

interface FetchedImage {
  url: string;
  instagram_post_id: string;
  caption: string | null;
  classified: boolean;
}

interface ProfileData {
  username: string;
  totalImages: number;
  tattooImages: number;
}

type Step = 'fetching' | 'selecting' | 'importing' | 'error';

function PortfolioImportContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isPro = searchParams.get('pro') === '1';
  const limit = isPro ? MAX_PRO_TIER_IMAGES : MAX_FREE_TIER_IMAGES;

  const [step, setStep] = useState<Step>('fetching');
  const [images, setImages] = useState<FetchedImage[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Auto-fetch on mount
  useEffect(() => {
    fetchInstagramImages();
  }, []);

  async function fetchInstagramImages() {
    try {
      setStep('fetching');
      setError(null);

      const response = await fetch('/api/dashboard/portfolio/fetch-instagram', {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch Instagram images');
      }

      const data = await response.json();

      // Filter to classified images only
      const tattooImages = data.images.filter((img: FetchedImage) => img.classified);

      setImages(tattooImages);
      setProfileData(data.profileData);
      setStep('selecting');
    } catch (err: any) {
      console.error('[Portfolio Import] Fetch failed:', err);
      setError(err.message || 'Failed to fetch images');
      setStep('error');
    }
  }

  function toggleImage(imageId: string) {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(imageId)) {
        newSet.delete(imageId);
      } else {
        // Enforce tier-based limit
        if (newSet.size >= limit) {
          return prev; // Don't add if already at limit
        }
        newSet.add(imageId);
      }
      return newSet;
    });
  }

  async function handleImport() {
    if (selectedIds.size === 0) {
      setError('Please select at least one image');
      return;
    }

    try {
      setStep('importing');
      setError(null);

      const response = await fetch('/api/dashboard/portfolio/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selectedImageIds: Array.from(selectedIds),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to import portfolio');
      }

      // Success - redirect to portfolio page
      router.push('/dashboard/portfolio');
    } catch (err: any) {
      console.error('[Portfolio Import] Import failed:', err);
      setError(err.message || 'Failed to import portfolio');
      setStep('selecting'); // Return to selection on error
    }
  }

  // Loading state
  if (step === 'fetching') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-neutral-900 to-black text-white">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="flex flex-col items-center justify-center space-y-6">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-neutral-700 border-t-white" />
            <p className="text-lg text-neutral-400">Fetching Instagram images...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (step === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-neutral-900 to-black text-white">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="flex flex-col items-center justify-center space-y-6">
            <div className="rounded-lg border border-red-900/20 bg-red-950/10 p-6">
              <h2 className="mb-2 text-xl font-semibold text-red-400">Error</h2>
              <p className="text-neutral-300">{error}</p>
            </div>
            <button
              onClick={fetchInstagramImages}
              className="rounded-lg bg-white px-6 py-3 text-sm font-semibold text-black transition-colors hover:bg-neutral-200"
            >
              Retry
            </button>
            <button
              onClick={() => router.push('/dashboard/portfolio')}
              className="text-sm text-neutral-400 hover:text-white"
            >
              Back to Portfolio
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Importing state
  if (step === 'importing') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-neutral-900 to-black text-white">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="flex flex-col items-center justify-center space-y-6">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-neutral-700 border-t-white" />
            <p className="text-lg text-neutral-400">
              Importing {selectedIds.size} images...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Selection state
  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-900 to-black text-white">
      <div className="mx-auto max-w-7xl px-6 py-16">
        {/* Header */}
        <div className="mb-12">
          <h1 className="mb-3 text-3xl font-bold">Import Portfolio from Instagram</h1>
          <p className="text-neutral-400">
            Select up to {limit} tattoo images from @{profileData?.username}
            {isPro && <span className="ml-2 text-amber-400">(Pro)</span>}
          </p>
          {profileData && (
            <p className="mt-2 text-sm text-neutral-500">
              Found {profileData.tattooImages} tattoo images out of {profileData.totalImages}{' '}
              total posts
            </p>
          )}
        </div>

        {/* Selection count */}
        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm text-neutral-400">
            Selected: <span className="font-semibold text-white">{selectedIds.size}/{limit}</span>
          </p>
          {selectedIds.size === limit && (
            <p className="text-sm text-amber-400">
              {isPro ? `Max ${limit} images (Pro tier limit)` : `Max ${limit} images (Free tier limit)`}
            </p>
          )}
        </div>

        {/* Error message */}
        {error && step === 'selecting' && (
          <div className="mb-6 rounded-lg border border-red-900/20 bg-red-950/10 p-4">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Image grid */}
        {images.length === 0 ? (
          <div className="flex flex-col items-center justify-center space-y-6 py-12">
            <p className="text-neutral-400">No tattoo images found in your recent posts.</p>
            <button
              onClick={() => router.push('/dashboard/portfolio')}
              className="rounded-lg bg-white px-6 py-3 text-sm font-semibold text-black transition-colors hover:bg-neutral-200"
            >
              Back to Portfolio
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {images.map((image) => {
                const isSelected = selectedIds.has(image.instagram_post_id);
                const isAtLimit = selectedIds.size >= limit && !isSelected;

                return (
                  <button
                    key={image.instagram_post_id}
                    onClick={() => toggleImage(image.instagram_post_id)}
                    disabled={isAtLimit}
                    className={`group relative aspect-square overflow-hidden rounded-lg transition-all ${
                      isSelected
                        ? 'ring-2 ring-white ring-offset-2 ring-offset-black'
                        : 'hover:ring-2 hover:ring-neutral-500'
                    } ${isAtLimit ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                  >
                    <Image
                      src={image.url}
                      alt={image.caption || 'Instagram image'}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    />

                    {/* Checkbox overlay */}
                    <div
                      className={`absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all ${
                        isSelected
                          ? 'border-white bg-white'
                          : 'border-white bg-black/50 group-hover:bg-black/70'
                      }`}
                    >
                      {isSelected && (
                        <svg
                          className="h-4 w-4 text-black"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Action buttons */}
            <div className="mt-12 flex items-center justify-between">
              <button
                onClick={() => router.push('/dashboard/portfolio')}
                className="text-sm text-neutral-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={selectedIds.size === 0}
                className="rounded-lg bg-white px-8 py-3 font-semibold text-black transition-colors hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Import {selectedIds.size} Images
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ImportLoadingFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-900 to-black text-white">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="flex flex-col items-center justify-center space-y-6">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-neutral-700 border-t-white" />
          <p className="text-lg text-neutral-400">Loading...</p>
        </div>
      </div>
    </div>
  );
}

export default function PortfolioImportPage() {
  return (
    <Suspense fallback={<ImportLoadingFallback />}>
      <PortfolioImportContent />
    </Suspense>
  );
}
