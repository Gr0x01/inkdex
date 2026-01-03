import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import LocationFilter from './LocationFilter'

/**
 * LocationFilter provides cascading dropdowns for filtering by location.
 * Country → Region → City
 *
 * The component fetches options from the API and updates URL search params.
 */
const meta: Meta<typeof LocationFilter> = {
  title: 'Search/LocationFilter',
  component: LocationFilter,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: '/search',
        query: {},
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="p-8 bg-paper min-w-[400px]">
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof LocationFilter>

/**
 * Default state - no filters applied, shows "All Countries"
 */
export const Default: Story = {
  parameters: {
    nextjs: {
      navigation: {
        pathname: '/search',
        query: {},
      },
    },
    mockData: [
      {
        url: '/api/locations/countries?with_artists=true',
        method: 'GET',
        status: 200,
        response: [
          { code: 'US', name: 'United States', artist_count: 1500 },
          { code: 'UK', name: 'United Kingdom', artist_count: 200 },
          { code: 'CA', name: 'Canada', artist_count: 150 },
          { code: 'AU', name: 'Australia', artist_count: 100 },
        ],
      },
    ],
  },
}

/**
 * With country selected - shows region dropdown
 */
export const WithCountrySelected: Story = {
  parameters: {
    nextjs: {
      navigation: {
        pathname: '/search',
        query: { country: 'us' },
      },
    },
    mockData: [
      {
        url: '/api/locations/countries?with_artists=true',
        method: 'GET',
        status: 200,
        response: [
          { code: 'US', name: 'United States', artist_count: 1500 },
        ],
      },
      {
        url: '/api/locations/regions?country=US',
        method: 'GET',
        status: 200,
        response: [
          { region: 'TX', region_name: 'Texas', artist_count: 250 },
          { region: 'CA', region_name: 'California', artist_count: 400 },
          { region: 'NY', region_name: 'New York', artist_count: 300 },
          { region: 'FL', region_name: 'Florida', artist_count: 200 },
        ],
      },
      {
        url: '/api/cities/with-counts?country=US&min_count=1',
        method: 'GET',
        status: 200,
        response: [
          { city: 'Austin', region: 'TX', country_code: 'US', artist_count: 150 },
          { city: 'Houston', region: 'TX', country_code: 'US', artist_count: 100 },
          { city: 'Los Angeles', region: 'CA', country_code: 'US', artist_count: 200 },
        ],
      },
    ],
  },
}

/**
 * With country and region selected - shows all three dropdowns
 */
export const WithRegionSelected: Story = {
  parameters: {
    nextjs: {
      navigation: {
        pathname: '/search',
        query: { country: 'us', region: 'tx' },
      },
    },
    mockData: [
      {
        url: '/api/locations/countries?with_artists=true',
        method: 'GET',
        status: 200,
        response: [
          { code: 'US', name: 'United States', artist_count: 1500 },
        ],
      },
      {
        url: '/api/locations/regions?country=US',
        method: 'GET',
        status: 200,
        response: [
          { region: 'TX', region_name: 'Texas', artist_count: 250 },
        ],
      },
      {
        url: '/api/cities/with-counts?country=US&region=TX&min_count=1',
        method: 'GET',
        status: 200,
        response: [
          { city: 'Austin', region: 'TX', country_code: 'US', artist_count: 150 },
          { city: 'Houston', region: 'TX', country_code: 'US', artist_count: 100 },
          { city: 'Dallas', region: 'TX', country_code: 'US', artist_count: 80 },
          { city: 'San Antonio', region: 'TX', country_code: 'US', artist_count: 50 },
        ],
      },
    ],
  },
}

/**
 * Full selection - all three filters applied
 */
export const FullSelection: Story = {
  parameters: {
    nextjs: {
      navigation: {
        pathname: '/search',
        query: { country: 'us', region: 'tx', city: 'austin' },
      },
    },
  },
}

/**
 * Loading state - shows "..." while fetching countries
 */
export const Loading: Story = {
  parameters: {
    nextjs: {
      navigation: {
        pathname: '/search',
        query: {},
      },
    },
    mockData: [
      {
        url: '/api/locations/countries?with_artists=true',
        method: 'GET',
        status: 200,
        delay: 10000, // 10 second delay to show loading state
        response: [],
      },
    ],
  },
}

/**
 * Error state - shows retry button when API fails
 */
export const Error: Story = {
  parameters: {
    nextjs: {
      navigation: {
        pathname: '/search',
        query: {},
      },
    },
    mockData: [
      {
        url: '/api/locations/countries?with_artists=true',
        method: 'GET',
        status: 500,
        response: { error: 'Server error' },
      },
    ],
  },
}

/**
 * Empty state - no countries available
 */
export const Empty: Story = {
  parameters: {
    nextjs: {
      navigation: {
        pathname: '/search',
        query: {},
      },
    },
    mockData: [
      {
        url: '/api/locations/countries?with_artists=true',
        method: 'GET',
        status: 200,
        response: [],
      },
    ],
  },
}

/**
 * International - UK selected
 */
export const InternationalUK: Story = {
  parameters: {
    nextjs: {
      navigation: {
        pathname: '/search',
        query: { country: 'uk' },
      },
    },
    mockData: [
      {
        url: '/api/locations/countries?with_artists=true',
        method: 'GET',
        status: 200,
        response: [
          { code: 'UK', name: 'United Kingdom', artist_count: 200 },
        ],
      },
      {
        url: '/api/locations/regions?country=UK',
        method: 'GET',
        status: 200,
        response: [
          { region: 'England', region_name: 'England', artist_count: 150 },
          { region: 'Scotland', region_name: 'Scotland', artist_count: 30 },
          { region: 'Wales', region_name: 'Wales', artist_count: 15 },
        ],
      },
      {
        url: '/api/cities/with-counts?country=UK&min_count=1',
        method: 'GET',
        status: 200,
        response: [
          { city: 'London', region: 'England', country_code: 'UK', artist_count: 100 },
          { city: 'Manchester', region: 'England', country_code: 'UK', artist_count: 25 },
          { city: 'Edinburgh', region: 'Scotland', country_code: 'UK', artist_count: 20 },
        ],
      },
    ],
  },
}
