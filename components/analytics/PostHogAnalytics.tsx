'use client'

/**
 * PostHog Analytics Component
 *
 * Cookie-free analytics with localStorage for session continuity.
 * - Always loads (no cookies = no consent banner required)
 * - Session replay requires consent (records sensitive user behavior)
 *
 * Privacy approach:
 * - persistence: 'localStorage' = no cookies, localStorage for session continuity
 * - Enables proper UTM attribution across page views
 * - No cross-site tracking, user can clear localStorage anytime
 * - No PII stored client-side
 *
 * Session Replay (consent-gated):
 * - Only enabled if user has analytics consent
 * - Dynamically toggled via startSessionRecording/stopSessionRecording
 * - Masks all text inputs for privacy
 * - Records console logs for debugging
 */

import Script from 'next/script'
import { useEffect, useSyncExternalStore } from 'react'
import {
  hasAnalyticsConsent,
  CONSENT_CHANGE_EVENT,
} from '@/lib/consent/consent-manager'

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY
// Use reverse proxy path to avoid ad blockers (rewrites in next.config.js)
const POSTHOG_HOST = '/ingest'
const POSTHOG_UI_HOST = 'https://us.posthog.com'

// Skip PostHog in development
const IS_PRODUCTION = process.env.NODE_ENV === 'production'

/**
 * Subscribe to consent changes for session replay toggle
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
 * Get current consent snapshot (for session replay)
 */
function getSnapshot() {
  if (typeof window === 'undefined') return false
  return hasAnalyticsConsent()
}

/**
 * Get server-side snapshot (always false for SSR)
 */
function getServerSnapshot() {
  return false
}

/**
 * Validate PostHog API key format
 */
function isValidPostHogKey(key: string | undefined): key is string {
  if (!key) return false
  return /^phc_[a-zA-Z0-9]{32,}$/.test(key)
}


export function PostHogAnalytics() {
  // Track consent for session replay
  const hasReplayConsent = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  // Dynamically toggle session recording when consent changes
  // This runs AFTER PostHog is initialized, fixing the SSR race condition
  useEffect(() => {
    if (!IS_PRODUCTION) return
    if (typeof window === 'undefined' || !window.posthog) return

    if (hasReplayConsent) {
      window.posthog.startSessionRecording()
    } else {
      window.posthog.stopSessionRecording()
    }
  }, [hasReplayConsent])

  // Skip in development - no localhost tracking
  if (!IS_PRODUCTION) {
    return null
  }

  // Validate PostHog key format
  if (!isValidPostHogKey(POSTHOG_KEY)) {
    if (POSTHOG_KEY) {
      console.error(
        '[PostHog] Invalid API key format - expected phc_ followed by 32+ alphanumeric characters'
      )
    }
    return null
  }

  // Cookieless analytics - always load
  // Session replay starts disabled, then enabled dynamically via useEffect above
  const initScript = `
    !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="capture identify alias people.set people.set_once set_config register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset isFeatureEnabled onFeatureFlags getFeatureFlag getFeatureFlagPayload reloadFeatureFlags group updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures getActiveMatchingSurveys getSurveys getNextSurveyStep onSessionId startSessionRecording stopSessionRecording".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
    posthog.init('${POSTHOG_KEY}', {
      api_host: '${POSTHOG_HOST}',
      ui_host: '${POSTHOG_UI_HOST}',
      capture_pageview: true,
      capture_pageleave: true,
      persistence: 'localStorage',
      autocapture: true,
      disable_session_recording: true,
      session_recording: {
        maskAllInputs: true,
        maskTextSelector: '.ph-mask, [data-ph-mask]',
        blockSelector: '.ph-no-capture, [data-ph-no-capture]'
      },
      enable_recording_console_log: true
    });
  `

  return (
    <Script id="posthog-analytics" strategy="afterInteractive">
      {initScript}
    </Script>
  )
}
