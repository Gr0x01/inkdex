/**
 * Cookie Consent Manager
 *
 * Core logic for cookie consent system
 * Uses localStorage for consent storage
 * Respects DNT (Do Not Track) and GPC (Global Privacy Control) headers
 *
 * Jan 2026: Auto-consent to analytics for all visitors (no consent banner)
 */

import type { CookieConsent, ConsentUpdate } from './types'

/** localStorage key for consent storage */
const CONSENT_KEY = 'inkdex_cookie_consent'

/** Cookie name for geo data (set by middleware) */
const GEO_COOKIE = 'inkdex_geo'

/** Current consent policy version */
const CONSENT_VERSION = '1.0'

/**
 * Custom event name for consent changes (for cross-component communication)
 */
export const CONSENT_CHANGE_EVENT = 'inkdex-consent-change'

/**
 * Get user's country code from geo cookie (set by middleware)
 * Returns null if cookie not set or invalid format
 * Only accepts valid 2-letter ISO country codes (defense-in-depth)
 */
export function getUserCountry(): string | null {
  if (typeof document === 'undefined') return null

  // Only match valid 2-letter country codes (case-insensitive)
  const match = document.cookie.match(new RegExp(`(^| )${GEO_COOKIE}=([A-Z]{2})`, 'i'))
  return match ? match[2].toUpperCase() : null
}

/**
 * Check if user is in a GDPR region
 * @deprecated Always returns false - GDPR filtering removed Jan 2026
 */
export function isGDPRRegion(): boolean {
  return false
}

/**
 * Check if Do Not Track (DNT) or Global Privacy Control (GPC) is enabled
 * Auto-deny analytics if user has browser-level privacy preference
 */
export function isDoNotTrack(): boolean {
  if (typeof navigator === 'undefined') return false

  // Check DNT header (Firefox, older browsers)
  if (navigator.doNotTrack === '1') return true

  // Check Global Privacy Control (modern standard)
  if (navigator.globalPrivacyControl === true) return true

  return false
}

/**
 * Get current consent from localStorage with sessionStorage fallback
 * Returns null if no consent exists or storage unavailable
 */
export function getConsent(): CookieConsent | null {
  if (typeof window === 'undefined') return null // SSR safety

  try {
    // Try localStorage first
    let stored = localStorage.getItem(CONSENT_KEY)

    // Fallback to sessionStorage if localStorage empty
    if (!stored) {
      stored = sessionStorage.getItem(CONSENT_KEY)
    }

    if (!stored) return null

    const consent = JSON.parse(stored) as CookieConsent

    // Invalidate if version mismatch (privacy policy changed)
    if (consent.version !== CONSENT_VERSION) {
      clearConsent()
      return null
    }

    return consent
  } catch (error) {
    // Storage unavailable (Safari private mode) or parse error
    console.warn('Failed to read consent from storage:', error)
    return null
  }
}

/**
 * Save consent to localStorage with sessionStorage fallback
 * @param analytics - User choice for analytics cookies
 */
export function saveConsent(analytics: boolean): void {
  if (typeof window === 'undefined') return // SSR safety

  const consent: CookieConsent = {
    necessary: true,
    analytics,
    timestamp: Date.now(),
    version: CONSENT_VERSION,
  }

  try {
    localStorage.setItem(CONSENT_KEY, JSON.stringify(consent))

    // Dispatch custom event for cross-component sync
    window.dispatchEvent(new CustomEvent(CONSENT_CHANGE_EVENT, { detail: { consent } }))
  } catch (error) {
    // localStorage unavailable (Safari private mode, quota exceeded)
    console.warn('Failed to save consent to localStorage:', error)

    // Fallback to sessionStorage (consent persists for session only)
    try {
      sessionStorage.setItem(CONSENT_KEY, JSON.stringify(consent))
      console.info('[Consent] Saved to sessionStorage as fallback (consent will reset on browser close)')

      // Dispatch event even when using fallback
      window.dispatchEvent(new CustomEvent(CONSENT_CHANGE_EVENT, { detail: { consent } }))
    } catch (sessionError) {
      // Both localStorage and sessionStorage failed
      console.error('[Consent] Cannot save consent - storage unavailable:', sessionError)

      // Dispatch event with null to trigger error state in components
      window.dispatchEvent(
        new CustomEvent(CONSENT_CHANGE_EVENT, {
          detail: { consent: null, error: 'Storage unavailable' },
        })
      )
    }
  }
}

/**
 * Quick check: Does user have analytics consent?
 *
 * Logic:
 * - DNT/GPC enabled → false (respect browser preference)
 * - Otherwise → true (auto-consent)
 */
export function hasAnalyticsConsent(): boolean {
  // Respect DNT/GPC headers (auto-deny)
  if (isDoNotTrack()) return false

  // Auto-consent to analytics
  return true
}

/**
 * Should we show the cookie consent banner?
 *
 * Always returns false - consent banner removed Jan 2026
 */
export function needsConsentBanner(): boolean {
  return false
}

/**
 * Accept all cookies (convenience function)
 */
export function acceptAll(): void {
  saveConsent(true)
}

/**
 * Reject all non-essential cookies (convenience function)
 */
export function rejectAll(): void {
  saveConsent(false)
}

/**
 * Clear consent (GDPR "right to be forgotten")
 * Forces re-prompt on next visit
 * Clears from both localStorage and sessionStorage
 */
export function clearConsent(): void {
  if (typeof window === 'undefined') return // SSR safety

  try {
    localStorage.removeItem(CONSENT_KEY)
    sessionStorage.removeItem(CONSENT_KEY)

    // Dispatch event for cross-component sync
    window.dispatchEvent(new CustomEvent(CONSENT_CHANGE_EVENT, { detail: { consent: null } }))
  } catch (error) {
    console.warn('Failed to clear consent from storage:', error)
  }
}

/**
 * Update consent with partial data (for modal save)
 * Preserves timestamp and version
 */
export function updateConsent(update: ConsentUpdate): void {
  saveConsent(update.analytics)
}
