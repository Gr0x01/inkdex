import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import ProfileEditor from './ProfileEditor';

/**
 * ProfileEditor is the profile editing component in the artist dashboard.
 * Editorial design with Paper & Ink aesthetic.
 *
 * Features:
 * - Basic fields: name, location, bio, booking link
 * - Pro-only fields: pricing info, availability status
 * - Live preview column
 * - Delete profile with multi-step confirmation
 */
const meta = {
  title: 'Dashboard/ProfileEditor',
  component: ProfileEditor,
  parameters: {
    layout: 'fullscreen',
    backgrounds: { default: 'paper' },
  },
  tags: ['autodocs'],
  argTypes: {
    isPro: {
      control: 'boolean',
      description: 'Whether the artist has Pro tier subscription',
    },
  },
} satisfies Meta<typeof ProfileEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

// Mock initial data for stories
const baseInitialData = {
  name: 'Alex Rivera',
  city: 'Los Angeles',
  state: 'CA',
  instagramHandle: 'alex.ink',
  bioOverride: '',
  bookingLink: '',
  pricingInfo: '',
  availabilityStatus: null,
};

const filledInitialData = {
  name: 'Morgan Black',
  city: 'New York',
  state: 'NY',
  instagramHandle: 'morganblackink',
  bioOverride:
    'Neo-traditional and Japanese-inspired designs. 10+ years experience. Specializing in large-scale work and custom pieces. DM for consultations.',
  bookingLink: 'https://calendly.com/morganblackink',
  pricingInfo: '$200/hr, $150 minimum',
  availabilityStatus: 'available',
};

/**
 * Free tier artist: Basic fields only
 */
export const FreeTier: Story = {
  args: {
    artistId: 'artist-123',
    artistSlug: 'alex-rivera',
    isPro: false,
    initialData: baseInitialData,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Free tier artists can edit name, location, bio, and booking link. Pro features are hidden.',
      },
    },
  },
};

/**
 * Pro tier artist: All fields visible
 */
export const ProTier: Story = {
  args: {
    artistId: 'artist-456',
    artistSlug: 'morgan-black',
    isPro: true,
    initialData: filledInitialData,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Pro tier artists can also set pricing information and availability status.',
      },
    },
  },
};

/**
 * Empty profile: New artist with minimal data
 */
export const EmptyProfile: Story = {
  args: {
    artistId: 'artist-789',
    artistSlug: 'new-artist',
    isPro: false,
    initialData: {
      name: '',
      city: '',
      state: '',
      instagramHandle: 'newartist',
      bioOverride: '',
      bookingLink: '',
      pricingInfo: '',
      availabilityStatus: null,
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'Initial state for a newly claimed artist profile with no data.',
      },
    },
  },
};

/**
 * Pro with availability "Available"
 */
export const AvailableForBookings: Story = {
  args: {
    artistId: 'artist-avail',
    artistSlug: 'available-artist',
    isPro: true,
    initialData: {
      ...filledInitialData,
      availabilityStatus: 'available',
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'Pro artist showing "Available for bookings" status.',
      },
    },
  },
};

/**
 * Pro with availability "Waitlist"
 */
export const WaitlistOnly: Story = {
  args: {
    artistId: 'artist-wait',
    artistSlug: 'waitlist-artist',
    isPro: true,
    initialData: {
      ...filledInitialData,
      availabilityStatus: 'waitlist',
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'Pro artist on waitlist-only status.',
      },
    },
  },
};

/**
 * Pro with availability "Opening Soon"
 */
export const OpeningSoon: Story = {
  args: {
    artistId: 'artist-soon',
    artistSlug: 'opening-soon-artist',
    isPro: true,
    initialData: {
      ...filledInitialData,
      availabilityStatus: 'booking_soon',
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'Pro artist showing "Opening soon" status.',
      },
    },
  },
};

/**
 * Long bio: Testing character limit display
 */
export const LongBio: Story = {
  args: {
    artistId: 'artist-bio',
    artistSlug: 'long-bio-artist',
    isPro: false,
    initialData: {
      ...baseInitialData,
      bioOverride:
        'Award-winning tattoo artist with over 15 years of experience in the industry. I specialize in neo-traditional and Japanese-inspired designs, blending classic techniques with modern aesthetics. My studio is a welcoming space for first-timers and seasoned collectors alike. I believe every tattoo should tell a story, and I work closely with each client to bring their vision to life. When not tattooing, you can find me sketching at local coffee shops or attending art shows around the city.',
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'Testing the 500 character limit on bio field with long content.',
      },
    },
  },
};

/**
 * Mobile view: Responsive layout
 */
export const Mobile: Story = {
  args: {
    artistId: 'artist-mobile',
    artistSlug: 'mobile-artist',
    isPro: true,
    initialData: filledInitialData,
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
    docs: {
      description: {
        story: 'On mobile, form and preview stack vertically.',
      },
    },
  },
};

/**
 * Tablet view: Medium screens
 */
export const Tablet: Story = {
  args: {
    artistId: 'artist-tablet',
    artistSlug: 'tablet-artist',
    isPro: true,
    initialData: filledInitialData,
  },
  parameters: {
    viewport: {
      defaultViewport: 'tablet',
    },
    docs: {
      description: {
        story: 'Tablet layout with adjusted spacing.',
      },
    },
  },
};

/**
 * Interactive: Fully functional form with state
 */
export const Interactive: Story = {
  args: {
    artistId: 'artist-interactive',
    artistSlug: 'interactive-artist',
    isPro: true,
    initialData: baseInitialData,
  },
  render: function InteractiveStory(args) {
    // Note: In a real scenario, the component manages its own state
    // This story demonstrates the component as it would appear with real data
    return <ProfileEditor {...args} />;
  },
  parameters: {
    docs: {
      description: {
        story:
          'Fully interactive form. Try editing fields to see the live preview update. Note: API calls are mocked in Storybook.',
      },
    },
  },
};
