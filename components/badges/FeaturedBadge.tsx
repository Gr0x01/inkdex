import { Star } from 'lucide-react'

interface FeaturedBadgeProps {
  size?: 'sm' | 'md' | 'lg'
  variant?: 'icon-only' | 'badge' | 'inline'
  className?: string
}

/**
 * Featured Badge Component
 *
 * Displays a star icon to indicate featured artist status
 * Uses editorial accent color (warm gold/ochre) to complement Pro badge
 *
 * Variants:
 * - icon-only: Just the star icon (for profile handles)
 * - badge: Star + "Featured" text with solid background (for card overlays)
 * - inline: Star + "Featured" text with subtle background (for headers)
 */
export function FeaturedBadge({
  size = 'sm',
  variant = 'icon-only',
  className = ''
}: FeaturedBadgeProps) {
  const sizeMap = {
    sm: 'w-3.5 h-3.5',  // 14px - matches verification badge size
    md: 'w-4 h-4',      // 16px - dashboard and overlays
    lg: 'w-5 h-5',      // 20px - large headers
  }

  // Icon only variant - inline next to handles/names
  if (variant === 'icon-only') {
    return (
      <Star
        className={`${sizeMap[size]} text-accent shrink-0 fill-accent ${className}`}
        aria-label="Featured artist"
      />
    )
  }

  // Badge variant - overlay on images/cards (editorial style)
  if (variant === 'badge') {
    return (
      <div className={`px-2.5 py-1.5 bg-accent/90 backdrop-blur-sm border border-accent-bright/30 ${className}`}>
        <span className="font-mono text-xs font-bold text-paper tracking-[0.15em] uppercase">
          Featured
        </span>
      </div>
    )
  }

  // Inline variant - subtle background for headers/sections
  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 bg-accent/10 border border-accent/30 ${className}`}>
      <Star
        className={`${sizeMap[size]} text-accent fill-accent`}
        aria-hidden="true"
      />
      <span className="font-mono text-xs font-semibold text-accent uppercase tracking-wider leading-none">
        Featured
      </span>
    </div>
  )
}
