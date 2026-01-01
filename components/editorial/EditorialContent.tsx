import { memo } from 'react'
import type { ContentSection } from '@/lib/content/types'

interface EditorialContentProps {
  sections: ContentSection[]
  className?: string
}

/**
 * Editorial content renderer for SEO-optimized browse pages
 * Renders structured content sections with semantic HTML and "INK & ETHER" design system styling
 */
const EditorialContent = memo(function EditorialContent({
  sections,
  className = '',
}: EditorialContentProps) {
  return (
    <article
      className={`editorial-content space-y-8 ${className}`}
      aria-label="Editorial content about tattoo artists in this area"
    >
      {sections.map((section, sectionIdx) => (
        <section key={section.heading || `section-${sectionIdx}`} className="space-y-4">
          {section.heading && (
            <h3 className="font-display text-h3 font-[700] text-text-primary">
              {section.heading}
            </h3>
          )}
          <div className="space-y-4">
            {section.paragraphs.map((paragraph, paraIdx) => (
              <p
                key={`para-${sectionIdx}-${paraIdx}`}
                className="font-body text-body text-text-secondary"
              >
                {paragraph}
              </p>
            ))}
          </div>
        </section>
      ))}
    </article>
  )
})

export default EditorialContent
