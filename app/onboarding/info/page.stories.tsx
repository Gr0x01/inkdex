import type { Meta, StoryObj } from '@storybook/nextjs-vite';

/**
 * Info Page Stories
 *
 * NOTE: For comprehensive onboarding stories with working dropdowns and mock data,
 * see the main `Onboarding` stories in `app/onboarding/onboarding-flow.stories.tsx`.
 *
 * This file tests the actual InfoPage component which relies on:
 * - URL search params (session_id)
 * - Supabase auth and database
 * - API calls for background fetch
 *
 * For interactive testing, use the `Onboarding/Step1_BasicInfo` story instead.
 */

// Placeholder component that matches the page's loading state
function InfoPagePlaceholder() {
  return (
    <div className="min-h-screen bg-[var(--paper-white)] relative">
      <div className="grain-overlay absolute inset-0 pointer-events-none" />
      <div className="relative">
        <main className="container mx-auto px-3 sm:px-4 lg:px-6 py-6 sm:py-8 lg:py-12 max-w-2xl">
          <div className="bg-paper border-2 border-border-subtle p-4 sm:p-6 lg:p-8 shadow-md">
            <div className="flex justify-center items-center min-h-[300px]">
              <div className="text-center">
                <div className="w-16 h-16 border-2 border-ink border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="font-body text-gray-700">Loading your profile...</p>
                <p className="font-mono text-xs text-gray-400 mt-2 uppercase tracking-wider">
                  Requires session_id parameter
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

// Error state placeholder
function InfoPageError() {
  return (
    <div className="min-h-screen bg-[var(--paper-white)] relative">
      <div className="grain-overlay absolute inset-0 pointer-events-none" />
      <div className="relative">
        <main className="container mx-auto px-3 sm:px-4 lg:px-6 py-6 sm:py-8 lg:py-12 max-w-2xl">
          <div className="bg-paper border-2 border-status-error p-6 text-center">
            <p className="font-body text-status-error mb-4">No session ID found</p>
            <p className="font-mono text-xs text-gray-500 uppercase tracking-wider">Redirecting...</p>
          </div>
        </main>
      </div>
    </div>
  );
}

const meta = {
  title: 'Onboarding/InfoPage (Production)',
  parameters: {
    layout: 'fullscreen',
    backgrounds: { default: 'paper' },
    docs: {
      description: {
        component: `
# Info Page (Production Component)

This is the actual \`/onboarding/info\` page component that requires:
- A valid \`session_id\` URL parameter
- Authenticated Supabase user
- Active onboarding session in the database

**For interactive testing with working forms and mock data, use:**
- \`Onboarding/Step1_BasicInfo\` - Basic info form
- \`Onboarding/InteractiveFlow\` - Full click-through demo

These stories show what the production page looks like in various states.
        `,
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj;

/**
 * Loading state - What users see while session data is being fetched
 */
export const Loading: Story = {
  render: () => <InfoPagePlaceholder />,
  parameters: {
    docs: {
      description: {
        story: 'Loading state while fetching session data from the database.',
      },
    },
  },
};

/**
 * Error state - Missing or invalid session
 */
export const Error: Story = {
  render: () => <InfoPageError />,
  parameters: {
    docs: {
      description: {
        story: 'Error state when session_id is missing or invalid. Auto-redirects to /add-artist.',
      },
    },
  },
};

/**
 * Mobile loading state
 */
export const Loading_Mobile: Story = {
  render: () => <InfoPagePlaceholder />,
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
    docs: {
      description: {
        story: 'Loading state on mobile devices.',
      },
    },
  },
};
