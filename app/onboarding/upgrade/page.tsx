/* eslint-disable @typescript-eslint/no-explicit-any -- API response types vary */
'use client';
import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Crown, Check, Sparkles } from 'lucide-react';
import EmbeddedCheckout from '@/components/stripe/EmbeddedCheckout';
import { PRICING, FREE_FEATURES, PRO_FEATURES } from '@/lib/pricing/config';

function UpgradeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const artistId = searchParams.get('artist_id');
  const intent = searchParams.get('intent'); // 'pro' if user clicked "Go Pro" link

  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');
  const [showCheckout, setShowCheckout] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState('');
  const [checkoutError, setCheckoutError] = useState('');

  // Validate session and artist on load
  useEffect(() => {
    const validateSession = async () => {
      if (!sessionId) {
        setError('No session ID found');
        setInitialLoading(false);
        setTimeout(() => router.push('/add-artist'), 3000);
        return;
      }

      if (!artistId) {
        setError('Please complete Step 1 first');
        setInitialLoading(false);
        setTimeout(() => router.push(`/onboarding/info?session_id=${sessionId}`), 3000);
        return;
      }

      try {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();

        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setError('Please log in to continue');
          setInitialLoading(false);
          return;
        }

        // Validate session belongs to user and matches artist_id
        const { data: session, error: sessionError } = await supabase
          .from('onboarding_sessions')
          .select('user_id, artist_id, expires_at')
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

        // Check session expiration
        if (session.expires_at && new Date(session.expires_at) < new Date()) {
          setError('Session expired. Please start over.');
          setInitialLoading(false);
          setTimeout(() => router.push('/add-artist'), 3000);
          return;
        }

        // Validate artist belongs to current user
        const { data: artist, error: artistError } = await supabase
          .from('artists')
          .select('id, is_pro, claimed_by_user_id')
          .eq('id', artistId)
          .single();

        if (artistError || !artist) {
          setError('Artist not found. Please start over.');
          setInitialLoading(false);
          setTimeout(() => router.push('/add-artist'), 3000);
          return;
        }

        if (artist.claimed_by_user_id !== user.id) {
          setError('Invalid artist. Please start over.');
          setInitialLoading(false);
          setTimeout(() => router.push('/add-artist'), 3000);
          return;
        }

        // If already Pro, skip to next step
        if (artist.is_pro) {
          router.push(`/onboarding/portfolio?session_id=${sessionId}&artist_id=${artistId}&upgraded=true`);
          return;
        }

        setInitialLoading(false);

        // Auto-show checkout if user came from "Go Pro" link
        if (intent === 'pro') {
          setShowCheckout(true);
        }
      } catch (err: any) {
        console.error('[Upgrade] Error validating session:', err);
        setError('Failed to load. Please try again.');
        setInitialLoading(false);
      }
    };

    validateSession();
  }, [sessionId, artistId, intent, router]);

  const handleSkip = () => {
    router.push(`/onboarding/portfolio?session_id=${sessionId}&artist_id=${artistId}`);
  };

  const handleUpgrade = () => {
    setCheckoutError('');
    setShowCheckout(true);
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
    <div className="max-w-3xl mx-auto">
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
                      <Check className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
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
                      <Check className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                      <span className="font-body text-sm text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {error && (
              <div className="bg-status-error/10 border-2 border-status-error p-3 mb-4">
                <p className="font-body text-status-error text-sm">{error}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2">
              <button
                onClick={handleSkip}
                className="btn btn-secondary px-6 sm:px-8 py-2.5 sm:py-3 text-sm sm:text-base"
              >
                Continue Free
              </button>
              <button
                onClick={handleUpgrade}
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
            {/* Checkout View */}
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

            {checkoutError && (
              <div className="bg-status-error/10 border-2 border-status-error p-3 mb-4">
                <p className="font-body text-status-error text-sm">{checkoutError}</p>
              </div>
            )}

            {artistId && sessionId && (
              <EmbeddedCheckout
                plan={selectedPlan}
                artistId={artistId}
                sessionId={sessionId}
                onError={setCheckoutError}
              />
            )}
          </>
        )}

        {/* Step indicator */}
        <p className="font-mono text-[10px] sm:text-xs text-gray-500 text-center uppercase tracking-wider pt-4 mt-4 border-t border-border-subtle">
          Step 2 of 4 <span className="text-gray-400">(Optional)</span>
        </p>
      </div>
    </div>
  );
}

function UpgradeLoadingFallback() {
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

export default function UpgradePage() {
  return (
    <Suspense fallback={<UpgradeLoadingFallback />}>
      <UpgradeContent />
    </Suspense>
  );
}
