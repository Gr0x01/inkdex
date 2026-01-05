import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import SearchTabs from './SearchTabs';

const meta = {
  title: 'Components/Search/SearchTabs',
  component: SearchTabs,
  parameters: {
    layout: 'centered',
    backgrounds: { default: 'paper' },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="w-full max-w-3xl p-8">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SearchTabs>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default state - image tab selected
 * Tab-based search switcher between image upload and text description
 */
export const Default: Story = {};

/**
 * Desktop viewport - full width experience
 */
export const Desktop: Story = {
  parameters: {
    viewport: { defaultViewport: 'desktop' },
  },
};

/**
 * Mobile viewport - stacked layout
 */
export const Mobile: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile' },
  },
};

/**
 * Tablet viewport
 */
export const Tablet: Story = {
  parameters: {
    viewport: { defaultViewport: 'tablet' },
  },
};

/**
 * Interactive demo - try switching tabs and uploading
 */
export const InteractiveDemo: Story = {
  render: () => (
    <div className="space-y-6">
      <div className="bg-gray-100 p-6 rounded border border-gray-300">
        <h3 className="font-display text-2xl mb-4 text-ink">Features:</h3>
        <ul className="font-body space-y-2 text-gray-700">
          <li>• Switch between Image Upload and Text Description tabs</li>
          <li>• Each tab maintains its own state</li>
          <li>• Submit button enables when input is valid</li>
          <li>• Loading state replaces form during search</li>
          <li>• Error messages shown below form</li>
        </ul>
      </div>
      <SearchTabs />
    </div>
  ),
};

/**
 * On dark background
 */
export const OnDarkBackground: Story = {
  parameters: {
    backgrounds: { default: 'ink' },
  },
  decorators: [
    (Story) => (
      <div className="w-full max-w-3xl p-8 bg-ink rounded-lg">
        <Story />
      </div>
    ),
  ],
};

/**
 * In page context - simulates actual search page layout
 */
export const InPageContext: Story = {
  render: () => (
    <div className="bg-paper min-h-screen py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="font-display text-5xl text-ink mb-4">
            Find Your Artist
          </h1>
          <p className="font-body text-lg text-gray-600 mb-8">
            Upload a reference image or describe the style you&apos;re looking for
          </p>
          <SearchTabs />
        </div>
      </div>
    </div>
  ),
  parameters: {
    layout: 'fullscreen',
  },
};
