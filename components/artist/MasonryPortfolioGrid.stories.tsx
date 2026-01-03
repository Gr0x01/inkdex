import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import MasonryPortfolioGrid from './MasonryPortfolioGrid';
import { getTestArtistSafe, TEST_USERS, FALLBACK_ARTIST } from '@/.storybook/test-data';

const meta = {
  title: 'Components/Artist/MasonryPortfolioGrid',
  component: MasonryPortfolioGrid,
  parameters: {
    layout: 'fullscreen',
    backgrounds: { default: 'paper' },
  },
  tags: ['autodocs'],
  argTypes: {
    images: {
      description: 'Array of portfolio images to display in masonry layout',
    },
    artistName: {
      description: 'Artist name for image alt text',
    },
  },
} satisfies Meta<typeof MasonryPortfolioGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default portfolio grid - Full collection
 * Shows typical artist portfolio with 10+ images
 */
export const Default: Story = {
  args: {
    images: [],
    artistName: 'Test Artist',
  },
  loaders: [
    async () => {
      const artist = await getTestArtistSafe(TEST_USERS.PRO_TIER);
      return { artist };
    },
  ],
  render: (args, { loaded }) => (
    <div className="max-w-4xl mx-auto p-6">
      <MasonryPortfolioGrid
        images={loaded.artist.portfolio_images}
        artistName={loaded.artist.name}
      />
    </div>
  ),
};

/**
 * Large portfolio - 20+ images
 * Tests masonry layout with many images
 */
export const LargePortfolio: Story = {
  args: {
    images: [],
    artistName: 'Test Artist',
  },
  loaders: [
    async () => {
      const artist = await getTestArtistSafe(TEST_USERS.PRO_TIER);
      // Duplicate images to create a larger portfolio
      const duplicatedImages = [
        ...artist.portfolio_images,
        ...artist.portfolio_images.map((img, idx) => ({
          ...img,
          id: `${img.id}-dup-${idx}`,
        })),
        ...artist.portfolio_images.map((img, idx) => ({
          ...img,
          id: `${img.id}-dup2-${idx}`,
        })),
      ];
      return { artist: { ...artist, portfolio_images: duplicatedImages } };
    },
  ],
  render: (args, { loaded }) => (
    <div className="max-w-4xl mx-auto p-6">
      <MasonryPortfolioGrid
        images={loaded.artist.portfolio_images}
        artistName={loaded.artist.name}
      />
    </div>
  ),
};

/**
 * Small portfolio - 3-5 images
 * Shows layout with minimal content
 */
export const SmallPortfolio: Story = {
  args: {
    images: [],
    artistName: 'Test Artist',
  },
  loaders: [
    async () => {
      const artist = await getTestArtistSafe(TEST_USERS.FREE_TIER);
      return { artist: { ...artist, portfolio_images: artist.portfolio_images.slice(0, 3) } };
    },
  ],
  render: (args, { loaded }) => (
    <div className="max-w-4xl mx-auto p-6">
      <MasonryPortfolioGrid
        images={loaded.artist.portfolio_images}
        artistName={loaded.artist.name}
      />
    </div>
  ),
};

/**
 * Empty portfolio - No images
 * Shows empty state message
 */
export const EmptyPortfolio: Story = {
  args: {
    images: [],
    artistName: 'New Artist',
  },
  render: (args) => (
    <div className="max-w-4xl mx-auto p-6">
      <MasonryPortfolioGrid images={args.images} artistName={args.artistName} />
    </div>
  ),
};

/**
 * With captions - Images have Instagram captions
 * Shows hover overlay with caption text
 */
export const WithCaptions: Story = {
  args: {
    images: [],
    artistName: 'Test Artist',
  },
  loaders: [
    async () => {
      const artist = await getTestArtistSafe(TEST_USERS.PRO_TIER);
      const imagesWithCaptions = artist.portfolio_images.map((img, idx) => ({
        ...img,
        post_caption: [
          'Neo-traditional sleeve session. Client sat like a champ! 💪',
          'Custom black and grey piece. DM for bookings.',
          'Fine line floral work. Love doing these delicate designs 🌸',
          'Japanese traditional dragon. Multi-session piece.',
          'Geometric mandala design. Sacred geometry vibes ✨',
        ][idx % 5],
      }));
      return { artist: { ...artist, portfolio_images: imagesWithCaptions } };
    },
  ],
  render: (args, { loaded }) => (
    <div className="max-w-4xl mx-auto p-6">
      <MasonryPortfolioGrid
        images={loaded.artist.portfolio_images}
        artistName={loaded.artist.name}
      />
    </div>
  ),
};

/**
 * Mobile viewport - Single column
 * Shows how grid adapts to mobile screens
 */
export const Mobile: Story = {
  args: {
    images: [],
    artistName: 'Test Artist',
  },
  loaders: [
    async () => {
      const artist = await getTestArtistSafe(TEST_USERS.PRO_TIER);
      return { artist };
    },
  ],
  render: (args, { loaded }) => (
    <div className="max-w-sm mx-auto p-4">
      <MasonryPortfolioGrid
        images={loaded.artist.portfolio_images}
        artistName={loaded.artist.name}
      />
    </div>
  ),
  parameters: {
    viewport: { defaultViewport: 'mobile' },
  },
};

/**
 * Tablet viewport - Two columns
 * Shows masonry layout on medium screens
 */
export const Tablet: Story = {
  args: {
    images: [],
    artistName: 'Test Artist',
  },
  loaders: [
    async () => {
      const artist = await getTestArtistSafe(TEST_USERS.PRO_TIER);
      return { artist };
    },
  ],
  render: (args, { loaded }) => (
    <div className="max-w-3xl mx-auto p-6">
      <MasonryPortfolioGrid
        images={loaded.artist.portfolio_images}
        artistName={loaded.artist.name}
      />
    </div>
  ),
  parameters: {
    viewport: { defaultViewport: 'tablet' },
  },
};

/**
 * Desktop wide - Full layout
 * Shows masonry on large desktop screens
 */
export const DesktopWide: Story = {
  args: {
    images: [],
    artistName: 'Test Artist',
  },
  loaders: [
    async () => {
      const artist = await getTestArtistSafe(TEST_USERS.PRO_TIER);
      // Duplicate for more content
      const moreImages = [
        ...artist.portfolio_images,
        ...artist.portfolio_images.map((img, idx) => ({
          ...img,
          id: `${img.id}-extra-${idx}`,
        })),
      ];
      return { artist: { ...artist, portfolio_images: moreImages } };
    },
  ],
  render: (args, { loaded }) => (
    <div className="max-w-6xl mx-auto p-8">
      <MasonryPortfolioGrid
        images={loaded.artist.portfolio_images}
        artistName={loaded.artist.name}
      />
    </div>
  ),
  parameters: {
    viewport: { defaultViewport: 'desktop' },
  },
};

/**
 * Full artist profile page layout
 * Shows MasonryPortfolioGrid in context with ArtistInfoColumn
 */
export const FullPageLayout: Story = {
  args: {
    images: [],
    artistName: 'Test Artist',
  },
  loaders: [
    async () => {
      const artist = await getTestArtistSafe(TEST_USERS.PRO_TIER);
      return { artist };
    },
  ],
  render: (args, { loaded }) => (
    <div className="min-h-screen bg-paper">
      <div className="flex flex-col lg:flex-row">
        {/* Left: Info Column (mocked) */}
        <aside className="w-full lg:w-[30%] xl:w-[35%] bg-gray-50 p-6 lg:sticky lg:top-6 lg:self-start">
          <div className="space-y-4">
            <div className="w-48 h-64 bg-gray-200 rounded mx-auto" />
            <div className="text-center">
              <h2 className="font-heading text-2xl font-black">
                @{loaded.artist.instagram_handle}
              </h2>
              <p className="font-mono text-xs text-gray-500 uppercase mt-1">
                {loaded.artist.city}
              </p>
            </div>
          </div>
        </aside>

        {/* Right: Portfolio Grid */}
        <div className="w-full lg:w-[70%] xl:w-[65%] p-5 sm:p-6 lg:pl-6 lg:pr-8">
          <MasonryPortfolioGrid
            images={loaded.artist.portfolio_images}
            artistName={loaded.artist.name}
          />
        </div>
      </div>
    </div>
  ),
  parameters: {
    layout: 'fullscreen',
  },
};

/**
 * Long captions - Tests caption overflow handling
 * Shows how long Instagram captions are displayed
 */
export const LongCaptions: Story = {
  args: {
    images: [],
    artistName: 'Test Artist',
  },
  loaders: [
    async () => {
      const artist = await getTestArtistSafe(TEST_USERS.FREE_TIER);
      const imagesWithLongCaptions = artist.portfolio_images.map((img) => ({
        ...img,
        post_caption: 'Custom neo-traditional piece featuring a phoenix rising from flames. Client wanted to symbolize their journey of transformation and rebirth. Multi-session work spanning 12 hours total. Super proud of how this turned out! Available for custom bookings - DM for consultations. 🔥🔥🔥 #tattoo #neotrad #phoenix',
      }));
      return { artist: { ...artist, portfolio_images: imagesWithLongCaptions } };
    },
  ],
  render: (args, { loaded }) => (
    <div className="max-w-4xl mx-auto p-6">
      <MasonryPortfolioGrid
        images={loaded.artist.portfolio_images}
        artistName={loaded.artist.name}
      />
    </div>
  ),
};
