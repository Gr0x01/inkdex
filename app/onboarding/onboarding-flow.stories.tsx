import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { ProgressIndicator } from '@/components/onboarding/ProgressIndicator';
import LocationPicker, { Location } from '@/components/onboarding/LocationPicker';

/**
 * Interactive Onboarding Flow
 *
 * Click-through simulation of the complete 2-step onboarding experience:
 * 1. Profile Info - Enter name, locations, bio, booking link
 * 2. Complete - Auto-finalize and redirect to dashboard
 *
 * Features:
 * - Mock background Instagram fetch (completes after 3 seconds)
 * - Form validation
 * - Progress indicator updates
 * - Simulated API responses
 */

function OnboardingFlowSimulator() {
  const [currentStep, setCurrentStep] = useState(1);
  const [name, setName] = useState('');
  const [locations, setLocations] = useState<Location[]>([]);
  const [bio, setBio] = useState('');
  const [bookingLink, setBookingLink] = useState('');
  const [error, setError] = useState('');
  const [locationError, setLocationError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchStatus, setFetchStatus] = useState<'pending' | 'in_progress' | 'completed'>('pending');
  const [fetchProgress, setFetchProgress] = useState(0);

  // Simulate background Instagram fetch
  useState(() => {
    setTimeout(() => {
      setFetchStatus('in_progress');
      let progress = 0;
      const interval = setInterval(() => {
        progress += 20;
        setFetchProgress(progress);
        if (progress >= 100) {
          setFetchStatus('completed');
          clearInterval(interval);
        }
      }, 600);
    }, 500);
  });

  const validateForm = () => {
    setError('');
    setLocationError('');

    if (!name.trim()) {
      setError('Name is required');
      return false;
    }

    if (locations.length === 0) {
      setLocationError('Please add at least one location');
      return false;
    }

    const primaryLocation = locations[0];
    if (primaryLocation.locationType === 'city' && !primaryLocation.city) {
      setLocationError('City is required');
      return false;
    }

    if (bookingLink && !/^https?:\/\/.+/.test(bookingLink)) {
      setError('Booking link must be a valid URL starting with http:// or https://');
      return false;
    }

    return true;
  };

  const handleContinue = () => {
    if (!validateForm()) return;

    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      setCurrentStep(2);
    }, 800);
  };

  const handleReset = () => {
    setCurrentStep(1);
    setName('');
    setLocations([]);
    setBio('');
    setBookingLink('');
    setError('');
    setLocationError('');
    setFetchStatus('pending');
    setFetchProgress(0);
  };

  if (currentStep === 1) {
    return (
      <div className="min-h-screen bg-[var(--paper-white)] relative">
        {/* Grain texture overlay */}
        <div className="grain-overlay absolute inset-0 pointer-events-none" />

        <div className="relative">
          {/* Progress indicator */}
          <ProgressIndicator currentStep={1} />

          {/* Background Fetch Status Indicator */}
          <div className="container mx-auto px-4 max-w-2xl mb-4">
            <div className={`text-xs font-mono p-3 rounded border ${
              fetchStatus === 'completed'
                ? 'bg-green-50 border-green-500 text-green-900'
                : fetchStatus === 'in_progress'
                ? 'bg-blue-50 border-blue-500 text-blue-900'
                : 'bg-gray-50 border-gray-300 text-gray-600'
            }`}>
              <div className="flex items-center justify-between mb-1">
                <span>
                  {fetchStatus === 'completed' && '✓ Instagram fetch completed'}
                  {fetchStatus === 'in_progress' && '⏳ Fetching Instagram images...'}
                  {fetchStatus === 'pending' && '⏸ Instagram fetch starting...'}
                </span>
                {fetchStatus === 'in_progress' && (
                  <span className="font-medium">{fetchProgress}%</span>
                )}
              </div>
              {fetchStatus === 'in_progress' && (
                <div className="w-full h-1 bg-gray-200 rounded overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${fetchProgress}%` }}
                  />
                </div>
              )}
              {fetchStatus === 'completed' && (
                <p className="text-[10px] mt-1">
                  Found 24 images, 18 classified as tattoo work. Will auto-import on completion.
                </p>
              )}
            </div>
          </div>

          {/* Info Form */}
          <main className="container mx-auto px-4 py-8 max-w-2xl">
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

            {/* Reset button for testing */}
            <div className="mt-4 text-center">
              <button
                onClick={handleReset}
                className="text-xs text-gray-500 hover:text-gray-300 underline"
              >
                Reset Demo
              </button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // Step 2: Complete
  return (
    <div className="min-h-screen bg-[var(--paper-white)] relative">
      {/* Grain texture overlay */}
      <div className="grain-overlay absolute inset-0 pointer-events-none" />

      <div className="relative">
        {/* Progress indicator */}
        <ProgressIndicator currentStep={2} />

        {/* Complete Screen */}
        <main className="container mx-auto px-4 py-8 max-w-2xl">
          <div className="max-w-2xl mx-auto text-center">
            <div className="bg-paper-dark border border-gray-800 rounded-lg p-12">
              <div className="w-16 h-16 border-4 border-ether border-t-transparent rounded-full animate-spin mx-auto mb-6" />
              <h1 className="font-display text-2xl text-white mb-2">Creating Your Profile...</h1>
              <p className="text-gray-400">Setting up your profile</p>

              {fetchStatus === 'completed' && (
                <div className="mt-6 p-4 bg-green-900/20 border border-green-800 rounded text-green-400 text-sm">
                  ✓ Instagram images ready - importing 18 classified images
                </div>
              )}

              <p className="text-xs text-gray-500 mt-8">
                In the real flow, you'll be redirected to the dashboard where you can:
                <br />• Pin your favorite images
                <br />• Manage your portfolio
                <br />• View analytics
              </p>

              <button
                onClick={handleReset}
                className="mt-6 px-6 py-2 border border-gray-700 text-gray-400 rounded hover:border-gray-500 text-sm"
              >
                ← Try Again
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

const meta = {
  title: 'Onboarding/Complete Flow (Interactive)',
  component: OnboardingFlowSimulator,
  parameters: {
    layout: 'fullscreen',
    backgrounds: { default: 'paper' },
    docs: {
      description: {
        component: `
# Interactive Onboarding Flow

Complete click-through simulation of the streamlined 2-step onboarding experience.

## Features

- ✅ **Background fetch simulation** - Instagram fetch runs automatically and completes after 3 seconds
- ✅ **Live form validation** - See errors in real-time
- ✅ **Progress indicator** - Updates as you move through steps
- ✅ **Location picker** - Full interactive location selection
- ✅ **Character counter** - Bio character limit (500 chars)
- ✅ **Simulated API delays** - Realistic loading states
- ✅ **Reset button** - Start over anytime

## How to Use

1. Fill in the profile information (name is required, at least one location required)
2. Watch the background Instagram fetch progress in the blue status bar
3. Click "Continue" to proceed to Step 2
4. See the completion screen with auto-import status
5. Click "Try Again" to reset the demo

## What's Different from Old Flow

**Old (5 steps, 3-5 minutes):**
1. Fetch (blocking) - Wait for Instagram
2. Preview - Enter profile info
3. Portfolio - Select 20 images manually
4. Booking - Add booking link
5. Complete - Redirect to artist profile

**New (2 steps, 30-60 seconds):**
1. Profile Info - Enter everything at once (Instagram fetches in background)
2. Complete - Auto-redirect to dashboard

## Validation Rules

- **Name**: Required, 2-100 characters
- **Locations**: At least 1 location required
- **Bio**: Optional, max 500 characters
- **Booking Link**: Optional, must be valid URL if provided
        `,
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof OnboardingFlowSimulator>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Complete interactive onboarding flow
 */
export const InteractiveFlow: Story = {};

/**
 * Mobile view of the flow
 */
export const MobileFlow: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
  },
};

/**
 * Tablet view of the flow
 */
export const TabletFlow: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'tablet',
    },
  },
};
