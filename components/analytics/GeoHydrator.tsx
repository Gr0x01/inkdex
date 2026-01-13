'use client'

/**
 * GeoHydrator - Sets geo cookie from server-provided country code
 *
 * Vercel provides x-vercel-ip-country header on every request.
 * This component receives the country from a Server Component and
 * sets the cookie that consent-manager.ts reads.
 *
 * This enables auto-consent for non-GDPR regions (US, etc.) so
 * Google Ads gtag loads immediately without a consent banner.
 */

import { useEffect } from 'react'
import { CONSENT_CHANGE_EVENT } from '@/lib/consent/consent-manager'

const GEO_COOKIE = 'inkdex_geo'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

interface GeoHydratorProps {
  country: string
}

export function GeoHydrator({ country }: GeoHydratorProps) {
  useEffect(() => {
    // Only set if we have a valid 2-letter country code
    // Vercel sends uppercase (e.g., "US"), but normalize just in case
    if (!country || !/^[A-Z]{2}$/i.test(country)) return

    // Check if cookie already set with same value
    const existing = document.cookie
      .split('; ')
      .find(row => row.startsWith(`${GEO_COOKIE}=`))

    const normalizedCountry = country.toUpperCase()
    if (existing?.split('=')[1] === normalizedCountry) return

    // Set the geo cookie with Secure flag in production (HTTPS)
    const isSecure = window.location.protocol === 'https:'
    const secureFlag = isSecure ? '; Secure' : ''
    document.cookie = `${GEO_COOKIE}=${normalizedCountry}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax${secureFlag}`

    // Trigger consent re-evaluation so GoogleAnalytics re-checks on first load
    window.dispatchEvent(new CustomEvent(CONSENT_CHANGE_EVENT, { detail: { geoUpdated: true } }))
  }, [country])

  return null
}
