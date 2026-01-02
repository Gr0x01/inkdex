import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import LocationPicker, { Location } from './LocationPicker';

/**
 * LocationPicker is used in onboarding for artists to select their location(s).
 *
 * Behavior differs based on tier:
 * - Free tier US: City OR State-wide (radio toggle)
 * - Free tier International: City + Country required
 * - Pro tier: Up to 20 locations worldwide
 */
const meta = {
  title: 'Onboarding/LocationPicker',
  component: LocationPicker,
  parameters: {
    layout: 'padded',
    backgrounds: { default: 'paper' },
  },
  tags: ['autodocs'],
  argTypes: {
    isPro: {
      control: 'boolean',
      description: 'Whether the artist has Pro tier',
    },
    error: {
      control: 'text',
      description: 'Error message to display',
    },
  },
} satisfies Meta<typeof LocationPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

// Mock locations
const singleUSLocation: Location[] = [
  {
    city: 'Austin',
    region: 'TX',
    countryCode: 'US',
    locationType: 'city',
    isPrimary: true,
  },
];

const stateWideLocation: Location[] = [
  {
    city: null,
    region: 'CA',
    countryCode: 'US',
    locationType: 'region',
    isPrimary: true,
  },
];

const internationalLocation: Location[] = [
  {
    city: 'London',
    region: 'England',
    countryCode: 'GB',
    locationType: 'city',
    isPrimary: true,
  },
];

const multipleLocations: Location[] = [
  {
    city: 'New York',
    region: 'NY',
    countryCode: 'US',
    locationType: 'city',
    isPrimary: true,
  },
  {
    city: 'Los Angeles',
    region: 'CA',
    countryCode: 'US',
    locationType: 'city',
    isPrimary: false,
  },
  {
    city: 'London',
    region: 'England',
    countryCode: 'GB',
    locationType: 'city',
    isPrimary: false,
  },
  {
    city: 'Tokyo',
    region: null,
    countryCode: 'JP',
    locationType: 'city',
    isPrimary: false,
  },
];

/**
 * Free tier US: Empty state
 */
export const FreeTierEmpty: Story = {
  args: {
    isPro: false,
    locations: [],
    onChange: () => {},
  },
  render: function FreeTierEmptyStory(args) {
    const [locations, setLocations] = useState<Location[]>([]);
    return <LocationPicker {...args} locations={locations} onChange={setLocations} />;
  },
  parameters: {
    docs: {
      description: {
        story: 'Free tier artist with no location set. Shows city OR state-wide radio toggle for US.',
      },
    },
  },
};

/**
 * Free tier US: City selected
 */
export const FreeTierUSCity: Story = {
  args: {
    isPro: false,
    locations: singleUSLocation,
    onChange: () => {},
  },
  render: function FreeTierUSCityStory(args) {
    const [locations, setLocations] = useState<Location[]>(singleUSLocation);
    return <LocationPicker {...args} locations={locations} onChange={setLocations} />;
  },
  parameters: {
    docs: {
      description: {
        story: 'Free tier artist with a US city selected (Austin, TX).',
      },
    },
  },
};

/**
 * Free tier US: State-wide
 */
export const FreeTierStateWide: Story = {
  args: {
    isPro: false,
    locations: stateWideLocation,
    onChange: () => {},
  },
  render: function FreeTierStateWideStory(args) {
    const [locations, setLocations] = useState<Location[]>(stateWideLocation);
    return <LocationPicker {...args} locations={locations} onChange={setLocations} />;
  },
  parameters: {
    docs: {
      description: {
        story: 'Free tier artist covering entire state (California statewide).',
      },
    },
  },
};

/**
 * Free tier International
 */
export const FreeTierInternational: Story = {
  args: {
    isPro: false,
    locations: internationalLocation,
    onChange: () => {},
  },
  render: function FreeTierInternationalStory(args) {
    const [locations, setLocations] = useState<Location[]>(internationalLocation);
    return <LocationPicker {...args} locations={locations} onChange={setLocations} />;
  },
  parameters: {
    docs: {
      description: {
        story: 'Free tier international artist (London, UK). City + country required.',
      },
    },
  },
};

/**
 * Pro tier: Empty state
 */
export const ProTierEmpty: Story = {
  args: {
    isPro: true,
    locations: [],
    onChange: () => {},
  },
  render: function ProTierEmptyStory(args) {
    const [locations, setLocations] = useState<Location[]>([]);
    return <LocationPicker {...args} locations={locations} onChange={setLocations} />;
  },
  parameters: {
    docs: {
      description: {
        story: 'Pro tier with no locations. Shows empty state with add button.',
      },
    },
  },
};

/**
 * Pro tier: Multiple locations
 */
export const ProTierMultiple: Story = {
  args: {
    isPro: true,
    locations: multipleLocations,
    onChange: () => {},
  },
  render: function ProTierMultipleStory(args) {
    const [locations, setLocations] = useState<Location[]>(multipleLocations);
    return <LocationPicker {...args} locations={locations} onChange={setLocations} />;
  },
  parameters: {
    docs: {
      description: {
        story: 'Pro tier artist with 4 locations across US and international. First location is primary.',
      },
    },
  },
};

/**
 * Pro tier: Adding location
 */
export const ProTierAdding: Story = {
  args: {
    isPro: true,
    locations: singleUSLocation,
    onChange: () => {},
  },
  render: function ProTierAddingStory(args) {
    const [locations, setLocations] = useState<Location[]>(singleUSLocation);
    return (
      <div>
        <p className="font-body text-sm text-gray-500 mb-4">
          Click &quot;Add location&quot; to see the add form.
        </p>
        <LocationPicker {...args} locations={locations} onChange={setLocations} />
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Pro tier with one location. Click "Add location" to see the add form.',
      },
    },
  },
};

/**
 * With error
 */
export const WithError: Story = {
  args: {
    isPro: false,
    locations: [],
    onChange: () => {},
    error: 'Please select at least one location',
  },
  parameters: {
    docs: {
      description: {
        story: 'Error state when validation fails.',
      },
    },
  },
};

/**
 * Mobile view
 */
export const Mobile: Story = {
  args: {
    isPro: true,
    locations: multipleLocations,
    onChange: () => {},
  },
  render: function MobileStory(args) {
    const [locations, setLocations] = useState<Location[]>(multipleLocations);
    return <LocationPicker {...args} locations={locations} onChange={setLocations} />;
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
    docs: {
      description: {
        story: 'Mobile view with multiple locations.',
      },
    },
  },
};
