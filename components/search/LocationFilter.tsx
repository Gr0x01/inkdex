'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Select from '@/components/ui/Select'
import { US_STATES } from '@/lib/constants/states'
import { isValidCountryCode, isValidRegion, isValidCitySlug } from '@/lib/utils/location'

interface LocationFilterProps {
  /** Search ID to filter locations by matching artists */
  searchId?: string
}

interface FlatLocationOption {
  value: string
  label: string
  type: 'country' | 'region' | 'city'
  country?: string
  region?: string
}

// US state name lookup
const US_STATE_NAME_MAP = new Map(US_STATES.map(s => [s.code, s.name]))

// Debounce delay for filter updates
const FILTER_DEBOUNCE_MS = 150

/**
 * Location Filter with lazy loading
 * Fetches location counts filtered by search embedding when dropdown opens
 */
export default function LocationFilter({ searchId }: LocationFilterProps) {
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

  // State
  const [flatLocations, setFlatLocations] = useState<FlatLocationOption[]>([])
  const [loading, setLoading] = useState(false)
  const [hasFetched, setHasFetched] = useState(false)
  const filterDebounceRef = useRef<NodeJS.Timeout | null>(null)

  // Fetch filtered locations when dropdown opens
  const fetchLocations = useCallback(async () => {
    // Only fetch once per search
    if (hasFetched || loading) return

    setLoading(true)

    try {
      if (searchId) {
        // Fetch locations filtered by search embedding
        const res = await fetch(`/api/search/${searchId}/locations`)
        if (!res.ok) throw new Error('Failed to fetch locations')

        const data = await res.json()
        const flattened: FlatLocationOption[] = []

        // Add "United States" if we have US results
        const hasUSResults = data.regions?.length > 0 || data.cities?.length > 0
        if (hasUSResults) {
          const usCount = data.countries?.find((c: { code: string }) => c.code === 'US')?.count
          flattened.push({
            value: 'country-US',
            label: usCount ? `United States (${usCount})` : 'United States',
            type: 'country',
            country: 'US'
          })
        }

        // Add regions/states (sorted by count)
        const regions = (data.regions || []).sort((a: { count: number }, b: { count: number }) => b.count - a.count)
        for (const r of regions) {
          const stateName = US_STATE_NAME_MAP.get(r.code) || r.code
          flattened.push({
            value: `region-${r.country}-${r.code}`,
            label: `${stateName} (${r.count})`,
            type: 'region',
            country: r.country,
            region: r.code
          })
        }

        // Add cities (sorted by count)
        const cities = (data.cities || []).sort((a: { count: number }, b: { count: number }) => b.count - a.count)
        for (const c of cities) {
          const cityName = c.slug.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
          flattened.push({
            value: `city-${c.country}-${c.region}-${c.slug}`,
            label: `${cityName} (${c.count})`,
            type: 'city',
            country: c.country,
            region: c.region
          })
        }

        setFlatLocations(flattened)
      } else {
        // No searchId - fall back to fetching all locations
        const [regionsRes, citiesRes] = await Promise.all([
          fetch('/api/locations/regions?country=US').then(r => r.json()),
          fetch('/api/cities/with-counts?country=US&min_count=1').then(r => r.json())
        ])

        const flattened: FlatLocationOption[] = []

        // Add United States
        flattened.push({
          value: 'country-US',
          label: 'United States',
          type: 'country',
          country: 'US'
        })

        // Add regions
        for (const r of regionsRes) {
          const stateName = US_STATE_NAME_MAP.get(r.region) || r.region_name
          flattened.push({
            value: `region-US-${r.region}`,
            label: `${stateName} (${r.artist_count})`,
            type: 'region',
            country: 'US',
            region: r.region
          })
        }

        // Add cities
        for (const c of citiesRes) {
          flattened.push({
            value: `city-${c.country_code}-${c.region}-${c.city}`,
            label: `${c.city.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} (${c.artist_count})`,
            type: 'city',
            country: c.country_code,
            region: c.region
          })
        }

        setFlatLocations(flattened)
      }

      setHasFetched(true)
    } catch (error) {
      console.error('Failed to fetch locations:', error)
    } finally {
      setLoading(false)
    }
  }, [searchId, hasFetched, loading])

  // Fetch locations on mount if a filter is already applied (so we can display the selected value)
  useEffect(() => {
    if ((currentCountry || currentRegion || currentCity) && !hasFetched) {
      fetchLocations()
    }
  }, [])

  // Update URL with debouncing
  const updateFilters = useCallback((updates: {
    country?: string
    region?: string
    city?: string
  }) => {
    if (filterDebounceRef.current) {
      clearTimeout(filterDebounceRef.current)
    }

    filterDebounceRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString())

      if ('country' in updates) {
        if (updates.country) {
          params.set('country', updates.country.toLowerCase())
        } else {
          params.delete('country')
        }
        params.delete('region')
        params.delete('city')
      }

      if ('region' in updates) {
        if (updates.region) {
          params.set('region', updates.region.toLowerCase())
        } else {
          params.delete('region')
        }
        params.delete('city')
      }

      if ('city' in updates) {
        if (updates.city) {
          params.set('city', updates.city.toLowerCase())
        } else {
          params.delete('city')
        }
      }

      params.delete('page')
      router.push(`/search?${params.toString()}`)
    }, FILTER_DEBOUNCE_MS)
  }, [searchParams, router])

  // Get current selected value
  const getCurrentValue = (): string | null => {
    if (currentCity && currentCountry && currentRegion) return `city-${currentCountry}-${currentRegion}-${currentCity}`
    if (currentRegion && currentCountry) return `region-${currentCountry}-${currentRegion}`
    if (currentCountry) return `country-${currentCountry}`
    return null
  }

  // Handle selection
  const handleSelection = (value: string | null) => {
    if (!value) {
      updateFilters({ country: '', region: '', city: '' })
      return
    }

    const option = flatLocations.find(loc => loc.value === value)
    if (!option) return

    if (option.type === 'country') {
      updateFilters({ country: option.country || '', region: '', city: '' })
    } else if (option.type === 'region') {
      updateFilters({ country: option.country || '', region: option.region || '', city: '' })
    } else if (option.type === 'city') {
      // Extract city slug from value format: city-{country}-{region}-{slug}
      const citySlug = value.replace(`city-${option.country}-${option.region}-`, '')
      updateFilters({
        country: option.country || '',
        region: option.region || '',
        city: citySlug
      })
    }
  }

  // Build options
  const options = [
    { value: '', label: 'All Locations' },
    ...flatLocations.map(loc => ({
      value: loc.value,
      label: loc.label
    }))
  ]

  return (
    <Select
      value={getCurrentValue()}
      onChange={handleSelection}
      options={options}
      placeholder={loading ? 'Loading...' : 'All locations'}
      className="w-[140px] md:w-[200px]"
      searchable
      searchPlaceholder="Search locations..."
      size="sm"
      onOpen={fetchLocations}
    />
  )
}
