import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { CompleteStep } from './CompleteStep';

/**
 * The CompleteStep component is the final step of onboarding showing
 * the result of the finalization process.
 *
 * States:
 * - Finalizing: Creating artist profile and uploading images
 * - Success: Profile is live
 * - Error: Something went wrong
 */
const meta = {
  title: 'Onboarding/CompleteStep',
  component: CompleteStep,
  parameters: {
    layout: 'padded',
    backgrounds: { default: 'paper' },
  },
  tags: ['autodocs'],
  argTypes: {
    status: {
      control: 'select',
      options: ['finalizing', 'success', 'error'],
      description: 'Current finalization status',
    },
    artistSlug: { control: 'text', description: 'Artist profile slug' },
    error: { control: 'text', description: 'Error message' },
    onViewProfile: { action: 'view profile clicked' },
    onGoToDashboard: { action: 'go to dashboard clicked' },
  },
} satisfies Meta<typeof CompleteStep>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Finalizing: Creating profile
 */
export const Finalizing: Story = {
  args: {
    status: 'finalizing',
  },
  parameters: {
    docs: {
      description: {
        story: 'Profile is being created. Images are being uploaded and indexed.',
      },
    },
  },
};

/**
 * Success: Profile is live
 */
export const Success: Story = {
  args: {
    status: 'success',
    artistSlug: 'alex-rivera',
  },
  parameters: {
    docs: {
      description: {
        story: 'Profile successfully created and is now live on Inkdex.',
      },
    },
  },
};

/**
 * Error: Transaction failed
 */
export const ErrorTransactionFailed: Story = {
  args: {
    status: 'error',
    error: 'Failed to create profile. Please try again.',
  },
  parameters: {
    docs: {
      description: {
        story: 'Error when the finalization transaction fails.',
      },
    },
  },
};

/**
 * Error: Session expired
 */
export const ErrorSessionExpired: Story = {
  args: {
    status: 'error',
    error: 'Session expired. Please start the onboarding process again.',
  },
  parameters: {
    docs: {
      description: {
        story: 'Error when the 24-hour session has expired.',
      },
    },
  },
};

/**
 * Error: Upload failed
 */
export const ErrorUploadFailed: Story = {
  args: {
    status: 'error',
    error: 'Failed to upload portfolio images. Please try again.',
  },
  parameters: {
    docs: {
      description: {
        story: 'Error when image upload to Supabase Storage fails.',
      },
    },
  },
};

/**
 * Mobile: Complete step on small screens
 */
export const MobileSuccess: Story = {
  args: {
    status: 'success',
    artistSlug: 'alex-rivera',
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile',
    },
    docs: {
      description: {
        story: 'On mobile, buttons stack vertically.',
      },
    },
  },
};

/**
 * Mobile: Finalizing on small screens
 */
export const MobileFinalizing: Story = {
  args: {
    status: 'finalizing',
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile',
    },
    docs: {
      description: {
        story: 'Finalizing state on mobile devices.',
      },
    },
  },
};
