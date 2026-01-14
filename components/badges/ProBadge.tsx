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
    sm: 'w-3 h-3', // 12px (0.75rem)
    md: 'w-4 h-4',       // 16px (1rem) - dashboard and overlays
    lg: 'w-6 h-6',   // 24px (1.5rem) - large headers
  }

  const textSizeMap = {
    sm: 'text-[0.5rem]',   // 8px (0.5rem)
    md: 'text-[0.75rem]',  // 12px (0.75rem)
    lg: 'text-[1rem]',     // 16px (1rem)
  }

  // Icon only variant - inline next to handles/names
  if (variant === 'icon-only') {
    return (
      <Crown
        className={`${sizeMap[size]} text-purple-500 shrink-0 ${className}`}
        aria-label="Pro artist"
      />
    )
  }

  // Badge variant - overlay on images/cards
  if (variant === 'badge') {
    return (
      <div className={`px-2.5 py-1.5 bg-purple-500 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 ${className}`}>
        <Crown
          className={`${sizeMap[size]} text-white`}
          aria-hidden="true"
        />
        <span className={`font-mono ${textSizeMap[size]} font-bold text-white uppercase tracking-wider leading-none`}>
          Pro
        </span>
      </div>
    )
  }

  // Inline variant - subtle background for headers/sections
  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-500/10 border border-purple-500 whitespace-nowrap shrink-0 ${className}`}>
      <Crown
        className={`${sizeMap[size]} text-purple-500`}
        aria-hidden="true"
      />
      <span className={`font-mono ${textSizeMap[size]} font-semibold text-purple-400 uppercase tracking-wider leading-none`}>
        Pro
      </span>
    </div>
  )
}
