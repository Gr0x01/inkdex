interface StatsStripProps {
  artistCount: number
  cityCount: number
  imageCount: number
  variant?: 'light' | 'dark'
  className?: string
}

/**
 * Reusable stats strip showing platform metrics
 * Used on homepage, for-artists, how-it-works, and city pages
 */
export default function StatsStrip({
  artistCount,
  cityCount,
  imageCount,
  variant = 'light',
  className = '',
}: StatsStripProps) {
  const textColor = variant === 'dark' ? 'text-white/60' : 'text-text-tertiary'

  return (
    <div
      className={`flex flex-wrap gap-6 text-sm font-mono uppercase tracking-wider ${textColor} ${className}`}
    >
      <span>{artistCount.toLocaleString()}+ Artists</span>
      <span className="hidden sm:inline">•</span>
      <span>{cityCount} Cities</span>
      <span className="hidden sm:inline">•</span>
      <span>{imageCount.toLocaleString()}+ Portfolio Images</span>
    </div>
  )
}
