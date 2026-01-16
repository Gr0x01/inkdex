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
 */

import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { useEffect, useState } from 'react'
import {
  hasAnalyticsConsent,
  CONSENT_CHANGE_EVENT,
} from '@/lib/consent/consent-manager'

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

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false)

  // Initialize PostHog once on mount
  useEffect(() => {
    // Skip in dev mode or when running production builds locally
    if (!IS_PRODUCTION || window.location.hostname === 'localhost') return
    if (!isValidPostHogKey(POSTHOG_KEY)) {
      if (POSTHOG_KEY) {
        console.error(
          '[PostHog] Invalid API key format - expected phc_ followed by 32+ alphanumeric characters'
        )
      }
      return
    }

    // Initialize PostHog
    posthog.init(POSTHOG_KEY, {
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
        maskAllInputs: true,
        maskTextSelector: '.ph-mask, [data-ph-mask]',
        blockSelector: '.ph-no-capture, [data-ph-no-capture]',
      },
      enable_recording_console_log: true,
      loaded: () => {
        setIsInitialized(true)
      },
    })
  }, [])

  // Handle session replay consent toggle
  useEffect(() => {
    if (!IS_PRODUCTION || !isInitialized || window.location.hostname === 'localhost') return

    const handleConsentChange = () => {
      if (hasAnalyticsConsent()) {
        posthog.startSessionRecording()
      } else {
        posthog.stopSessionRecording()
      }
    }

    // Check initial consent state
    handleConsentChange()

    // Listen for consent changes
    window.addEventListener(CONSENT_CHANGE_EVENT, handleConsentChange)
    window.addEventListener('storage', handleConsentChange)

    return () => {
      window.removeEventListener(CONSENT_CHANGE_EVENT, handleConsentChange)
      window.removeEventListener('storage', handleConsentChange)
    }
  }, [isInitialized])

  // In development, localhost, or if not initialized, just render children without provider
  const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost'
  if (!IS_PRODUCTION || isLocalhost || !isValidPostHogKey(POSTHOG_KEY)) {
    return <>{children}</>
  }

  return <PHProvider client={posthog}>{children}</PHProvider>
}
