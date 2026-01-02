import { memo } from 'react'
import type { ContentSection } from '@/lib/content/types'
import EditorialContent from '@/components/editorial/EditorialContent'

interface LegalPageLayoutProps {
  /** Page title (e.g., "Terms of Service", "Privacy Policy") */
  title: string
  /** Optional description shown below title */
  description?: string
  /** Last updated date (e.g., "January 3, 2026") */
  lastUpdated: string
  /** Content sections to render */
  sections: ContentSection[]
}

/**
 * Legal page layout component
 * Provides consistent styling for Terms, Privacy, About, and Contact pages
 * Narrower max-width (max-w-3xl) for improved readability of legal text
 */
const LegalPageLayout = memo(function LegalPageLayout({
  title,
  description,
  lastUpdated,
  sections,
}: LegalPageLayoutProps) {
  return (
    <div className="min-h-screen bg-paper-white">
      {/* Page header */}
      <div className="max-w-3xl mx-auto px-4 pt-12 md:pt-24 pb-8">
        <h1 className="font-display text-h1 font-[900] text-text-primary mb-4">
          {title}
        </h1>

        {description && (
          <p className="font-body text-lg text-text-secondary mb-6">
            {description}
          </p>
        )}

        <div className="font-mono text-xs text-text-tertiary tracking-wide">
          Last Updated: {lastUpdated}
        </div>
      </div>

      {/* Content sections */}
      <div className="max-w-3xl mx-auto px-4 pb-12 md:pb-24">
        <EditorialContent sections={sections} />
      </div>
    </div>
  )
})

export default LegalPageLayout
