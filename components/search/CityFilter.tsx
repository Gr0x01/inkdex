'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import * as Select from '@radix-ui/react-select'
import { CITIES, STATES } from '@/lib/constants/cities'

// Build filter options with proper database values
const FILTER_OPTIONS = [
  { value: 'all', label: 'All Locations' }, // Use 'all' instead of empty string
  // State filters
  ...STATES.map(state => ({
    value: `state:${state.slug}`,
    label: `All of ${state.name}`,
  })),
  // City filters (use slug to match database)
  ...CITIES.map(city => ({
    value: city.slug, // 'austin' matches database
    label: city.fullName, // 'Austin, TX' for display
  })),
]

export default function CityFilter() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const currentCity = searchParams.get('city') || 'all'

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
          className="overflow-hidden bg-[#F8F7F5] rounded border border-ink/20 shadow-lg z-50"
          position="popper"
          sideOffset={5}
        >
          <Select.Viewport className="p-1">
            {FILTER_OPTIONS.map((option) => (
              <Select.Item
                key={option.value}
                value={option.value}
                className="relative flex items-center px-7 py-1.5 font-body text-sm text-ink rounded cursor-pointer hover:bg-ink/5 focus:bg-ink/5 focus:outline-none data-[highlighted]:bg-ink/5 transition-colors duration-fast"
              >
                <Select.ItemText>{option.label}</Select.ItemText>
                <Select.ItemIndicator className="absolute left-1.5 inline-flex items-center">
                  <svg
                    className="w-3.5 h-3.5 text-ink"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  )
}
