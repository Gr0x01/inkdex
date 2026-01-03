'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Select from '@/components/ui/Select'
import { US_STATES } from '@/lib/constants/states'
import { isValidCountryCode, isValidRegion, isValidCitySlug } from '@/lib/utils/location'

interface CountryOption {
  code: string
  name: string
  artist_count?: number
}

interface RegionOption {
  region: string
  region_name: string
  artist_count: number
}

interface CityOption {
  city: string
  region: string
  country_code: string
  artist_count: number
}

// US state name lookup
const US_STATE_NAME_MAP = new Map(US_STATES.map(s => [s.code, s.name]))

// Retry configuration
const RETRY_CONFIG = {
  MAX_RETRIES: 2,
  INITIAL_DELAY_MS: 1000,
  BACKOFF_MULTIPLIER: 1, // Linear backoff (use 2 for exponential)
} as const

// Debounce delay for filter updates
const FILTER_DEBOUNCE_MS = 150

/**
 * Cascading Location Filter
 * Country → Region/State → City
 *
 * URL params: ?country=us&region=tx&city=austin
 */
export default function LocationFilter() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Validate and extract current filter values from URL
  const currentCountry = (() => {
    const val = searchParams.get('country')?.toUpperCase() || ''
    return val && isValidCountryCode(val) ? val : ''
  })()

  const currentRegion = (() => {
    const val = searchParams.get('region')?.toUpperCase() || ''
    return val && isValidRegion(val) ? val : ''
  })()

  const currentCity = (() => {
    const val = searchParams.get('city')?.toLowerCase() || ''
    return val && isValidCitySlug(val) ? val : ''
  })()

  // Dynamic options loaded from API
  const [countries, setCountries] = useState<CountryOption[]>([])
  const [regions, setRegions] = useState<RegionOption[]>([])
  const [cities, setCities] = useState<CityOption[]>([])
  const [loadingCountries, setLoadingCountries] = useState(true)
  const [loadingRegions, setLoadingRegions] = useState(false)
  const [loadingCities, setLoadingCities] = useState(false)
  const [countriesError, setCountriesError] = useState(false)
  const [regionsError, setRegionsError] = useState(false)
  const [citiesError, setCitiesError] = useState(false)
  const [filterApplied, setFilterApplied] = useState(false)

  // Refs for request cancellation and retry
  const countriesAbortRef = useRef<AbortController | null>(null)
  const regionsAbortRef = useRef<AbortController | null>(null)
  const citiesAbortRef = useRef<AbortController | null>(null)
  const countriesRetryCount = useRef(0)
  const regionsRetryCount = useRef(0)
  const citiesRetryCount = useRef(0)
  const filterDebounceRef = useRef<NodeJS.Timeout | null>(null)

  // Generic fetch with retry logic
  const fetchWithRetry = useCallback(<T,>(
    url: string,
    abortRef: React.MutableRefObject<AbortController | null>,
    retryCountRef: React.MutableRefObject<number>,
    setLoading: (loading: boolean) => void,
    setError: (error: boolean) => void,
    setData: (data: T[]) => void,
    onRetry: () => void
  ) => {
    abortRef.current?.abort()
    abortRef.current = new AbortController()

    setLoading(true)
    setError(false)

    fetch(url, { signal: abortRef.current.signal })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then(data => {
        setData(Array.isArray(data) ? data : [])
        setLoading(false)
        retryCountRef.current = 0
      })
      .catch(err => {
        if (err.name === 'AbortError') return

        // Auto-retry with backoff
        if (retryCountRef.current < RETRY_CONFIG.MAX_RETRIES) {
          retryCountRef.current++
          const delay = RETRY_CONFIG.INITIAL_DELAY_MS *
            Math.pow(RETRY_CONFIG.BACKOFF_MULTIPLIER, retryCountRef.current)
          setTimeout(onRetry, delay)
          return
        }

        console.error(`Failed to load data from ${url} after retries:`, err)
        setData([])
        setLoading(false)
        setError(true)
      })
  }, [])

  // Fetch countries with retry logic
  const fetchCountries = useCallback(() => {
    fetchWithRetry(
      '/api/locations/countries?with_artists=true',
      countriesAbortRef,
      countriesRetryCount,
      setLoadingCountries,
      setCountriesError,
      setCountries,
      fetchCountries
    )
  }, [fetchWithRetry])

  // Fetch regions with retry logic
  const fetchRegions = useCallback((country: string) => {
    fetchWithRetry(
      `/api/locations/regions?country=${encodeURIComponent(country)}`,
      regionsAbortRef,
      regionsRetryCount,
      setLoadingRegions,
      setRegionsError,
      setRegions,
      () => fetchRegions(country)
    )
  }, [fetchWithRetry])

  // Fetch cities with retry logic
  const fetchCities = useCallback((country: string, region: string | null) => {
    const regionParam = region ? `&region=${encodeURIComponent(region)}` : ''
    fetchWithRetry(
      `/api/cities/with-counts?country=${encodeURIComponent(country)}${regionParam}&min_count=1`,
      citiesAbortRef,
      citiesRetryCount,
      setLoadingCities,
      setCitiesError,
      setCities,
      () => fetchCities(country, region)
    )
  }, [fetchWithRetry])

  // Fetch countries on mount
  useEffect(() => {
    fetchCountries()
    return () => {
      countriesAbortRef.current?.abort()
    }
  }, [fetchCountries])

  // Fetch regions when country changes
  useEffect(() => {
    if (!currentCountry) {
      setRegions([])
      return
    }
    fetchRegions(currentCountry)
    return () => {
      regionsAbortRef.current?.abort()
    }
  }, [currentCountry, fetchRegions])

  // Fetch cities when country or region changes
  useEffect(() => {
    if (!currentCountry) {
      setCities([])
      return
    }
    fetchCities(currentCountry, currentRegion || null)
    return () => {
      citiesAbortRef.current?.abort()
    }
  }, [currentCountry, currentRegion, fetchCities])

  // Update URL with debouncing
  const updateFilters = useCallback((updates: {
    country?: string
    region?: string
    city?: string
  }) => {
    // Clear existing debounce timer
    if (filterDebounceRef.current) {
      clearTimeout(filterDebounceRef.current)
    }

    // Debounce the navigation
    filterDebounceRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString())

      // Apply updates with cascading reset
      if ('country' in updates) {
        if (updates.country) {
          params.set('country', updates.country.toLowerCase())
        } else {
          params.delete('country')
        }
        // Reset dependent filters
        params.delete('region')
        params.delete('city')
      }

      if ('region' in updates) {
        if (updates.region) {
          params.set('region', updates.region.toLowerCase())
        } else {
          params.delete('region')
        }
        // Reset dependent filters
        params.delete('city')
      }

      if ('city' in updates) {
        if (updates.city) {
          params.set('city', updates.city.toLowerCase())
        } else {
          params.delete('city')
        }
      }

      // Reset to page 1 when filters change
      params.delete('page')

      // Navigate with new filters
      router.push(`/search?${params.toString()}`)

      // Show filter applied feedback
      setFilterApplied(true)
      setTimeout(() => setFilterApplied(false), 2000)
    }, FILTER_DEBOUNCE_MS)
  }, [searchParams, router])

  // Helper: Get country display name
  const getCountryDisplayName = (code: string): string => {
    const country = countries.find(c => c.code === code)
    return country?.name || code
  }

  // Helper: Get region display name
  const getRegionDisplayName = (code: string): string => {
    if (currentCountry === 'US') {
      return US_STATE_NAME_MAP.get(code) || code
    }
    const region = regions.find(r => r.region === code)
    return region?.region_name || code
  }

  // Helper: Format city name from slug
  const formatCityName = (slug: string): string => {
    return slug.split('-').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }

  // Helper: Get screen reader description
  const getFilterDescription = (): string => {
    const parts: string[] = []
    if (currentCountry) parts.push(getCountryDisplayName(currentCountry))
    if (currentRegion) parts.push(getRegionDisplayName(currentRegion))
    if (currentCity) parts.push(formatCityName(currentCity))
    return parts.length > 0 ? `Filtered by: ${parts.join(', ')}` : 'No location filter applied'
  }

  // Retry button component
  const RetryButton = ({ onClick, label }: { onClick: () => void; label: string }) => (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-2 md:px-2.5 py-1.5 border border-red-300 rounded font-body text-xs text-red-600 hover:border-red-400 hover:bg-red-50 focus:outline-none transition-all duration-fast"
      aria-label={`Retry loading ${label}`}
    >
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
      Retry
    </button>
  )

  // Convert to Select options format
  const countryOptions = [
    { value: '', label: 'All Countries' },
    ...countries.map(c => ({
      value: c.code,
      label: `${c.name}${c.artist_count ? ` (${c.artist_count})` : ''}`
    }))
  ]

  const regionOptions = [
    { value: '', label: currentCountry === 'US' ? 'All States' : 'All Regions' },
    ...regions.map(r => ({
      value: r.region,
      label: `${getRegionDisplayName(r.region)} (${r.artist_count})`
    }))
  ]

  const cityOptions = [
    { value: '', label: 'All Cities' },
    ...cities.map(c => ({
      value: c.city.toLowerCase().replace(/\s+/g, '-'),
      label: `${c.city} (${c.artist_count})`
    }))
  ]

  return (
    <div className="flex items-center gap-2">
      {/* Filter applied indicator with screen reader context */}
      {filterApplied && (
        <span
          className="text-xs text-green-600 font-medium animate-fade-in"
          role="status"
          aria-live="polite"
        >
          Filters applied
          <span className="sr-only">. {getFilterDescription()}</span>
        </span>
      )}

      {/* Country Dropdown */}
      {countriesError ? (
        <RetryButton
          onClick={() => {
            countriesRetryCount.current = 0
            fetchCountries()
          }}
          label="countries"
        />
      ) : (
        <Select
          value={currentCountry}
          onChange={(value) => updateFilters({ country: value || '' })}
          options={countryOptions}
          placeholder={loadingCountries ? 'Loading...' : 'Select country'}
          className="w-[140px]"
        />
      )}

      {/* Region/State Dropdown - shown when country selected */}
      {currentCountry && (
        <>
          {regionsError ? (
            <RetryButton
              onClick={() => {
                regionsRetryCount.current = 0
                fetchRegions(currentCountry)
              }}
              label="regions"
            />
          ) : (
            <Select
              value={currentRegion}
              onChange={(value) => updateFilters({ region: value || '' })}
              options={regionOptions}
              placeholder={loadingRegions ? 'Loading...' : 'Select region'}
              className="w-[140px]"
            />
          )}
        </>
      )}

      {/* City Dropdown - shown when country selected */}
      {currentCountry && (
        <>
          {citiesError ? (
            <RetryButton
              onClick={() => {
                citiesRetryCount.current = 0
                fetchCities(currentCountry, currentRegion || null)
              }}
              label="cities"
            />
          ) : (
            <Select
              value={currentCity}
              onChange={(value) => updateFilters({ city: value || '' })}
              options={cityOptions}
              placeholder={loadingCities ? 'Loading...' : 'Select city'}
              className="w-[160px]"
              searchable
              searchPlaceholder="Search cities..."
            />
          )}
        </>
      )}
    </div>
  )
}
