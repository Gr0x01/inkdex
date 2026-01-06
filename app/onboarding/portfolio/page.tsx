/* eslint-disable @typescript-eslint/no-explicit-any -- API response types vary */
'use client';
import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Crown } from 'lucide-react';

function PortfolioContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Support both JWT token (new) and legacy URL params (backwards compat)
  const token = searchParams.get('token');
  const legacySessionId = searchParams.get('session_id');
  const legacyArtistId = searchParams.get('artist_id');
  const legacyUpgraded = searchParams.get('upgraded');

  const [sessionId, setSessionId] = useState<string | null>(legacySessionId);
  const [artistId, setArtistId] = useState<string | null>(legacyArtistId);
  const [bookingLink, setBookingLink] = useState('');
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
  const [filterNonTattoo, setFilterNonTattoo] = useState(true);
  const [isPro, setIsPro] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState('');

  // Load existing data
  useEffect(() => {
    const fetchData = async () => {
      let resolvedSessionId = legacySessionId;
      let resolvedArtistId = legacyArtistId;

      // If we have a JWT token, verify it to get sessionId and artistId
      if (token) {
        try {
          const verifyRes = await fetch('/api/onboarding/verify-return-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token }),
          });

          if (!verifyRes.ok) {
            const data = await verifyRes.json();
            setError(data.error || 'Invalid return token');
            setInitialLoading(false);
            setTimeout(() => router.push('/add-artist'), 3000);
            return;
          }

          const tokenData = await verifyRes.json();
          resolvedSessionId = tokenData.sessionId;
          resolvedArtistId = tokenData.artistId;
          setSessionId(resolvedSessionId);
          setArtistId(resolvedArtistId);
        } catch (err) {
          console.error('[Portfolio] Token verification error:', err);
          setError('Failed to verify return token');
          setInitialLoading(false);
          setTimeout(() => router.push('/add-artist'), 3000);
          return;
        }
      }

      if (!resolvedSessionId) {
        setError('No session ID found');
        setInitialLoading(false);
        setTimeout(() => router.push('/add-artist'), 3000);
        return;
      }

      if (!resolvedArtistId) {
        // Missing artist ID means Step 1 wasn't completed - redirect back
        setError('Please complete Step 1 first');
        setInitialLoading(false);
        setTimeout(() => router.push(`/onboarding/info?session_id=${resolvedSessionId}`), 3000);
        return;
      }

      try {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();

        // Get current user to validate session ownership
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setError('Please log in to continue');
          setInitialLoading(false);
          return;
        }

        // Validate session belongs to user and matches artist_id
        const { data: session, error: sessionError } = await supabase
          .from('onboarding_sessions')
          .select('user_id, artist_id')
          .eq('id', resolvedSessionId)
          .single();

        if (sessionError || !session) {
          setError('Session not found. Please start over.');
          setInitialLoading(false);
          setTimeout(() => router.push('/add-artist'), 3000);
          return;
        }

        if (session.user_id !== user.id) {
          setError('Invalid session. Please start over.');
          setInitialLoading(false);
          setTimeout(() => router.push('/add-artist'), 3000);
          return;
        }

        if (session.artist_id !== resolvedArtistId) {
          setError('Artist ID mismatch. Please start over.');
          setInitialLoading(false);
          setTimeout(() => router.push('/add-artist'), 3000);
          return;
        }

        // Fetch artist data
        const { data: artist, error: artistError } = await supabase
          .from('artists')
          .select('booking_url, auto_sync_enabled, filter_non_tattoo_content, is_pro, claimed_by_user_id')
          .eq('id', resolvedArtistId)
          .single();

        if (artistError || !artist) {
          setError('Artist not found. Please start over.');
          setInitialLoading(false);
          setTimeout(() => router.push('/add-artist'), 3000);
          return;
        }

        // Validate artist belongs to current user (defense in depth)
        if (artist.claimed_by_user_id !== user.id) {
          setError('Invalid artist. Please start over.');
          setInitialLoading(false);
          setTimeout(() => router.push('/add-artist'), 3000);
          return;
        }

        setBookingLink(artist.booking_url || '');
        setAutoSyncEnabled(artist.auto_sync_enabled || false);
        setFilterNonTattoo(artist.filter_non_tattoo_content !== false);
        setIsPro(artist.is_pro || false);

        setInitialLoading(false);
      } catch (err: any) {
        console.error('[Portfolio] Error fetching data:', err);
        setError('Failed to load data. Please try again.');
        setInitialLoading(false);
      }
    };

    fetchData();
  }, [token, legacySessionId, legacyArtistId, legacyUpgraded, router]);

  const isValidUrl = (url: string) => {
    return !url || /^https?:\/\/.+/.test(url);
  };

  const handleContinue = async () => {
    setError('');

    // Validate booking link if provided
    if (bookingLink && !isValidUrl(bookingLink)) {
      setError('Please enter a valid URL (starting with http:// or https://)');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/onboarding/update-artist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          artistId,
          sessionId,
          bookingUrl: bookingLink || null,
          autoSyncEnabled: isPro ? autoSyncEnabled : false,
          filterNonTattoo: isPro ? filterNonTattoo : true,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save');
      }

      // Redirect to Step 3 (locations)
      router.push(`/onboarding/locations?session_id=${sessionId}&artist_id=${artistId}`);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleSkip = () => {
    // Skip to Step 3 without saving
    router.push(`/onboarding/locations?session_id=${sessionId}&artist_id=${artistId}`);
  };

  if (initialLoading) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="text-center">
            <div className="w-16 h-16 border-2 border-ink border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="font-body text-gray-700">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !artistId) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-paper border-2 border-status-error p-6 text-center">
          <p className="font-body text-status-error mb-4">{error}</p>
          <p className="font-mono text-xs text-gray-500 uppercase tracking-wider">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-paper border-2 border-border-subtle p-4 sm:p-6 lg:p-8 shadow-md">
        {/* Header */}
        <div className="mb-5 sm:mb-6">
          <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl text-ink mb-2">Portfolio Settings</h1>
          <p className="font-body text-sm sm:text-base text-gray-700">Configure your booking link and sync preferences</p>
        </div>

        <div className="space-y-4 sm:space-y-5">
          {/* Booking Link */}
          <div>
            <label className="block font-mono text-xs text-gray-700 mb-2 uppercase tracking-widest">
              Booking Link <span className="font-body text-gray-500 normal-case tracking-normal">(optional)</span>
            </label>
            <input
              type="url"
              value={bookingLink}
              onChange={(e) => setBookingLink(e.target.value)}
              className="input w-full"
              placeholder="https://instagram.com/yourhandle"
            />
            <p className="font-body text-sm text-gray-500 mt-1.5 leading-relaxed">
              Instagram DM link, website, Calendly, or any booking method
            </p>
          </div>

          {/* Sync Preferences - Pro Only */}
          <div className="border-t-2 border-border-subtle pt-5">
            <h3 className="font-mono text-xs text-gray-700 mb-4 uppercase tracking-widest">
              Portfolio Sync <span className="font-body text-gray-500 normal-case tracking-normal">(Pro)</span>
            </h3>

            {/* Auto-Sync Toggle */}
            <div className="mb-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <label className="font-mono text-xs text-gray-900 uppercase tracking-widest">
                      Daily Auto-Sync
                    </label>
                    {!isPro && <Crown className="h-3.5 w-3.5 text-purple-600" />}
                  </div>
                  <p className="font-body text-sm text-gray-600 leading-relaxed">
                    Automatically sync your latest Instagram posts daily at 2am UTC
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => isPro && setAutoSyncEnabled(!autoSyncEnabled)}
                  disabled={!isPro}
                  className={`relative inline-flex border-2 overflow-hidden h-7 w-20 flex-shrink-0 ${
                    isPro ? 'border-ink' : 'border-gray-300 opacity-50 cursor-not-allowed'
                  }`}
                  role="switch"
                  aria-checked={autoSyncEnabled}
                  aria-label="Toggle auto-sync"
                >
                  <div
                    className={`absolute top-0 bottom-0 transition-all duration-300 ease-out ${isPro ? 'bg-ink' : 'bg-gray-400'}`}
                    style={{
                      width: '50%',
                      left: autoSyncEnabled ? '50%' : '0'
                    }}
                  />
                  <span
                    className={`relative z-10 w-1/2 font-mono text-[9px] uppercase tracking-wider transition-colors duration-300 text-center flex items-center justify-center ${
                      !autoSyncEnabled ? (isPro ? 'text-paper' : 'text-white') : (isPro ? 'text-ink' : 'text-gray-400')
                    }`}
                  >
                    OFF
                  </span>
                  <div className={`absolute top-0 bottom-0 left-1/2 -ml-[1px] w-[2px] z-10 ${isPro ? 'bg-ink' : 'bg-gray-300'}`} />
                  <span
                    className={`relative z-10 w-1/2 font-mono text-[9px] uppercase tracking-wider transition-colors duration-300 text-center flex items-center justify-center ${
                      autoSyncEnabled ? (isPro ? 'text-paper' : 'text-white') : (isPro ? 'text-ink' : 'text-gray-400')
                    }`}
                  >
                    ON
                  </span>
                </button>
              </div>
            </div>

            {/* Filter Non-Tattoo Toggle */}
            <div>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <label className="font-mono text-xs text-gray-900 uppercase tracking-widest">
                      Filter Non-Tattoo Content
                    </label>
                    {!isPro && <Crown className="h-3.5 w-3.5 text-purple-600" />}
                  </div>
                  <p className="font-body text-sm text-gray-600 leading-relaxed">
                    Filter out lifestyle photos and non-tattoo posts
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => isPro && setFilterNonTattoo(!filterNonTattoo)}
                  disabled={!isPro}
                  className={`relative inline-flex border-2 overflow-hidden h-7 w-20 flex-shrink-0 ${
                    isPro ? 'border-ink' : 'border-gray-300 opacity-50 cursor-not-allowed'
                  }`}
                  role="switch"
                  aria-checked={filterNonTattoo}
                  aria-label="Toggle filter non-tattoo content"
                >
                  <div
                    className={`absolute top-0 bottom-0 transition-all duration-300 ease-out ${isPro ? 'bg-ink' : 'bg-gray-400'}`}
                    style={{
                      width: '50%',
                      left: filterNonTattoo ? '50%' : '0'
                    }}
                  />
                  <span
                    className={`relative z-10 w-1/2 font-mono text-[9px] uppercase tracking-wider transition-colors duration-300 text-center flex items-center justify-center ${
                      !filterNonTattoo ? (isPro ? 'text-paper' : 'text-white') : (isPro ? 'text-ink' : 'text-gray-400')
                    }`}
                  >
                    OFF
                  </span>
                  <div className={`absolute top-0 bottom-0 left-1/2 -ml-[1px] w-[2px] z-10 ${isPro ? 'bg-ink' : 'bg-gray-300'}`} />
                  <span
                    className={`relative z-10 w-1/2 font-mono text-[9px] uppercase tracking-wider transition-colors duration-300 text-center flex items-center justify-center ${
                      filterNonTattoo ? (isPro ? 'text-paper' : 'text-white') : (isPro ? 'text-ink' : 'text-gray-400')
                    }`}
                  >
                    ON
                  </span>
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-status-error/10 border-2 border-status-error p-3">
              <p className="font-body text-status-error text-sm">{error}</p>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2">
            <button
              onClick={handleSkip}
              disabled={loading}
              className="btn btn-secondary px-6 sm:px-8 py-2.5 sm:py-3 text-sm sm:text-base"
            >
              Skip
            </button>
            <button
              onClick={handleContinue}
              disabled={loading}
              className="btn btn-primary flex-1 py-2.5 sm:py-3 text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Continue →'}
            </button>
          </div>

          {/* Step indicator */}
          <p className="font-mono text-[10px] sm:text-xs text-gray-500 text-center uppercase tracking-wider pt-1">
            Step 3 of 4 <span className="text-gray-400">(Optional)</span>
          </p>
        </div>
      </div>
    </div>
  );
}

function PortfolioLoadingFallback() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 border-2 border-ink border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="font-body text-gray-700">Loading...</p>
        </div>
      </div>
    </div>
  );
}

export default function PortfolioPage() {
  return (
    <Suspense fallback={<PortfolioLoadingFallback />}>
      <PortfolioContent />
    </Suspense>
  );
}
