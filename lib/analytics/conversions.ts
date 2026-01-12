/**
 * Google Ads Conversion Tracking
 *
 * Fire conversion events for Google Ads campaigns.
 * Requires gtag to be loaded (via GoogleAnalytics component).
 *
 * Usage:
 *   import { trackClaimConversion, trackSearchConversion } from '@/lib/analytics/conversions'
 *
 *   // After artist claims profile
 *   trackClaimConversion()
 *
 *   // After search results display
 *   trackSearchConversion()
 */

import { capturePostHog } from './posthog'

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
    dataLayer?: unknown[]
  }
}

const GOOGLE_ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID
const CLAIM_LABEL = process.env.NEXT_PUBLIC_GADS_CLAIM_LABEL
const SEARCH_LABEL = process.env.NEXT_PUBLIC_GADS_SEARCH_LABEL

/**
 * Check if gtag is available and consent was given
 */
function isGtagReady(): boolean {
  return typeof window !== 'undefined' && typeof window.gtag === 'function'
}

/**
 * Track artist claim conversion
 * Call this after an artist successfully claims their profile
 *
 * @param value - Optional conversion value (default: 1.0)
 */
export function trackClaimConversion(value: number = 1.0): void {
  // PostHog event (always try, regardless of Google Ads)
  capturePostHog('Artist Claimed', { value, currency: 'USD' })

  if (!isGtagReady()) {
    console.debug('[Conversions] gtag not ready, skipping claim conversion')
    return
  }

  if (!GOOGLE_ADS_ID || !CLAIM_LABEL) {
    console.debug('[Conversions] Missing GOOGLE_ADS_ID or CLAIM_LABEL, skipping')
    return
  }

  window.gtag!('event', 'conversion', {
    send_to: `${GOOGLE_ADS_ID}/${CLAIM_LABEL}`,
    value,
    currency: 'USD',
  })

  console.debug('[Conversions] Fired claim conversion', { value })
}

/**
 * Track search completion conversion
 * Call this after search results are displayed to the user
 *
 * @param value - Optional conversion value (default: 0.1)
 */
export function trackSearchConversion(value: number = 0.1): void {
  // PostHog event (always try, regardless of Google Ads)
  capturePostHog('Search Completed', { value, currency: 'USD' })

  if (!isGtagReady()) {
    console.debug('[Conversions] gtag not ready, skipping search conversion')
    return
  }

  if (!GOOGLE_ADS_ID || !SEARCH_LABEL) {
    console.debug('[Conversions] Missing GOOGLE_ADS_ID or SEARCH_LABEL, skipping')
    return
  }

  window.gtag!('event', 'conversion', {
    send_to: `${GOOGLE_ADS_ID}/${SEARCH_LABEL}`,
    value,
    currency: 'USD',
  })

  console.debug('[Conversions] Fired search conversion', { value })
}

/**
 * Track a custom conversion event
 * Use this for any additional conversion actions
 *
 * @param label - The conversion label (without the AW-XXXXX/ prefix)
 * @param value - Conversion value
 */
export function trackCustomConversion(label: string, value: number = 0): void {
  if (!isGtagReady()) {
    console.debug('[Conversions] gtag not ready, skipping custom conversion')
    return
  }

  if (!GOOGLE_ADS_ID) {
    console.debug('[Conversions] Missing GOOGLE_ADS_ID, skipping')
    return
  }

  window.gtag!('event', 'conversion', {
    send_to: `${GOOGLE_ADS_ID}/${label}`,
    value,
    currency: 'USD',
  })

  console.debug('[Conversions] Fired custom conversion', { label, value })
}
