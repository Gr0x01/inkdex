'use client'

import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown } from 'lucide-react'
import { buildLocationPath, getRegionName } from '@/lib/utils/location'

interface NavbarLocationSelectProps {
  /** Mobile variant uses different styling */
  variant?: 'desktop' | 'mobile'
  /** Called after navigation (for closing mobile menu) */
  onNavigate?: () => void
}

interface LocationOption {
  value: string
  label: string
  type: 'country' | 'region' | 'city'
  path: string
  country: string
  region?: string
}

interface BrowseLocationsResponse {
  countries: Array<{ code: string; name: string; count: number }>
  regions: Array<{ code: string; name: string; country: string; count: number }>
  cities: Array<{ slug: string; name: string; region: string; country: string; count: number }>
}

/**
 * Searchable location dropdown for navbar navigation
 * Editorial dropdown style with search input inside
 * Lazy-loads all browsable locations on first open
 */
export default function NavbarLocationSelect({
  variant = 'desktop',
  onNavigate,
}: NavbarLocationSelectProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [locations, setLocations] = useState<LocationOption[]>([])
  const [loading, setLoading] = useState(false)
  const [hasFetched, setHasFetched] = useState(false)
  const [error, setError] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)

  const containerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Filter locations based on search query
  const filteredLocations = useMemo(() => {
    if (!searchQuery) return locations
    const query = searchQuery.toLowerCase()
    return locations.filter(loc =>
      loc.label.toLowerCase().includes(query)
    )
  }, [locations, searchQuery])

  // Fetch all locations on first open
  const fetchLocations = useCallback(async () => {
    if (hasFetched || loading) return

    setLoading(true)
    setError(false)

    try {
      const res = await fetch('/api/locations/browse')
      if (!res.ok) throw new Error('Failed to fetch')

      const data: BrowseLocationsResponse = await res.json()
      const options: LocationOption[] = []

      // Add countries (sorted by count, already from API)
      for (const c of data.countries) {
        options.push({
          value: `country-${c.code}`,
          label: `${c.name} (${c.count})`,
          type: 'country',
          path: buildLocationPath(c.code, null, null),
          country: c.code,
        })
      }

      // Add regions/states (sorted by count, already from API)
      for (const r of data.regions) {
        const regionName = r.name || getRegionName(r.code, r.country)
        options.push({
          value: `region-${r.country}-${r.code}`,
          label: `${regionName} (${r.count})`,
          type: 'region',
          path: buildLocationPath(r.country, r.code, null),
          country: r.country,
          region: r.code,
        })
      }

      // Add cities (sorted by count, already from API)
      for (const c of data.cities) {
        // Format: "Austin, TX" for US, "Toronto, ON" for others
        const stateCode = c.region?.toUpperCase() || ''
        const cityLabel = stateCode ? `${c.name}, ${stateCode}` : c.name
        options.push({
          value: `city-${c.country}-${c.region}-${c.slug}`,
          label: `${cityLabel} (${c.count})`,
          type: 'city',
          path: buildLocationPath(c.country, c.region, c.slug),
          country: c.country,
          region: c.region,
        })
      }

      setLocations(options)
      setHasFetched(true)
    } catch (err) {
      console.error('Failed to fetch locations:', err)
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [hasFetched, loading])

  // Handle opening dropdown
  const openDropdown = useCallback(() => {
    setIsOpen(true)
    fetchLocations()
  }, [fetchLocations])

  // Handle closing dropdown
  const closeDropdown = useCallback(() => {
    setIsOpen(false)
    setSearchQuery('')
    setHighlightedIndex(-1)
  }, [])

  // Handle selection - navigate to location page
  const handleSelect = useCallback((option: LocationOption) => {
    router.push(option.path)
    closeDropdown()
    onNavigate?.()
  }, [router, closeDropdown, onNavigate])

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        closeDropdown()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, closeDropdown])

  // Focus search input when opening
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      // Small delay to ensure dropdown is rendered
      setTimeout(() => searchInputRef.current?.focus(), 50)
    }
  }, [isOpen])

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll('[data-location-option]')
      const item = items[highlightedIndex] as HTMLElement
      if (item) {
        item.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [highlightedIndex])

  // Handle keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!isOpen) {
      if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
        event.preventDefault()
        openDropdown()
      }
      return
    }

    switch (event.key) {
      case 'Escape':
        event.preventDefault()
        closeDropdown()
        break
      case 'ArrowDown':
        event.preventDefault()
        setHighlightedIndex(prev =>
          prev < filteredLocations.length - 1 ? prev + 1 : 0
        )
        break
      case 'ArrowUp':
        event.preventDefault()
        setHighlightedIndex(prev =>
          prev > 0 ? prev - 1 : filteredLocations.length - 1
        )
        break
      case 'Enter':
        event.preventDefault()
        if (highlightedIndex >= 0 && filteredLocations[highlightedIndex]) {
          handleSelect(filteredLocations[highlightedIndex])
        }
        break
      case 'Tab':
        closeDropdown()
        break
    }
  }

  // Mobile variant - full-width dropdown
  if (variant === 'mobile') {
    return (
      <div ref={containerRef} className="relative" onKeyDown={handleKeyDown}>
        {/* Mobile Trigger */}
        <button
          type="button"
          onClick={() => isOpen ? closeDropdown() : openDropdown()}
          className="w-full flex items-center justify-between px-3 py-2 border-2 border-ink/20 bg-paper text-ink font-body text-sm"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
        >
          <span className="text-gray-500 italic">Search locations...</span>
          <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Mobile Dropdown */}
        {isOpen && (
          <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-paper border-2 border-ink shadow-lg max-h-80 overflow-hidden">
            {/* Search Input */}
            <div className="p-2 border-b border-gray-200">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setHighlightedIndex(0)
                }}
                placeholder="Type to search..."
                className="w-full h-8 px-2 py-1 font-body text-sm bg-white border border-gray-200 focus:outline-none focus:border-gray-400 placeholder:text-gray-400 placeholder:italic"
              />
            </div>

            {/* Options List */}
            <div ref={listRef} className="max-h-60 overflow-y-auto" role="listbox">
              {loading && (
                <div className="px-4 py-3 text-gray-500 italic font-body text-sm">
                  Loading locations...
                </div>
              )}
              {error && (
                <div className="px-4 py-3 text-red-500 italic font-body text-sm">
                  Failed to load locations
                </div>
              )}
              {!loading && !error && filteredLocations.length === 0 && (
                <div className="px-4 py-3 text-gray-500 italic font-body text-sm">
                  No matches found
                </div>
              )}
              {!loading && !error && filteredLocations.map((location, index) => (
                <button
                  key={location.value}
                  type="button"
                  data-location-option
                  onClick={() => handleSelect(location)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`w-full text-left px-4 py-2 font-body text-sm transition-colors duration-100 border-l-3 ${
                    highlightedIndex === index
                      ? 'bg-gray-100 border-l-ink'
                      : 'border-l-transparent hover:bg-gray-50'
                  }`}
                  role="option"
                >
                  {location.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // Desktop variant - editorial nav style
  return (
    <div ref={containerRef} className="relative" onKeyDown={handleKeyDown}>
      {/* Desktop Trigger - Editorial Style */}
      <button
        type="button"
        onClick={() => isOpen ? closeDropdown() : openDropdown()}
        className="editorial-nav-link relative group flex items-center gap-1"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className="relative z-10">Browse</span>
        <ChevronDown className={`w-3.5 h-3.5 text-ink transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-ink transform scale-x-0 group-hover:scale-x-100 transition-transform duration-medium origin-left" />
      </button>

      {/* Desktop Dropdown - Editorial Style */}
      <div
        className={`editorial-dropdown-menu ${isOpen ? 'editorial-dropdown-menu-open' : ''}`}
        style={{ minWidth: '240px' }}
      >
        {/* Search Input */}
        <div className="p-2 border-b border-gray-200 sticky top-0 bg-paper z-10">
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setHighlightedIndex(0)
            }}
            placeholder="Search cities, states..."
            className="w-full h-7 px-2 py-1 font-body text-[13px] bg-white border border-gray-200 focus:outline-none focus:border-gray-400 placeholder:text-gray-400 placeholder:italic"
          />
        </div>

        {/* Options List */}
        <div ref={listRef} role="listbox">
          {loading && (
            <div className="px-4 py-3 text-gray-500 italic font-body text-sm">
              Loading locations...
            </div>
          )}
          {error && (
            <div className="px-4 py-3 text-red-500 italic font-body text-sm">
              Failed to load locations
            </div>
          )}
          {!loading && !error && filteredLocations.length === 0 && (
            <div className="px-4 py-3 text-gray-500 italic font-body text-sm">
              No matches found
            </div>
          )}
          {!loading && !error && filteredLocations.map((location, index) => (
            <button
              key={location.value}
              type="button"
              data-location-option
              onClick={() => handleSelect(location)}
              onMouseEnter={() => setHighlightedIndex(index)}
              className={`editorial-dropdown-item w-full text-left ${
                highlightedIndex === index ? 'bg-gray-100 border-l-gray-500' : ''
              }`}
              role="option"
            >
              {location.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
