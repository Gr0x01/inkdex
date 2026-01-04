import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import DashboardToolbar from './DashboardToolbar';

/**
 * DashboardToolbar - Animated Navigation Tabs
 *
 * Sticky navigation toolbar with animated sliding underline indicator.
 * Editorial "Paper & Ink" aesthetic with responsive behavior.
 *
 * Features:
 * - Animated sliding underline that smoothly transitions between active tabs
 * - Responsive: Horizontal scroll on mobile, centered on tablet+
 * - Icon + label navigation items
 * - Optimized touch targets (min 44px)
 * - Editorial typography (uppercase tracking, monospace font)
 */
const meta = {
  title: 'Dashboard/DashboardToolbar',
  component: DashboardToolbar,
  parameters: {
    layout: 'fullscreen',
    backgrounds: { default: 'paper' },
    docs: {
      description: {
        component:
          'Navigation toolbar for dashboard pages with animated sliding underline. Supports Overview, Portfolio, Profile, and Account sections.',
      },
    },
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: '/dashboard',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof DashboardToolbar>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Overview Tab Active
 */
export const OverviewActive: Story = {
  parameters: {
    nextjs: {
      navigation: {
        pathname: '/dashboard',
      },
    },
    docs: {
      description: {
        story: 'Dashboard Overview tab is active. Underline is positioned under the Overview tab.',
      },
    },
  },
};

/**
 * Portfolio Tab Active
 */
export const PortfolioActive: Story = {
  parameters: {
    nextjs: {
      navigation: {
        pathname: '/dashboard/portfolio',
      },
    },
    docs: {
      description: {
        story: 'Portfolio tab is active. Underline smoothly slides to Portfolio position.',
      },
    },
  },
};

/**
 * Profile Tab Active
 */
export const ProfileActive: Story = {
  parameters: {
    nextjs: {
      navigation: {
        pathname: '/dashboard/profile',
      },
    },
    docs: {
      description: {
        story: 'Profile tab is active. Underline animates to Profile position.',
      },
    },
  },
};

/**
 * Account Tab Active
 */
export const AccountActive: Story = {
  parameters: {
    nextjs: {
      navigation: {
        pathname: '/dashboard/account',
      },
    },
    docs: {
      description: {
        story: 'Account tab is active. Underline is positioned at the rightmost tab.',
      },
    },
  },
};

/**
 * Mobile View - Overview
 */
export const MobileOverview: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
    nextjs: {
      navigation: {
        pathname: '/dashboard',
      },
    },
    docs: {
      description: {
        story: 'Mobile view with horizontal scroll. Tabs are left-aligned with scrollable overflow.',
      },
    },
  },
};

/**
 * Mobile View - Portfolio
 */
export const MobilePortfolio: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
    nextjs: {
      navigation: {
        pathname: '/dashboard/portfolio',
      },
    },
    docs: {
      description: {
        story: 'Mobile view with Portfolio active. Animated underline works on mobile too.',
      },
    },
  },
};

/**
 * Tablet View
 */
export const Tablet: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'tablet',
    },
    nextjs: {
      navigation: {
        pathname: '/dashboard/portfolio',
      },
    },
    docs: {
      description: {
        story: 'Tablet view (768px+). Tabs are centered and no longer scroll horizontally.',
      },
    },
  },
};

/**
 * Desktop View
 */
export const Desktop: Story = {
  parameters: {
    nextjs: {
      navigation: {
        pathname: '/dashboard/profile',
      },
    },
    docs: {
      description: {
        story: 'Desktop view with full spacing and centered tabs. Smooth underline animation on tab change.',
      },
    },
  },
};

/**
 * With Content Below
 */
export const WithContent: Story = {
  parameters: {
    nextjs: {
      navigation: {
        pathname: '/dashboard/portfolio',
      },
    },
    docs: {
      description: {
        story: 'Toolbar in context with page content below. Shows sticky positioning behavior.',
      },
    },
  },
  decorators: [
    (Story) => (
      <div>
        <Story />
        <div className="p-8 max-w-7xl mx-auto">
          <h1 className="font-heading text-3xl mb-4">Portfolio Manager</h1>
          <p className="text-gray-600 mb-6">
            The toolbar sticks to the top as you scroll. The animated underline smoothly transitions between tabs.
          </p>
          <div className="h-[800px] bg-gray-100 rounded-lg p-6">
            <p className="text-sm text-gray-500">Scroll to see sticky behavior...</p>
          </div>
        </div>
      </div>
    ),
  ],
};
