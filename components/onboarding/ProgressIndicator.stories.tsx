import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ProgressIndicator } from './ProgressIndicator';

/**
 * The ProgressIndicator shows the user's current step in the 5-step onboarding flow.
 *
 * Steps:
 * 1. Fetch - Pull Instagram images
 * 2. Preview - Edit profile details
 * 3. Portfolio - Select portfolio images
 * 4. Booking - Add booking link
 * 5. Complete - Launch profile
 */
const meta = {
  title: 'Onboarding/ProgressIndicator',
  component: ProgressIndicator,
  parameters: {
    layout: 'padded',
    backgrounds: { default: 'ink' },
  },
  tags: ['autodocs'],
  argTypes: {
    currentStep: {
      control: { type: 'range', min: 1, max: 5, step: 1 },
      description: 'Current step in the onboarding flow (1-5)',
    },
  },
} satisfies Meta<typeof ProgressIndicator>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Step 1: Fetch Instagram images
 */
export const Step1Fetch: Story = {
  args: {
    currentStep: 1,
  },
  parameters: {
    docs: {
      description: {
        story: 'First step - fetching Instagram images. No steps are completed yet.',
      },
    },
  },
};

/**
 * Step 2: Preview profile
 */
export const Step2Preview: Story = {
  args: {
    currentStep: 2,
  },
  parameters: {
    docs: {
      description: {
        story: 'Second step - editing profile details. Fetch step is completed.',
      },
    },
  },
};

/**
 * Step 3: Portfolio selection
 */
export const Step3Portfolio: Story = {
  args: {
    currentStep: 3,
  },
  parameters: {
    docs: {
      description: {
        story: 'Third step - selecting portfolio images. Fetch and Preview are completed.',
      },
    },
  },
};

/**
 * Step 4: Booking link
 */
export const Step4Booking: Story = {
  args: {
    currentStep: 4,
  },
  parameters: {
    docs: {
      description: {
        story: 'Fourth step - adding booking link. Three steps completed.',
      },
    },
  },
};

/**
 * Step 5: Complete (Launch)
 */
export const Step5Complete: Story = {
  args: {
    currentStep: 5,
  },
  parameters: {
    docs: {
      description: {
        story: 'Final step - profile is being launched. All previous steps completed.',
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
    currentStep: 3,
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile',
    },
    docs: {
      description: {
        story: 'On mobile, step labels appear below the dots instead of above.',
      },
    },
  },
};
