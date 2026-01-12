'use client'

import { useEffect } from 'react'
import { capturePostHog } from '@/lib/analytics/posthog'
import { EVENTS } from '@/lib/analytics/events'

interface PricingPageTrackerProps {
  source?: string
}

/**
 * Tracks pricing page views for analytics.
 * Fires on mount to capture when users view pricing options.
 */
export function PricingPageTracker({ source }: PricingPageTrackerProps) {
  useEffect(() => {
    capturePostHog(EVENTS.PRICING_VIEWED, {
      source: source || 'direct',
      referrer: typeof document !== 'undefined' ? document.referrer : undefined,
    })
  }, [source])

  return null
}
