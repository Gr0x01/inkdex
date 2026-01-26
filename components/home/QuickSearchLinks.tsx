'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { trackSearchStarted } from '@/lib/analytics/posthog'
import { useDetectUserCity } from '@/lib/hooks/useDetectUserCity'

// Style options to rotate through
const STYLE_OPTIONS = [
  { label: 'black and gray', query: 'black and gray tattoo' },
  { label: 'realism', query: 'realism tattoo' },
  { label: 'neo traditional', query: 'neo traditional tattoo' },
]

// Fallback cities if geolocation fails
const FALLBACK_CITIES = ['denver', 'new-york', 'chicago']

export default function QuickSearchLinks() {
  const router = useRouter()
  const [loadingIndex, setLoadingIndex] = useState<number | null>(null)
  const { detectedCity } = useDetectUserCity()

  // Build the quick searches based on detected city
  const quickSearches = STYLE_OPTIONS.map((style, index) => {
    if (detectedCity) {
      // Use detected city for all searches
      const cityDisplay = detectedCity.name === 'New York' ? 'NYC' : detectedCity.name
      return {
        label: `${style.label} in ${cityDisplay}`,
        query: style.query,
        city: detectedCity.slug,
      }
    }
    // Fallback: different city per style
    return {
      label: `${style.label} in ${index === 1 ? 'NYC' : FALLBACK_CITIES[index] === 'chicago' ? 'Chicago' : 'Denver'}`,
      query: style.query,
      city: FALLBACK_CITIES[index],
    }
  })

  const handleClick = async (index: number) => {
    const { query, city } = quickSearches[index]
    setLoadingIndex(index)

    // Track search started
    trackSearchStarted({
      search_type: 'text',
      source: 'quick_pill',
      query_preview: query.slice(0, 50),
      city_filter: city,
    })

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'text', text: query }),
      })
      if (!response.ok) {
        setLoadingIndex(null)
        return
      }
      const data = await response.json()
      if (!data.searchId) {
        setLoadingIndex(null)
        return
      }
      router.push(`/search?id=${data.searchId}&city=${city}`)
    } catch {
      setLoadingIndex(null)
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <span
        className="font-mono text-xs uppercase tracking-widest"
        style={{ color: 'rgba(255, 255, 255, 0.4)' }}
      >
        or try
      </span>
      {quickSearches.map((search, index) => (
        <button
          key={`${search.label}-${search.city}`}
          onClick={() => handleClick(index)}
          disabled={loadingIndex !== null}
          className={`
            px-3 py-1.5
            border border-white/30 rounded-full
            font-mono text-xs uppercase tracking-wider
            transition-all duration-200
            hover:bg-white hover:text-ink hover:border-white
            disabled:opacity-40 disabled:cursor-not-allowed
            ${loadingIndex === index ? 'text-white/40' : 'text-white/80'}
          `}
        >
          {loadingIndex === index ? 'searching...' : search.label}
        </button>
      ))}
    </div>
  )
}
