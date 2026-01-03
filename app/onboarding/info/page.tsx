'use client';
import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import LocationPicker, { Location } from '@/components/onboarding/LocationPicker';

function InfoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');

  const [name, setName] = useState('');
  const [locations, setLocations] = useState<Location[]>([]);
  const [bio, setBio] = useState('');
  const [bookingLink, setBookingLink] = useState('');
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
          .select('profile_data, profile_updates, user_id, current_step, booking_link')
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

        setName(updates.name || profileData.username || '');
        setBio(updates.bio || profileData.bio || '');
        setBookingLink(session.booking_link || '');

        // Pre-populate locations if available
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

  const handleContinue = async () => {
    // Validate name
    if (!name.trim()) {
      setError('Name is required');
      return;
    }

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

    // Validate booking link if provided
    if (bookingLink && !isValidUrl(bookingLink)) {
      setError('Please enter a valid URL (starting with http:// or https://)');
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
          step: 'info',
          data: {
            name,
            bio,
            locations,
            bookingLink,
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
            <div className="w-16 h-16 border-4 border-ether border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-400">Loading your profile...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !name) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-6 text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <p className="text-gray-500 text-sm">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-paper-dark border border-gray-800 rounded-lg p-8">
        <h1 className="font-display text-3xl text-white mb-4">Create Your Profile</h1>
        <p className="text-gray-400 mb-8">Tell us about yourself</p>

        <div className="space-y-6">
          {/* Name */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-ink border border-gray-800 rounded text-white focus:border-ether focus:outline-none"
              placeholder="Your name"
            />
          </div>

          {/* Locations */}
          <LocationPicker
            isPro={false}
            locations={locations}
            onChange={setLocations}
            error={locationError}
          />

          {/* Bio */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Bio (optional)</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              maxLength={500}
              className="w-full px-4 py-3 bg-ink border border-gray-800 rounded text-white focus:border-ether focus:outline-none resize-none"
              placeholder="Tell people about your style..."
            />
            <p className="text-xs text-gray-600 mt-1">{bio.length}/500</p>
          </div>

          {/* Booking Link */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Booking Link (optional)</label>
            <input
              type="url"
              value={bookingLink}
              onChange={(e) => setBookingLink(e.target.value)}
              className="w-full px-4 py-3 bg-ink border border-gray-800 rounded text-white focus:border-ether focus:outline-none"
              placeholder="https://instagram.com/yourhandle"
            />
            <p className="text-xs text-gray-600 mt-2">
              Instagram DM link, website, Calendly, or any booking method
            </p>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            onClick={handleContinue}
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 transition"
          >
            {loading ? 'Saving...' : 'Continue →'}
          </button>
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
          <div className="w-16 h-16 border-4 border-ether border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading...</p>
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
