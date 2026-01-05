import { memo } from 'react'
import type { NeighborhoodSection as NeighborhoodType } from '@/lib/content/editorial/guides-types'

interface NeighborhoodSectionProps {
  neighborhood: NeighborhoodType
}

/**
 * Renders a single neighborhood section in a city guide
 * Includes name, description paragraphs, and characteristic tags
 */
const NeighborhoodSection = memo(function NeighborhoodSection({
  neighborhood,
}: NeighborhoodSectionProps) {
  return (
    <div
      id={neighborhood.slug}
      className="scroll-mt-24 pb-8 border-b border-border-subtle last:border-0 last:pb-0"
    >
      <h3 className="font-display text-xl font-semibold text-text-primary mb-4">
        {neighborhood.name}
      </h3>

      <div className="space-y-3 mb-4">
        {neighborhood.description.map((paragraph, index) => (
          <p
            key={index}
            className="font-body text-text-secondary leading-relaxed"
          >
            {paragraph}
          </p>
        ))}
      </div>

      {neighborhood.characteristics.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {neighborhood.characteristics.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center px-3 py-1 text-xs font-medium text-text-tertiary bg-bg-secondary rounded-full border border-border-subtle"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  )
})

export default NeighborhoodSection
