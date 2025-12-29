'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import * as Select from '@radix-ui/react-select'

const CITIES = [
  { value: '', label: 'All Cities' },
  { value: 'Austin, TX', label: 'Austin, TX' },
  { value: 'Los Angeles, CA', label: 'Los Angeles, CA' },
]

export default function CityFilter() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const currentCity = searchParams.get('city') || ''
  const searchId = searchParams.get('id') || ''

  const handleCityChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())

    if (value) {
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
      <label htmlFor="city-filter" className="text-sm font-medium text-gray-700">
        City:
      </label>

      <Select.Root value={currentCity} onValueChange={handleCityChange}>
        <Select.Trigger
          id="city-filter"
          className="inline-flex items-center justify-between gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[180px]"
          aria-label="Filter by city"
        >
          <Select.Value />
          <Select.Icon>
            <svg
              className="w-4 h-4 text-gray-500"
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
            className="overflow-hidden bg-white rounded-lg shadow-lg border border-gray-200"
            position="popper"
            sideOffset={5}
          >
            <Select.Viewport className="p-1">
              {CITIES.map((city) => (
                <Select.Item
                  key={city.value}
                  value={city.value}
                  className="relative flex items-center px-8 py-2 text-sm text-gray-700 rounded cursor-pointer hover:bg-blue-50 hover:text-blue-900 focus:bg-blue-50 focus:text-blue-900 focus:outline-none data-[highlighted]:bg-blue-50 data-[highlighted]:text-blue-900"
                >
                  <Select.ItemText>{city.label}</Select.ItemText>
                  <Select.ItemIndicator className="absolute left-2 inline-flex items-center">
                    <svg
                      className="w-4 h-4 text-blue-600"
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
