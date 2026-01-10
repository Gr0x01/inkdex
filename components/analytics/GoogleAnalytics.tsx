'use client'

/**
 * Google Analytics & Google Ads Component
 *
 * Conditionally loads GA4 + Google Ads tracking scripts based on user consent
 * - Only loads if measurement IDs are configured
 * - Only loads if user has given analytics consent
 * - Respects DNT (Do Not Track) headers
 * - Listens for consent changes in real-time (cross-tab sync)
 *
 * GDPR Compliance:
 * - anonymize_ip: true (IP anonymization)
 * - cookie_flags: 'SameSite=None;Secure' (secure cookies)
 *
 * Security:
 * - ID formats validated (defense-in-depth against XSS)
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

/**
 * Validate Google Ads ID format (AW-XXXXXXXXX)
 */
function isValidGadsId(gadsId: string | undefined): gadsId is string {
  if (!gadsId) return false
  return /^AW-\d{10,}$/.test(gadsId)
}

export function GoogleAnalytics() {
  // Use useSyncExternalStore to prevent hydration mismatches
  const hasConsent = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID
  const gadsId = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID

  // Validate GA ID format (defense-in-depth)
  const validGaId = isValidGaId(gaId)
  const validGadsId = isValidGadsId(gadsId)

  // Debug logging (temporary)
  if (typeof window !== 'undefined') {
    console.debug('[GoogleAnalytics] Debug:', {
      hasConsent,
      gaId,
      gadsId,
      validGaId,
      validGadsId,
      geoCookie: document.cookie.match(/inkdex_geo=([A-Z]{2})/i)?.[1] || 'not set',
      dnt: navigator.doNotTrack,
      gpc: (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl,
    })
  }

  if (!validGaId && gaId) {
    console.error('[GoogleAnalytics] Invalid GA4 Measurement ID format:', gaId)
  }
  if (!validGadsId && gadsId) {
    console.error('[GoogleAnalytics] Invalid Google Ads ID format:', gadsId)
  }

  // Don't load if no valid IDs or user hasn't consented
  if (!validGaId && !validGadsId) return null
  if (!hasConsent) return null

  // Build gtag config script
  const configScript = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    ${validGaId ? `gtag('config', '${gaId}', {
      anonymize_ip: true,
      cookie_flags: 'SameSite=None;Secure'
    });` : ''}
    ${validGadsId ? `gtag('config', '${gadsId}');` : ''}
  `

  // Use GA ID for script loading (falls back to Google Ads ID if no GA)
  const primaryId = validGaId ? gaId : gadsId

  return (
    <>
      {/* Load gtag.js script */}
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${primaryId}`}
        strategy="afterInteractive"
      />

      {/* Initialize GA4 + Google Ads with GDPR-compliant config */}
      <Script id="google-analytics" strategy="afterInteractive">
        {configScript}
      </Script>
    </>
  )
}
