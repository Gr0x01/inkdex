/**
 * Content registry for competitive comparison pages
 *
 * To add a new competitor:
 * 1. Create content file (e.g., instagram.ts)
 * 2. Import and add to COMPETITOR_CONTENT array
 * 3. Dynamic route handles the rest
 */

import type { CompetitorComparison, CompetitorCard } from './types'
import { tattoodoContent } from './tattoodo'

// Register all competitor content here
const COMPETITOR_CONTENT: CompetitorComparison[] = [
  tattoodoContent,
  // Future additions:
  // instagramContent,
  // bookingAppsContent,
]

/**
 * Get all competitors as simplified cards for index page
 */
export function getAllCompetitors(): CompetitorCard[] {
  return COMPETITOR_CONTENT.map((c) => ({
    slug: c.slug,
    name: c.competitorName,
    tagline: c.hero.subheadline,
    keyDifferentiator: c.painPoints[0]?.inkdexSolution || '',
  }))
}

/**
 * Get full competitor content by slug
 */
export function getCompetitorBySlug(
  slug: string
): CompetitorComparison | null {
  return COMPETITOR_CONTENT.find((c) => c.slug === slug) || null
}

/**
 * Get all competitor slugs for static generation
 */
export function getAllCompetitorSlugs(): string[] {
  return COMPETITOR_CONTENT.map((c) => c.slug)
}

// Re-export types for convenience
export type { CompetitorComparison, CompetitorCard, ComparisonFeature, PainPoint } from './types'
