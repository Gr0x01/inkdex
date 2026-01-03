'use client';
import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import LocationPicker, { Location } from '@/components/onboarding/LocationPicker';

function LocationsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');

  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState('');
  const [locationError, setLocationError] = useState('');

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
          .select('profile_data, profile_updates, user_id')
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

        // Pre-populate locations if available
        const updates = session.profile_updates || {};
        if (updates.locations && Array.isArray(updates.locations)) {
          setLocations(updates.locations);
        } else if (updates.city && updates.state) {
          // Legacy format: convert city/state to location
          setLocations([{
            city: updates.city,
            region: updates.state,
            countryCode: 'US',
            locationType: 'city',
            isPrimary: true,
          }]);
        }

        setInitialLoading(false);
      } catch (err: any) {
        console.error('[Locations] Error fetching session:', err);
        setError('Failed to load session. Please try again.');
        setInitialLoading(false);
      }
    };

    fetchSessionData();
  }, [sessionId, router]);

  const handleContinue = async () => {
    // Validate location
    if (locations.length === 0) {
      setLocationError('Please add at least one location');
      return;
    }

    // Validate location has required fields
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

    setError('');
    setLocationError('');
    setLoading(true);

    try {
      const res = await fetch('/api/onboarding/update-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          step: 'locations',
          data: {
            locations,
          },
        }),
      });

      if (!res.ok) throw new Error('Failed to save');
      router.push(`/onboarding/complete?session_id=${sessionId}`);
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

  if (error && locations.length === 0) {
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
      <div className="bg-paper border-2 border-border-subtle p-6 md:p-8 shadow-md">
        {/* Header */}
        <div className="mb-6">
          <h1 className="font-display text-3xl md:text-4xl text-ink mb-2">Where Do You Work?</h1>
          <p className="font-body text-gray-700">Add your shop location(s)</p>
        </div>

        <div className="space-y-6">
          {/* Locations */}
          <LocationPicker
            isPro={false}
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
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => router.push(`/onboarding/info?session_id=${sessionId}`)}
              className="btn btn-secondary px-8 py-3"
            >
              ← Back
            </button>
            <button
              onClick={handleContinue}
              disabled={loading}
              className="btn btn-primary flex-1 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Continue →'}
            </button>
          </div>

          {/* Subtle helper text */}
          <p className="font-mono text-xs text-gray-500 text-center uppercase tracking-wider pt-1">
            Step 2 of 3
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
