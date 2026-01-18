import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import NavbarSearch from './NavbarSearch';

const meta = {
  title: 'Components/Search/NavbarSearch',
  component: NavbarSearch,
  parameters: {
    layout: 'padded',
    backgrounds: { default: 'paper' },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof NavbarSearch>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default navbar search - compact design for navigation
 */
export const Default: Story = {
  render: () => (
    <div className="max-w-2xl">
      <NavbarSearch />
    </div>
  ),
};

/**
 * Desktop width - typical navbar search width
 */
export const Desktop: Story = {
  render: () => (
    <div className="w-full max-w-2xl">
      <NavbarSearch />
    </div>
  ),
  parameters: {
    viewport: { defaultViewport: 'desktop' },
  },
};

/**
 * Mobile width - shows compact behavior
 */
export const Mobile: Story = {
  render: () => (
    <div className="w-full">
      <NavbarSearch />
    </div>
  ),
  parameters: {
    viewport: { defaultViewport: 'mobile' },
  },
};

/**
 * Tablet width
 */
export const Tablet: Story = {
  render: () => (
    <div className="w-full">
      <NavbarSearch />
    </div>
  ),
  parameters: {
    viewport: { defaultViewport: 'tablet' },
  },
};

/**
 * Instagram Post URL detected - shows "IG Post" badge
 * Compact purple/pink gradient badge
 * Note: Input is cleared when Instagram is detected (tag replaces text)
 */
export const WithInstagramPostBadge: Story = {
  render: () => (
    <div className="max-w-2xl">
      <NavbarSearch
        forceTextQuery="https://instagram.com/p/ABC123xyz/"
        forceInstagramDetection={{
          type: 'post',
          id: 'ABC123xyz',
          originalUrl: 'https://instagram.com/p/ABC123xyz/',
        }}
      />
    </div>
  ),
};

/**
 * Instagram Profile URL detected - shows "@username" badge
 * Note: Input is cleared when Instagram is detected (tag replaces text)
 */
export const WithInstagramProfileBadge: Story = {
  render: () => (
    <div className="max-w-2xl">
      <NavbarSearch
        forceTextQuery="@tattooartist"
        forceInstagramDetection={{
          type: 'profile',
          id: 'tattooartist',
          originalUrl: 'https://instagram.com/tattooartist',
        }}
      />
    </div>
  ),
};

/**
 * Image preview state - shows compact thumbnail
 */
export const WithImagePreview: Story = {
  render: () => (
    <div className="max-w-2xl">
      <NavbarSearch
        forceImagePreview="https://images.unsplash.com/photo-1611501275019-9b5cda994e8d?w=100&h=100&fit=crop"
      />
    </div>
  ),
};

/**
 * Text input state - shows text query
 */
export const WithTextInput: Story = {
  render: () => (
    <div className="max-w-2xl">
      <NavbarSearch forceTextQuery="dark floral sketchy" />
    </div>
  ),
};

/**
 * Error state - red border and error message below
 */
export const WithError: Story = {
  render: () => (
    <div className="max-w-2xl pb-8">
      <NavbarSearch forceError="Please enter at least 3 characters or upload an image" />
    </div>
  ),
};

/**
 * In navbar context - simulates actual placement
 */
export const InNavbarContext: Story = {
  render: () => (
    <header className="bg-paper border-b-2 border-ink/10">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between gap-6 h-24">
          {/* Logo */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="font-display text-4xl font-black text-ink tracking-tight">
              INKDEX
            </div>
          </div>

          {/* Search */}
          <div className="flex-1 max-w-2xl">
            <NavbarSearch />
          </div>

          {/* Nav links */}
          <nav className="flex items-center gap-8 shrink-0">
            <a href="#" className="font-mono text-sm text-ink hover:text-gray-700">
              Browse
            </a>
            <a href="#" className="font-mono text-sm text-ink hover:text-gray-700">
              Add Artist
            </a>
          </nav>
        </div>
      </div>
    </header>
  ),
  parameters: {
    layout: 'fullscreen',
  },
};

/**
 * Interactive demo - shows all features
 */
export const InteractiveDemo: Story = {
  render: () => (
    <div className="space-y-6 max-w-2xl">
      <div className="bg-gray-100 p-6 rounded border border-gray-300">
        <h3 className="font-display text-2xl mb-4 text-ink">Features:</h3>
        <ul className="font-body space-y-2 text-gray-700">
          <li>• Type text to search (min 3 characters)</li>
          <li>• Click upload icon to select image</li>
          <li>• Paste Instagram post or profile URL</li>
          <li>• Watch for Instagram badge when URL detected</li>
          <li>• Inline loading spinner on submit</li>
          <li>• Error messages shown below input</li>
        </ul>
      </div>
      <NavbarSearch />
    </div>
  ),
};

/**
 * Comparison - Desktop vs Mobile layout side by side
 */
export const SizeComparison: Story = {
  render: () => (
    <div className="space-y-8">
      <div>
        <h3 className="font-display text-xl mb-4 text-ink">Desktop (h-11)</h3>
        <div className="max-w-2xl">
          <NavbarSearch />
        </div>
      </div>
      <div>
        <h3 className="font-display text-xl mb-4 text-ink">Mobile (h-10)</h3>
        <div className="max-w-md">
          <NavbarSearch />
        </div>
      </div>
    </div>
  ),
};

/**
 * Loading state - shows the animated shimmer border effect
 */
export const LoadingState: Story = {
  args: {
    forceLoading: true,
  },
  render: (args) => (
    <div className="max-w-2xl">
      <NavbarSearch {...args} />
    </div>
  ),
};

/**
 * On dark background - less common but possible
 */
export const OnDarkBackground: Story = {
  render: () => (
    <div className="bg-ink p-8 rounded">
      <div className="max-w-2xl mx-auto">
        <NavbarSearch />
      </div>
    </div>
  ),
  parameters: {
    backgrounds: { default: 'ink' },
  },
};

/**
 * Full width - edge case testing
 */
export const FullWidth: Story = {
  render: () => (
    <div className="w-full">
      <NavbarSearch />
    </div>
  ),
  parameters: {
    layout: 'fullscreen',
  },
};

/**
 * With surrounding UI - realistic integration
 */
export const WithSurroundingUI: Story = {
  render: () => (
    <div className="bg-paper min-h-screen">
      {/* Navbar */}
      <header className="bg-paper border-b-2 border-ink/10 sticky top-0">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between gap-6 h-24">
            <div className="font-display text-4xl font-black text-ink">INKDEX</div>
            <div className="flex-1 max-w-2xl">
              <NavbarSearch />
            </div>
            <div className="flex gap-8">
              <a href="#" className="font-mono text-sm text-ink">
                Browse
              </a>
              <a href="#" className="font-mono text-sm text-ink">
                Add Artist
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="font-display text-5xl text-ink mb-6">Page Content</h1>
          <p className="font-body text-lg text-gray-700 leading-relaxed">
            This demonstrates how the navbar search appears in context with other page
            elements. Try scrolling to see the sticky navbar behavior.
          </p>
          <div className="h-[200vh]" />
        </div>
      </main>
    </div>
  ),
  parameters: {
    layout: 'fullscreen',
  },
};

/**
 * All search patterns comparison - shows all input types side by side
 * User's text becomes the tag content with gradient background
 */
export const AllSearchPatterns: Story = {
  render: () => (
    <div className="space-y-6 max-w-2xl">
      <h3 className="font-display text-2xl mb-4 text-ink">
        Search Pattern States:
      </h3>

      <div className="space-y-4">
        <div>
          <p className="text-gray-500 text-sm mb-2 font-mono">Instagram Post URL</p>
          <NavbarSearch
            forceTextQuery="https://instagram.com/p/ABC123xyz/"
            forceInstagramDetection={{
              type: 'post',
              id: 'ABC123xyz',
              originalUrl: 'https://instagram.com/p/ABC123xyz/',
            }}
          />
        </div>

        <div>
          <p className="text-gray-500 text-sm mb-2 font-mono">Instagram Profile URL</p>
          <NavbarSearch
            forceTextQuery="@blackworktattoo"
            forceInstagramDetection={{
              type: 'profile',
              id: 'blackworktattoo',
              originalUrl: 'https://instagram.com/blackworktattoo',
            }}
          />
        </div>

        <div>
          <p className="text-gray-500 text-sm mb-2 font-mono">Image Upload</p>
          <NavbarSearch
            forceImagePreview="https://images.unsplash.com/photo-1611501275019-9b5cda994e8d?w=100&h=100&fit=crop"
          />
        </div>

        <div>
          <p className="text-gray-500 text-sm mb-2 font-mono">Text Query</p>
          <NavbarSearch forceTextQuery="dark floral sketchy" />
        </div>

        <div className="pb-8">
          <p className="text-gray-500 text-sm mb-2 font-mono">Error State</p>
          <NavbarSearch forceError="Rate limit exceeded. Please try again." />
        </div>
      </div>
    </div>
  ),
};
