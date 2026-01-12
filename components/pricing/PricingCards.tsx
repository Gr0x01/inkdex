'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Crown, Check, Loader2, Sparkles } from 'lucide-react'
import { PRICING, FREE_FEATURES, PRO_FEATURES } from '@/lib/pricing/config'
import { capturePostHog } from '@/lib/analytics/posthog'
import { EVENTS } from '@/lib/analytics/events'

type UserState = 'loading' | 'logged-out' | 'no-artist' | 'free' | 'pro'

export default function PricingCards() {
  const [userState, setUserState] = useState<UserState>('loading')
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly')
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function checkUserState() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setUserState('logged-out')
        return
      }

      // Check if user has an artist profile
      const { data: artist } = await supabase
        .from('artists')
        .select('id, is_pro')
        .eq('claimed_by_user_id', user.id)
        .single()

      if (!artist) {
        setUserState('no-artist')
        return
      }

      setUserState(artist.is_pro ? 'pro' : 'free')
    }

    checkUserState()
  }, [])

  const handleUpgrade = async () => {
    setCheckoutLoading(true)
    setError(null)

    // Track checkout started event
    capturePostHog(EVENTS.CHECKOUT_STARTED, {
      plan_type: selectedPlan,
      price: selectedPlan === 'monthly' ? PRICING.monthly.amount : PRICING.yearly.amount,
    })

    try {
      const res = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: selectedPlan }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create checkout')
      }

      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setCheckoutLoading(false)
    }
  }

  const showPlanToggle = userState === 'free'
  const { monthly, yearly, yearlySavings } = PRICING

  return (
    <div className="max-w-4xl mx-auto">
      {/* Plan Toggle - Only show for logged-in free users */}
      {showPlanToggle && (
        <div className="flex justify-center mb-8">
          <div className="inline-flex items-center gap-1 p-1 bg-gray-100 rounded-full">
            <button
              onClick={() => setSelectedPlan('monthly')}
              className={`px-4 py-2 rounded-full font-mono text-xs uppercase tracking-wider transition-colors ${
                selectedPlan === 'monthly'
                  ? 'bg-white text-ink shadow-sm'
                  : 'text-gray-600 hover:text-ink'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setSelectedPlan('yearly')}
              className={`px-4 py-2 rounded-full font-mono text-xs uppercase tracking-wider transition-colors flex items-center gap-2 ${
                selectedPlan === 'yearly'
                  ? 'bg-white text-ink shadow-sm'
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
      )}

      {/* Pricing Cards */}
      <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
        {/* Free Tier */}
        <div className="border-2 border-gray-200 bg-white p-6 md:p-8 flex flex-col">
          <div className="mb-6">
            <h3 className="font-heading text-xl mb-2">Free</h3>
            <p className="font-body text-sm text-gray-600">
              Get discovered by clients searching for your style
            </p>
          </div>

          <div className="mb-6">
            <div className="flex items-baseline gap-1">
              <span className="font-display text-4xl font-bold">$0</span>
              <span className="font-mono text-sm text-gray-500">/forever</span>
            </div>
          </div>

          <ul className="space-y-3 mb-8 flex-grow">
            {FREE_FEATURES.map((feature) => (
              <li key={feature} className="flex items-start gap-3">
                <Check className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                <span className="font-body text-sm text-gray-700">{feature}</span>
              </li>
            ))}
          </ul>

          {userState === 'loading' ? (
            <div className="h-12 bg-gray-100 animate-pulse rounded" />
          ) : userState === 'pro' ? (
            <div className="text-center py-3 font-mono text-xs uppercase tracking-wider text-gray-500">
              You started here
            </div>
          ) : (
            <Link
              href="/add-artist"
              className="block w-full py-3 border-2 border-ink text-center font-mono text-xs uppercase tracking-wider hover:bg-gray-50 transition-colors"
            >
              Get Started Free
            </Link>
          )}
        </div>

        {/* Pro Tier */}
        <div className="border-2 border-purple-500 bg-white p-6 md:p-8 flex flex-col relative">
          {/* Popular badge */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-600 text-white font-mono text-[10px] uppercase tracking-wider">
              <Sparkles className="w-3 h-3" />
              Most Popular
            </span>
          </div>

          <div className="mb-6 pt-2">
            <div className="flex items-center gap-2 mb-2">
              <Crown className="w-5 h-5 text-purple-500" />
              <h3 className="font-heading text-xl">Pro</h3>
            </div>
            <p className="font-body text-sm text-gray-600">
              Maximize your visibility and save time with auto-sync
            </p>
          </div>

          <div className="mb-6">
            {showPlanToggle ? (
              <div className="flex items-baseline gap-1">
                <span className="font-display text-4xl font-bold">
                  ${selectedPlan === 'monthly' ? monthly.amount : yearly.amount}
                </span>
                <span className="font-mono text-sm text-gray-500">
                  /{selectedPlan === 'monthly' ? monthly.interval : yearly.interval}
                </span>
              </div>
            ) : (
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="font-display text-4xl font-bold">${monthly.amount}</span>
                  <span className="font-mono text-sm text-gray-500">/{monthly.interval}</span>
                </div>
                <p className="font-body text-xs text-gray-500 mt-1">
                  or ${yearly.amount}/{yearly.interval} (save ${yearlySavings})
                </p>
              </div>
            )}
          </div>

          <ul className="space-y-3 mb-8 flex-grow">
            {PRO_FEATURES.map((feature) => (
              <li key={feature} className="flex items-start gap-3">
                <Check className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                <span className="font-body text-sm text-gray-700">{feature}</span>
              </li>
            ))}
          </ul>

          {error && (
            <div className="bg-red-50 border border-red-200 p-3 mb-4 rounded">
              <p className="font-body text-sm text-red-800">{error}</p>
            </div>
          )}

          {userState === 'loading' ? (
            <div className="h-12 bg-purple-100 animate-pulse rounded" />
          ) : userState === 'pro' ? (
            <div className="flex items-center justify-center gap-2 py-3 bg-purple-50 text-purple-700 font-mono text-xs uppercase tracking-wider">
              <Crown className="w-4 h-4" />
              You&apos;re on Pro
            </div>
          ) : userState === 'free' ? (
            <button
              onClick={handleUpgrade}
              disabled={checkoutLoading}
              className="w-full py-3 bg-purple-600 text-white font-mono text-xs uppercase tracking-wider hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {checkoutLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Crown className="w-4 h-4" />
                  Upgrade Now
                </>
              )}
            </button>
          ) : (
            <Link
              href="/add-artist"
              className="block w-full py-3 bg-purple-600 text-white text-center font-mono text-xs uppercase tracking-wider hover:bg-purple-700 transition-colors"
            >
              Get Started with Pro
            </Link>
          )}
        </div>
      </div>

      {/* Trust signals */}
      <div className="mt-8 text-center">
        <p className="font-body text-xs text-gray-500">
          Secure payment via Stripe. Cancel anytime.
        </p>
      </div>
    </div>
  )
}
