/**
 * Conversion Tracking
 *
 * Fire conversion events for PostHog and Google Ads campaigns.
 * Requires gtag to be loaded (via GoogleAnalytics component) for Google Ads.
 *
 * Usage:
 *   import { trackClaimConversion, trackSearchConversion } from '@/lib/analytics/conversions'
 *
 *   // After artist claims profile
 *   trackClaimConversion()
 *
 *   // After search results display
 *   trackSearchConversion({ search_type: 'text', result_count: 10 })
 */

import { capturePostHog, setUserPropertiesOnce, incrementUserProperty } from './posthog'
import { EVENTS, type SearchCompletedProperties } from './events'

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
  capturePostHog(EVENTS.CLAIM_COMPLETED, { value, currency: 'USD' })

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
 * @param properties - Search metadata for analytics
 * @param value - Optional conversion value (default: 0.1)
 */
export function trackSearchConversion(
  properties?: Partial<SearchCompletedProperties>,
  value: number = 0.1
): void {
  const eventProps = {
    ...properties,
    value,
    currency: 'USD',
  }

  // PostHog event with enhanced properties
  capturePostHog(EVENTS.SEARCH_COMPLETED, eventProps)

  // Track first search if this is the user's first
  if (properties?.is_first_search) {
    capturePostHog(EVENTS.FIRST_SEARCH, {
      search_type: properties.search_type,
      referrer: typeof document !== 'undefined' ? document.referrer : undefined,
      landing_page: typeof window !== 'undefined' ? window.location.pathname : undefined,
    })
    setUserPropertiesOnce({
      first_search_at: new Date().toISOString(),
    })
  }

  // Increment search count
  incrementUserProperty('search_count', 1)

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
