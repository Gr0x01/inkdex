import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { Crown, MapPin, Globe, Plus, X, Check, Sparkles } from 'lucide-react';
import Select from '@/components/ui/Select';
import { PRICING, FREE_FEATURES, PRO_FEATURES } from '@/lib/pricing/config';

// =============================================================================
// MOCK DATA
// =============================================================================

const MOCK_US_CITIES = [
  { value: 'New York', label: 'New York, NY' },
  { value: 'Los Angeles', label: 'Los Angeles, CA' },
  { value: 'Chicago', label: 'Chicago, IL' },
  { value: 'Houston', label: 'Houston, TX' },
  { value: 'Phoenix', label: 'Phoenix, AZ' },
  { value: 'Philadelphia', label: 'Philadelphia, PA' },
  { value: 'San Antonio', label: 'San Antonio, TX' },
  { value: 'San Diego', label: 'San Diego, CA' },
  { value: 'Dallas', label: 'Dallas, TX' },
  { value: 'Austin', label: 'Austin, TX' },
  { value: 'San Jose', label: 'San Jose, CA' },
  { value: 'San Francisco', label: 'San Francisco, CA' },
  { value: 'Seattle', label: 'Seattle, WA' },
  { value: 'Denver', label: 'Denver, CO' },
  { value: 'Boston', label: 'Boston, MA' },
  { value: 'Nashville', label: 'Nashville, TN' },
  { value: 'Portland', label: 'Portland, OR' },
  { value: 'Las Vegas', label: 'Las Vegas, NV' },
  { value: 'Miami', label: 'Miami, FL' },
  { value: 'Atlanta', label: 'Atlanta, GA' },
  { value: 'Minneapolis', label: 'Minneapolis, MN' },
  { value: 'Detroit', label: 'Detroit, MI' },
  { value: 'Brooklyn', label: 'Brooklyn, NY' },
  { value: 'Oakland', label: 'Oakland, CA' },
  { value: 'Tampa', label: 'Tampa, FL' },
];

const MOCK_US_STATES = [
  { value: 'AL', label: 'Alabama' },
  { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' },
  { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' },
  { value: 'DE', label: 'Delaware' },
  { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' },
  { value: 'HI', label: 'Hawaii' },
  { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' },
  { value: 'IN', label: 'Indiana' },
  { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' },
  { value: 'KY', label: 'Kentucky' },
  { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' },
  { value: 'MD', label: 'Maryland' },
  { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' },
  { value: 'MN', label: 'Minnesota' },
  { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' },
  { value: 'MT', label: 'Montana' },
  { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' },
  { value: 'NH', label: 'New Hampshire' },
  { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' },
  { value: 'NY', label: 'New York' },
  { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' },
  { value: 'OH', label: 'Ohio' },
  { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' },
  { value: 'PA', label: 'Pennsylvania' },
  { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' },
  { value: 'SD', label: 'South Dakota' },
  { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' },
  { value: 'UT', label: 'Utah' },
  { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' },
  { value: 'WA', label: 'Washington' },
  { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' },
  { value: 'WY', label: 'Wyoming' },
];

const MOCK_COUNTRIES = [
  { value: 'US', label: 'United States' },
  { value: 'CA', label: 'Canada' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'AU', label: 'Australia' },
  { value: 'DE', label: 'Germany' },
  { value: 'FR', label: 'France' },
  { value: 'ES', label: 'Spain' },
  { value: 'IT', label: 'Italy' },
  { value: 'JP', label: 'Japan' },
  { value: 'BR', label: 'Brazil' },
  { value: 'MX', label: 'Mexico' },
  { value: 'NL', label: 'Netherlands' },
  { value: 'SE', label: 'Sweden' },
  { value: 'NO', label: 'Norway' },
  { value: 'DK', label: 'Denmark' },
  { value: 'NZ', label: 'New Zealand' },
  { value: 'IE', label: 'Ireland' },
  { value: 'PT', label: 'Portugal' },
  { value: 'AT', label: 'Austria' },
  { value: 'CH', label: 'Switzerland' },
];

// City to state mapping for auto-fill
const CITY_STATE_MAP: Record<string, string> = {
  'new york': 'NY',
  'los angeles': 'CA',
  'chicago': 'IL',
  'houston': 'TX',
  'phoenix': 'AZ',
  'philadelphia': 'PA',
  'san antonio': 'TX',
  'san diego': 'CA',
  'dallas': 'TX',
  'austin': 'TX',
  'san jose': 'CA',
  'san francisco': 'CA',
  'seattle': 'WA',
  'denver': 'CO',
  'boston': 'MA',
  'nashville': 'TN',
  'portland': 'OR',
  'las vegas': 'NV',
  'miami': 'FL',
  'atlanta': 'GA',
  'minneapolis': 'MN',
  'detroit': 'MI',
  'brooklyn': 'NY',
  'oakland': 'CA',
  'tampa': 'FL',
};

// =============================================================================
// TYPES
// =============================================================================

interface Location {
  city: string | null;
  region: string | null;
  countryCode: string;
  locationType: 'city' | 'region' | 'country';
  isPrimary: boolean;
}

// =============================================================================
// STEP 1: BASIC INFO (Required)
// =============================================================================

interface Step1Props {
  initialEmail?: string;
  initialName?: string;
  initialBio?: string;
  onSubmit?: () => void;
}

function Step1BasicInfo({
  initialEmail = '',
  initialName = '',
  initialBio = '',
  onSubmit,
}: Step1Props) {
  const [email, setEmail] = useState(initialEmail);
  const [emailError, setEmailError] = useState('');
  const [name, setName] = useState(initialName);
  const [bio, setBio] = useState(initialBio);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isValidEmail = (emailStr: string) => {
    // Match production validation (case-insensitive, normalized to lowercase)
    const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
    return emailRegex.test(emailStr.toLowerCase());
  };

  const handleSubmit = () => {
    setEmailError('');
    setError('');

    if (!email.trim()) {
      setEmailError('Email is required');
      return;
    }
    if (!isValidEmail(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }
    if (email.endsWith('@instagram.inkdex.io')) {
      setEmailError('Please use your real email address');
      return;
    }
    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onSubmit?.();
    }, 800);
  };

  return (
    <div className="min-h-screen bg-(--paper-white) relative">
      <div className="grain-overlay absolute inset-0 pointer-events-none" />
      <div className="relative">
        <main className="container mx-auto px-3 sm:px-4 lg:px-6 py-6 sm:py-8 lg:py-12 max-w-2xl">
          <div className="bg-paper border-2 border-border-subtle p-4 sm:p-6 lg:p-8 shadow-md">
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

              <button
                onClick={handleSubmit}
                disabled={loading}
                className="btn btn-primary w-full py-2.5 sm:py-3 text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating Profile...' : 'Create Profile →'}
              </button>

              <p className="font-mono text-[10px] sm:text-xs text-gray-500 text-center uppercase tracking-wider pt-1">
                Step 1 of 4
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

// =============================================================================
// STEP 2: PRO UPGRADE (Optional)
// =============================================================================

interface Step2UpgradeProps {
  onUpgrade?: () => void;
  onSkip?: () => void;
}

function Step2Upgrade({ onUpgrade, onSkip }: Step2UpgradeProps) {
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');
  const [showCheckout, setShowCheckout] = useState(false);

  return (
    <div className="min-h-screen bg-(--paper-white) relative">
      <div className="grain-overlay absolute inset-0 pointer-events-none" />
      <div className="relative">
        <main className="container mx-auto px-3 sm:px-4 lg:px-6 py-6 sm:py-8 lg:py-12 max-w-3xl">
          <div className="bg-paper border-2 border-border-subtle p-4 sm:p-6 lg:p-8 shadow-md">
            {/* Header */}
            <div className="mb-5 sm:mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Crown className="w-6 h-6 sm:w-7 sm:h-7 text-purple-600" />
                <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl text-ink">Upgrade to Pro</h1>
              </div>
              <p className="font-body text-sm sm:text-base text-gray-700">
                Maximize your visibility and save time with auto-sync
              </p>
            </div>

            {!showCheckout ? (
              <>
                {/* Plan Toggle */}
                <div className="flex justify-center mb-6">
                  <div className="inline-flex items-center gap-1 p-1 bg-gray-100 border-2 border-border-subtle">
                    <button
                      onClick={() => setSelectedPlan('monthly')}
                      className={`px-4 py-2 font-mono text-xs uppercase tracking-wider transition-colors ${
                        selectedPlan === 'monthly'
                          ? 'bg-paper text-ink shadow-sm'
                          : 'text-gray-600 hover:text-ink'
                      }`}
                    >
                      Monthly
                    </button>
                    <button
                      onClick={() => setSelectedPlan('yearly')}
                      className={`px-4 py-2 font-mono text-xs uppercase tracking-wider transition-colors flex items-center gap-2 ${
                        selectedPlan === 'yearly'
                          ? 'bg-paper text-ink shadow-sm'
                          : 'text-gray-600 hover:text-ink'
                      }`}
                    >
                      Yearly
                      <span className="text-[10px] text-green-600 font-semibold">
                        Save ${PRICING.yearlySavings}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Comparison Cards */}
                <div className="grid md:grid-cols-2 gap-4 mb-6">
                  {/* Free Card */}
                  <div className="border-2 border-gray-200 bg-white p-4 sm:p-5">
                    <div className="mb-4">
                      <h3 className="font-heading text-lg mb-1">Free</h3>
                      <div className="flex items-baseline gap-1">
                        <span className="font-display text-2xl font-bold">$0</span>
                        <span className="font-mono text-xs text-gray-500">/forever</span>
                      </div>
                    </div>
                    <ul className="space-y-2">
                      {FREE_FEATURES.map((feature) => (
                        <li key={feature} className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                          <span className="font-body text-sm text-gray-700">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Pro Card */}
                  <div className="border-2 border-purple-500 bg-white p-4 sm:p-5 relative">
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-600 text-white font-mono text-[10px] uppercase tracking-wider">
                        <Sparkles className="w-3 h-3" />
                        Recommended
                      </span>
                    </div>
                    <div className="mb-4 pt-2">
                      <div className="flex items-center gap-2 mb-1">
                        <Crown className="w-4 h-4 text-purple-500" />
                        <h3 className="font-heading text-lg">Pro</h3>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="font-display text-2xl font-bold">
                          ${selectedPlan === 'monthly' ? PRICING.monthly.amount : PRICING.yearly.amount}
                        </span>
                        <span className="font-mono text-xs text-gray-500">
                          /{selectedPlan === 'monthly' ? PRICING.monthly.interval : PRICING.yearly.interval}
                        </span>
                      </div>
                    </div>
                    <ul className="space-y-2">
                      {PRO_FEATURES.map((feature) => (
                        <li key={feature} className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                          <span className="font-body text-sm text-gray-700">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2">
                  <button
                    onClick={onSkip}
                    className="btn btn-secondary px-6 sm:px-8 py-2.5 sm:py-3 text-sm sm:text-base"
                  >
                    Continue Free
                  </button>
                  <button
                    onClick={() => setShowCheckout(true)}
                    className="btn flex-1 py-2.5 sm:py-3 text-sm sm:text-base bg-purple-600 text-white hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Crown className="w-4 h-4" />
                    Upgrade to Pro
                  </button>
                </div>

                {/* Trust signals */}
                <p className="font-body text-xs text-gray-500 text-center mt-4">
                  Secure payment via Stripe. Cancel anytime.
                </p>
              </>
            ) : (
              <>
                {/* Checkout View (Mock) */}
                <div className="mb-4">
                  <button
                    onClick={() => setShowCheckout(false)}
                    className="font-mono text-xs text-gray-600 hover:text-ink uppercase tracking-wider"
                  >
                    &larr; Back to plans
                  </button>
                </div>

                <div className="bg-gray-50 border-2 border-border-subtle p-3 mb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Crown className="w-4 h-4 text-purple-600" />
                      <span className="font-mono text-xs uppercase tracking-wider">
                        Pro {selectedPlan === 'monthly' ? 'Monthly' : 'Yearly'}
                      </span>
                    </div>
                    <span className="font-display text-lg font-bold">
                      ${selectedPlan === 'monthly' ? PRICING.monthly.amount : PRICING.yearly.amount}
                      <span className="font-mono text-xs text-gray-500">
                        /{selectedPlan === 'monthly' ? 'mo' : 'yr'}
                      </span>
                    </span>
                  </div>
                </div>

                {/* Mock Stripe Checkout Form */}
                <div className="border-2 border-border-subtle p-6 bg-gray-50">
                  <div className="space-y-4">
                    <div>
                      <label className="block font-mono text-xs text-gray-600 mb-2 uppercase tracking-wider">
                        Card Number
                      </label>
                      <div className="input w-full bg-white text-gray-400">
                        4242 4242 4242 4242
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block font-mono text-xs text-gray-600 mb-2 uppercase tracking-wider">
                          Expiry
                        </label>
                        <div className="input w-full bg-white text-gray-400">12/28</div>
                      </div>
                      <div>
                        <label className="block font-mono text-xs text-gray-600 mb-2 uppercase tracking-wider">
                          CVC
                        </label>
                        <div className="input w-full bg-white text-gray-400">123</div>
                      </div>
                    </div>
                    <button
                      onClick={onUpgrade}
                      className="w-full py-3 bg-purple-600 text-white font-mono text-xs uppercase tracking-wider hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <Crown className="w-4 h-4" />
                      Subscribe to Pro
                    </button>
                    <p className="text-center font-body text-xs text-gray-500">
                      Demo only - no real payment processed
                    </p>
                  </div>
                </div>
              </>
            )}

            {/* Step indicator */}
            <p className="font-mono text-[10px] sm:text-xs text-gray-500 text-center uppercase tracking-wider pt-4 mt-4 border-t border-border-subtle">
              Step 2 of 4 <span className="text-gray-400">(Optional)</span>
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}

// =============================================================================
// STEP 3: PORTFOLIO SETTINGS (Optional)
// =============================================================================

interface Step3Props {
  isPro?: boolean;
  initialBookingLink?: string;
  onContinue?: () => void;
  onSkip?: () => void;
}

function Step3PortfolioSettings({
  isPro = false,
  initialBookingLink = '',
  onContinue,
  onSkip,
}: Step3Props) {
  const [bookingLink, setBookingLink] = useState(initialBookingLink);
  // Auto-sync defaults to OFF - free tier can't enable, Pro tier can toggle
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
  // Filter defaults to ON - free tier can't disable, Pro tier can toggle
  const [filterNonTattoo, setFilterNonTattoo] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleContinue = () => {
    setError('');

    if (bookingLink && !/^https?:\/\/.+/.test(bookingLink)) {
      setError('Booking link must be a valid URL starting with http:// or https://');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onContinue?.();
    }, 500);
  };

  return (
    <div className="min-h-screen bg-(--paper-white) relative">
      <div className="grain-overlay absolute inset-0 pointer-events-none" />
      <div className="relative">
        <main className="container mx-auto px-3 sm:px-4 lg:px-6 py-6 sm:py-8 lg:py-12 max-w-2xl">
          <div className="bg-paper border-2 border-border-subtle p-4 sm:p-6 lg:p-8 shadow-md">
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
                      className={`relative inline-flex border-2 overflow-hidden h-7 w-20 shrink-0 ${
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
                      <div className={`absolute top-0 bottom-0 left-1/2 -ml-px w-[2px] z-10 ${isPro ? 'bg-ink' : 'bg-gray-300'}`} />
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
                      className={`relative inline-flex border-2 overflow-hidden h-7 w-20 shrink-0 ${
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
                      <div className={`absolute top-0 bottom-0 left-1/2 -ml-px w-[2px] z-10 ${isPro ? 'bg-ink' : 'bg-gray-300'}`} />
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
                  onClick={onSkip}
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

              <p className="font-mono text-[10px] sm:text-xs text-gray-500 text-center uppercase tracking-wider pt-1">
                Step 3 of 4 <span className="text-gray-400">(Optional)</span>
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

// =============================================================================
// STEP 4: LOCATIONS (Optional)
// =============================================================================

interface Step4Props {
  isPro?: boolean;
  initialLocations?: Location[];
  onFinish?: () => void;
  onSkip?: () => void;
}

function Step4Locations({
  isPro = false,
  initialLocations = [],
  onFinish,
  onSkip,
}: Step4Props) {
  const [locations, setLocations] = useState<Location[]>(initialLocations);
  const [locationType, setLocationType] = useState<'city' | 'region'>('city');
  const [selectedCountry, setSelectedCountry] = useState<string>('US');
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [cityInput, setCityInput] = useState<string | null>(null);
  const [regionInput, setRegionInput] = useState<string>('');
  const [isAdding, setIsAdding] = useState(false);
  const [newCountry, setNewCountry] = useState<string>('US');
  const [newCity, setNewCity] = useState<string>('');
  const [newRegion, setNewRegion] = useState<string>('');
  const [locationError, setLocationError] = useState('');
  const [loading, setLoading] = useState(false);

  const maxLocations = isPro ? 20 : 1;

  const handleCityChange = (city: string | null) => {
    setCityInput(city);
    if (city) {
      const stateCode = CITY_STATE_MAP[city.toLowerCase()];
      if (stateCode) {
        setSelectedState(stateCode);
      }
    }
  };

  const handleFinish = () => {
    setLocationError('');
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onFinish?.();
    }, 500);
  };

  const formatLocation = (loc: Location): string => {
    const parts: string[] = [];
    if (loc.city) parts.push(loc.city);
    if (loc.region) {
      const state = MOCK_US_STATES.find(s => s.value === loc.region);
      parts.push(state ? state.label : loc.region);
    }
    if (loc.countryCode !== 'US') {
      const country = MOCK_COUNTRIES.find(c => c.value === loc.countryCode);
      parts.push(country ? country.label : loc.countryCode);
    }
    return parts.join(', ') || 'Unknown location';
  };

  const handleAddLocation = () => {
    if (!newCity.trim() && newCountry === 'US' && !newRegion.trim()) return;
    if (!newCity.trim() && newCountry !== 'US') return;

    const newLocation: Location = {
      countryCode: newCountry,
      city: newCity.trim() || null,
      region: newCountry === 'US' ? newRegion || null : (newRegion.trim() || null),
      locationType: newCity.trim() ? 'city' : 'region',
      isPrimary: locations.length === 0,
    };

    setLocations([...locations, newLocation]);
    setNewCity('');
    setNewRegion('');
    setIsAdding(false);
  };

  const handleRemoveLocation = (index: number) => {
    const newLocations = locations.filter((_, i) => i !== index);
    if (newLocations.length > 0 && !newLocations.some((l) => l.isPrimary)) {
      newLocations[0].isPrimary = true;
    }
    setLocations(newLocations);
  };

  const handleSetPrimary = (index: number) => {
    const newLocations = locations.map((loc, i) => ({
      ...loc,
      isPrimary: i === index,
    }));
    setLocations(newLocations);
  };

  return (
    <div className="min-h-screen bg-(--paper-white) relative">
      <div className="grain-overlay absolute inset-0 pointer-events-none" />
      <div className="relative">
        <main className="container mx-auto px-3 sm:px-4 lg:px-6 py-6 sm:py-8 lg:py-12 max-w-2xl">
          <div className="bg-paper border-2 border-border-subtle p-4 sm:p-6 lg:p-8 shadow-md">
            <div className="mb-5 sm:mb-6">
              <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl text-ink mb-2">Where Do You Work?</h1>
              <p className="font-body text-sm sm:text-base text-gray-700">Add your shop location(s) so clients can find you</p>
            </div>

            <div className="space-y-5 sm:space-y-6">
              {/* Free tier single location */}
              {!isPro && (
                <div className="space-y-3">
                  <label className="block font-mono text-xs tracking-widest uppercase text-gray-700 mb-2">
                    Where are you based?
                  </label>

                  {/* Country Selector */}
                  <div>
                    <label className="block font-mono text-[10px] tracking-wider uppercase text-(--gray-500) mb-2">
                      Country
                    </label>
                    <Select
                      value={selectedCountry}
                      onChange={(val) => {
                        setSelectedCountry(val || 'US');
                        setSelectedState(null);
                        setCityInput(null);
                        setRegionInput('');
                      }}
                      options={MOCK_COUNTRIES}
                      placeholder="Select country"
                      searchable
                      searchPlaceholder="Search countries..."
                    />
                  </div>

                  {/* US-specific: City OR State toggle */}
                  {selectedCountry === 'US' && (
                    <>
                      <div className="flex gap-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="locationType"
                            checked={locationType === 'city'}
                            onChange={() => setLocationType('city')}
                            className="w-3.5 h-3.5 text-(--ink-black) border-2 border-(--gray-400) focus:ring-(--ink-black)"
                          />
                          <span className="font-body text-(--text-primary)">Specific city</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="locationType"
                            checked={locationType === 'region'}
                            onChange={() => setLocationType('region')}
                            className="w-3.5 h-3.5 text-(--ink-black) border-2 border-(--gray-400) focus:ring-(--ink-black)"
                          />
                          <span className="font-body text-(--text-primary)">State-wide</span>
                        </label>
                      </div>

                      {locationType === 'city' ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block font-mono text-[10px] tracking-wider uppercase text-(--gray-500) mb-2">
                              City
                            </label>
                            <Select
                              value={cityInput}
                              onChange={handleCityChange}
                              options={MOCK_US_CITIES}
                              placeholder="Select city"
                              searchable
                              searchPlaceholder="Search cities..."
                            />
                          </div>
                          <div>
                            <label className="block font-mono text-[10px] tracking-wider uppercase text-(--gray-500) mb-2">
                              State
                            </label>
                            <Select
                              value={selectedState}
                              onChange={(val) => setSelectedState(val)}
                              options={MOCK_US_STATES}
                              placeholder="Select state"
                              searchable
                              searchPlaceholder="Search states..."
                              disabled={!!cityInput}
                            />
                          </div>
                        </div>
                      ) : (
                        <div>
                          <label className="block font-mono text-[10px] tracking-wider uppercase text-(--gray-500) mb-2">
                            State
                          </label>
                          <Select
                            value={selectedState}
                            onChange={(val) => setSelectedState(val)}
                            options={MOCK_US_STATES}
                            placeholder="Select state"
                            searchable
                            searchPlaceholder="Search states..."
                          />
                          <p className="mt-1 font-body text-sm text-(--gray-500) italic">
                            You&apos;ll appear in searches for this entire state
                          </p>
                        </div>
                      )}
                    </>
                  )}

                  {/* International: City + Region */}
                  {selectedCountry !== 'US' && (
                    <div className="space-y-3">
                      <div>
                        <label className="block font-mono text-[10px] tracking-wider uppercase text-(--gray-500) mb-2">
                          City
                        </label>
                        <input
                          type="text"
                          value={cityInput || ''}
                          onChange={(e) => setCityInput(e.target.value)}
                          className="input"
                          placeholder="London"
                        />
                      </div>
                      <div>
                        <label className="block font-mono text-[10px] tracking-wider uppercase text-(--gray-500) mb-2">
                          Region / Province
                          <span className="ml-2 font-normal text-(--gray-400) normal-case tracking-normal">(Optional)</span>
                        </label>
                        <input
                          type="text"
                          value={regionInput}
                          onChange={(e) => setRegionInput(e.target.value)}
                          className="input"
                          placeholder="England"
                        />
                      </div>
                    </div>
                  )}

                  {locationError && (
                    <p className="text-(--error) text-sm font-body">{locationError}</p>
                  )}
                </div>
              )}

              {/* Pro tier multi-location */}
              {isPro && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block font-mono text-[11px] font-medium tracking-[0.15em] uppercase text-(--gray-700)">
                      <Globe className="inline w-4 h-4 mr-1 -mt-0.5" />
                      Locations ({locations.length}/{maxLocations})
                    </label>
                    {locations.length < maxLocations && !isAdding && (
                      <button
                        type="button"
                        onClick={() => setIsAdding(true)}
                        className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-(--ink-black) hover:text-(--gray-700) transition-colors"
                      >
                        <Plus className="w-3 h-3" /> Add location
                      </button>
                    )}
                  </div>

                  {/* Existing locations list */}
                  {locations.length > 0 && (
                    <div className="space-y-2">
                      {locations.map((loc, index) => (
                        <div
                          key={index}
                          className={`flex items-center justify-between p-3 border-2 ${
                            loc.isPrimary
                              ? 'border-(--ink-black) bg-(--gray-50)'
                              : 'border-(--border-subtle)'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <MapPin className={`w-4 h-4 ${loc.isPrimary ? 'text-(--ink-black)' : 'text-(--gray-400)'}`} />
                            <span className="font-body text-(--text-primary)">
                              {formatLocation(loc)}
                            </span>
                            {loc.isPrimary && (
                              <span className="font-mono text-[9px] uppercase tracking-wider bg-(--ink-black) text-(--paper-white) px-2 py-0.5">
                                Primary
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {!loc.isPrimary && (
                              <button
                                type="button"
                                onClick={() => handleSetPrimary(index)}
                                className="font-mono text-[9px] uppercase tracking-wider text-(--gray-500) hover:text-(--ink-black) transition-colors"
                              >
                                Set primary
                              </button>
                            )}
                            {locations.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveLocation(index)}
                                className="p-1 text-(--gray-400) hover:text-(--error) transition-colors"
                                aria-label="Remove location"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add new location form */}
                  {isAdding && (
                    <div className="border-2 border-dashed border-(--gray-300) p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] uppercase tracking-wider text-(--gray-500)">
                          Add new location
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsAdding(false)}
                          className="text-(--gray-400) hover:text-(--gray-600)"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div>
                        <label className="block font-mono text-[10px] tracking-wider uppercase text-(--gray-500) mb-2">
                          Country
                        </label>
                        <Select
                          value={newCountry}
                          onChange={(val) => {
                            setNewCountry(val || 'US');
                            setNewRegion('');
                          }}
                          options={MOCK_COUNTRIES}
                          placeholder="Select country"
                          searchable
                          searchPlaceholder="Search countries..."
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block font-mono text-[10px] tracking-wider uppercase text-(--gray-500) mb-2">
                            City
                          </label>
                          <input
                            type="text"
                            value={newCity}
                            onChange={(e) => setNewCity(e.target.value)}
                            className="input"
                            placeholder="Enter city"
                          />
                        </div>
                        <div>
                          <label className="block font-mono text-[10px] tracking-wider uppercase text-(--gray-500) mb-2">
                            {newCountry === 'US' ? 'State' : 'Region'}
                          </label>
                          {newCountry === 'US' ? (
                            <Select
                              value={newRegion}
                              onChange={(val) => setNewRegion(val || '')}
                              options={MOCK_US_STATES}
                              placeholder="Select state"
                              searchable
                              searchPlaceholder="Search states..."
                            />
                          ) : (
                            <input
                              type="text"
                              value={newRegion}
                              onChange={(e) => setNewRegion(e.target.value)}
                              className="input"
                              placeholder="Province / Region"
                            />
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleAddLocation}
                        disabled={!newCity.trim() && newCountry !== 'US'}
                        className="w-full py-2 sm:py-2.5 bg-(--ink-black) text-(--paper-white) font-mono text-[10px] sm:text-[11px] uppercase tracking-wider hover:bg-(--gray-800) disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        Add Location
                      </button>
                    </div>
                  )}

                  {/* Empty state */}
                  {locations.length === 0 && !isAdding && (
                    <button
                      type="button"
                      onClick={() => setIsAdding(true)}
                      className="w-full p-6 border-2 border-dashed border-(--gray-300) text-center hover:border-(--gray-400) transition-colors"
                    >
                      <MapPin className="w-6 h-6 mx-auto mb-2 text-(--gray-400)" />
                      <span className="font-mono text-[11px] uppercase tracking-wider text-(--gray-500)">
                        Add your first location
                      </span>
                    </button>
                  )}

                  {locationError && (
                    <p className="text-(--error) text-sm font-body">{locationError}</p>
                  )}
                </div>
              )}

              {/* Navigation buttons */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2">
                <button
                  onClick={onSkip}
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

              <p className="font-mono text-[10px] sm:text-xs text-gray-500 text-center uppercase tracking-wider pt-1">
                Step 4 of 4 <span className="text-gray-400">(Optional)</span>
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

// =============================================================================
// INTERACTIVE FLOW (Full Click-Through Demo)
// =============================================================================

function OnboardingFlowSimulator() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isPro, setIsPro] = useState(false);

  const handleReset = () => {
    setCurrentStep(1);
    setIsPro(false);
  };

  const ResetButton = () => (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2">
      <button
        onClick={handleReset}
        className="font-mono text-xs text-gray-500 hover:text-ink uppercase tracking-wider underline transition-colors bg-white px-3 py-1 rounded shadow"
      >
        Reset Demo
      </button>
    </div>
  );

  if (currentStep === 1) {
    return (
      <div>
        <Step1BasicInfo onSubmit={() => setCurrentStep(2)} />
        <ResetButton />
      </div>
    );
  }

  if (currentStep === 2) {
    return (
      <div>
        <Step2Upgrade
          onUpgrade={() => {
            setIsPro(true);
            setCurrentStep(3);
          }}
          onSkip={() => setCurrentStep(3)}
        />
        <ResetButton />
      </div>
    );
  }

  if (currentStep === 3) {
    return (
      <div>
        <Step3PortfolioSettings
          isPro={isPro}
          onContinue={() => setCurrentStep(4)}
          onSkip={() => setCurrentStep(4)}
        />
        <ResetButton />
      </div>
    );
  }

  return (
    <div>
      <Step4Locations isPro={isPro} onFinish={handleReset} onSkip={handleReset} />
      <ResetButton />
    </div>
  );
}

// =============================================================================
// STORYBOOK META
// =============================================================================

const meta = {
  title: 'Onboarding',
  parameters: {
    layout: 'fullscreen',
    backgrounds: { default: 'paper' },
  },
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj;

// =============================================================================
// STORIES: STEP 1 - BASIC INFO
// =============================================================================

/**
 * Step 1: Basic Info - Empty form state (required step)
 */
export const Step1_BasicInfo: Story = {
  render: () => <Step1BasicInfo />,
  parameters: {
    docs: {
      description: {
        story: `
**Step 1: Basic Info (Required)**

The first step collects essential information:
- **Email** (required) - Contact email for notifications
- **Name** (required) - Display name on profile
- **Bio** (optional) - Up to 500 characters

On submit, the profile is created and Instagram sync begins.
        `,
      },
    },
  },
};

/**
 * Step 1: Pre-filled form (returning user)
 */
export const Step1_Prefilled: Story = {
  render: () => (
    <Step1BasicInfo
      initialEmail="artist@example.com"
      initialName="Luna Blackwood"
      initialBio="Specializing in blackwork and botanical designs. 10 years experience. Currently booking 2 months out."
    />
  ),
  parameters: {
    docs: {
      description: {
        story: 'Pre-filled state showing a returning user with existing data.',
      },
    },
  },
};

// =============================================================================
// STORIES: STEP 2 - PRO UPGRADE
// =============================================================================

/**
 * Step 2: Pro Upgrade - Plan comparison
 */
export const Step2_Upgrade: Story = {
  render: () => <Step2Upgrade />,
  parameters: {
    docs: {
      description: {
        story: `
**Step 2: Pro Upgrade (Optional)**

Shows side-by-side comparison of Free vs Pro tiers:
- **Plan Toggle** - Monthly or Yearly (with savings indicator)
- **Feature Comparison** - Lists benefits of each tier
- **Continue Free** - Skips to Step 3
- **Upgrade to Pro** - Shows embedded Stripe checkout

Users can skip this step to continue with a free account.
        `,
      },
    },
  },
};

/**
 * Step 2: Pro Upgrade - Checkout view
 */
export const Step2_Upgrade_Checkout: Story = {
  render: () => {
    // Show checkout view by default
    const UpgradeWithCheckout = () => {
      const [showCheckout] = useState(true);
      const [selectedPlan] = useState<'monthly' | 'yearly'>('yearly');

      return (
        <div className="min-h-screen bg-(--paper-white) relative">
          <div className="grain-overlay absolute inset-0 pointer-events-none" />
          <div className="relative">
            <main className="container mx-auto px-3 sm:px-4 lg:px-6 py-6 sm:py-8 lg:py-12 max-w-3xl">
              <div className="bg-paper border-2 border-border-subtle p-4 sm:p-6 lg:p-8 shadow-md">
                <div className="mb-5 sm:mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Crown className="w-6 h-6 sm:w-7 sm:h-7 text-purple-600" />
                    <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl text-ink">Upgrade to Pro</h1>
                  </div>
                </div>

                {showCheckout && (
                  <>
                    <div className="mb-4">
                      <button className="font-mono text-xs text-gray-600 hover:text-ink uppercase tracking-wider">
                        &larr; Back to plans
                      </button>
                    </div>

                    <div className="bg-gray-50 border-2 border-border-subtle p-3 mb-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Crown className="w-4 h-4 text-purple-600" />
                          <span className="font-mono text-xs uppercase tracking-wider">
                            Pro {selectedPlan === 'monthly' ? 'Monthly' : 'Yearly'}
                          </span>
                        </div>
                        <span className="font-display text-lg font-bold">
                          ${selectedPlan === 'monthly' ? PRICING.monthly.amount : PRICING.yearly.amount}
                          <span className="font-mono text-xs text-gray-500">
                            /{selectedPlan === 'monthly' ? 'mo' : 'yr'}
                          </span>
                        </span>
                      </div>
                    </div>

                    <div className="border-2 border-border-subtle p-6 bg-gray-50">
                      <div className="space-y-4">
                        <div>
                          <label className="block font-mono text-xs text-gray-600 mb-2 uppercase tracking-wider">
                            Card Number
                          </label>
                          <div className="input w-full bg-white text-gray-400">
                            4242 4242 4242 4242
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block font-mono text-xs text-gray-600 mb-2 uppercase tracking-wider">
                              Expiry
                            </label>
                            <div className="input w-full bg-white text-gray-400">12/28</div>
                          </div>
                          <div>
                            <label className="block font-mono text-xs text-gray-600 mb-2 uppercase tracking-wider">
                              CVC
                            </label>
                            <div className="input w-full bg-white text-gray-400">123</div>
                          </div>
                        </div>
                        <button className="w-full py-3 bg-purple-600 text-white font-mono text-xs uppercase tracking-wider flex items-center justify-center gap-2">
                          <Crown className="w-4 h-4" />
                          Subscribe to Pro
                        </button>
                        <p className="text-center font-body text-xs text-gray-500">
                          Demo only - no real payment processed
                        </p>
                      </div>
                    </div>
                  </>
                )}

                <p className="font-mono text-[10px] sm:text-xs text-gray-500 text-center uppercase tracking-wider pt-4 mt-4 border-t border-border-subtle">
                  Step 2 of 4 <span className="text-gray-400">(Optional)</span>
                </p>
              </div>
            </main>
          </div>
        </div>
      );
    };
    return <UpgradeWithCheckout />;
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows the embedded Stripe checkout form (mock) for Pro subscription.',
      },
    },
  },
};

// =============================================================================
// STORIES: STEP 3 - PORTFOLIO SETTINGS
// =============================================================================

/**
 * Step 3: Portfolio Settings - Free tier
 */
export const Step3_PortfolioSettings: Story = {
  render: () => <Step3PortfolioSettings />,
  parameters: {
    docs: {
      description: {
        story: `
**Step 3: Portfolio Settings (Optional)**

Configure booking and sync preferences:
- **Booking Link** (optional) - Any URL for booking
- **Daily Auto-Sync** (Pro only) - Auto-import new Instagram posts
- **Filter Non-Tattoo** (Pro only) - AI filters non-tattoo content

Users can Skip or Continue. Free tier sees grayed-out Pro features.
        `,
      },
    },
  },
};

/**
 * Step 3: Portfolio Settings - Pro tier
 */
export const Step3_PortfolioSettings_Pro: Story = {
  render: () => (
    <Step3PortfolioSettings
      isPro={true}
      initialBookingLink="https://calendly.com/lunablackwood"
    />
  ),
  parameters: {
    docs: {
      description: {
        story: 'Pro tier view with functional auto-sync and filter toggles.',
      },
    },
  },
};

// =============================================================================
// STORIES: STEP 4 - LOCATIONS
// =============================================================================

/**
 * Step 4: Location selection - Free tier (US)
 */
export const Step4_Locations_US: Story = {
  render: () => <Step4Locations />,
  parameters: {
    docs: {
      description: {
        story: `
**Step 4: Locations (Optional)**

Free tier users select a single location:
- **Country dropdown** - Pre-populated with common countries
- **City/State toggle** - Choose specific city or state-wide coverage
- **City dropdown** - Searchable list of major US cities
- **State dropdown** - Auto-fills when city is selected

Users can Skip or Finish.
        `,
      },
    },
  },
};

/**
 * Step 4: Location selection - Free tier (International)
 */
export const Step4_Locations_International: Story = {
  render: () => (
    <div>
      <Step4Locations />
      <div className="fixed top-4 right-4 bg-amber-100 border-2 border-amber-300 p-3 rounded shadow-lg max-w-xs">
        <p className="font-mono text-xs text-amber-800 uppercase tracking-wider mb-1">Demo Tip</p>
        <p className="font-body text-sm text-amber-900">Select a country other than US to see international location fields</p>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Select a country other than US to see the international location input fields (city + region text inputs).',
      },
    },
  },
};

/**
 * Step 4: Location selection - Pro tier (multiple locations)
 */
export const Step4_Locations_Pro: Story = {
  render: () => (
    <Step4Locations
      isPro={true}
      initialLocations={[
        { city: 'Austin', region: 'TX', countryCode: 'US', locationType: 'city', isPrimary: true },
        { city: 'Los Angeles', region: 'CA', countryCode: 'US', locationType: 'city', isPrimary: false },
      ]}
    />
  ),
  parameters: {
    docs: {
      description: {
        story: `
**Step 4: Locations (Pro Tier)**

Pro users can add up to 20 locations:
- View existing locations with primary indicator
- Add new locations via expandable form
- Set any location as primary
- Remove locations (except when only one remains)
        `,
      },
    },
  },
};

/**
 * Step 4: Pro tier - Empty state
 */
export const Step4_Locations_Pro_Empty: Story = {
  render: () => <Step4Locations isPro={true} />,
  parameters: {
    docs: {
      description: {
        story: 'Pro tier with no locations added yet. Shows the empty state with "Add your first location" prompt.',
      },
    },
  },
};

// =============================================================================
// STORIES: INTERACTIVE FLOW
// =============================================================================

/**
 * Complete interactive flow (click-through demo)
 */
export const InteractiveFlow: Story = {
  render: () => <OnboardingFlowSimulator />,
  parameters: {
    docs: {
      description: {
        story: `
# Interactive Onboarding Flow

Complete click-through simulation of the 4-step onboarding experience.

## How to Use

1. **Step 1 (Required)**: Fill in basic info (email, name, bio) → "Create Profile"
2. **Step 2 (Optional)**: Upgrade to Pro → "Upgrade to Pro" or "Continue Free"
3. **Step 3 (Optional)**: Add booking link and sync settings → "Continue" or "Skip"
4. **Step 4 (Optional)**: Add your location(s) → "Finish" or "Skip"

Click "Reset Demo" to start over.

## Key Features

- Step 1 creates the profile immediately (Instagram sync starts)
- Step 2 offers Pro upgrade with embedded Stripe checkout
- Steps 3 & 4 are optional - users can skip to dashboard
- If user upgrades to Pro in Step 2, Step 3 toggles become functional
        `,
      },
    },
  },
};

/**
 * Mobile view of the interactive flow
 */
export const InteractiveFlow_Mobile: Story = {
  render: () => <OnboardingFlowSimulator />,
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
    docs: {
      description: {
        story: 'Mobile view (375px width) of the interactive onboarding flow.',
      },
    },
  },
};

/**
 * Tablet view of the interactive flow
 */
export const InteractiveFlow_Tablet: Story = {
  render: () => <OnboardingFlowSimulator />,
  parameters: {
    viewport: {
      defaultViewport: 'tablet',
    },
    docs: {
      description: {
        story: 'Tablet view (768px width) of the interactive onboarding flow.',
      },
    },
  },
};
