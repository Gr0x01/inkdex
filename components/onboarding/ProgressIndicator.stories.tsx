import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ProgressIndicator } from './ProgressIndicator';

/**
 * The ProgressIndicator shows the user's current step in the streamlined 2-step onboarding flow.
 *
 * Steps:
 * 1. Profile Info - Enter name, locations, bio, and booking link (Instagram fetch runs in background)
 * 2. Launch - Finalize profile and redirect to dashboard
 *
 * Design: Smaller 16px dots (down from 32px) for a more minimal appearance.
 */
const meta = {
  title: 'Onboarding/ProgressIndicator',
  component: ProgressIndicator,
  parameters: {
    layout: 'padded',
    backgrounds: { default: 'paper' },
  },
  tags: ['autodocs'],
  argTypes: {
    currentStep: {
      control: { type: 'range', min: 1, max: 2, step: 1 },
      description: 'Current step in the onboarding flow (1-2)',
    },
  },
} satisfies Meta<typeof ProgressIndicator>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Step 1: Profile Info
 */
export const Step1ProfileInfo: Story = {
  args: {
    currentStep: 1,
  },
  parameters: {
    docs: {
      description: {
        story: 'First step - entering profile information (name, locations, bio, booking link). Instagram fetch runs in the background. No steps are completed yet.',
      },
    },
  },
};

/**
 * Step 2: Launch
 */
export const Step2Launch: Story = {
  args: {
    currentStep: 2,
  },
  parameters: {
    docs: {
      description: {
        story: 'Final step - finalizing profile and redirecting to dashboard. Profile Info step is completed (shown with checkmark).',
      },
    },
  },
};

/**
 * Interactive: Use the controls to navigate through steps
 */
export const Interactive: Story = {
  args: {
    currentStep: 1,
  },
  parameters: {
    docs: {
      description: {
        story: 'Use the controls below to interactively change the current step.',
      },
    },
  },
};

/**
 * Mobile view: Progress indicator on small screens
 */
export const Mobile: Story = {
  args: {
    currentStep: 2,
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
    docs: {
      description: {
        story: 'On mobile, step labels appear below the dots instead of above. Smaller font size (8px) for compact display.',
      },
    },
  },
};
