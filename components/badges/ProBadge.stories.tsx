import type { Meta, StoryObj } from '@storybook/react';
import { ProBadge } from './ProBadge';

const meta = {
  title: 'Components/Badges/ProBadge',
  component: ProBadge,
  parameters: {
    layout: 'centered',
    backgrounds: { default: 'paper' },
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Size of the badge',
    },
    variant: {
      control: 'select',
      options: ['icon-only', 'badge', 'inline'],
      description: 'Visual style variant',
    },
    className: {
      control: 'text',
      description: 'Additional CSS classes',
    },
  },
} satisfies Meta<typeof ProBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Icon-only variant - just the crown icon
 * Used next to artist names and handles in compact displays
 */
export const IconOnly: Story = {
  args: {
    variant: 'icon-only',
    size: 'sm',
  },
};

/**
 * Badge variant - crown + "Pro" text with solid background
 * Used as overlay badges on images and cards
 */
export const Badge: Story = {
  args: {
    variant: 'badge',
    size: 'md',
  },
};

/**
 * Inline variant - crown + "Pro" text with subtle background
 * Used in headers and section titles
 */
export const Inline: Story = {
  args: {
    variant: 'inline',
    size: 'md',
  },
};

/**
 * All size variations displayed together for comparison
 */
export const AllSizes: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      <div>
        <p className="mb-2 text-sm font-semibold text-gray-700">Icon Only</p>
        <div className="flex items-center gap-4">
          <ProBadge variant="icon-only" size="sm" />
          <ProBadge variant="icon-only" size="md" />
          <ProBadge variant="icon-only" size="lg" />
        </div>
      </div>
      <div>
        <p className="mb-2 text-sm font-semibold text-gray-700">Badge</p>
        <div className="flex items-center gap-4">
          <ProBadge variant="badge" size="sm" />
          <ProBadge variant="badge" size="md" />
          <ProBadge variant="badge" size="lg" />
        </div>
      </div>
      <div>
        <p className="mb-2 text-sm font-semibold text-gray-700">Inline</p>
        <div className="flex items-center gap-4">
          <ProBadge variant="inline" size="sm" />
          <ProBadge variant="inline" size="md" />
          <ProBadge variant="inline" size="lg" />
        </div>
      </div>
    </div>
  ),
};

/**
 * Badge on dark background
 * Tests visibility and contrast on dark surfaces
 */
export const OnDarkBackground: Story = {
  args: {
    variant: 'badge',
    size: 'md',
  },
  parameters: {
    backgrounds: { default: 'ink' },
  },
};
