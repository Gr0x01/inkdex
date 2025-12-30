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
    <div className="flex items-center gap-3">
      <label htmlFor="city-filter" className="font-body text-sm font-medium text-text-secondary">
        Location:
      </label>

      <Select.Root value={currentCity} onValueChange={handleCityChange}>
        <Select.Trigger
          id="city-filter"
          className="inline-flex items-center justify-between gap-2 px-4 py-2 bg-surface-mid border border-border-medium rounded-lg font-body text-sm font-medium text-text-primary hover:bg-surface-high hover:border-border-strong focus:outline-none focus:border-accent-primary focus:shadow-glow-accent transition-all duration-fast min-w-[200px]"
          aria-label="Filter by location"
        >
          <Select.Value />
          <Select.Icon>
            <svg
              className="w-4 h-4 text-text-tertiary"
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
            className="overflow-hidden bg-surface-low rounded-lg shadow-xl border border-border-medium z-50"
            position="popper"
            sideOffset={5}
          >
            <Select.Viewport className="p-1">
              {FILTER_OPTIONS.map((option) => (
                <Select.Item
                  key={option.value}
                  value={option.value}
                  className="relative flex items-center px-8 py-2 font-body text-sm text-text-primary rounded cursor-pointer hover:bg-accent-primary/10 hover:text-accent-primary focus:bg-accent-primary/10 focus:text-accent-primary focus:outline-none data-[highlighted]:bg-accent-primary/10 data-[highlighted]:text-accent-primary transition-colors duration-fast"
                >
                  <Select.ItemText>{option.label}</Select.ItemText>
                  <Select.ItemIndicator className="absolute left-2 inline-flex items-center">
                    <svg
                      className="w-4 h-4 text-accent-primary"
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
    </div>
  )
}
