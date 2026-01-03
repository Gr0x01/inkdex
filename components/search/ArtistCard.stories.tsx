import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import ArtistCard from './ArtistCard';
import type { SearchResult } from '@/types/search';

const meta = {
  title: 'Components/Cards/ArtistCard',
  component: ArtistCard,
  parameters: {
    layout: 'centered',
    backgrounds: { default: 'paper' },
  },
  tags: ['autodocs'],
  argTypes: {
    artist: {
      description: 'Search result data including artist info and matching images',
    },
    displayMode: {
      control: 'select',
      options: ['search', 'browse'],
      description: 'Display mode: search shows match %, browse shows follower count',
    },
  },
} satisfies Meta<typeof ArtistCard>;

export default meta;
type Story = StoryObj<typeof meta>;

// Mock search result data
const createMockSearchResult = (
  overrides?: Partial<SearchResult>
): SearchResult => ({
  artist_id: 'artist-1',
  artist_name: 'Alex Rivera',
  artist_slug: 'alex-rivera',
  city: 'Los Angeles',
  profile_image_url: null,
  follower_count: 45000,
  instagram_url: 'https://instagram.com/alex_ink',
  is_verified: true,
  is_pro: false,
  is_featured: false,
  similarity: 0.28,
  matching_images: [
    {
      url: 'https://images.unsplash.com/photo-1611501275019-9b5cda994e8d?w=800&h=800&fit=crop',
      instagramUrl: 'https://instagram.com/p/abc123',
      similarity: 0.28,
      likes_count: 1250,
    },
    {
      url: 'https://images.unsplash.com/photo-1598371839696-5c5bb00bdc28?w=800&h=800&fit=crop',
      instagramUrl: 'https://instagram.com/p/abc124',
      similarity: 0.25,
      likes_count: 890,
    },
    {
      url: 'https://images.unsplash.com/photo-1590246814883-57c511193177?w=800&h=800&fit=crop',
      instagramUrl: 'https://instagram.com/p/abc125',
      similarity: 0.22,
      likes_count: 2100,
    },
  ],
  ...overrides,
});

/**
 * Default search result card with multiple matching images
 * Click the image to cycle through matches
 */
export const Default: Story = {
  args: {
    artist: createMockSearchResult(),
    displayMode: 'search',
  },
};

/**
 * High match percentage (excellent similarity)
 */
export const HighMatch: Story = {
  args: {
    artist: createMockSearchResult({
      similarity: 0.38,
      artist_name: 'Morgan Black',
      artist_slug: 'morgan-black',
      city: 'New York',
    }),
    displayMode: 'search',
  },
};

/**
 * Low match percentage (still relevant, but lower similarity)
 */
export const LowMatch: Story = {
  args: {
    artist: createMockSearchResult({
      similarity: 0.17,
      artist_name: 'Jamie Chen',
      artist_slug: 'jamie-chen',
      city: 'Austin',
    }),
    displayMode: 'search',
  },
};

/**
 * Featured artist with featured badge
 */
export const FeaturedArtist: Story = {
  args: {
    artist: createMockSearchResult({
      artist_name: 'Sarah Martinez',
      artist_slug: 'sarah-martinez',
      follower_count: 125000,
      city: 'Miami',
      similarity: 0.32,
      is_featured: true,
    }),
    displayMode: 'search',
  },
};

/**
 * Pro artist with Pro badge
 */
export const ProArtist: Story = {
  args: {
    artist: createMockSearchResult({
      artist_name: 'Morgan Black',
      artist_slug: 'morgan-black',
      follower_count: 85000,
      city: 'New York',
      similarity: 0.35,
      is_pro: true,
    }),
    displayMode: 'search',
  },
};

/**
 * Pro artist takes precedence over Featured badge
 */
export const ProAndFeaturedArtist: Story = {
  args: {
    artist: createMockSearchResult({
      artist_name: 'Elite Ink Master',
      artist_slug: 'elite-ink-master',
      follower_count: 200000,
      city: 'Los Angeles',
      similarity: 0.38,
      is_pro: true,
      is_featured: true,
    }),
    displayMode: 'search',
  },
};

/**
 * Browse mode - shows follower count instead of match percentage
 */
export const BrowseMode: Story = {
  args: {
    artist: createMockSearchResult(),
    displayMode: 'browse',
  },
};

/**
 * Single matching image
 */
export const SingleImage: Story = {
  args: {
    artist: createMockSearchResult({
      matching_images: [
        {
          url: 'https://images.unsplash.com/photo-1611501275019-9b5cda994e8d?w=800&h=800&fit=crop',
          instagramUrl: 'https://instagram.com/p/abc123',
          similarity: 0.28,
          likes_count: 500,
        },
      ],
    }),
    displayMode: 'search',
  },
};

/**
 * No follower count data
 */
export const NoFollowerCount: Story = {
  args: {
    artist: createMockSearchResult({
      follower_count: null,
    }),
    displayMode: 'browse',
  },
};

/**
 * No Instagram handle (edge case)
 */
export const NoInstagramHandle: Story = {
  args: {
    artist: createMockSearchResult({
      instagram_url: null,
    }),
    displayMode: 'search',
  },
};

/**
 * Grid of search results (simulating search results page)
 */
export const SearchResultsGrid: Story = {
  args: {
    artist: createMockSearchResult(),
    displayMode: 'search',
  },
  render: () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6 max-w-6xl">
      <ArtistCard
        artist={createMockSearchResult({
          similarity: 0.38,
          artist_name: 'High Match',
          artist_slug: 'high-match',
        })}
        displayMode="search"
      />
      <ArtistCard
        artist={createMockSearchResult({
          similarity: 0.28,
          artist_name: 'Good Match',
          artist_slug: 'good-match',
          follower_count: 125000,
        })}
        displayMode="search"
      />
      <ArtistCard
        artist={createMockSearchResult({
          similarity: 0.18,
          artist_name: 'Okay Match',
          artist_slug: 'okay-match',
        })}
        displayMode="search"
      />
      <ArtistCard
        artist={createMockSearchResult({
          similarity: 0.25,
          artist_name: 'Another Artist',
          artist_slug: 'another-artist',
          city: 'Chicago',
        })}
        displayMode="search"
      />
    </div>
  ),
  parameters: {
    layout: 'fullscreen',
  },
};

/**
 * Mobile viewport
 */
export const Mobile: Story = {
  args: {
    artist: createMockSearchResult(),
    displayMode: 'search',
  },
  parameters: {
    viewport: { defaultViewport: 'mobile' },
  },
};

/**
 * On dark background
 */
export const OnDarkBackground: Story = {
  args: {
    artist: createMockSearchResult(),
    displayMode: 'search',
  },
  parameters: {
    backgrounds: { default: 'ink' },
  },
};

/**
 * Multi-location artist with +N badge
 * Shows badge when artist works in multiple cities
 */
export const MultiLocationArtist: Story = {
  args: {
    artist: {
      ...createMockSearchResult({
        artist_name: 'Traveling Artist',
        artist_slug: 'traveling-artist',
        city: 'Austin',
        similarity: 0.32,
      }),
      locations: [
        {
          id: 'loc-1',
          city: 'Austin',
          region: 'TX',
          country_code: 'US',
          location_type: 'city' as const,
          is_primary: true,
          display_order: 0,
        },
        {
          id: 'loc-2',
          city: 'Dallas',
          region: 'TX',
          country_code: 'US',
          location_type: 'city' as const,
          is_primary: false,
          display_order: 1,
        },
        {
          id: 'loc-3',
          city: 'Houston',
          region: 'TX',
          country_code: 'US',
          location_type: 'city' as const,
          is_primary: false,
          display_order: 2,
        },
      ],
    },
    displayMode: 'search',
  },
};
