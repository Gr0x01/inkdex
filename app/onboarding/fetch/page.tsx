/**
 * Onboarding Step 1: Fetch Instagram Images
 *
 * Auto-fetches Instagram images on mount
 * Shows loading progress and auto-redirects on success
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

type LoadingState = 'connecting' | 'fetching' | 'classifying' | 'complete' | 'error';

export default function OnboardingFetchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loadingState, setLoadingState] = useState<LoadingState>('connecting');
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Auto-fetch Instagram images on mount
  useEffect(() => {
    fetchInstagramImages();
  }, []);

  const fetchInstagramImages = async () => {
    setLoadingState('connecting');
    setError(null);

    try {
      // Step 1: Connect to Instagram
      setLoadingState('fetching');
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Brief pause for UX

      // Step 2: Fetch images
      const response = await fetch('/api/onboarding/fetch-instagram', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle specific errors
        if (response.status === 403) {
          throw new Error('Your Instagram account is private. Please make it public to continue.');
        } else if (response.status === 429) {
          throw new Error('Too many attempts. Please try again later.');
        } else {
          throw new Error(data.error || 'Failed to fetch Instagram images');
        }
      }

      // Step 3: Show classification progress
      setLoadingState('classifying');
      const imageCount = data.fetchedImages?.length || 0;
      setProgress({ current: imageCount, total: imageCount });

      // Brief pause to show completion
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Step 4: Complete
      setLoadingState('complete');
      setSessionId(data.sessionId);

      // Auto-redirect to preview step
      setTimeout(() => {
        router.push(`/onboarding/preview?session_id=${data.sessionId}`);
      }, 1500);
    } catch (err: any) {
      console.error('[Onboarding] Fetch failed:', err);
      setLoadingState('error');
      setError(err.message || 'Something went wrong. Please try again.');
    }
  };

  const handleRetry = () => {
    fetchInstagramImages();
  };

  // Loading states
  const getLoadingMessage = () => {
    switch (loadingState) {
      case 'connecting':
        return 'Connecting to Instagram...';
      case 'fetching':
        return 'Pulling your recent posts...';
      case 'classifying':
        return `Analyzing ${progress.total} images...`;
      case 'complete':
        return `Found ${progress.total} images! Redirecting...`;
      case 'error':
        return 'Something went wrong';
      default:
        return 'Loading...';
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-paper-dark border border-gray-800 rounded-lg p-8 md:p-12">
        {/* Heading */}
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl md:text-4xl text-white mb-4">
            {loadingState === 'error' ? 'Oops!' : 'Setting Up Your Profile'}
          </h1>
          <p className="font-body text-gray-400 text-base md:text-lg">
            {loadingState === 'error'
              ? 'We encountered an issue fetching your Instagram images'
              : "We're grabbing your Instagram images to build your portfolio"}
          </p>
        </div>

        {/* Loading/Error state */}
        <div className="space-y-6">
          {loadingState !== 'error' ? (
            <>
              {/* Loading spinner */}
              <div className="flex justify-center">
                <div className="relative w-20 h-20">
                  <div className="absolute inset-0 border-4 border-gray-800 rounded-full" />
                  <div className="absolute inset-0 border-4 border-ether border-t-transparent rounded-full animate-spin" />
                </div>
              </div>

              {/* Status message */}
              <p className="text-center font-body text-white text-lg">
                {getLoadingMessage()}
              </p>

              {/* Progress indicator (for classification) */}
              {loadingState === 'classifying' && progress.total > 0 && (
                <div className="max-w-md mx-auto">
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-ether transition-all duration-300"
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>
              )}

              {/* Success checkmark */}
              {loadingState === 'complete' && (
                <div className="flex justify-center">
                  <div className="w-16 h-16 bg-green-500/20 border-2 border-green-500 rounded-full flex items-center justify-center">
                    <svg
                      className="w-10 h-10 text-green-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Error icon */}
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-red-500/20 border-2 border-red-500 rounded-full flex items-center justify-center">
                  <svg
                    className="w-10 h-10 text-red-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </div>
              </div>

              {/* Error message */}
              <div className="p-4 bg-red-900/20 border border-red-800 rounded-lg">
                <p className="text-red-400 text-sm font-body text-center">{error}</p>
              </div>

              {/* Retry button */}
              <div className="flex justify-center">
                <button
                  onClick={handleRetry}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600
                           text-white font-body font-medium rounded-lg
                           hover:from-purple-700 hover:to-pink-700
                           transition-all duration-200 transform hover:scale-105
                           focus:outline-none focus:ring-2 focus:ring-ether focus:ring-offset-2 focus:ring-offset-ink"
                >
                  Try Again
                </button>
              </div>
            </>
          )}
        </div>

        {/* Helper text */}
        {loadingState !== 'error' && loadingState !== 'complete' && (
          <p className="text-center text-xs text-gray-600 font-body mt-8">
            This usually takes 30-60 seconds
          </p>
        )}
      </div>
    </div>
  );
}
