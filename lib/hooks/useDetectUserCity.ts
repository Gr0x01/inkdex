'use client'

import { useState, useEffect } from 'react'
import { ALL_SUPPORTED_CITIES } from '@/lib/constants/cities'

const STORAGE_KEY = 'inkdex_detected_city'
const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

interface DetectedCity {
  name: string
  slug: string
  state: string
}

interface CachedCity {
  city: DetectedCity
  timestamp: number
}

// Module-level singleton to ensure only ONE geolocation request fires
// even if multiple components use this hook during the same page session
let sharedPromise: Promise<DetectedCity | null> | null = null

// Common city name variations that ipapi.co might return differently
const CITY_NAME_ALIASES: Record<string, string> = {
  'saint louis': 'st. louis',
  'saint paul': 'st. paul',
  'nyc': 'new york',
  'new york city': 'new york',
  'la': 'los angeles',
  'sf': 'san francisco',
  'dc': 'washington',
  'washington dc': 'washington',
  'fort worth': 'fort worth',
  'ft worth': 'fort worth',
  'ft. worth': 'fort worth',
  'philly': 'philadelphia',
  'vegas': 'las vegas',
  'nola': 'new orleans',
}

function normalizeCity(name: string): string {
  // Normalize: lowercase, trim, replace hyphens with spaces (handles "Los-Angeles" edge case)
  const lower = name.toLowerCase().trim().replace(/-/g, ' ')
  return CITY_NAME_ALIASES[lower] ?? lower
}

async function fetchCityInternal(): Promise<DetectedCity | null> {
  try {
    // Add timeout to prevent hanging on slow/unresponsive API
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000) // 5s timeout

    const res = await fetch('https://ipapi.co/json/', {
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    if (!res.ok) return null

    const data = await res.json()
    if (!data.city) return null

    // Try to match to our supported cities with normalized names
    const normalizedCity = normalizeCity(data.city)
    const match = ALL_SUPPORTED_CITIES.find(
      (c) => normalizeCity(c.name) === normalizedCity || c.slug === normalizedCity
    )

    if (match) {
      const detected: DetectedCity = {
        name: match.name,
        slug: match.slug,
        state: match.state,
      }

      // Cache successful detection
      try {
        const cached: CachedCity = {
          city: detected,
          timestamp: Date.now(),
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cached))
      } catch {
        // Ignore localStorage errors
      }

      return detected
    }

    return null
  } catch {
    return null
  }
}

async function fetchCity(): Promise<DetectedCity | null> {
  try {
    return await fetchCityInternal()
  } finally {
    // Clear shared promise after resolution so future page loads
    // respect the localStorage TTL check
    sharedPromise = null
  }
}

/**
 * Hook to detect user's city via IP geolocation
 * - Checks localStorage first (24h cache)
 * - Defers geolocation by 2s to preserve LCP
 * - Only ONE API call fires even if multiple components use this hook
 * - Returns null if no match (use "Search Anywhere")
 */
export function useDetectUserCity() {
  const [detectedCity, setDetectedCity] = useState<DetectedCity | null>(null)
  const [isDetecting, setIsDetecting] = useState(true)

  useEffect(() => {
    let isMounted = true

    // Check localStorage cache first
    try {
      const cached = localStorage.getItem(STORAGE_KEY)
      if (cached) {
        const parsed: CachedCity = JSON.parse(cached)
        const isValid = Date.now() - parsed.timestamp < CACHE_TTL_MS
        if (isValid) {
          setDetectedCity(parsed.city)
          setIsDetecting(false)
          return
        }
      }
    } catch {
      // Ignore localStorage errors
    }

    // Defer geolocation to avoid blocking LCP
    const timeoutId = setTimeout(async () => {
      // Use shared promise so only one fetch fires across all components
      if (!sharedPromise) {
        sharedPromise = fetchCity()
      }

      const result = await sharedPromise

      if (isMounted) {
        setDetectedCity(result)
        setIsDetecting(false)
      }
    }, 2000)

    return () => {
      isMounted = false
      clearTimeout(timeoutId)
    }
  }, [])

  return { detectedCity, isDetecting }
}
