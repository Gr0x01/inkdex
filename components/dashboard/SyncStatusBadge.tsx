'use client';

/**
 * SyncStatusBadge
 *
 * Small badge showing sync status with appropriate styling
 * Used in SyncSettingsCard and potentially elsewhere
 */

interface SyncStatusBadgeProps {
  status: 'synced' | 'syncing' | 'failed' | 'disabled' | 'never';
  lastSyncAt?: string | null;
  className?: string;
}

/**
 * Format relative time (e.g., "2h ago", "3d ago")
 */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 1000 / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  // Format as date for older syncs
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function SyncStatusBadge({ status, lastSyncAt, className = '' }: SyncStatusBadgeProps) {
  const baseClasses = 'inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider';

  switch (status) {
    case 'synced':
      return (
        <span className={`${baseClasses} text-emerald-600 ${className}`}>
          <span className="inline-block w-1.5 h-1.5 bg-emerald-500 rounded-full" />
          <span className="hidden sm:inline">Synced {lastSyncAt ? formatRelativeTime(lastSyncAt) : ''}</span>
        </span>
      );

    case 'syncing':
      return (
        <span className={`${baseClasses} text-amber-600 ${className}`}>
          <span className="inline-block w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
          <span className="hidden sm:inline">Syncing...</span>
        </span>
      );

    case 'failed':
      return (
        <span className={`${baseClasses} text-red-600 ${className}`}>
          <span className="inline-block w-1.5 h-1.5 bg-red-500 rounded-full" />
          <span className="hidden sm:inline">Last sync failed</span>
        </span>
      );

    case 'disabled':
      return (
        <span className={`${baseClasses} text-[var(--gray-500)] ${className}`}>
          <span className="inline-block w-1.5 h-1.5 bg-[var(--gray-400)] rounded-full" />
          <span className="hidden sm:inline">Auto-sync off</span>
        </span>
      );

    case 'never':
      return (
        <span className={`${baseClasses} text-[var(--gray-500)] ${className}`}>
          <span className="inline-block w-1.5 h-1.5 bg-[var(--gray-400)] rounded-full" />
          <span className="hidden sm:inline">Never synced</span>
        </span>
      );

    default:
      return null;
  }
}
