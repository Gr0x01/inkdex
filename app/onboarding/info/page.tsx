/* eslint-disable @typescript-eslint/no-explicit-any -- API response types vary */
'use client';
import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function InfoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');

  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
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
          .select('profile_data, profile_updates, user_id, artist_id')
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
        if (session.artist_id) {
          const { data: claimedArtist } = await supabase
            .from('artists')
            .select('bio, name')
            .eq('id', session.artist_id)
            .single();

          if (claimedArtist) {
            existingArtistBio = claimedArtist.bio || '';
            existingArtistName = claimedArtist.name || '';
          }
        }

        setEmail(updates.email || '');
        // Priority: user edits > existing artist name > Instagram username
        setName(updates.name || existingArtistName || profileData.username || '');
        // Priority: user edits > existing artist bio > Instagram bio
        setBio(updates.bio || existingArtistBio || profileData.bio || '');

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
      } catch (err) {
        console.error('[Info] Background fetch failed to start:', err);
      }
    };

    startBackgroundFetch();
  }, [sessionId]);

  const isValidEmail = (emailStr: string) => {
    const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
    return emailRegex.test(emailStr);
  };

  const handleSubmit = async () => {
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

    setLoading(true);

    try {
      // Step 1: Save basic info to session
      const updateRes = await fetch('/api/onboarding/update-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          step: 'info',
          data: {
            email: normalizedEmail,
            name,
            bio,
          },
        }),
      });

      if (!updateRes.ok) throw new Error('Failed to save info');

      // Step 2: Finalize (create profile, import images) but keep session for optional steps
      const finalizeRes = await fetch('/api/onboarding/finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, keepSession: true }),
      });

      const finalizeData = await finalizeRes.json();
      if (!finalizeRes.ok) throw new Error(finalizeData.error || 'Failed to create profile');

      // Redirect to Step 2 (upgrade) with artistId
      router.push(`/onboarding/upgrade?session_id=${sessionId}&artist_id=${finalizeData.artistId}`);
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
          <p className="font-body text-sm sm:text-base text-gray-700">Let&apos;s start with the essentials</p>
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

          {error && (
            <div className="bg-status-error/10 border-2 border-status-error p-3">
              <p className="font-body text-status-error text-sm">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="btn btn-primary w-full py-2.5 sm:py-3 text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating Profile...' : 'Create Profile →'}
          </button>

          {/* Step indicator */}
          <p className="font-mono text-[10px] sm:text-xs text-gray-500 text-center uppercase tracking-wider pt-1">
            Step 1 of 4
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
