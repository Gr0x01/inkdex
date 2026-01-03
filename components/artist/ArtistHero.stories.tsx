/* eslint-disable @typescript-eslint/no-explicit-any -- Storybook args require flexible types */
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import ArtistHero from './ArtistHero';
import { getTestArtistSafe, TEST_USERS, FALLBACK_ARTIST } from '@/.storybook/test-data';

const meta = {
  title: 'Components/Artist/ArtistHero',
  component: ArtistHero,
  parameters: {
    layout: 'fullscreen',
    backgrounds: { default: 'paper' },
  },
  tags: ['autodocs'],
  argTypes: {
    artist: {
      description: 'Artist profile data',
    },
    featuredImage: {
      description: 'Featured portfolio image for hero background',
    },
  },
} satisfies Meta<typeof ArtistHero>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default hero with featured image
 * Shows split-screen layout with artist info and portfolio image
 */
export const Default: Story = {
  args: {
    artist: FALLBACK_ARTIST as any,
    featuredImage: null,
  },
  loaders: [
    async () => {
      const artist = await getTestArtistSafe(TEST_USERS.PRO_TIER);
      const featuredImage = artist.portfolio_images[0] ? {
        storage_thumb_1280: artist.portfolio_images[0].url,
        storage_thumb_640: artist.portfolio_images[0].url,
        instagram_url: artist.portfolio_images[0].instagram_url,
      } : null;
      return { artist, featuredImage };
    },
  ],
  render: (args, { loaded }) => (
    <ArtistHero
      artist={{
        id: loaded.artist.id,
        name: loaded.artist.name,
        slug: loaded.artist.slug,
        city: loaded.artist.city,
        state: loaded.artist.state || 'CA',
        shop_name: loaded.artist.shop_name,
        bio: 'Award-winning tattoo artist specializing in neo-traditional and Japanese styles. 15+ years of experience creating custom pieces.',
        bio_override: null,
        instagram_url: 'https://instagram.com/test_artist',
        instagram_handle: loaded.artist.instagram_handle,
        website_url: 'https://example.com',
        booking_url: 'https://calendly.com/test-artist',
        profile_image_url: 'https://i.pravatar.cc/400?img=27',
        follower_count: 125000,
        verification_status: 'verified',
      }}
      featuredImage={loaded.featuredImage}
    />
  ),
};

/**
 * With custom bio override
 * Shows artist-written bio instead of Instagram bio
 */
export const WithCustomBio: Story = {
  args: {
    artist: FALLBACK_ARTIST as any,
    featuredImage: null,
  },
  loaders: [
    async () => {
      const artist = await getTestArtistSafe(TEST_USERS.PRO_TIER);
      const featuredImage = artist.portfolio_images[0] ? {
        storage_thumb_1280: artist.portfolio_images[0].url,
        storage_thumb_640: artist.portfolio_images[0].url,
        instagram_url: artist.portfolio_images[0].instagram_url,
      } : null;
      return { artist, featuredImage };
    },
  ],
  render: (args, { loaded }) => (
    <ArtistHero
      artist={{
        id: loaded.artist.id,
        name: loaded.artist.name,
        slug: loaded.artist.slug,
        city: loaded.artist.city,
        state: loaded.artist.state || 'NY',
        shop_name: 'Elite Ink Studio',
        bio: 'Original Instagram bio that will be overridden.',
        bio_override: 'Elite tattoo artist with international recognition. Specializing in large-scale pieces and custom collaborations. Featured in Inked Magazine and multiple international conventions.',
        instagram_url: 'https://instagram.com/elite_artist',
        instagram_handle: loaded.artist.instagram_handle,
        website_url: 'https://eliteinktattoo.com',
        booking_url: 'https://calendly.com/elite-artist',
        profile_image_url: 'https://i.pravatar.cc/400?img=56',
        follower_count: 500000,
        verification_status: 'verified',
      }}
      featuredImage={loaded.featuredImage}
    />
  ),
};

/**
 * Minimal artist profile
 * Shows hero with minimal information (no bio, no booking)
 */
export const MinimalProfile: Story = {
  args: {
    artist: FALLBACK_ARTIST as any,
    featuredImage: null,
  },
  loaders: [
    async () => {
      const artist = await getTestArtistSafe(TEST_USERS.UNCLAIMED);
      const featuredImage = artist.portfolio_images[0] ? {
        storage_thumb_1280: artist.portfolio_images[0].url,
        storage_thumb_640: artist.portfolio_images[0].url,
        instagram_url: artist.portfolio_images[0].instagram_url,
      } : null;
      return { artist, featuredImage };
    },
  ],
  render: (args, { loaded }) => (
    <ArtistHero
      artist={{
        id: loaded.artist.id,
        name: loaded.artist.name,
        slug: loaded.artist.slug,
        city: loaded.artist.city,
        state: loaded.artist.state || 'TX',
        shop_name: null,
        bio: null,
        bio_override: null,
        instagram_url: 'https://instagram.com/minimal_artist',
        instagram_handle: loaded.artist.instagram_handle,
        website_url: null,
        booking_url: null,
        profile_image_url: null,
        follower_count: null,
        verification_status: 'unclaimed',
      }}
      featuredImage={loaded.featuredImage}
    />
  ),
};

/**
 * No featured image - Uses profile image fallback
 * Shows hero when no portfolio image is available
 */
export const NoFeaturedImage: Story = {
  args: {
    artist: FALLBACK_ARTIST as any,
    featuredImage: null,
  },
  loaders: [
    async () => {
      const artist = await getTestArtistSafe(TEST_USERS.FREE_TIER);
      return { artist };
    },
  ],
  render: (args, { loaded }) => (
    <ArtistHero
      artist={{
        id: loaded.artist.id,
        name: loaded.artist.name,
        slug: loaded.artist.slug,
        city: loaded.artist.city,
        state: loaded.artist.state || 'CA',
        shop_name: 'Ink & Soul Studio',
        bio: 'Fine line and minimalist specialist. Book your consultation today!',
        bio_override: null,
        instagram_url: 'https://instagram.com/no_featured',
        instagram_handle: loaded.artist.instagram_handle,
        website_url: null,
        booking_url: 'https://calendly.com/test',
        profile_image_url: 'https://i.pravatar.cc/800?img=33',
        follower_count: 25000,
        verification_status: 'verified',
      }}
      featuredImage={null}
    />
  ),
};

/**
 * High follower count artist
 * Shows follower count formatting (500K+)
 */
export const HighFollowerCount: Story = {
  args: {
    artist: FALLBACK_ARTIST as any,
    featuredImage: null,
  },
  loaders: [
    async () => {
      const artist = await getTestArtistSafe(TEST_USERS.PRO_TIER);
      const featuredImage = artist.portfolio_images[0] ? {
        storage_thumb_1280: artist.portfolio_images[0].url,
        storage_thumb_640: artist.portfolio_images[0].url,
        instagram_url: artist.portfolio_images[0].instagram_url,
      } : null;
      return { artist, featuredImage };
    },
  ],
  render: (args, { loaded }) => (
    <ArtistHero
      artist={{
        id: loaded.artist.id,
        name: 'Celebrity Artist',
        slug: 'celebrity-artist',
        city: 'Los Angeles',
        state: 'CA',
        shop_name: 'Hollywood Ink',
        bio: 'World-renowned tattoo artist. Featured in major publications and celebrity collaborations.',
        bio_override: null,
        instagram_url: 'https://instagram.com/celebrity_artist',
        instagram_handle: 'celebrity_artist',
        website_url: 'https://celebrityink.com',
        booking_url: 'https://calendly.com/celebrity',
        profile_image_url: 'https://i.pravatar.cc/400?img=68',
        follower_count: 2500000,
        verification_status: 'verified',
      }}
      featuredImage={loaded.featuredImage}
    />
  ),
};

/**
 * All CTAs present
 * Shows all possible call-to-action buttons
 */
export const AllCTAs: Story = {
  args: {
    artist: FALLBACK_ARTIST as any,
    featuredImage: null,
  },
  loaders: [
    async () => {
      const artist = await getTestArtistSafe(TEST_USERS.PRO_TIER);
      const featuredImage = artist.portfolio_images[0] ? {
        storage_thumb_1280: artist.portfolio_images[0].url,
        storage_thumb_640: artist.portfolio_images[0].url,
        instagram_url: artist.portfolio_images[0].instagram_url,
      } : null;
      return { artist, featuredImage };
    },
  ],
  render: (args, { loaded }) => (
    <ArtistHero
      artist={{
        id: loaded.artist.id,
        name: loaded.artist.name,
        slug: loaded.artist.slug,
        city: loaded.artist.city,
        state: loaded.artist.state || 'FL',
        shop_name: 'Full Service Studio',
        bio: 'Professional tattoo artist offering custom designs, consultations, and guest spots.',
        bio_override: null,
        instagram_url: 'https://instagram.com/full_service',
        instagram_handle: loaded.artist.instagram_handle,
        website_url: 'https://fullservicetattoo.com',
        booking_url: 'https://calendly.com/full-service',
        profile_image_url: 'https://i.pravatar.cc/400?img=42',
        follower_count: 85000,
        verification_status: 'verified',
      }}
      featuredImage={loaded.featuredImage}
    />
  ),
};

/**
 * Mobile viewport
 * Shows stacked layout on mobile screens
 */
export const Mobile: Story = {
  args: {
    artist: FALLBACK_ARTIST as any,
    featuredImage: null,
  },
  loaders: [
    async () => {
      const artist = await getTestArtistSafe(TEST_USERS.PRO_TIER);
      const featuredImage = artist.portfolio_images[0] ? {
        storage_thumb_1280: artist.portfolio_images[0].url,
        storage_thumb_640: artist.portfolio_images[0].url,
        instagram_url: artist.portfolio_images[0].instagram_url,
      } : null;
      return { artist, featuredImage };
    },
  ],
  render: (args, { loaded }) => (
    <ArtistHero
      artist={{
        id: loaded.artist.id,
        name: loaded.artist.name,
        slug: loaded.artist.slug,
        city: loaded.artist.city,
        state: loaded.artist.state || 'CA',
        shop_name: 'Mobile Test Studio',
        bio: 'Neo-traditional and Japanese styles. Available for bookings.',
        bio_override: null,
        instagram_url: 'https://instagram.com/mobile_test',
        instagram_handle: loaded.artist.instagram_handle,
        website_url: null,
        booking_url: 'https://calendly.com/mobile',
        profile_image_url: 'https://i.pravatar.cc/400?img=15',
        follower_count: 45000,
        verification_status: 'verified',
      }}
      featuredImage={loaded.featuredImage}
    />
  ),
  parameters: {
    viewport: { defaultViewport: 'mobile' },
  },
};

/**
 * Tablet viewport
 * Shows responsive split-screen on tablet
 */
export const Tablet: Story = {
  args: {
    artist: FALLBACK_ARTIST as any,
    featuredImage: null,
  },
  loaders: [
    async () => {
      const artist = await getTestArtistSafe(TEST_USERS.PRO_TIER);
      const featuredImage = artist.portfolio_images[0] ? {
        storage_thumb_1280: artist.portfolio_images[0].url,
        storage_thumb_640: artist.portfolio_images[0].url,
        instagram_url: artist.portfolio_images[0].instagram_url,
      } : null;
      return { artist, featuredImage };
    },
  ],
  render: (args, { loaded }) => (
    <ArtistHero
      artist={{
        id: loaded.artist.id,
        name: loaded.artist.name,
        slug: loaded.artist.slug,
        city: loaded.artist.city,
        state: loaded.artist.state || 'NY',
        shop_name: 'Tablet View Studio',
        bio: 'Specializing in custom designs and collaborative work.',
        bio_override: null,
        instagram_url: 'https://instagram.com/tablet_test',
        instagram_handle: loaded.artist.instagram_handle,
        website_url: 'https://example.com',
        booking_url: 'https://calendly.com/tablet',
        profile_image_url: 'https://i.pravatar.cc/400?img=21',
        follower_count: 65000,
        verification_status: 'verified',
      }}
      featuredImage={loaded.featuredImage}
    />
  ),
  parameters: {
    viewport: { defaultViewport: 'tablet' },
  },
};

/**
 * Long bio text
 * Tests bio truncation (line-clamp-4)
 */
export const LongBio: Story = {
  args: {
    artist: FALLBACK_ARTIST as any,
    featuredImage: null,
  },
  loaders: [
    async () => {
      const artist = await getTestArtistSafe(TEST_USERS.FREE_TIER);
      const featuredImage = artist.portfolio_images[0] ? {
        storage_thumb_1280: artist.portfolio_images[0].url,
        storage_thumb_640: artist.portfolio_images[0].url,
        instagram_url: artist.portfolio_images[0].instagram_url,
      } : null;
      return { artist, featuredImage };
    },
  ],
  render: (args, { loaded }) => (
    <ArtistHero
      artist={{
        id: loaded.artist.id,
        name: loaded.artist.name,
        slug: loaded.artist.slug,
        city: loaded.artist.city,
        state: loaded.artist.state || 'TX',
        shop_name: 'Long Bio Studio',
        bio: 'Award-winning tattoo artist with over 15 years of experience in the industry. Specializing in neo-traditional, Japanese traditional, black and grey realism, and fine line work. Featured in Inked Magazine, Tattoo Artist Magazine, and various international tattoo conventions. Available for custom projects, collaborations, and guest spots. Currently accepting new clients for full sleeve and back piece projects. Book your free consultation today!',
        bio_override: null,
        instagram_url: 'https://instagram.com/long_bio_artist',
        instagram_handle: loaded.artist.instagram_handle,
        website_url: 'https://longbioartist.com',
        booking_url: 'https://calendly.com/long-bio',
        profile_image_url: 'https://i.pravatar.cc/400?img=12',
        follower_count: 95000,
        verification_status: 'verified',
      }}
      featuredImage={loaded.featuredImage}
    />
  ),
};
