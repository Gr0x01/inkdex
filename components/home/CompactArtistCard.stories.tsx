import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import CompactArtistCard from './CompactArtistCard';
import type { FeaturedArtist } from '@/lib/mock/featured-data';
import { getTestArtistSafe, TEST_USERS, FALLBACK_ARTIST } from '@/.storybook/test-data';

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

/**
 * Free tier artist - uses real test seed data from Alex Rivera
 * Loads actual portfolio images from Supabase storage
 */
export const FreeTierArtist: Story = {
  args: {
    artist: FALLBACK_ARTIST, // Placeholder, replaced by loader
  },
  loaders: [
    async () => ({
      artist: await getTestArtistSafe(TEST_USERS.FREE_TIER),
    }),
  ],
  render: (args, { loaded }) => <CompactArtistCard artist={loaded.artist} />,
};

/**
 * Pro tier artist - uses real test seed data from Morgan Black
 * Shows Pro crown badge with real portfolio
 */
export const ProTierArtist: Story = {
  args: {
    artist: FALLBACK_ARTIST, // Placeholder, replaced by loader
  },
  loaders: [
    async () => ({
      artist: await getTestArtistSafe(TEST_USERS.PRO_TIER),
    }),
  ],
  render: (args, { loaded }) => <CompactArtistCard artist={loaded.artist} />,
};

/**
 * Unclaimed artist - uses real test seed data from Jamie Chen
 * No verification badge shown
 */
export const UnclaimedArtist: Story = {
  args: {
    artist: FALLBACK_ARTIST, // Placeholder, replaced by loader
  },
  loaders: [
    async () => ({
      artist: await getTestArtistSafe(TEST_USERS.UNCLAIMED),
    }),
  ],
  render: (args, { loaded }) => <CompactArtistCard artist={loaded.artist} />,
};

/**
 * Fallback example - static mock data when Supabase unavailable
 */
export const Fallback: Story = {
  args: {
    artist: FALLBACK_ARTIST,
  },
};

/**
 * Horizontal scroll with mix of test users
 * Shows Free, Pro, and Unclaimed artists side by side
 */
export const HorizontalScroll: Story = {
  args: {
    artist: FALLBACK_ARTIST, // Placeholder, replaced by loader
  },
  loaders: [
    async () => {
      const [freeTier, proTier, unclaimed] = await Promise.all([
        getTestArtistSafe(TEST_USERS.FREE_TIER),
        getTestArtistSafe(TEST_USERS.PRO_TIER),
        getTestArtistSafe(TEST_USERS.UNCLAIMED),
      ]);
      return { freeTier, proTier, unclaimed };
    },
  ],
  render: (args, { loaded }) => (
    <div className="flex gap-4 p-4 overflow-x-auto max-w-4xl">
      <CompactArtistCard artist={loaded.freeTier} />
      <CompactArtistCard artist={loaded.proTier} />
      <CompactArtistCard artist={loaded.unclaimed} />
      <CompactArtistCard artist={loaded.freeTier} />
    </div>
  ),
  parameters: {
    layout: 'fullscreen',
  },
};

/**
 * Mobile viewport with real test data
 */
export const Mobile: Story = {
  args: {
    artist: FALLBACK_ARTIST, // Placeholder, replaced by loader
  },
  loaders: [
    async () => ({
      artist: await getTestArtistSafe(TEST_USERS.FREE_TIER),
    }),
  ],
  render: (args, { loaded }) => <CompactArtistCard artist={loaded.artist} />,
  parameters: {
    viewport: { defaultViewport: 'mobile' },
  },
};

/**
 * Desktop viewport with Pro artist
 */
export const Desktop: Story = {
  args: {
    artist: FALLBACK_ARTIST, // Placeholder, replaced by loader
  },
  loaders: [
    async () => ({
      artist: await getTestArtistSafe(TEST_USERS.PRO_TIER),
    }),
  ],
  render: (args, { loaded }) => <CompactArtistCard artist={loaded.artist} />,
  parameters: {
    viewport: { defaultViewport: 'desktop' },
  },
};

/**
 * On dark background with Pro artist
 */
export const OnDarkBackground: Story = {
  args: {
    artist: FALLBACK_ARTIST, // Placeholder, replaced by loader
  },
  loaders: [
    async () => ({
      artist: await getTestArtistSafe(TEST_USERS.PRO_TIER),
    }),
  ],
  render: (args, { loaded }) => <CompactArtistCard artist={loaded.artist} />,
  parameters: {
    backgrounds: { default: 'ink' },
  },
};
