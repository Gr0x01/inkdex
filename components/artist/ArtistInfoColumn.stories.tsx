/* eslint-disable @typescript-eslint/no-explicit-any -- Storybook args require flexible types */
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import ArtistInfoColumn from './ArtistInfoColumn';
import { getTestArtistSafe, TEST_USERS, FALLBACK_ARTIST } from '@/.storybook/test-data';

const meta = {
  title: 'Components/Artist/ArtistInfoColumn',
  component: ArtistInfoColumn,
  parameters: {
    layout: 'padded',
    backgrounds: { default: 'paper' },
  },
  tags: ['autodocs'],
  argTypes: {
    artist: {
      description: 'Artist profile data including bio, location, social links, and verification status',
    },
    portfolioImages: {
      description: 'Array of portfolio images for stats display',
    },
  },
} satisfies Meta<typeof ArtistInfoColumn>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Free tier artist (Alex Rivera) - Basic features
 * Shows profile image, bio, location, Instagram link
 */
export const FreeTierArtist: Story = {
  args: {
    artist: FALLBACK_ARTIST as any, // Placeholder, replaced by loader
    portfolioImages: [],
  },
  loaders: [
    async () => {
      const artist = await getTestArtistSafe(TEST_USERS.FREE_TIER);
      return { artist };
    },
  ],
  render: (args, { loaded }) => (
    <div className="max-w-md">
      <ArtistInfoColumn
        artist={{
          ...loaded.artist,
          bio: 'Specializing in fine line and minimalist designs. Based in Austin, TX. Available for consultations.',
          bio_override: null,
          instagram_url: 'https://instagram.com/alex_ink',
          booking_url: 'https://calendly.com/alex-ink',
          website_url: null,
          profile_image_url: 'https://i.pravatar.cc/400?img=33',
        } as any}
        portfolioImages={loaded.artist.portfolio_images}
      />
    </div>
  ),
};

/**
 * Pro tier artist (Morgan Black) - Full features
 * Shows Pro badge, multi-location support, custom bio, all CTAs
 */
export const ProTierArtist: Story = {
  args: {
    artist: FALLBACK_ARTIST as any, // Placeholder, replaced by loader
    portfolioImages: [],
  },
  loaders: [
    async () => {
      const artist = await getTestArtistSafe(TEST_USERS.PRO_TIER);
      return { artist };
    },
  ],
  render: (args, { loaded }) => (
    <div className="max-w-md">
      <ArtistInfoColumn
        artist={{
          ...loaded.artist,
          bio: 'Award-winning tattoo artist specializing in neo-traditional and Japanese styles. 15+ years of experience creating custom pieces.',
          bio_override: 'Elite tattoo artist with international recognition. Specializing in large-scale pieces and custom collaborations.',
          instagram_url: 'https://instagram.com/morgan_black_ink',
          booking_url: 'https://calendly.com/morgan-black',
          website_url: 'https://morganblacktattoo.com',
          profile_image_url: 'https://i.pravatar.cc/400?img=27',
          is_pro: true,
          follower_count: 125000,
        } as any}
        portfolioImages={loaded.artist.portfolio_images}
      />
    </div>
  ),
};

/**
 * Unclaimed artist (Jamie Chen) - Public profile only
 * No claim status, limited information, shows claim CTA
 */
export const UnclaimedArtist: Story = {
  args: {
    artist: FALLBACK_ARTIST as any, // Placeholder, replaced by loader
    portfolioImages: [],
  },
  loaders: [
    async () => {
      const artist = await getTestArtistSafe(TEST_USERS.UNCLAIMED);
      return { artist };
    },
  ],
  render: (args, { loaded }) => (
    <div className="max-w-md">
      <ArtistInfoColumn
        artist={{
          ...loaded.artist,
          bio: 'Black and grey realism specialist. Custom designs only.',
          instagram_url: 'https://instagram.com/jamie_chen_ink',
          booking_url: null,
          website_url: null,
          profile_image_url: 'https://i.pravatar.cc/400?img=44',
          verification_status: 'unclaimed',
        } as any}
        portfolioImages={loaded.artist.portfolio_images}
      />
    </div>
  ),
};

/**
 * Featured artist - High follower count
 * Shows featured badge with large following
 */
export const FeaturedArtist: Story = {
  args: {
    artist: FALLBACK_ARTIST as any, // Placeholder, replaced by loader
    portfolioImages: [],
  },
  loaders: [
    async () => {
      const artist = await getTestArtistSafe(TEST_USERS.PRO_TIER);
      return { artist };
    },
  ],
  render: (args, { loaded }) => (
    <div className="max-w-md">
      <ArtistInfoColumn
        artist={{
          ...loaded.artist,
          bio: 'World-renowned tattoo artist. Featured in Inked Magazine and Tattoo Artist Magazine.',
          instagram_url: 'https://instagram.com/featured_artist',
          booking_url: 'https://calendly.com/featured-artist',
          website_url: 'https://featuredartist.com',
          profile_image_url: 'https://i.pravatar.cc/400?img=56',
          follower_count: 500000,
        } as any}
        portfolioImages={loaded.artist.portfolio_images.slice(0, 15)}
      />
    </div>
  ),
};

/**
 * Multi-location artist - Works in multiple cities
 * Shows expandable location list
 */
export const MultiLocationArtist: Story = {
  args: {
    artist: FALLBACK_ARTIST as any, // Placeholder, replaced by loader
    portfolioImages: [],
  },
  loaders: [
    async () => {
      const artist = await getTestArtistSafe(TEST_USERS.PRO_TIER);
      return { artist };
    },
  ],
  render: (args, { loaded }) => (
    <div className="max-w-md">
      <ArtistInfoColumn
        artist={{
          ...loaded.artist,
          bio: 'Traveling artist working across major US cities. Custom work and guest spots.',
          instagram_url: 'https://instagram.com/traveling_ink',
          booking_url: 'https://calendly.com/traveling-artist',
          profile_image_url: 'https://i.pravatar.cc/400?img=68',
          is_pro: true,
          locations: [
            {
              id: 'loc-1',
              artist_id: loaded.artist.id,
              city: 'Los Angeles',
              region: 'CA',
              country_code: 'US',
              is_primary: true,
              created_at: new Date().toISOString(),
            },
            {
              id: 'loc-2',
              artist_id: loaded.artist.id,
              city: 'New York',
              region: 'NY',
              country_code: 'US',
              is_primary: false,
              created_at: new Date().toISOString(),
            },
            {
              id: 'loc-3',
              artist_id: loaded.artist.id,
              city: 'Miami',
              region: 'FL',
              country_code: 'US',
              is_primary: false,
              created_at: new Date().toISOString(),
            },
          ],
        } as any}
        portfolioImages={loaded.artist.portfolio_images}
      />
    </div>
  ),
};

/**
 * International artist - Non-US location
 * Shows country code in location display
 */
export const InternationalArtist: Story = {
  args: {
    artist: FALLBACK_ARTIST as any, // Placeholder, replaced by loader
    portfolioImages: [],
  },
  loaders: [
    async () => {
      const artist = await getTestArtistSafe(TEST_USERS.FREE_TIER);
      return { artist };
    },
  ],
  render: (args, { loaded }) => (
    <div className="max-w-md">
      <ArtistInfoColumn
        artist={{
          ...loaded.artist,
          bio: 'Japanese traditional and irezumi specialist. Tokyo-based with international guest spots.',
          instagram_url: 'https://instagram.com/tokyo_ink',
          profile_image_url: 'https://i.pravatar.cc/400?img=12',
          city: 'Tokyo',
          state: null,
          locations: [
            {
              id: 'loc-1',
              artist_id: loaded.artist.id,
              city: 'Tokyo',
              region: null,
              country_code: 'JP',
              is_primary: true,
              created_at: new Date().toISOString(),
            },
          ],
        } as any}
        portfolioImages={loaded.artist.portfolio_images}
      />
    </div>
  ),
};

/**
 * Minimal profile - No bio, no booking
 * Shows bare minimum information
 */
export const MinimalProfile: Story = {
  args: {
    artist: FALLBACK_ARTIST as any, // Placeholder, replaced by loader
    portfolioImages: [],
  },
  loaders: [
    async () => {
      const artist = await getTestArtistSafe(TEST_USERS.UNCLAIMED);
      return { artist };
    },
  ],
  render: (args, { loaded }) => (
    <div className="max-w-md">
      <ArtistInfoColumn
        artist={{
          ...loaded.artist,
          bio: null,
          bio_override: null,
          shop_name: null,
          instagram_url: 'https://instagram.com/minimal_artist',
          booking_url: null,
          website_url: null,
          profile_image_url: 'https://i.pravatar.cc/400?img=21',
          follower_count: null,
        } as any}
        portfolioImages={loaded.artist.portfolio_images.slice(0, 5)}
      />
    </div>
  ),
};

/**
 * No profile image - Uses default layout
 * Artist without profile photo
 */
export const NoProfileImage: Story = {
  args: {
    artist: FALLBACK_ARTIST as any, // Placeholder, replaced by loader
    portfolioImages: [],
  },
  loaders: [
    async () => {
      const artist = await getTestArtistSafe(TEST_USERS.FREE_TIER);
      return { artist };
    },
  ],
  render: (args, { loaded }) => (
    <div className="max-w-md">
      <ArtistInfoColumn
        artist={{
          ...loaded.artist,
          bio: 'Traditional and neo-traditional tattoo artist.',
          instagram_url: 'https://instagram.com/no_profile_pic',
          profile_image_url: null,
        } as any}
        portfolioImages={loaded.artist.portfolio_images}
      />
    </div>
  ),
};

/**
 * Mobile viewport
 * Shows how column adapts to mobile screens
 */
export const Mobile: Story = {
  args: {
    artist: FALLBACK_ARTIST as any, // Placeholder, replaced by loader
    portfolioImages: [],
  },
  loaders: [
    async () => {
      const artist = await getTestArtistSafe(TEST_USERS.PRO_TIER);
      return { artist };
    },
  ],
  render: (args, { loaded }) => (
    <div className="max-w-md">
      <ArtistInfoColumn
        artist={{
          ...loaded.artist,
          bio: 'Neo-traditional and Japanese styles.',
          instagram_url: 'https://instagram.com/mobile_test',
          booking_url: 'https://calendly.com/mobile-test',
          profile_image_url: 'https://i.pravatar.cc/400?img=15',
          is_pro: true,
        } as any}
        portfolioImages={loaded.artist.portfolio_images}
      />
    </div>
  ),
  parameters: {
    viewport: { defaultViewport: 'mobile' },
  },
};

/**
 * Desktop viewport - Sticky sidebar preview
 * Shows full desktop layout with sticky behavior
 */
export const DesktopSticky: Story = {
  args: {
    artist: FALLBACK_ARTIST as any, // Placeholder, replaced by loader
    portfolioImages: [],
  },
  loaders: [
    async () => {
      const artist = await getTestArtistSafe(TEST_USERS.PRO_TIER);
      return { artist };
    },
  ],
  render: (args, { loaded }) => (
    <div className="flex gap-6 max-w-6xl">
      <div className="w-80 sticky top-6 self-start">
        <ArtistInfoColumn
          artist={{
            ...loaded.artist,
            bio: 'Award-winning artist specializing in large-scale custom pieces.',
            instagram_url: 'https://instagram.com/desktop_test',
            booking_url: 'https://calendly.com/desktop-test',
            website_url: 'https://example.com',
            profile_image_url: 'https://i.pravatar.cc/400?img=42',
            is_pro: true,
            follower_count: 85000,
          } as any}
          portfolioImages={loaded.artist.portfolio_images}
        />
      </div>
      <div className="flex-1 space-y-4">
        <div className="h-96 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
          Portfolio Grid Would Go Here
        </div>
        <div className="h-96 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
          More Content
        </div>
        <div className="h-96 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
          Even More Content
        </div>
      </div>
    </div>
  ),
  parameters: {
    layout: 'fullscreen',
    viewport: { defaultViewport: 'desktop' },
  },
};
