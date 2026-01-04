'use client'

import { useState } from 'react'
import { Crown, Check, Loader2, ExternalLink } from 'lucide-react'

interface SubscriptionData {
  id: string
  subscription_type: string
  status: string
  current_period_end: string | null
  cancel_at_period_end: boolean
  stripe_subscription_id: string | null
}

interface SubscriptionManagerProps {
  isPro: boolean
  subscription: SubscriptionData | null
}

const PRO_FEATURES = [
  'Unlimited portfolio images',
  'Auto-sync new Instagram posts',
  'Pin up to 6 images to top',
  'Search ranking boost',
  'Pro badge on profile',
  'Detailed analytics dashboard',
  'Priority support',
]

const FREE_FEATURES = [
  '20 portfolio images',
  'Manual import only',
  'Basic profile',
  'Verified badge',
]

export default function SubscriptionManager({
  isPro,
  subscription,
}: SubscriptionManagerProps) {
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly')
  const [loading, setLoading] = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleUpgrade = async () => {
    setLoading(true)
    setError(null)

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

      // Redirect to Stripe Checkout
      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
  }

  const handleManageBilling = async () => {
    setPortalLoading(true)

    try {
      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to open billing portal')
      }

      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setPortalLoading(false)
    }
  }

  // Pro user - show current plan and management options
  if (isPro && subscription) {
    const periodEnd = subscription.current_period_end
      ? new Date(subscription.current_period_end).toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        })
      : null

    return (
      <div className="space-y-6">
        {/* Current Plan Card */}
        <div className="border border-gray-300 bg-white p-6">
          <div className="flex items-center gap-3 mb-4">
            <Crown className="w-6 h-6 text-purple-500" />
            <h2 className="font-heading text-xl">Inkdex Pro</h2>
            {subscription.status === 'active' && (
              <span className="px-2 py-0.5 bg-green-100 text-green-800 font-mono text-[10px] uppercase tracking-wider">
                Active
              </span>
            )}
            {subscription.status === 'past_due' && (
              <span className="px-2 py-0.5 bg-red-100 text-red-800 font-mono text-[10px] uppercase tracking-wider">
                Past Due
              </span>
            )}
          </div>

          {periodEnd && (
            <p className="font-body text-sm text-gray-600 mb-4">
              {subscription.cancel_at_period_end
                ? `Your subscription will end on ${periodEnd}`
                : `Next billing date: ${periodEnd}`}
            </p>
          )}

          {subscription.cancel_at_period_end && (
            <div className="bg-amber-50 border border-amber-200 p-4 mb-4">
              <p className="font-body text-sm text-amber-800">
                Your subscription is set to cancel. You&apos;ll lose Pro features after{' '}
                {periodEnd}. Reactivate anytime from the billing portal.
              </p>
            </div>
          )}

          <button
            onClick={handleManageBilling}
            disabled={portalLoading}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 font-mono text-xs uppercase tracking-wider hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {portalLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ExternalLink className="w-4 h-4" />
            )}
            Manage Billing
          </button>
        </div>

        {/* Pro Features */}
        <div className="border border-gray-200 bg-gray-50 p-6">
          <h3 className="font-mono text-xs uppercase tracking-wider text-gray-500 mb-4">
            Your Pro Features
          </h3>
          <ul className="space-y-2">
            {PRO_FEATURES.map((feature) => (
              <li key={feature} className="flex items-center gap-2 font-body text-sm">
                <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                {feature}
              </li>
            ))}
          </ul>
        </div>
      </div>
    )
  }

  // Free user - show upgrade options
  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <div className="border border-gray-200 bg-gray-50 p-6">
        <h2 className="font-heading text-xl mb-2">Free Plan</h2>
        <p className="font-body text-sm text-gray-600 mb-4">
          You&apos;re on the free plan with limited features.
        </p>
        <ul className="space-y-2">
          {FREE_FEATURES.map((feature) => (
            <li key={feature} className="flex items-center gap-2 font-body text-sm text-gray-600">
              <Check className="w-4 h-4 text-gray-400 flex-shrink-0" />
              {feature}
            </li>
          ))}
        </ul>
      </div>

      {/* Upgrade to Pro */}
      <div className="border border-purple-300 bg-white p-6">
        <div className="flex items-center gap-3 mb-4">
          <Crown className="w-6 h-6 text-purple-500" />
          <h2 className="font-heading text-xl">Upgrade to Pro</h2>
        </div>

        <ul className="space-y-2 mb-6">
          {PRO_FEATURES.map((feature) => (
            <li key={feature} className="flex items-center gap-2 font-body text-sm">
              <Check className="w-4 h-4 text-purple-600 flex-shrink-0" />
              {feature}
            </li>
          ))}
        </ul>

        {/* Plan Selection */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <button
            onClick={() => setSelectedPlan('monthly')}
            className={`p-4 border-2 transition-colors ${
              selectedPlan === 'monthly'
                ? 'border-purple-500 bg-purple-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <p className="font-heading text-lg">$15</p>
            <p className="font-mono text-[10px] uppercase tracking-wider text-gray-500">
              per month
            </p>
          </button>
          <button
            onClick={() => setSelectedPlan('yearly')}
            className={`p-4 border-2 transition-colors relative ${
              selectedPlan === 'yearly'
                ? 'border-purple-500 bg-purple-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <span className="absolute -top-2 right-2 px-2 py-0.5 bg-green-500 text-white font-mono text-[9px] uppercase tracking-wider">
              Save $30
            </span>
            <p className="font-heading text-lg">$150</p>
            <p className="font-mono text-[10px] uppercase tracking-wider text-gray-500">
              per year
            </p>
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 p-3 mb-4">
            <p className="font-body text-sm text-red-800">{error}</p>
          </div>
        )}

        <button
          onClick={handleUpgrade}
          disabled={loading}
          className="w-full px-6 py-3 bg-purple-600 text-white font-mono text-xs uppercase tracking-wider hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
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

        <p className="font-body text-xs text-gray-500 text-center mt-3">
          Cancel anytime. No refunds.
        </p>
      </div>
    </div>
  )
}
