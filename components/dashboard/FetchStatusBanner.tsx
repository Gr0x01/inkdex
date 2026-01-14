/**
 * Fetch Status Banner
 *
 * Shows Instagram sync status at top of dashboard after onboarding.
 * Polls /api/onboarding/fetch-status every 3 seconds while in_progress.
 *
 * States:
 * - in_progress: Blue loading banner
 * - completed: Green success banner (auto-dismisses after 5s)
 * - failed: Yellow warning banner
 * - null: No banner shown
 */

'use client';
import { useEffect, useState } from 'react';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export function FetchStatusBanner() {
  const [status, setStatus] = useState<'pending' | 'in_progress' | 'completed' | 'failed' | null>(null);
  const [imageCount, setImageCount] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Poll for fetch status
    const checkStatus = async () => {
      try {
        const res = await fetch('/api/onboarding/fetch-status');
        if (res.ok) {
          const data = await res.json();
          setStatus(data.status);
          setImageCount(data.imageCount || 0);

          // Auto-dismiss completed status after 5 seconds
          if (data.status === 'completed' && !dismissed) {
            setTimeout(() => setDismissed(true), 5000);
          }
        }
      } catch (err) {
        console.error('[FetchStatusBanner] Error checking status:', err);
      }
    };

    checkStatus();

    // Poll every 3 seconds if in progress
    const interval = setInterval(() => {
      if (status === 'in_progress') {
        checkStatus();
      } else {
        clearInterval(interval);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [status, dismissed]);

  // Don't show banner if:
  // - No status (user hasn't done onboarding)
  // - User dismissed the banner
  // - Status is pending (fetch hasn't started yet)
  if (!status || dismissed || status === 'pending') return null;

  if (status === 'in_progress') {
    return (
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-blue-600 shrink-0" />
          <div className="flex-1">
            <p className="font-medium text-blue-900">Instagram sync in progress</p>
            <p className="text-sm text-blue-700">
              We're importing your portfolio images. This usually takes 1-2 minutes.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'completed') {
    return (
      <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6 rounded">
        <div className="flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
          <div className="flex-1">
            <p className="font-medium text-green-900">
              Instagram sync complete! Added {imageCount} {imageCount === 1 ? 'image' : 'images'} to your portfolio.
            </p>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="text-green-700 hover:text-green-900 shrink-0"
            aria-label="Dismiss"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-6 rounded">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 shrink-0" />
          <div className="flex-1">
            <p className="font-medium text-yellow-900">Instagram sync incomplete</p>
            <p className="text-sm text-yellow-700">
              You can add images manually in your portfolio settings.
            </p>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="text-yellow-700 hover:text-yellow-900 shrink-0"
            aria-label="Dismiss"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  return null;
}
