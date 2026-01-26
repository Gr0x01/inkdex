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

async function fetchCityInternal(): Promise<DetectedCity | null> {
  try {
    const res = await fetch('https://ipapi.co/json/')
    if (!res.ok) return null

    const data = await res.json()
    if (!data.city) return null

    // Try to match to our supported cities
    const cityLower = data.city.toLowerCase()
    const match = ALL_SUPPORTED_CITIES.find(
      (c) => c.name.toLowerCase() === cityLower || c.slug === cityLower
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
