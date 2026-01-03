import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { SyncSettingsCard } from './SyncSettingsCard';

/**
 * SyncSettingsCard - Instagram Auto-Sync Settings
 *
 * Pro-only feature for managing daily Instagram portfolio sync.
 * Editorial minimal design with split-button toggles.
 *
 * Features:
 * - Auto-Sync toggle: Enable/disable daily Instagram sync
 * - Filter Non-Tattoo Content: AI classification to filter lifestyle photos
 * - Manual sync trigger: Force sync immediately (rate limited)
 * - Sync status badge: Visual feedback on last sync
 * - Sync history: Recent sync logs
 */
const meta = {
  title: 'Dashboard/SyncSettingsCard',
  component: SyncSettingsCard,
  parameters: {
    layout: 'padded',
    backgrounds: { default: 'paper' },
    docs: {
      description: {
        component:
          'Pro-only settings card for Instagram auto-sync. Manages daily portfolio synchronization and content filtering preferences.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof SyncSettingsCard>;

export default meta;
type Story = StoryObj<typeof meta>;

// Helper to create mock sync status data
const createMockStatus = (
  isPro: boolean,
  autoSyncEnabled: boolean,
  filterNonTattoo: boolean,
  lastSyncAt: string | null = null,
  syncDisabledReason: string | null = null,
  consecutiveFailures: number = 0
) => ({
  isPro,
  autoSyncEnabled,
  filterNonTattoo,
  lastSyncAt,
  syncDisabledReason,
  consecutiveFailures,
  recentLogs: [
    {
      id: 'log-1',
      syncType: 'auto' as const,
      imagesFetched: 20,
      imagesAdded: 8,
      imagesSkipped: 12,
      status: 'success' as const,
      errorMessage: null,
      startedAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
      completedAt: new Date(Date.now() - 86400000 + 5000).toISOString(),
    },
    {
      id: 'log-2',
      syncType: 'manual' as const,
      imagesFetched: 15,
      imagesAdded: 5,
      imagesSkipped: 10,
      status: 'success' as const,
      errorMessage: null,
      startedAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
      completedAt: new Date(Date.now() - 172800000 + 4500).toISOString(),
    },
  ],
});

/**
 * Not Pro: Shows upgrade prompt
 */
export const NotPro: Story = {
  args: {
    initialStatus: createMockStatus(false, false, true),
  },
  parameters: {
    docs: {
      description: {
        story:
          'Free tier users see an upgrade prompt. Auto-sync is a Pro-only feature.',
      },
    },
  },
};

/**
 * Pro - Both Toggles ON
 */
export const ProBothEnabled: Story = {
  args: {
    initialStatus: createMockStatus(
      true,
      true,
      true,
      new Date(Date.now() - 3600000).toISOString() // 1 hour ago
    ),
  },
  parameters: {
    docs: {
      description: {
        story:
          'Pro artist with both auto-sync and filtering enabled. Daily sync at 2am UTC, AI filters non-tattoo posts.',
      },
    },
  },
};

/**
 * Pro - Auto-Sync ON, Filter OFF
 */
export const ProAutoSyncNoFilter: Story = {
  args: {
    initialStatus: createMockStatus(
      true,
      true,
      false,
      new Date(Date.now() - 7200000).toISOString() // 2 hours ago
    ),
  },
  parameters: {
    docs: {
      description: {
        story:
          'Pro artist with auto-sync enabled but filtering disabled. Imports all Instagram posts without AI classification (saves GPT-5-mini costs).',
      },
    },
  },
};

/**
 * Pro - Auto-Sync OFF, Filter ON
 */
export const ProManualSyncOnly: Story = {
  args: {
    initialStatus: createMockStatus(true, false, true),
  },
  parameters: {
    docs: {
      description: {
        story:
          'Pro artist with auto-sync disabled. Uses manual sync only when needed. Filter is still enabled for manual imports.',
      },
    },
  },
};

/**
 * Pro - Both Toggles OFF
 */
export const ProBothDisabled: Story = {
  args: {
    initialStatus: createMockStatus(
      true,
      false,
      false,
      new Date(Date.now() - 604800000).toISOString() // 1 week ago
    ),
  },
  parameters: {
    docs: {
      description: {
        story:
          'Pro artist with both features disabled. Maximum manual control - no automatic sync, imports all posts without filtering.',
      },
    },
  },
};

/**
 * Pro - Never Synced
 */
export const ProNeverSynced: Story = {
  args: {
    initialStatus: {
      isPro: true,
      autoSyncEnabled: true,
      filterNonTattoo: true,
      lastSyncAt: null,
      syncDisabledReason: null,
      consecutiveFailures: 0,
      recentLogs: [],
    },
  },
  parameters: {
    docs: {
      description: {
        story:
          "Pro artist who just enabled auto-sync but hasn't synced yet. Waits for next 2am UTC cron job.",
      },
    },
  },
};

/**
 * Pro - Recently Synced
 */
export const ProRecentlyActive: Story = {
  args: {
    initialStatus: createMockStatus(
      true,
      true,
      true,
      new Date(Date.now() - 300000).toISOString() // 5 minutes ago
    ),
  },
  parameters: {
    docs: {
      description: {
        story: 'Pro artist with very recent sync activity. Shows "Synced" badge.',
      },
    },
  },
};

/**
 * Pro - Sync Failed
 */
export const ProSyncFailed: Story = {
  args: {
    initialStatus: {
      isPro: true,
      autoSyncEnabled: true,
      filterNonTattoo: true,
      lastSyncAt: new Date(Date.now() - 86400000).toISOString(),
      syncDisabledReason: 'Instagram account private',
      consecutiveFailures: 2,
      recentLogs: [
        {
          id: 'log-fail-1',
          syncType: 'auto' as const,
          imagesFetched: 0,
          imagesAdded: 0,
          imagesSkipped: 0,
          status: 'failed' as const,
          errorMessage: 'Instagram account is private',
          startedAt: new Date(Date.now() - 86400000).toISOString(),
          completedAt: new Date(Date.now() - 86400000 + 2000).toISOString(),
        },
      ],
    },
  },
  parameters: {
    docs: {
      description: {
        story:
          'Sync failed due to private Instagram account. Shows error state and consecutive failure count.',
      },
    },
  },
};

/**
 * Loading State
 */
export const Loading: Story = {
  args: {
    // Don't provide initialStatus to trigger loading state
  },
  parameters: {
    docs: {
      description: {
        story: 'Loading state while fetching sync status from API.',
      },
    },
  },
};

/**
 * Mobile View
 */
export const Mobile: Story = {
  args: {
    initialStatus: createMockStatus(
      true,
      true,
      true,
      new Date(Date.now() - 3600000).toISOString()
    ),
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
    docs: {
      description: {
        story:
          'Responsive layout on mobile. Toggles stack vertically on small screens.',
      },
    },
  },
};

/**
 * Interactive: Fully functional toggles
 */
export const Interactive: Story = {
  args: {
    initialStatus: createMockStatus(
      true,
      false,
      true,
      new Date(Date.now() - 3600000).toISOString()
    ),
  },
  parameters: {
    docs: {
      description: {
        story:
          "Fully interactive component. Note: API calls are mocked in Storybook and won't persist changes.",
      },
    },
  },
};
