/**
 * PostHog Analytics Utilities
 *
 * Shared helper for capturing PostHog events with consent check.
 * Ensures events are only sent when user has given analytics consent.
 */

'use client'

import { hasAnalyticsConsent, isDoNotTrack } from '@/lib/consent/consent-manager'

// PostHog type declaration (shared across analytics modules)
declare global {
  interface Window {
    posthog?: {
      capture: (event: string, properties?: Record<string, unknown>) => void
      startSessionRecording: () => void
      stopSessionRecording: () => void
      isFeatureEnabled: (key: string) => boolean
    }
  }
}

/**
 * Capture a PostHog event (fire-and-forget)
 *
 * Only sends if:
 * - Running in browser
 * - User has analytics consent
 * - DNT/GPC is not enabled
 * - PostHog is loaded
 */
export function capturePostHog(event: string, properties?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return
  if (isDoNotTrack() || !hasAnalyticsConsent()) return
  if (window.posthog) {
    window.posthog.capture(event, properties)
  }
}
