'use client';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function BookingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');

  const [bookingLink, setBookingLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isValidUrl = (url: string) => {
    return !url || /^https?:\/\/.+/.test(url);
  };

  const handleContinue = async () => {
    if (bookingLink && !isValidUrl(bookingLink)) {
      setError('Please enter a valid URL (starting with http:// or https://)');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/onboarding/update-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          step: 'booking',
          data: { bookingLink },
        }),
      });

      if (!res.ok) throw new Error('Failed to save');
      router.push(`/onboarding/complete?session_id=${sessionId}`);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-paper-dark border border-gray-800 rounded-lg p-8">
        <h1 className="font-display text-3xl text-white mb-4">Add Booking Link</h1>
        <p className="text-gray-400 mb-8">Help clients book appointments (optional)</p>

        <div className="space-y-6">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Booking URL</label>
            <input
              type="url"
              value={bookingLink}
              onChange={(e) => setBookingLink(e.target.value)}
              className="w-full px-4 py-3 bg-ink border border-gray-800 rounded text-white focus:border-ether focus:outline-none"
              placeholder="https://instagram.com/yourhandle or https://your-website.com"
            />
            <p className="text-xs text-gray-600 mt-2">
              Instagram DM link, website, Calendly, or any other booking method
            </p>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-4">
            <button
              onClick={() => router.push(`/onboarding/complete?session_id=${sessionId}`)}
              className="flex-1 py-3 border border-gray-700 text-gray-400 font-medium rounded-lg hover:border-gray-600 transition"
            >
              Skip for now
            </button>
            <button
              onClick={handleContinue}
              disabled={loading}
              className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 transition"
            >
              {loading ? 'Saving...' : 'Continue →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function BookingLoadingFallback() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-paper-dark border border-gray-800 rounded-lg p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-800 rounded w-1/3" />
          <div className="h-4 bg-gray-800 rounded w-1/2" />
          <div className="h-12 bg-gray-800 rounded mt-8" />
        </div>
      </div>
    </div>
  );
}

export default function BookingPage() {
  return (
    <Suspense fallback={<BookingLoadingFallback />}>
      <BookingContent />
    </Suspense>
  );
}
