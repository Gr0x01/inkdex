import { memo } from 'react'
import Link from 'next/link'
import type { CityGuideCard } from '@/lib/content/editorial/guides-types'

interface GuideCardProps {
  guide: CityGuideCard
}

/**
 * Card component for displaying a city guide in the index listing
 */
const GuideCard = memo(function GuideCard({ guide }: GuideCardProps) {
  return (
    <Link
      href={`/guides/${guide.citySlug}`}
      className="group block p-6 bg-bg-secondary border-2 border-border-subtle hover:border-ink-black hover:-translate-y-1 hover:shadow-md transition-all duration-200"
    >
      <h3 className="font-display text-xl font-semibold text-text-primary mb-2 group-hover:text-ink-black transition-colors">
        {guide.title.replace(': A Complete Guide', '')}
      </h3>
      <p className="font-body text-sm text-text-secondary line-clamp-2 mb-4">
        {guide.metaDescription}
      </p>
      {guide.artistCount && (
        <span className="font-mono text-xs uppercase tracking-wider text-text-tertiary">
          {guide.artistCount.toLocaleString()} artists
        </span>
      )}
    </Link>
  )
})

export default GuideCard
