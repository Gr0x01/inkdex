'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import UnifiedSearchBar from './UnifiedSearchBar'
import { useDetectUserCity } from '@/lib/hooks/useDetectUserCity'

interface City {
  name: string
  state: string
  slug: string
}

interface HeroSearchWithCityProps {
  /** Initial city to display (for Storybook) */
  initialCity?: City | null
  /** Show detecting state (for Storybook) */
  forceDetecting?: boolean
  /** Show city picker open (for Storybook) */
  forcePickerOpen?: boolean
  /** Pass through to UnifiedSearchBar */
  forceLoading?: boolean
  forceError?: string | null
  forceTextQuery?: string | null
  forceImagePreview?: string | null
}

export default function HeroSearchWithCity({
  initialCity,
  forceDetecting,
  forcePickerOpen = false,
  forceLoading,
  forceError,
  forceTextQuery,
  forceImagePreview,
}: HeroSearchWithCityProps) {
  // Use geolocation hook for real detection
  const { detectedCity, isDetecting: hookIsDetecting } = useDetectUserCity()

  // Allow Storybook overrides
  const isDetecting = forceDetecting ?? hookIsDetecting

  // Memoize to prevent unnecessary effect runs
  const autoDetectedCity = useMemo(() => {
    if (initialCity !== undefined) return initialCity
    if (!detectedCity) return null
    return {
      name: detectedCity.name,
      slug: detectedCity.slug,
      state: detectedCity.state,
    }
  }, [initialCity, detectedCity])

  const [selectedCity, setSelectedCity] = useState<City | null>(autoDetectedCity)
  const [isPickerOpen, setIsPickerOpen] = useState(forcePickerOpen)
  const [searchQuery, setSearchQuery] = useState('')
  const [cities, setCities] = useState<City[]>([])
  const [citiesLoading, setCitiesLoading] = useState(false)
  const [citiesFetched, setCitiesFetched] = useState(false)
  const [citiesError, setCitiesError] = useState<string | null>(null)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 })
  const abortControllerRef = useRef<AbortController | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Update selected city when auto-detection completes
  useEffect(() => {
    if (!isDetecting && autoDetectedCity && !selectedCity) {
      setSelectedCity(autoDetectedCity)
    }
  }, [isDetecting, autoDetectedCity, selectedCity])

  // Fetch cities with actual artists when dropdown opens
  const fetchCities = useCallback(async () => {
    if (citiesFetched) return

    // Cancel any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    setCitiesLoading(true)
    setCitiesError(null)

    try {
      const res = await fetch('/api/cities/with-counts?min_count=1', {
        signal: abortControllerRef.current.signal,
      })
      if (!res.ok) throw new Error('Failed to fetch cities')

      const data = await res.json()

      // Handle error response structure from API
      if (data.error) {
        throw new Error(data.error)
      }

      const cityList: City[] = data.map((c: { city: string; region: string; country_code: string }) => ({
        // Convert slug to display name (e.g., "los-angeles" -> "Los Angeles")
        name: c.city.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        state: c.region,
        slug: c.city,
      }))
      setCities(cityList)
      setCitiesFetched(true)
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return // Ignore abort errors
      }
      console.error('Failed to fetch cities:', error)
      setCitiesError('Unable to load cities')
    } finally {
      setCitiesLoading(false)
      abortControllerRef.current = null
    }
  }, [citiesFetched])

  // Fetch cities when picker opens
  useEffect(() => {
    if (isPickerOpen && !citiesFetched && !citiesError) {
      fetchCities()
    }
  }, [isPickerOpen, citiesFetched, citiesError, fetchCities])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  // Close dropdown on scroll
  useEffect(() => {
    if (isPickerOpen) {
      const handleScroll = () => setIsPickerOpen(false)
      window.addEventListener('scroll', handleScroll, { passive: true })
      return () => window.removeEventListener('scroll', handleScroll)
    }
  }, [isPickerOpen])

  // Calculate dropdown position synchronously when opening
  const handlePickerToggle = () => {
    if (!isPickerOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      const dropdownWidth = 256 // w-64 = 16rem = 256px
      setDropdownPosition({
        top: rect.bottom + 8,
        left: rect.left + rect.width / 2 - dropdownWidth / 2, // center it
      })
    }
    setIsPickerOpen(!isPickerOpen)
  }

  const filteredCities = useMemo(() => {
    const query = searchQuery.toLowerCase()
    return cities.filter(
      (city) =>
        city.name.toLowerCase().includes(query) ||
        city.state.toLowerCase().includes(query)
    )
  }, [searchQuery, cities])

  return (
    <div className="w-full">
      {/* City Selector Above Search */}
      <div className="flex items-center justify-center gap-2 mb-3">
        {isDetecting ? (
          // Detecting state
          <div className="flex items-center gap-2 px-3 py-1.5">
            <svg
              className="w-4 h-4 text-orange-500 animate-pulse"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <span className="text-white/60 text-sm font-mono uppercase tracking-wider">
              Detecting location...
            </span>
          </div>
        ) : (
          // City display with change button
          <div className="relative">
            <button
              ref={buttonRef}
              onClick={handlePickerToggle}
              className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/5 transition-colors group"
            >
              <svg
                className="w-4 h-4 text-orange-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <span className="text-white font-mono text-sm uppercase tracking-wider">
                {selectedCity ? `${selectedCity.name}, ${selectedCity.state}` : 'Search Anywhere'}
              </span>
              <svg
                className={`w-3 h-3 text-white/40 transition-transform ${isPickerOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* City Picker Dropdown */}
            {isPickerOpen && (
              <>
                {/* Backdrop */}
                <div
                  className="fixed inset-0 z-40 animate-fade-in-fast"
                  onClick={() => setIsPickerOpen(false)}
                />

                {/* Dropdown - fixed position to escape overflow:hidden */}
                <div
                  className="fixed w-64 bg-ink border border-white/20 shadow-2xl z-50 animate-fade-in-fast"
                  style={{ top: dropdownPosition.top, left: dropdownPosition.left }}
                >
                  {/* Search input */}
                  <div className="p-2 border-b border-white/10">
                    <input
                      type="text"
                      placeholder="Search cities..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full px-3 py-2 bg-white/5 text-white text-sm font-mono placeholder:text-white/30 outline-none focus:bg-white/10 transition-colors"
                      autoFocus
                    />
                  </div>

                  {/* Options */}
                  <div className="max-h-64 overflow-y-auto">
                    {/* Anywhere option */}
                    <button
                      onClick={() => {
                        setSelectedCity(null)
                        setIsPickerOpen(false)
                        setSearchQuery('')
                      }}
                      className={`w-full px-4 py-3 text-left font-mono text-sm uppercase tracking-wider transition-colors flex items-center gap-2 ${
                        selectedCity === null
                          ? 'bg-orange-500/20 text-orange-400'
                          : 'text-white/70 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      Search Anywhere
                    </button>

                    {/* Loading state */}
                    {citiesLoading && (
                      <div className="px-4 py-6 text-center text-white/40 text-sm font-mono">
                        Loading cities...
                      </div>
                    )}

                    {/* Error state with retry */}
                    {citiesError && !citiesLoading && (
                      <div className="px-4 py-6 text-center">
                        <p className="text-red-400 text-sm font-mono mb-2">{citiesError}</p>
                        <button
                          onClick={() => {
                            setCitiesError(null)
                            setCitiesFetched(false)
                            fetchCities()
                          }}
                          className="text-orange-400 hover:text-orange-300 text-sm font-mono"
                        >
                          Retry
                        </button>
                      </div>
                    )}

                    {/* City options */}
                    {!citiesLoading && filteredCities.map((city) => (
                      <button
                        key={city.slug}
                        onClick={() => {
                          setSelectedCity(city)
                          setIsPickerOpen(false)
                          setSearchQuery('')
                        }}
                        className={`w-full px-4 py-3 text-left font-mono text-sm uppercase tracking-wider transition-colors ${
                          selectedCity?.slug === city.slug
                            ? 'bg-orange-500/20 text-orange-400'
                            : 'text-white/70 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        {city.name}, {city.state}
                      </button>
                    ))}

                    {!citiesLoading && filteredCities.length === 0 && citiesFetched && (
                      <div className="px-4 py-6 text-center text-white/40 text-sm font-mono">
                        No cities found
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Search Bar */}
      <UnifiedSearchBar
        cityFilter={selectedCity?.slug ?? null}
        forceLoading={forceLoading}
        forceError={forceError}
        forceTextQuery={forceTextQuery}
        forceImagePreview={forceImagePreview}
      />
    </div>
  )
}
