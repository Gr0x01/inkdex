/**
 * Cookie Consent Types
 * TypeScript interfaces for GDPR/CCPA-compliant cookie consent system
 */

/**
 * Cookie consent preferences stored in localStorage
 */
export interface CookieConsent {
  /** Always true - required for site functionality */
  necessary: true
  /** User choice for analytics cookies (Google Analytics) */
  analytics: boolean
  /** Timestamp when consent was given (milliseconds since epoch) */
  timestamp: number
  /** Consent policy version (e.g., "1.0") - invalidate if privacy policy changes */
  version: string
}

/**
 * Partial consent update (for modal save)
 */
export interface ConsentUpdate {
  analytics: boolean
}

/**
 * Storage event custom detail for cross-tab sync
 */
export interface ConsentChangeEvent extends Event {
  detail: {
    consent: CookieConsent | null
  }
}
