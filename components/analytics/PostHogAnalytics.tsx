'use client'

/**
 * PostHog Analytics Component
 *
 * Conditionally loads PostHog tracking script based on user consent
 * - Only loads if PostHog API key is configured
 * - Only loads if user has given analytics consent
 * - Respects DNT (Do Not Track) headers
 * - Listens for consent changes in real-time (cross-tab sync)
 *
 * Session Replay:
 * - Enabled by default (controlled via PostHog dashboard settings)
 * - Masks all text inputs for privacy
 * - Records console logs and network requests for debugging
 *
 * GDPR Compliance:
 * - Follows same consent rules as Google Analytics
 * - EU/EEA/UK/CH users must opt-in
 * - Non-EU users auto-consent
 *
 * Security:
 * - API key and host format validated (defense-in-depth against XSS)
 * - useSyncExternalStore prevents hydration mismatches
 */

import Script from 'next/script'
import { useSyncExternalStore } from 'react'
import {
  hasAnalyticsConsent,
  isDoNotTrack,
  CONSENT_CHANGE_EVENT,
} from '@/lib/consent/consent-manager'

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY
// Use reverse proxy path to avoid ad blockers (rewrites in next.config.js)
const POSTHOG_HOST = '/ingest'
const POSTHOG_UI_HOST = 'https://us.posthog.com'

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
 * Validate PostHog API key format
 * Defense-in-depth: Prevent potential XSS if env vars are compromised
 * PostHog keys start with "phc_" followed by alphanumeric characters
 */
function isValidPostHogKey(key: string | undefined): key is string {
  if (!key) return false
  return /^phc_[a-zA-Z0-9]{32,}$/.test(key)
}


export function PostHogAnalytics() {
  // Use useSyncExternalStore to prevent hydration mismatches
  const hasConsent = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  // Validate PostHog key format (defense-in-depth)
  if (!isValidPostHogKey(POSTHOG_KEY)) {
    if (POSTHOG_KEY) {
      // Don't log the actual key - just indicate the format is wrong
      console.error(
        '[PostHog] Invalid API key format - expected phc_ followed by 32+ alphanumeric characters'
      )
    }
    return null
  }

  // Don't load if user hasn't consented
  if (!hasConsent) return null

  // PostHog initialization snippet with session replay enabled
  // Session replay settings are controlled via PostHog dashboard
  const initScript = `
    !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="capture identify alias people.set people.set_once set_config register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset isFeatureEnabled onFeatureFlags getFeatureFlag getFeatureFlagPayload reloadFeatureFlags group updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures getActiveMatchingSurveys getSurveys getNextSurveyStep onSessionId startSessionRecording stopSessionRecording".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
    posthog.init('${POSTHOG_KEY}', {
      api_host: '${POSTHOG_HOST}',
      ui_host: '${POSTHOG_UI_HOST}',
      capture_pageview: true,
      capture_pageleave: true,
      persistence: 'memory',  // Cookieless mode - server uses hash for unique users
      autocapture: true,
      // Session Replay Configuration
      disable_session_recording: false,
      session_recording: {
        maskAllInputs: true,
        maskTextSelector: '.ph-mask, [data-ph-mask]',
        blockSelector: '.ph-no-capture, [data-ph-no-capture]'
      },
      // Capture console logs for debugging
      enable_recording_console_log: true
    });
  `

  return (
    <Script id="posthog-analytics" strategy="afterInteractive">
      {initScript}
    </Script>
  )
}
