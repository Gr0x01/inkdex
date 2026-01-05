/* eslint-disable @typescript-eslint/no-explicit-any -- API response types vary */
'use client';
import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Crown, Sparkles } from 'lucide-react';

function InfoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');

  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [bookingLink, setBookingLink] = useState('');
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
  const [filterNonTattoo, setFilterNonTattoo] = useState(true);
  const [isPro, setIsPro] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState('');

  // Load existing session data
  useEffect(() => {
    const fetchSessionData = async () => {
      if (!sessionId) {
        setError('No session ID found');
        setInitialLoading(false);
        setTimeout(() => router.push('/add-artist'), 3000);
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

        // Fetch session data
        const { data: session, error: sessionError } = await supabase
          .from('onboarding_sessions')
          .select('profile_data, profile_updates, user_id, current_step, booking_link, artist_id')
          .eq('id', sessionId)
          .single();

        if (sessionError || !session) {
          setError('Session not found. Please start over.');
          setInitialLoading(false);
          setTimeout(() => router.push('/add-artist'), 3000);
          return;
        }

        // Validate session belongs to current user
        if (session.user_id !== user.id) {
          setError('Invalid session. Please start over.');
          setInitialLoading(false);
          setTimeout(() => router.push('/add-artist'), 3000);
          return;
        }

        // Pre-populate form fields
        const profileData = session.profile_data || {};
        const updates = session.profile_updates || {};

        // If claiming an existing artist, fetch their bio and name
        let existingArtistBio = '';
        let existingArtistName = '';
        let existingBookingUrl = '';
        if (session.artist_id) {
          const { data: claimedArtist } = await supabase
            .from('artists')
            .select('bio, name, booking_url')
            .eq('id', session.artist_id)
            .single();

          if (claimedArtist) {
            existingArtistBio = claimedArtist.bio || '';
            existingArtistName = claimedArtist.name || '';
            existingBookingUrl = claimedArtist.booking_url || '';
          }
        }

        setEmail(updates.email || '');
        // Priority: user edits > existing artist name > Instagram username
        setName(updates.name || existingArtistName || profileData.username || '');
        // Priority: user edits > existing artist bio > Instagram bio
        setBio(updates.bio || existingArtistBio || profileData.bio || '');
        // Priority: session booking link > existing artist booking url
        setBookingLink(session.booking_link || existingBookingUrl || '');
        setAutoSyncEnabled(updates.autoSyncEnabled || false);
        setFilterNonTattoo(updates.filterNonTattoo !== undefined ? updates.filterNonTattoo : true);

        // Check if user has Pro subscription
        const { data: artist } = await supabase
          .from('artists')
          .select('is_pro')
          .eq('claimed_by_user_id', user.id)
          .single();

        setIsPro(artist?.is_pro || false);
        setInitialLoading(false);
      } catch (err: any) {
        console.error('[Info] Error fetching session:', err);
        setError('Failed to load session. Please try again.');
        setInitialLoading(false);
      }
    };

    fetchSessionData();
  }, [sessionId, router]);

  // Start background Instagram fetch on mount
  useEffect(() => {
    const startBackgroundFetch = async () => {
      if (!sessionId) return;

      try {
        await fetch('/api/onboarding/start-fetch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        });
        console.log('[Info] Background fetch started');
        // Don't wait for response - it runs in background
      } catch (err) {
        console.error('[Info] Background fetch failed to start:', err);
        // Non-critical - user can still complete onboarding
      }
    };

    startBackgroundFetch();
  }, [sessionId]);

  const isValidUrl = (url: string) => {
    return !url || /^https?:\/\/.+/.test(url);
  };

  const isValidEmail = (emailStr: string) => {
    const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
    return emailRegex.test(emailStr);
  };

  const handleContinue = async () => {
    // Clear previous errors
    setEmailError('');
    setError('');

    // Normalize email for validation
    const normalizedEmail = email.toLowerCase().trim();

    // Validate email
    if (!normalizedEmail) {
      setEmailError('Email is required');
      return;
    }
    if (normalizedEmail.length > 254) {
      setEmailError('Email address is too long');
      return;
    }
    if (!isValidEmail(normalizedEmail)) {
      setEmailError('Please enter a valid email address');
      return;
    }
    if (normalizedEmail.endsWith('@instagram.inkdex.io')) {
      setEmailError('Please use your real email address');
      return;
    }

    // Validate name
    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    // Validate booking link if provided
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
          step: 'info',
          data: {
            email: normalizedEmail,
            name,
            bio,
            bookingLink,
            autoSyncEnabled: isPro ? autoSyncEnabled : false,
            filterNonTattoo: isPro ? filterNonTattoo : true,
          },
        }),
      });

      if (!res.ok) throw new Error('Failed to save');
      router.push(`/onboarding/locations?session_id=${sessionId}`);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="text-center">
            <div className="w-16 h-16 border-2 border-ink border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="font-body text-gray-700">Loading your profile...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !name) {
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
          <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl text-ink mb-2">Basic Info</h1>
          <p className="font-body text-sm sm:text-base text-gray-700">Let's start with the essentials</p>
        </div>

        <div className="space-y-4 sm:space-y-5">
          {/* Email */}
          <div>
            <label className="block font-mono text-xs text-gray-700 mb-2 uppercase tracking-widest">
              Email *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailError('');
              }}
              className={`input w-full ${emailError ? 'border-status-error' : ''}`}
              placeholder="your@email.com"
              autoComplete="email"
            />
            <p className="font-body text-sm text-gray-500 mt-1.5 leading-relaxed">
              We&apos;ll send you updates about your profile and account
            </p>
            {emailError && (
              <p className="font-body text-sm text-status-error mt-1">{emailError}</p>
            )}
          </div>

          {/* Name */}
          <div>
            <label className="block font-mono text-xs text-gray-700 mb-2 uppercase tracking-widest">
              Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input w-full"
              placeholder="Your name"
            />
          </div>

          {/* Bio */}
          <div>
            <label className="block font-mono text-xs text-gray-700 mb-2 uppercase tracking-widest">
              Bio <span className="font-body text-gray-500 normal-case tracking-normal">(optional)</span>
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              maxLength={500}
              className="input w-full resize-none"
              placeholder="Tell people about your style, experience, and what inspires you..."
            />
            <p className="font-mono text-xs text-gray-500 mt-1">{bio.length}/500</p>
          </div>

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
            <div className={`mb-3 rounded border-2 ${isPro ? 'border-border-subtle bg-gray-50' : 'border-purple-200 bg-purple-50'} p-4`}>
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
                {isPro ? (
                  <button
                    type="button"
                    onClick={() => setAutoSyncEnabled(!autoSyncEnabled)}
                    className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors ${
                      autoSyncEnabled ? 'bg-ink' : 'bg-gray-300'
                    }`}
                    aria-label="Toggle auto-sync"
                  >
                    <span
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                        autoSyncEnabled ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                ) : (
                  <Link
                    href="/pricing"
                    className="flex-shrink-0 rounded bg-purple-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-700 transition-colors"
                  >
                    Upgrade
                  </Link>
                )}
              </div>
            </div>

            {/* Filter Non-Tattoo Toggle */}
            <div className={`rounded border-2 ${isPro ? 'border-border-subtle bg-gray-50' : 'border-purple-200 bg-purple-50'} p-4`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <label className="font-mono text-xs text-gray-900 uppercase tracking-widest">
                      Filter Non-Tattoo Content
                    </label>
                    {!isPro && <Crown className="h-3.5 w-3.5 text-purple-600" />}
                  </div>
                  <p className="font-body text-sm text-gray-600 leading-relaxed">
                    Use AI to filter out lifestyle photos and non-tattoo posts
                  </p>
                  {isPro && (
                    <p className="flex items-center gap-1.5 mt-1 font-body text-xs text-gray-500">
                      <Sparkles className="h-3 w-3" />
                      Powered by GPT-5-mini vision
                    </p>
                  )}
                </div>
                {isPro ? (
                  <button
                    type="button"
                    onClick={() => setFilterNonTattoo(!filterNonTattoo)}
                    className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors ${
                      filterNonTattoo ? 'bg-ink' : 'bg-gray-300'
                    }`}
                    aria-label="Toggle filter non-tattoo content"
                  >
                    <span
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                        filterNonTattoo ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                ) : (
                  <Link
                    href="/pricing"
                    className="flex-shrink-0 rounded bg-purple-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-700 transition-colors"
                  >
                    Upgrade
                  </Link>
                )}
              </div>
            </div>

            {!isPro && (
              <p className="font-body text-xs text-gray-600 mt-3 leading-relaxed">
                <strong className="text-gray-900">Free tier:</strong> Manual portfolio management only. Upgrade to Pro for auto-sync.
              </p>
            )}
          </div>

          {error && (
            <div className="bg-status-error/10 border-2 border-status-error p-3">
              <p className="font-body text-status-error text-sm">{error}</p>
            </div>
          )}

          {/* Primary CTA */}
          <button
            onClick={handleContinue}
            disabled={loading}
            className="btn btn-primary w-full py-2.5 sm:py-3 text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : 'Continue →'}
          </button>

          {/* Subtle helper text */}
          <p className="font-mono text-[10px] sm:text-xs text-gray-500 text-center uppercase tracking-wider pt-1">
            Step 1 of 3
          </p>
        </div>
      </div>
    </div>
  );
}

function InfoLoadingFallback() {
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

export default function InfoPage() {
  return (
    <Suspense fallback={<InfoLoadingFallback />}>
      <InfoContent />
    </Suspense>
  );
}
