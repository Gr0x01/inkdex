import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import InfoPage from './page';

/**
 * The Info page is the first (and main) step in the streamlined 2-step onboarding flow.
 *
 * Features:
 * - Combined form for name, locations, bio, and booking link
 * - No preview panel (removed for simplicity)
 * - Instagram fetch starts in background when page loads
 * - Single-column layout for faster completion
 *
 * This replaces the old 3-step flow: Fetch → Preview → Booking
 */
const meta = {
  title: 'Onboarding/InfoPage',
  component: InfoPage,
  parameters: {
    layout: 'fullscreen',
    backgrounds: { default: 'paper' },
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: '/onboarding/info',
        query: { session_id: '123e4567-e89b-12d3-a456-426614174000' },
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof InfoPage>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default state - Empty form
 */
export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Empty form state when user first lands on the info page. Instagram fetch starts automatically in the background.',
      },
    },
  },
};

/**
 * Loading state - Fetching session data
 */
export const Loading: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Loading state while fetching existing session data from the database.',
      },
    },
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: '/onboarding/info',
        query: { session_id: 'loading' },
      },
    },
  },
};

/**
 * Mobile view
 */
export const Mobile: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
    docs: {
      description: {
        story: 'Info page on mobile devices. Single-column layout adapts to smaller screens.',
      },
    },
  },
};

/**
 * Tablet view
 */
export const Tablet: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'tablet',
    },
    docs: {
      description: {
        story: 'Info page on tablet devices.',
      },
    },
  },
};

/**
 * With validation errors
 */
export const WithErrors: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Form with validation errors shown (name required, location required, invalid booking URL).',
      },
    },
  },
};

/**
 * Info vs Old Preview Comparison
 */
export const ComparisonWithOldFlow: Story = {
  parameters: {
    docs: {
      description: {
        story: `
**Key Differences from Old Preview Step:**

- ✅ Booking link field added (no separate step)
- ❌ Preview panel removed (single-column layout)
- ✅ Instagram fetch runs in background (non-blocking)
- ✅ Faster completion (~30 sec vs ~3-5 min)
- ✅ Simpler UX (2 steps total instead of 5)

**What happens in the background:**
1. Instagram fetch starts when page loads
2. Images are classified with AI
3. User can complete form while fetch runs
4. On finalization, all classified images auto-imported
`,
      },
    },
  },
};
