import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import CompactArtistCard from './CompactArtistCard';
import type { FeaturedArtist } from '@/lib/mock/featured-data';

const meta = {
  title: 'Components/Cards/CompactArtistCard',
  component: CompactArtistCard,
  parameters: {
    layout: 'centered',
    backgrounds: { default: 'paper' },
  },
  tags: ['autodocs'],
  argTypes: {
    artist: {
      description: 'Artist data including name, portfolio images, and verification status',
    },
  },
} satisfies Meta<typeof CompactArtistCard>;

export default meta;
type Story = StoryObj<typeof meta>;

// Mock artist data
const createMockArtist = (
  overrides?: Partial<FeaturedArtist & { city: string; state: string }>
): FeaturedArtist & { city: string; state: string } => ({
  id: 'artist-1',
  name: 'Alex Rivera',
  slug: 'alex-rivera',
  shop_name: 'Ink & Soul Studio',
  verification_status: 'verified',
  follower_count: 45000,
  is_pro: false,
  instagram_handle: 'alex_ink',
  city: 'Los Angeles',
  state: 'California',
  portfolio_images: [
    {
      id: 'img-1',
      url: 'https://images.unsplash.com/photo-1611501275019-9b5cda994e8d?w=400&h=600&fit=crop',
      instagram_url: 'https://instagram.com/p/abc123',
      likes_count: 1250,
    },
    {
      id: 'img-2',
      url: 'https://images.unsplash.com/photo-1598371839696-5c5bb00bdc28?w=400&h=600&fit=crop',
      instagram_url: 'https://instagram.com/p/abc124',
      likes_count: 890,
    },
    {
      id: 'img-3',
      url: 'https://images.unsplash.com/photo-1590246814883-57c511193177?w=400&h=600&fit=crop',
      instagram_url: 'https://instagram.com/p/abc125',
      likes_count: 2100,
    },
  ],
  ...overrides,
});

/**
 * Default artist card with verified badge and shop name
 * Free tier artist (no Pro badge)
 */
export const Default: Story = {
  args: {
    artist: createMockArtist(),
  },
};

/**
 * Pro artist with crown badge
 */
export const ProArtist: Story = {
  args: {
    artist: createMockArtist({
      name: 'Morgan Black',
      slug: 'morgan-black',
      shop_name: 'Black Rose Tattoo',
      is_pro: true,
      follower_count: 125000,
    }),
  },
};

/**
 * Unverified artist (no verification badge)
 */
export const Unverified: Story = {
  args: {
    artist: createMockArtist({
      name: 'Jamie Chen',
      slug: 'jamie-chen',
      verification_status: 'unclaimed',
      follower_count: 8500,
    }),
  },
};

/**
 * Artist without shop name
 */
export const NoShopName: Story = {
  args: {
    artist: createMockArtist({
      name: 'Taylor Swift',
      slug: 'taylor-swift',
      shop_name: null,
    }),
  },
};

/**
 * Featured artist (high follower count) with Pro badge
 */
export const FeaturedProArtist: Story = {
  args: {
    artist: createMockArtist({
      name: 'Sarah Martinez',
      slug: 'sarah-martinez',
      shop_name: 'Martinez Ink',
      is_pro: true,
      verification_status: 'verified',
      follower_count: 250000,
    }),
  },
};

/**
 * Artist with single portfolio image
 */
export const SingleImage: Story = {
  args: {
    artist: createMockArtist({
      name: 'Chris Anderson',
      slug: 'chris-anderson',
      portfolio_images: [
        {
          id: 'img-1',
          url: 'https://images.unsplash.com/photo-1611501275019-9b5cda994e8d?w=400&h=600&fit=crop',
          instagram_url: 'https://instagram.com/p/abc123',
          likes_count: 500,
        },
      ],
    }),
  },
};

/**
 * Display multiple cards in a horizontal scroll (simulating homepage carousel)
 * Shows mix of Free and Pro artists with different badges
 */
export const HorizontalScroll: Story = {
  render: () => (
    <div className="flex gap-4 p-4 overflow-x-auto max-w-4xl">
      {/* Free artist - verified */}
      <CompactArtistCard artist={createMockArtist()} />
      {/* Pro artist - verified + crown */}
      <CompactArtistCard
        artist={createMockArtist({
          name: 'Morgan Black',
          slug: 'morgan-black',
          is_pro: true,
          shop_name: 'Black Rose Tattoo',
        })}
      />
      {/* Unclaimed artist - no badges */}
      <CompactArtistCard
        artist={createMockArtist({
          name: 'Jamie Chen',
          slug: 'jamie-chen',
          verification_status: 'unclaimed',
        })}
      />
      {/* Pro artist without shop */}
      <CompactArtistCard
        artist={createMockArtist({
          name: 'Sarah Martinez',
          slug: 'sarah-martinez',
          shop_name: null,
          is_pro: true,
        })}
      />
    </div>
  ),
  parameters: {
    layout: 'fullscreen',
  },
};

/**
 * Mobile viewport (180px width cards)
 */
export const Mobile: Story = {
  args: {
    artist: createMockArtist(),
  },
  parameters: {
    viewport: { defaultViewport: 'mobile' },
  },
};

/**
 * Desktop viewport (220px width cards)
 */
export const Desktop: Story = {
  args: {
    artist: createMockArtist(),
  },
  parameters: {
    viewport: { defaultViewport: 'desktop' },
  },
};

/**
 * Badge comparison - Free vs Pro side by side
 * Shows the visual difference between free and pro tier artists
 */
export const BadgeComparison: Story = {
  render: () => (
    <div className="space-y-6 p-6">
      <div>
        <h3 className="font-display text-xl mb-3 text-ink">Free Tier Artist</h3>
        <p className="font-body text-sm text-gray-600 mb-3">
          Shows verification badge only
        </p>
        <CompactArtistCard
          artist={createMockArtist({
            is_pro: false,
          })}
        />
      </div>
      <div>
        <h3 className="font-display text-xl mb-3 text-ink">Pro Tier Artist</h3>
        <p className="font-body text-sm text-gray-600 mb-3">
          Shows verification badge + gold crown (ProBadge)
        </p>
        <CompactArtistCard
          artist={createMockArtist({
            name: 'Morgan Black',
            slug: 'morgan-black',
            shop_name: 'Black Rose Tattoo',
            is_pro: true,
          })}
        />
      </div>
    </div>
  ),
  parameters: {
    layout: 'centered',
  },
};

/**
 * On dark background
 */
export const OnDarkBackground: Story = {
  args: {
    artist: createMockArtist({
      is_pro: true, // Show pro badge on dark background
    }),
  },
  parameters: {
    backgrounds: { default: 'ink' },
  },
};
