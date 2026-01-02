'use client'

/**
 * Google Analytics Component
 *
 * Conditionally loads GA4 tracking scripts based on user consent
 * - Only loads if NEXT_PUBLIC_GA_MEASUREMENT_ID is configured
 * - Only loads if user has given analytics consent
 * - Respects DNT (Do Not Track) headers
 * - Listens for consent changes in real-time (cross-tab sync)
 *
 * GDPR Compliance:
 * - anonymize_ip: true (IP anonymization)
 * - cookie_flags: 'SameSite=None;Secure' (secure cookies)
 *
 * Security:
 * - GA ID format validated (defense-in-depth against XSS)
 * - useSyncExternalStore prevents hydration mismatches
 */

import Script from 'next/script'
import { useSyncExternalStore } from 'react'
import { hasAnalyticsConsent, isDoNotTrack, CONSENT_CHANGE_EVENT } from '@/lib/consent/consent-manager'

/**
 * Subscribe to consent changes for useSyncExternalStore
 */
function subscribe(callback: () => void) {
  if (typeof window === 'undefined') return () => {}

  window.addEventListener(CONSENT_CHANGE_EVENT, callback)
  window.addEventListener('storage', callback)

  return () => {
    window.removeEventListener(CONSENT_CHANGE_EVENT, callback)
    window.removeEventListener('storage', callback)
  }
}

/**
 * Get current consent snapshot (client-side)
 */
function getSnapshot() {
  if (typeof window === 'undefined') return false
  if (isDoNotTrack()) return false
  return hasAnalyticsConsent()
}

/**
 * Get server-side snapshot (always false for SSR)
 */
function getServerSnapshot() {
  return false
}

/**
 * Validate GA4 Measurement ID format
 * Defense-in-depth: Prevent potential XSS if env vars are compromised
 */
function isValidGaId(gaId: string | undefined): gaId is string {
  if (!gaId) return false
  return /^G-[A-Z0-9]{10,}$/.test(gaId)
}

export function GoogleAnalytics() {
  // Use useSyncExternalStore to prevent hydration mismatches
  const hasConsent = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID

  // Validate GA ID format (defense-in-depth)
  if (!isValidGaId(gaId)) {
    if (gaId) {
      console.error('[GoogleAnalytics] Invalid GA4 Measurement ID format:', gaId)
    }
    return null
  }

  // Don't load if user hasn't consented or DNT enabled
  if (!hasConsent) return null

  return (
    <>
      {/* Load gtag.js script */}
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
        strategy="afterInteractive"
      />

      {/* Initialize GA4 with GDPR-compliant config */}
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${gaId}', {
            anonymize_ip: true,
            cookie_flags: 'SameSite=None;Secure'
          });
        `}
      </Script>
    </>
  )
}
