import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import SearchError from './SearchError'

const meta = {
  title: 'Components/Search/SearchError',
  component: SearchError,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'radio',
      options: ['inline', 'banner'],
      description: 'Visual style variant',
    },
    message: {
      control: 'text',
      description: 'Error message to display',
    },
  },
} satisfies Meta<typeof SearchError>

export default meta
type Story = StoryObj<typeof meta>

/**
 * Inline variant - for navbar on light backgrounds
 * Left-aligned with editorial border accent
 */
export const Inline: Story = {
  args: {
    message: 'Please enter at least 3 characters',
    variant: 'inline',
  },
  decorators: [
    (Story) => (
      <div className="bg-paper p-6 w-96">
        <Story />
      </div>
    ),
  ],
}

/**
 * Banner variant - for hero on dark backgrounds
 * Full width, matches search bar aesthetic
 */
export const Banner: Story = {
  args: {
    message: 'Please upload an image or describe what you\'re looking for',
    variant: 'banner',
  },
  decorators: [
    (Story) => (
      <div className="bg-ink p-8 w-full max-w-2xl">
        <Story />
      </div>
    ),
  ],
}

/**
 * Rate limit error - common scenario
 */
export const RateLimitError: Story = {
  args: {
    message: 'Too many searches. Please try again in 5 minutes.',
    variant: 'banner',
  },
  decorators: [
    (Story) => (
      <div className="bg-ink p-8 w-full max-w-2xl">
        <Story />
      </div>
    ),
  ],
}

/**
 * Network error on light background
 */
export const NetworkError: Story = {
  args: {
    message: 'Failed to connect. Please check your internet connection.',
    variant: 'inline',
  },
  decorators: [
    (Story) => (
      <div className="bg-paper p-6 w-96">
        <Story />
      </div>
    ),
  ],
}

/**
 * Both variants side by side
 */
export const AllVariants: Story = {
  args: {
    message: 'Example error',
    variant: 'inline',
  },
  render: () => (
    <div className="space-y-8 w-full max-w-2xl">
      <div>
        <p className="text-xs uppercase tracking-widest text-gray-500 mb-3 font-mono">
          Banner (dark background)
        </p>
        <div className="bg-ink p-6">
          <SearchError
            message="Please upload an image or describe what you're looking for"
            variant="banner"
          />
        </div>
      </div>

      <div>
        <p className="text-xs uppercase tracking-widest text-gray-500 mb-3 font-mono">
          Inline (light background)
        </p>
        <div className="bg-paper p-6 border border-gray-200">
          <SearchError
            message="Please enter at least 3 characters"
            variant="inline"
          />
        </div>
      </div>
    </div>
  ),
}

/**
 * In context - shows how errors appear with search inputs
 */
export const InContext: Story = {
  args: {
    message: 'Example error',
    variant: 'inline',
  },
  render: () => (
    <div className="space-y-12 w-full max-w-3xl">
      {/* Hero context */}
      <div>
        <p className="text-xs uppercase tracking-widest text-gray-500 mb-4 font-mono">
          Hero Search
        </p>
        <div className="bg-ink p-8">
          <div className="flex gap-3">
            <div className="flex-1 h-16 bg-white/95 border-2 border-status-error flex items-center px-4">
              <span className="text-ink/40 font-body">Drop an image or describe a style...</span>
            </div>
            <button className="h-16 px-6 bg-white/5 text-white/30 border-2 border-transparent font-mono text-sm uppercase tracking-widest">
              Search
            </button>
          </div>
          <SearchError
            message="Please upload an image or describe what you're looking for"
            variant="banner"
          />
        </div>
      </div>

      {/* Navbar context */}
      <div>
        <p className="text-xs uppercase tracking-widest text-gray-500 mb-4 font-mono">
          Navbar Search
        </p>
        <div className="bg-paper p-6 border border-gray-200">
          <div className="flex gap-0">
            <div className="flex-1 h-11 bg-white/80 border-2 border-status-error flex items-center px-4">
              <span className="text-ink/35 text-sm font-body">Search artists, styles...</span>
            </div>
            <button className="h-11 px-4 bg-ink/5 text-ink/25 border-2 border-transparent font-mono text-xs uppercase tracking-widest">
              Search
            </button>
          </div>
          <SearchError
            message="Please enter at least 3 characters"
            variant="inline"
          />
        </div>
      </div>
    </div>
  ),
}
