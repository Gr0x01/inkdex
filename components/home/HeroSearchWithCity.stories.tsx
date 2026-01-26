import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import HeroSearchWithCity from './HeroSearchWithCity'

const meta = {
  title: 'Components/Search/HeroSearchWithCity',
  component: HeroSearchWithCity,
  parameters: {
    layout: 'fullscreen',
    backgrounds: { default: 'ink' },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="min-h-screen bg-ink flex items-center justify-center p-8">
        <div className="w-full max-w-3xl">
          <Story />
        </div>
      </div>
    ),
  ],
} satisfies Meta<typeof HeroSearchWithCity>

export default meta
type Story = StoryObj<typeof meta>

/**
 * Option B: City Above Search
 * City selector appears prominently above the search bar
 * Auto-detects user's city, shows as "Denver, CO" with change option
 */
export const Default: Story = {
  args: {
    initialCity: { name: 'Denver', state: 'CO', slug: 'denver' },
  },
}

/**
 * Mobile viewport - primary use case (80% of traffic)
 */
export const Mobile: Story = {
  args: {
    initialCity: { name: 'Denver', state: 'CO', slug: 'denver' },
  },
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
  },
}

/**
 * Mobile with picker open - shows full-width dropdown
 */
export const MobileWithPickerOpen: Story = {
  args: {
    initialCity: { name: 'Denver', state: 'CO', slug: 'denver' },
    forcePickerOpen: true,
  },
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
  },
}

/**
 * Desktop viewport
 */
export const Desktop: Story = {
  args: {
    initialCity: { name: 'Denver', state: 'CO', slug: 'denver' },
  },
  parameters: {
    viewport: { defaultViewport: 'desktop' },
  },
}

/**
 * Detecting state - shows loading indicator while geolocating
 */
export const DetectingLocation: Story = {
  args: {
    forceDetecting: true,
    initialCity: null,
  },
}

/**
 * Search Anywhere selected - no city filter applied
 */
export const SearchAnywhere: Story = {
  args: {
    initialCity: null,
  },
}

/**
 * City picker open - shows dropdown with search
 */
export const WithPickerOpen: Story = {
  args: {
    initialCity: { name: 'Denver', state: 'CO', slug: 'denver' },
    forcePickerOpen: true,
  },
}

/**
 * With text query entered
 */
export const WithTextQuery: Story = {
  args: {
    initialCity: { name: 'Austin', state: 'TX', slug: 'austin' },
    forceTextQuery: 'dark floral sketchy',
  },
}

/**
 * With image uploaded
 */
export const WithImagePreview: Story = {
  args: {
    initialCity: { name: 'Los Angeles', state: 'CA', slug: 'los-angeles' },
    forceImagePreview: 'https://images.unsplash.com/photo-1611501275019-9b5cda994e8d?w=200&h=200&fit=crop',
  },
}

/**
 * Loading state - search in progress
 */
export const LoadingState: Story = {
  args: {
    initialCity: { name: 'New York', state: 'NY', slug: 'new-york' },
    forceLoading: true,
  },
}

/**
 * Full Hero Context - shows how it looks with headline copy
 * Uses the updated messaging from brand/copy audits
 */
export const FullHeroContext: Story = {
  render: () => (
    <section className="relative overflow-hidden bg-ink min-h-screen flex items-center">
      {/* Subtle background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at center, transparent 0%, rgba(0, 0, 0, 0.4) 70%, rgba(26, 26, 26, 0.9) 100%)`,
        }}
      />

      {/* Content */}
      <div className="container mx-auto px-4 relative z-20 py-12">
        <div className="max-w-4xl mx-auto text-center">
          {/* Headline - Updated copy from audits */}
          <div className="mb-8">
            <h1
              className="font-display leading-[0.95] mb-5 tracking-tight text-balance"
              style={{
                fontSize: 'clamp(2.5rem, 8vw, 5rem)',
                color: '#FFFFFF',
                textShadow: '0 4px 20px rgba(0, 0, 0, 0.7)',
              }}
            >
              SEARCH INSTAGRAM'S
              <br />
              <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>TATTOO ARTISTS.</span>
            </h1>

            {/* Subheading - Updated copy */}
            <p
              className="font-body text-lg leading-relaxed max-w-2xl mx-auto"
              style={{
                color: 'rgba(255, 255, 255, 0.75)',
                textShadow: '0 2px 12px rgba(0, 0, 0, 0.8)',
              }}
            >
              Upload your reference image. Tell us your city.
              <br />
              We'll show you artists whose work matches—then send you straight to their Instagram to book.
            </p>
          </div>

          {/* Search Bar with City */}
          <div className="max-w-3xl mx-auto">
            <HeroSearchWithCity
              initialCity={{ name: 'Denver', state: 'CO', slug: 'denver' }}
            />
          </div>
        </div>
      </div>
    </section>
  ),
  parameters: {
    layout: 'fullscreen',
  },
}

/**
 * Full Hero Context - Mobile
 * Primary viewport for 80% of traffic
 */
export const FullHeroContextMobile: Story = {
  render: () => (
    <section className="relative overflow-hidden bg-ink min-h-screen flex items-center">
      {/* Subtle background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at center, transparent 0%, rgba(0, 0, 0, 0.4) 70%, rgba(26, 26, 26, 0.9) 100%)`,
        }}
      />

      {/* Content */}
      <div className="container mx-auto px-4 relative z-20 py-12">
        <div className="max-w-4xl mx-auto text-center">
          {/* Headline - Updated copy from audits */}
          <div className="mb-6">
            <h1
              className="font-display leading-[0.95] mb-4 tracking-tight text-balance"
              style={{
                fontSize: 'clamp(2rem, 10vw, 3rem)',
                color: '#FFFFFF',
                textShadow: '0 4px 20px rgba(0, 0, 0, 0.7)',
              }}
            >
              SEARCH INSTAGRAM'S
              <br />
              <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>TATTOO ARTISTS.</span>
            </h1>

            {/* Subheading - Updated copy */}
            <p
              className="font-body text-base leading-relaxed max-w-sm mx-auto"
              style={{
                color: 'rgba(255, 255, 255, 0.75)',
                textShadow: '0 2px 12px rgba(0, 0, 0, 0.8)',
              }}
            >
              Upload your reference. Tell us your city.
              We'll match you with artists.
            </p>
          </div>

          {/* Search Bar with City */}
          <HeroSearchWithCity
            initialCity={{ name: 'Denver', state: 'CO', slug: 'denver' }}
          />
        </div>
      </div>
    </section>
  ),
  parameters: {
    layout: 'fullscreen',
    viewport: { defaultViewport: 'mobile1' },
  },
}

/**
 * Comparison: Before vs After
 * Shows original hero vs new hero with city filter
 */
export const BeforeAfterComparison: Story = {
  render: () => (
    <div className="space-y-12 py-8">
      {/* Before */}
      <div>
        <h3 className="text-white/60 text-sm font-mono uppercase tracking-wider mb-4 text-center">
          Before: City Buried in Quick Links
        </h3>
        <div className="bg-ink/50 border border-white/10 p-6">
          <div className="text-center mb-6">
            <h1
              className="font-display leading-[0.95] mb-3"
              style={{ fontSize: '2rem', color: '#FFFFFF' }}
            >
              INSTAGRAM HAS YOUR ARTIST.
              <br />
              <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>WE HELP YOU FIND THEM.</span>
            </h1>
            <p className="text-white/60 text-sm">
              Upload a reference image or describe what you're looking for.
            </p>
          </div>
          {/* Original search bar placeholder */}
          <div className="bg-white/95 h-14 flex items-center px-4 text-ink/40 text-sm">
            Drop an image or describe a style...
          </div>
          <div className="mt-3 flex gap-2 justify-center">
            <span className="text-xs text-white/40 px-2 py-1 border border-white/20">
              black and gray in Denver
            </span>
            <span className="text-xs text-white/40 px-2 py-1 border border-white/20">
              realism in Austin
            </span>
          </div>
        </div>
      </div>

      {/* After */}
      <div>
        <h3 className="text-white/60 text-sm font-mono uppercase tracking-wider mb-4 text-center">
          After: City Prominent Above Search
        </h3>
        <div className="bg-ink/50 border border-orange-500/30 p-6">
          <div className="text-center mb-6">
            <h1
              className="font-display leading-[0.95] mb-3"
              style={{ fontSize: '2rem', color: '#FFFFFF' }}
            >
              SEARCH INSTAGRAM'S
              <br />
              <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>TATTOO ARTISTS.</span>
            </h1>
            <p className="text-white/60 text-sm">
              Upload your reference. Tell us your city.
            </p>
          </div>
          <HeroSearchWithCity
            initialCity={{ name: 'Denver', state: 'CO', slug: 'denver' }}
          />
        </div>
      </div>
    </div>
  ),
}
