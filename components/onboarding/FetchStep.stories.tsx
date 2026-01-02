import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { FetchStep } from './FetchStep';

/**
 * The FetchStep component displays the first step of onboarding where
 * Instagram images are fetched and classified.
 *
 * This component shows different states:
 * - Connecting to Instagram
 * - Fetching posts
 * - Classifying images with AI
 * - Complete (success)
 * - Error (with retry option)
 */
const meta = {
  title: 'Onboarding/FetchStep',
  component: FetchStep,
  parameters: {
    layout: 'padded',
    backgrounds: { default: 'ink' },
  },
  tags: ['autodocs'],
  argTypes: {
    loadingState: {
      control: 'select',
      options: ['connecting', 'fetching', 'classifying', 'complete', 'error'],
      description: 'Current state of the fetch process',
    },
    progress: {
      control: 'object',
      description: 'Progress of image classification',
    },
    error: {
      control: 'text',
      description: 'Error message to display',
    },
    onRetry: {
      action: 'retry clicked',
      description: 'Called when retry button is clicked',
    },
  },
} satisfies Meta<typeof FetchStep>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Initial state: Connecting to Instagram API
 */
export const Connecting: Story = {
  args: {
    loadingState: 'connecting',
  },
  parameters: {
    docs: {
      description: {
        story: 'Initial state when the page loads, before connecting to Instagram.',
      },
    },
  },
};

/**
 * Fetching: Pulling posts from Instagram
 */
export const Fetching: Story = {
  args: {
    loadingState: 'fetching',
  },
  parameters: {
    docs: {
      description: {
        story: 'Actively fetching recent posts from the Instagram API.',
      },
    },
  },
};

/**
 * Classifying: AI analyzing images for tattoo content
 */
export const Classifying: Story = {
  args: {
    loadingState: 'classifying',
    progress: { current: 35, total: 50 },
  },
  parameters: {
    docs: {
      description: {
        story: 'GPT-5-mini is classifying images to identify tattoo portfolio content.',
      },
    },
  },
};

/**
 * Complete: Successfully fetched and classified
 */
export const Complete: Story = {
  args: {
    loadingState: 'complete',
    progress: { current: 42, total: 42 },
  },
  parameters: {
    docs: {
      description: {
        story: 'Images successfully fetched and classified. Auto-redirecting to next step.',
      },
    },
  },
};

/**
 * Error: Private account
 */
export const ErrorPrivateAccount: Story = {
  args: {
    loadingState: 'error',
    error: 'Your Instagram account is private. Please make it public to continue.',
  },
  parameters: {
    docs: {
      description: {
        story: 'Error state when trying to fetch from a private Instagram account.',
      },
    },
  },
};

/**
 * Error: Rate limited
 */
export const ErrorRateLimited: Story = {
  args: {
    loadingState: 'error',
    error: 'Too many attempts. Please try again later.',
  },
  parameters: {
    docs: {
      description: {
        story: 'Error state when rate limit is exceeded (3 attempts per hour).',
      },
    },
  },
};

/**
 * Error: Generic failure
 */
export const ErrorGeneric: Story = {
  args: {
    loadingState: 'error',
    error: 'Failed to fetch Instagram images. Please try again.',
  },
  parameters: {
    docs: {
      description: {
        story: 'Generic error state with retry button.',
      },
    },
  },
};

/**
 * Mobile: Fetch step on small screens
 */
export const Mobile: Story = {
  args: {
    loadingState: 'fetching',
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile',
    },
    docs: {
      description: {
        story: 'Fetch step on mobile devices with responsive padding.',
      },
    },
  },
};
