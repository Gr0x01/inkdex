import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import LocationPicker, { Location } from '@/components/onboarding/LocationPicker';

/**
 * Interactive Onboarding Flow
 *
 * Click-through simulation of the complete 3-step onboarding experience:
 * 1. Basic Info - Enter name, bio, booking link
 * 2. Locations - Add shop location(s)
 * 3. Complete - Auto-finalize and redirect to dashboard
 *
 * Features:
 * - Form validation
 * - Progress indicator updates
 * - Simulated API responses
 * - Editorial design system (paper & ink aesthetic)
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

  const validateStep1 = () => {
    setError('');

    if (!name.trim()) {
      setError('Name is required');
      return false;
    }

    if (bookingLink && !/^https?:\/\/.+/.test(bookingLink)) {
      setError('Booking link must be a valid URL starting with http:// or https://');
      return false;
    }

    return true;
  };

  const validateStep2 = () => {
    setLocationError('');

    if (locations.length === 0) {
      setLocationError('Please add at least one location');
      return false;
    }

    const primaryLocation = locations[0];
    if (primaryLocation.locationType === 'city' && !primaryLocation.city) {
      setLocationError('City is required');
      return false;
    }

    return true;
  };

  const handleContinueStep1 = () => {
    if (!validateStep1()) return;

    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      setCurrentStep(2);
    }, 800);
  };

  const handleContinueStep2 = () => {
    if (!validateStep2()) return;

    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      setCurrentStep(3);
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
  };

  // Step 1: Basic Info
  if (currentStep === 1) {
    return (
      <div className="min-h-screen bg-[var(--paper-white)] relative">
        {/* Grain texture overlay */}
        <div className="grain-overlay absolute inset-0 pointer-events-none" />

        <div className="relative">
          {/* Info Form */}
          <main className="container mx-auto px-3 sm:px-4 lg:px-6 py-6 sm:py-8 lg:py-12 max-w-2xl">
            <div className="bg-paper border-2 border-border-subtle p-4 sm:p-6 lg:p-8 shadow-md">
              {/* Header */}
              <div className="mb-5 sm:mb-6">
                <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl text-ink mb-2">Basic Info</h1>
                <p className="font-body text-sm sm:text-base text-gray-700">Let's start with the essentials</p>
              </div>

              <div className="space-y-4 sm:space-y-5">
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

                {error && (
                  <div className="bg-status-error/10 border-2 border-status-error p-3">
                    <p className="font-body text-status-error text-sm">{error}</p>
                  </div>
                )}

                {/* Primary CTA */}
                <button
                  onClick={handleContinueStep1}
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

            {/* Reset button for testing */}
            <div className="mt-6 text-center">
              <button
                onClick={handleReset}
                className="font-mono text-xs text-gray-500 hover:text-ink uppercase tracking-wider underline transition-colors"
              >
                Reset Demo
              </button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // Step 2: Locations
  if (currentStep === 2) {
    return (
      <div className="min-h-screen bg-[var(--paper-white)] relative">
        {/* Grain texture overlay */}
        <div className="grain-overlay absolute inset-0 pointer-events-none" />

        <div className="relative">
          {/* Locations Form */}
          <main className="container mx-auto px-3 sm:px-4 lg:px-6 py-6 sm:py-8 lg:py-12 max-w-2xl">
            <div className="bg-paper border-2 border-border-subtle p-4 sm:p-6 lg:p-8 shadow-md">
              {/* Header */}
              <div className="mb-5 sm:mb-6">
                <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl text-ink mb-2">Where Do You Work?</h1>
                <p className="font-body text-sm sm:text-base text-gray-700">Add your shop location(s)</p>
              </div>

              <div className="space-y-5 sm:space-y-6">
                {/* Locations */}
                <LocationPicker
                  isPro={false}
                  locations={locations}
                  onChange={setLocations}
                  error={locationError}
                />

                {/* Navigation buttons */}
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2">
                  <button
                    onClick={() => setCurrentStep(1)}
                    className="btn btn-secondary px-6 sm:px-8 py-2.5 sm:py-3 text-sm sm:text-base"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={handleContinueStep2}
                    disabled={loading}
                    className="btn btn-primary flex-1 py-2.5 sm:py-3 text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Saving...' : 'Continue →'}
                  </button>
                </div>

                {/* Subtle helper text */}
                <p className="font-mono text-[10px] sm:text-xs text-gray-500 text-center uppercase tracking-wider pt-1">
                  Step 2 of 3
                </p>
              </div>
            </div>

            {/* Reset button for testing */}
            <div className="mt-6 text-center">
              <button
                onClick={handleReset}
                className="font-mono text-xs text-gray-500 hover:text-ink uppercase tracking-wider underline transition-colors"
              >
                Reset Demo
              </button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // Step 3: Complete
  return (
    <div className="min-h-screen bg-[var(--paper-white)] relative">
      {/* Grain texture overlay */}
      <div className="grain-overlay absolute inset-0 pointer-events-none" />

      <div className="relative">
        {/* Complete Screen */}
        <main className="container mx-auto px-3 sm:px-4 lg:px-6 py-6 sm:py-8 lg:py-12 max-w-2xl">
          <div className="max-w-2xl mx-auto text-center">
            <div className="bg-paper border-2 border-border-subtle p-6 sm:p-8 lg:p-10 shadow-md">
              {/* Loading Spinner */}
              <div className="w-12 h-12 sm:w-16 sm:h-16 border-2 border-ink border-t-transparent rounded-full animate-spin mx-auto mb-4 sm:mb-5" />

              <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl text-ink mb-2">Creating Your Profile...</h1>
              <p className="font-body text-sm sm:text-base text-gray-700">Setting up your profile</p>

              {/* Info Box */}
              <div className="mt-6 p-5 bg-gray-100 border-2 border-border-subtle">
                <p className="font-mono text-xs text-gray-700 uppercase tracking-wider mb-3">
                  What Happens Next
                </p>
                <div className="font-body text-sm text-gray-700 space-y-1.5 text-left">
                  <p>• Pin your favorite images to showcase your best work</p>
                  <p>• Manage your portfolio and locations</p>
                  <p>• View analytics and profile performance</p>
                  <p>• Upgrade to Pro for unlimited portfolio and auto-sync</p>
                </div>
              </div>

              {/* Reset Button */}
              <button
                onClick={handleReset}
                className="mt-6 btn btn-secondary px-6 sm:px-8 py-2.5 sm:py-3 text-sm sm:text-base"
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

Complete click-through simulation of the streamlined 3-step onboarding experience.

## Features

- ✅ **Live form validation** - See errors in real-time
- ✅ **Progress indicator** - Updates as you move through steps
- ✅ **Location picker** - Full interactive location selection
- ✅ **Character counter** - Bio character limit (500 chars)
- ✅ **Simulated API delays** - Realistic loading states
- ✅ **Editorial design** - Matches Inkdex's paper & ink aesthetic
- ✅ **Reset button** - Start over anytime

## How to Use

1. **Step 1**: Fill in basic info (name, bio, booking link)
2. **Step 2**: Add your location(s) - where you work
3. **Step 3**: See the completion screen
4. Click "Try Again" to reset the demo

## What's Different from Old Flow

**Old (5 steps, 3-5 minutes):**
1. Fetch (blocking) - Wait for Instagram
2. Preview - Enter profile info
3. Portfolio - Select 20 images manually
4. Booking - Add booking link
5. Complete - Redirect to artist profile

**New (3 steps, 1-2 minutes):**
1. Basic Info - Simple text inputs only
2. Locations - Just the location picker (separated for clarity)
3. Complete - Auto-redirect to dashboard

## Validation Rules

**Step 1 (Basic Info):**
- **Name**: Required
- **Bio**: Optional, max 500 characters
- **Booking Link**: Optional, must be valid URL if provided

**Step 2 (Locations):**
- **Locations**: At least 1 location required
- **City**: Required for city-based locations
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
 * Mobile view of the flow (375px × 667px)
 */
export const MobileFlow: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'mobile',
    },
  },
};

/**
 * Tablet view of the flow (768px × 1024px)
 */
export const TabletFlow: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'tablet',
    },
  },
};
