'use client'

import { Suspense, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { usePostHogInstance } from './PostHogProvider'

/**
 * ReferralTracker Component
 *
 * Captures referral and UTM parameters from the URL on first page load.
 * Stores them in PostHog as user properties with $set_once (first-touch attribution).
 *
 * Tracked parameters:
 * - ref: Custom referral source (e.g., ambassador ID, campaign name)
 * - utm_source: Traffic source (e.g., google, reddit, instagram)
 * - utm_medium: Traffic medium (e.g., cpc, social, email)
 * - utm_campaign: Campaign name
 * - utm_content: Ad content/variant
 * - utm_term: Search keywords
 */
function ReferralTrackerInner() {
  const searchParams = useSearchParams()
  const posthog = usePostHogInstance()
  const hasTracked = useRef(false)

  useEffect(() => {
    // Only track once per session - but only skip if we actually tracked successfully
    // (posthog may be null on first mount due to lazy loading)
    if (hasTracked.current) return
    if (typeof window === 'undefined') return
    if (!posthog) return // Wait for PostHog to load before attempting to track

    // Check if we already tracked referral in this session
    // Wrap in try-catch for private browsing mode
    try {
      const sessionTracked = sessionStorage.getItem('inkdex_referral_tracked')
      if (sessionTracked) {
        hasTracked.current = true
        return
      }
    } catch {
      // sessionStorage unavailable (private browsing), continue without deduplication
    }

    // Extract referral params
    const ref = searchParams.get('ref')
    const utmSource = searchParams.get('utm_source')
    const utmMedium = searchParams.get('utm_medium')
    const utmCampaign = searchParams.get('utm_campaign')
    const utmContent = searchParams.get('utm_content')
    const utmTerm = searchParams.get('utm_term')

    // Only proceed if we have at least one tracking param
    if (!ref && !utmSource && !utmMedium && !utmCampaign) {
      hasTracked.current = true
      try {
        sessionStorage.setItem('inkdex_referral_tracked', 'true')
      } catch {
        // Ignore storage errors
      }
      return
    }

    // Build properties object (only include non-null values)
    const properties: Record<string, string> = {}
    if (ref) properties.referral_source = ref
    if (utmSource) properties.utm_source = utmSource
    if (utmMedium) properties.utm_medium = utmMedium
    if (utmCampaign) properties.utm_campaign = utmCampaign
    if (utmContent) properties.utm_content = utmContent
    if (utmTerm) properties.utm_term = utmTerm

    // Add landing page
    properties.landing_page = window.location.pathname

    // Store in sessionStorage for persistence across navigations
    try {
      sessionStorage.setItem('inkdex_referral', JSON.stringify(properties))
      sessionStorage.setItem('inkdex_referral_tracked', 'true')
    } catch {
      // Ignore storage errors in private browsing
    }

    // Track in PostHog if available
    if (posthog) {
      // Capture referral event with $set_once for first-touch attribution
      posthog.capture('Referral Landed', {
        ...properties,
        referrer: document.referrer || undefined,
        $set_once: {
          referral_source: properties.referral_source,
          utm_source: properties.utm_source,
          utm_medium: properties.utm_medium,
          utm_campaign: properties.utm_campaign,
          utm_content: properties.utm_content,
          utm_term: properties.utm_term,
          landing_page: properties.landing_page,
          first_referrer: document.referrer || undefined,
        },
      })
    }

    hasTracked.current = true
  }, [searchParams, posthog])

  return null
}

/**
 * ReferralTracker with Suspense boundary
 * Required because useSearchParams needs Suspense in Next.js App Router
 */
export function ReferralTracker() {
  return (
    <Suspense fallback={null}>
      <ReferralTrackerInner />
    </Suspense>
  )
}

/**
 * Hook to get stored referral data
 * Useful for passing referral context to events
 */
export function useReferralData(): Record<string, string> | null {
  if (typeof window === 'undefined') return null

  try {
    const stored = sessionStorage.getItem('inkdex_referral')
    if (!stored) return null
    return JSON.parse(stored)
  } catch {
    return null
  }
}
