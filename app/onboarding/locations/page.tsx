/* eslint-disable @typescript-eslint/no-explicit-any -- API response types vary */
'use client';
import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import LocationPicker, { Location } from '@/components/onboarding/LocationPicker';

function LocationsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const artistId = searchParams.get('artist_id');

  const [locations, setLocations] = useState<Location[]>([]);
  const [isPro, setIsPro] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState('');
  const [locationError, setLocationError] = useState('');

  // Load existing data
  useEffect(() => {
    const fetchData = async () => {
      if (!sessionId) {
        setError('No session ID found');
        setInitialLoading(false);
        setTimeout(() => router.push('/add-artist'), 3000);
        return;
      }

      if (!artistId) {
        // Missing artist ID means Step 1 wasn't completed - redirect back
        setError('Please complete Step 1 first');
        setInitialLoading(false);
        setTimeout(() => router.push(`/onboarding/info?session_id=${sessionId}`), 3000);
        return;
      }

      try {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();

        // Get current user to validate ownership
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
          .eq('id', sessionId)
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

        if (session.artist_id !== artistId) {
          setError('Artist ID mismatch. Please start over.');
          setInitialLoading(false);
          setTimeout(() => router.push('/add-artist'), 3000);
          return;
        }

        // Fetch artist data to check Pro status
        const { data: artist, error: artistError } = await supabase
          .from('artists')
          .select('is_pro, claimed_by_user_id')
          .eq('id', artistId)
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

        setIsPro(artist.is_pro || false);

        // Fetch existing locations
        const { data: existingLocations } = await supabase
          .from('artist_locations')
          .select('city, region, country_code, location_type, is_primary')
          .eq('artist_id', artistId)
          .order('display_order', { ascending: true });

        if (existingLocations && existingLocations.length > 0) {
          setLocations(existingLocations.map(loc => ({
            city: loc.city,
            region: loc.region,
            countryCode: loc.country_code,
            locationType: loc.location_type as 'city' | 'region' | 'country',
            isPrimary: loc.is_primary,
          })));
        }

        setInitialLoading(false);
      } catch (err: any) {
        console.error('[Locations] Error fetching data:', err);
        setError('Failed to load data. Please try again.');
        setInitialLoading(false);
      }
    };

    fetchData();
  }, [sessionId, artistId, router]);

  const handleFinish = async () => {
    // Validate location if provided
    if (locations.length > 0) {
      const primaryLocation = locations[0];
      if (primaryLocation.locationType === 'city' && !primaryLocation.city) {
        setLocationError('City is required');
        return;
      }
      if (primaryLocation.locationType === 'region' && !primaryLocation.region) {
        setLocationError('State is required');
        return;
      }
      if (primaryLocation.countryCode !== 'US' && !primaryLocation.city) {
        setLocationError('City is required for international locations');
        return;
      }
    }

    setError('');
    setLocationError('');
    setLoading(true);

    try {
      // Update artist with locations and delete session
      const res = await fetch('/api/onboarding/update-artist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          artistId,
          sessionId,
          locations: locations.length > 0 ? locations : undefined,
          deleteSession: true,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save');
      }

      // Success - redirect to dashboard
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    setLoading(true);

    try {
      // Just delete the session without saving locations
      const res = await fetch('/api/onboarding/update-artist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          artistId,
          sessionId,
          deleteSession: true,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to complete');
      }

      // Success - redirect to dashboard
      router.push('/dashboard');
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
          <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl text-ink mb-2">Where Do You Work?</h1>
          <p className="font-body text-sm sm:text-base text-gray-700">Add your shop location(s) so clients can find you</p>
        </div>

        <div className="space-y-5 sm:space-y-6">
          {/* Locations */}
          <LocationPicker
            isPro={isPro}
            locations={locations}
            onChange={setLocations}
            error={locationError}
          />

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
              onClick={handleFinish}
              disabled={loading}
              className="btn btn-primary flex-1 py-2.5 sm:py-3 text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Finishing...' : 'Finish →'}
            </button>
          </div>

          {/* Step indicator */}
          <p className="font-mono text-[10px] sm:text-xs text-gray-500 text-center uppercase tracking-wider pt-1">
            Step 4 of 4 <span className="text-gray-400">(Optional)</span>
          </p>
        </div>
      </div>
    </div>
  );
}

function LocationsLoadingFallback() {
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

export default function LocationsPage() {
  return (
    <Suspense fallback={<LocationsLoadingFallback />}>
      <LocationsContent />
    </Suspense>
  );
}
