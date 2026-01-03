'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import * as Select from '@radix-ui/react-select'
import { CITIES, STATES } from '@/lib/constants/cities'

// Featured city slugs for filtering dynamic results
const FEATURED_CITY_SLUGS = new Set(CITIES.map(c => c.slug))

// Static filter options (always available)
const STATIC_FILTER_OPTIONS = [
  { value: 'all', label: 'All Locations', group: 'main' },
  // State filters
  ...STATES.map(state => ({
    value: `state:${state.slug}`,
    label: `All of ${state.name}`,
    group: 'states' as const,
  })),
  // Featured cities
  ...CITIES.map(city => ({
    value: city.slug,
    label: city.fullName,
    group: 'featured' as const,
  })),
]

export default function CityFilter() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [dynamicCities, setDynamicCities] = useState<Array<{ city: string; region: string; artist_count: number }>>([])
  const [loading, setLoading] = useState(true)

  const currentCity = searchParams.get('city') || 'all'

  // Fetch dynamic cities with 5+ artists
  useEffect(() => {
    fetch('/api/cities/with-counts')
      .then(res => res.json())
      .then(data => {
        setDynamicCities(data || [])
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to load dynamic cities:', err)
        setLoading(false) // Graceful fallback - just show featured cities
      })
  }, [])

  // Filter out featured cities from dynamic results and create city slug
  const popularCities = dynamicCities
    .filter(c => {
      const citySlug = c.city.toLowerCase().replace(/\s+/g, '-')
      return !FEATURED_CITY_SLUGS.has(citySlug)
    })
    .map(c => ({
      value: c.city.toLowerCase().replace(/\s+/g, '-'),
      label: `${c.city}, ${c.region} (${c.artist_count})`,
      group: 'popular' as const,
    }))

  // Combine static and dynamic options
  const allFilterOptions = [...STATIC_FILTER_OPTIONS, ...popularCities]

  const handleCityChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())

    // Treat 'all' as no filter
    if (value && value !== 'all') {
      params.set('city', value)
    } else {
      params.delete('city')
    }

    // Reset to page 1 when changing filters
    params.delete('page')

    router.push(`/search?${params.toString()}`)
  }

  return (
    <Select.Root value={currentCity} onValueChange={handleCityChange}>
      <Select.Trigger
        id="city-filter"
        className="inline-flex items-center gap-2 px-2.5 md:px-3 py-2 md:py-1.5 border border-ink/20 rounded font-body text-xs md:text-sm text-ink hover:border-ink/40 focus:outline-none focus:border-ink focus:ring-1 focus:ring-ink/20 transition-all duration-fast min-w-[120px] md:min-w-[140px]"
        aria-label="Filter by location"
      >
        <Select.Value />
        <Select.Icon>
          <svg
            className="w-3.5 h-3.5 md:w-3 md:h-3 text-ink/40 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </Select.Icon>
      </Select.Trigger>

      <Select.Portal>
        <Select.Content
          className="overflow-hidden bg-[#F8F7F5] rounded border border-ink/20 shadow-lg z-50 max-h-[400px]"
          position="popper"
          sideOffset={5}
        >
          <Select.Viewport className="p-1">
            {/* All Locations */}
            {allFilterOptions.filter(o => o.group === 'main').map((option) => (
              <Select.Item
                key={option.value}
                value={option.value}
                className="relative flex items-center px-7 py-1.5 font-body text-sm text-ink rounded cursor-pointer hover:bg-ink/5 focus:bg-ink/5 focus:outline-none data-[highlighted]:bg-ink/5 transition-colors duration-fast"
              >
                <Select.ItemText>{option.label}</Select.ItemText>
                <Select.ItemIndicator className="absolute left-1.5 inline-flex items-center">
                  <svg className="w-3.5 h-3.5 text-ink" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </Select.ItemIndicator>
              </Select.Item>
            ))}

            {/* By State */}
            <Select.Group>
              <Select.Label className="px-7 py-1.5 font-mono text-xs font-medium text-gray-500 uppercase tracking-wider">
                By State
              </Select.Label>
              {allFilterOptions.filter(o => o.group === 'states').map((option) => (
                <Select.Item
                  key={option.value}
                  value={option.value}
                  className="relative flex items-center px-7 py-1.5 font-body text-sm text-ink rounded cursor-pointer hover:bg-ink/5 focus:bg-ink/5 focus:outline-none data-[highlighted]:bg-ink/5 transition-colors duration-fast"
                >
                  <Select.ItemText>{option.label}</Select.ItemText>
                  <Select.ItemIndicator className="absolute left-1.5 inline-flex items-center">
                    <svg className="w-3.5 h-3.5 text-ink" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.Group>

            {/* Featured Cities */}
            <Select.Group>
              <Select.Label className="px-7 py-1.5 font-mono text-xs font-medium text-gray-500 uppercase tracking-wider">
                Featured Cities
              </Select.Label>
              {allFilterOptions.filter(o => o.group === 'featured').map((option) => (
                <Select.Item
                  key={option.value}
                  value={option.value}
                  className="relative flex items-center px-7 py-1.5 font-body text-sm text-ink rounded cursor-pointer hover:bg-ink/5 focus:bg-ink/5 focus:outline-none data-[highlighted]:bg-ink/5 transition-colors duration-fast"
                >
                  <Select.ItemText>{option.label}</Select.ItemText>
                  <Select.ItemIndicator className="absolute left-1.5 inline-flex items-center">
                    <svg className="w-3.5 h-3.5 text-ink" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.Group>

            {/* Other Popular Cities (5+ artists) */}
            {!loading && popularCities.length > 0 && (
              <Select.Group>
                <Select.Label className="px-7 py-1.5 font-mono text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Other Cities
                </Select.Label>
                {popularCities.map((option) => (
                  <Select.Item
                    key={option.value}
                    value={option.value}
                    className="relative flex items-center px-7 py-1.5 font-body text-sm text-ink rounded cursor-pointer hover:bg-ink/5 focus:bg-ink/5 focus:outline-none data-[highlighted]:bg-ink/5 transition-colors duration-fast"
                  >
                    <Select.ItemText>{option.label}</Select.ItemText>
                    <Select.ItemIndicator className="absolute left-1.5 inline-flex items-center">
                      <svg className="w-3.5 h-3.5 text-ink" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </Select.ItemIndicator>
                  </Select.Item>
                ))}
              </Select.Group>
            )}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  )
}
