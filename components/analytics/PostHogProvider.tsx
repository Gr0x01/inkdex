'use client'

/**
 * PostHog Provider Component
 *
 * Wraps the app with PostHog context for proper React integration.
 * Handles initialization and provides posthog instance to children.
 *
 * Key setup for Next.js App Router:
 * - capture_pageview: false (we capture manually in PostHogPageView)
 * - Uses posthog-js/react for proper React integration
 * - Reverse proxy at /ingest to avoid ad blockers
 *
 * Performance optimization:
 * - PostHog library is dynamically imported to reduce initial bundle size (~80KB saved)
 * - Only loads in production on non-localhost domains
 * - Custom context avoids static imports in consumer components
 */

import { useEffect, useState, useCallback, createContext, useContext } from 'react'
import type { PostHog } from 'posthog-js'
import {
  hasAnalyticsConsent,
  CONSENT_CHANGE_EVENT,
} from '@/lib/consent/consent-manager'

/**
 * Context for accessing PostHog instance without static imports
 * This allows consumer components to avoid bundling posthog-js
 */
const PostHogContext = createContext<PostHog | null>(null)

/**
 * Hook to access PostHog instance from context
 * Returns null if PostHog is not loaded (dev, localhost, or still loading)
 */
export function usePostHogInstance(): PostHog | null {
  return useContext(PostHogContext)
}

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY
const POSTHOG_HOST = '/ingest'
const POSTHOG_UI_HOST = 'https://us.posthog.com'
const IS_PRODUCTION = process.env.NODE_ENV === 'production'

/**
 * Validate PostHog API key format
 */
function isValidPostHogKey(key: string | undefined): key is string {
  if (!key) return false
  return /^phc_[a-zA-Z0-9]{32,}$/.test(key)
}

/**
 * Check if we should load PostHog (production + not localhost)
 */
function shouldLoadPostHog(): boolean {
  if (typeof window === 'undefined') return false
  if (!IS_PRODUCTION) return false
  if (window.location.hostname === 'localhost') return false
  if (!isValidPostHogKey(POSTHOG_KEY)) return false
  return true
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const [posthogInstance, setPosthogInstance] = useState<PostHog | null>(null)
  const [PHProvider, setPHProvider] = useState<React.ComponentType<{ client: PostHog; children: React.ReactNode }> | null>(null)

  // Dynamically load PostHog library and initialize
  useEffect(() => {
    if (!shouldLoadPostHog()) return

    // Dynamic import of posthog-js - defers ~80KB from initial bundle
    Promise.all([
      import('posthog-js'),
      import('posthog-js/react'),
    ]).then(([posthogModule, reactModule]) => {
      const posthog = posthogModule.default

      // Initialize PostHog
      posthog.init(POSTHOG_KEY!, {
        api_host: POSTHOG_HOST,
        ui_host: POSTHOG_UI_HOST,
        // IMPORTANT: Set to false - we capture pageviews manually in PostHogPageView
        // This ensures client-side navigations are tracked
        capture_pageview: false,
        capture_pageleave: true,
        persistence: 'localStorage',
        autocapture: true,
        // Session recording starts disabled, enabled via consent
        disable_session_recording: true,
        session_recording: {
          maskAllInputs: false, // Allow seeing search queries - no sensitive data
          maskTextSelector: '.ph-mask, [data-ph-mask]', // Manually mask sensitive fields with this class
          blockSelector: '.ph-no-capture, [data-ph-no-capture]',
        },
        enable_recording_console_log: true,
        loaded: () => {
          setPosthogInstance(posthog)
          setPHProvider(() => reactModule.PostHogProvider)
        },
      })
    }).catch((error) => {
      console.error('[PostHog] Failed to load:', error)
    })
  }, [])

  // Handle session replay consent toggle
  const handleConsentChange = useCallback(() => {
    if (!posthogInstance) return

    if (hasAnalyticsConsent()) {
      posthogInstance.startSessionRecording()
    } else {
      posthogInstance.stopSessionRecording()
    }
  }, [posthogInstance])

  useEffect(() => {
    if (!posthogInstance) return

    // Check initial consent state
    handleConsentChange()

    // Listen for consent changes
    window.addEventListener(CONSENT_CHANGE_EVENT, handleConsentChange)
    window.addEventListener('storage', handleConsentChange)

    return () => {
      window.removeEventListener(CONSENT_CHANGE_EVENT, handleConsentChange)
      window.removeEventListener('storage', handleConsentChange)
    }
  }, [posthogInstance, handleConsentChange])

  // Wrap children with our custom context (always)
  // Also wrap with PHProvider when available for posthog-js/react hooks compatibility
  return (
    <PostHogContext.Provider value={posthogInstance}>
      {posthogInstance && PHProvider ? (
        <PHProvider client={posthogInstance}>{children}</PHProvider>
      ) : (
        children
      )}
    </PostHogContext.Provider>
  )
}
