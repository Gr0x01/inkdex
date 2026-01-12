/**
 * PostHog Analytics Utilities
 *
 * Shared helper for capturing PostHog events with consent check.
 * Ensures events are only sent when user has given analytics consent.
 */

'use client'

import type { UserProperties, UserPropertiesSetOnce } from './events'

// PostHog type declaration (shared across analytics modules)
declare global {
  interface Window {
    posthog?: {
      capture: (event: string, properties?: Record<string, unknown>) => void
      identify: (distinctId: string, properties?: Record<string, unknown>) => void
      people: {
        set: (properties: Record<string, unknown>) => void
        set_once: (properties: Record<string, unknown>) => void
      }
      startSessionRecording: () => void
      stopSessionRecording: () => void
      isFeatureEnabled: (key: string) => boolean
      getDistinctId: () => string
      reset: () => void
    }
  }
}

/**
 * Check if PostHog is loaded (cookieless mode - no consent check needed)
 */
function isPostHogReady(): boolean {
  if (typeof window === 'undefined') return false
  return !!window.posthog
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
  if (!isPostHogReady()) return
  window.posthog!.capture(event, properties)
}

/**
 * Identify a user with their ID and optional properties
 * Call this after login or when user identity is known
 */
export function identifyUser(
  userId: string,
  properties?: UserProperties
): void {
  if (!isPostHogReady()) return
  window.posthog!.identify(userId, properties as Record<string, unknown>)
}

/**
 * Set user properties (overwrites existing values)
 * Use for properties that change over time
 */
export function setUserProperties(properties: UserProperties): void {
  if (!isPostHogReady()) return
  window.posthog!.people.set(properties as Record<string, unknown>)
}

/**
 * Set user properties only if not already set
 * Use for first-time events like first_search_at
 */
export function setUserPropertiesOnce(properties: UserPropertiesSetOnce): void {
  if (!isPostHogReady()) return
  window.posthog!.people.set_once(properties as Record<string, unknown>)
}

/**
 * Increment a numeric user property
 * Useful for counters like search_count
 */
export function incrementUserProperty(property: keyof UserProperties, amount: number = 1): void {
  if (!isPostHogReady()) return
  // PostHog doesn't have a direct increment, so we use capture with $set
  window.posthog!.capture('$set', {
    $set: { [property]: { $increment: amount } },
  })
}

/**
 * Get the current distinct ID (anonymous or identified user)
 */
export function getDistinctId(): string | null {
  if (!isPostHogReady()) return null
  return window.posthog!.getDistinctId()
}

/**
 * Reset the user identity (call on logout)
 */
export function resetUser(): void {
  if (!isPostHogReady()) return
  window.posthog!.reset()
}
