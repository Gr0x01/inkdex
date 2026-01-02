import { Crown } from 'lucide-react'

interface ProBadgeProps {
  size?: 'sm' | 'md' | 'lg'
  variant?: 'icon-only' | 'badge' | 'inline'
  className?: string
}

/**
 * Pro Badge Component
 *
 * Displays a crown icon to indicate pro tier status
 * Used across: profiles, search results, dashboard, portfolio manager
 *
 * Variants:
 * - icon-only: Just the crown icon (for profile handles)
 * - badge: Crown + "Pro" text with solid background (for card overlays)
 * - inline: Crown + "Pro" text with subtle background (for headers)
 */
export function ProBadge({
  size = 'sm',
  variant = 'icon-only',
  className = ''
}: ProBadgeProps) {
  const sizeMap = {
    sm: 'w-3.5 h-3.5',  // 14px - matches verification badge size
    md: 'w-4 h-4',      // 16px - dashboard and overlays
    lg: 'w-5 h-5',      // 20px - large headers
  }

  // Icon only variant - inline next to handles/names
  if (variant === 'icon-only') {
    return (
      <Crown
        className={`${sizeMap[size]} text-amber-500 flex-shrink-0 ${className}`}
        aria-label="Pro artist"
      />
    )
  }

  // Badge variant - overlay on images/cards
  if (variant === 'badge') {
    return (
      <div className={`px-2.5 py-1.5 bg-amber-500 rounded flex items-center gap-1.5 ${className}`}>
        <Crown
          className={`${sizeMap[size]} text-black`}
          aria-hidden="true"
        />
        <span className="font-mono text-xs font-bold text-black uppercase tracking-wider leading-none">
          Pro
        </span>
      </div>
    )
  }

  // Inline variant - subtle background for headers/sections
  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 border border-amber-600 rounded-md ${className}`}>
      <Crown
        className={`${sizeMap[size]} text-amber-500`}
        aria-hidden="true"
      />
      <span className="font-mono text-xs font-semibold text-amber-400 uppercase tracking-wider leading-none">
        Pro
      </span>
    </div>
  )
}
