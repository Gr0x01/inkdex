/**
 * Editorial content types for SEO-optimized browse pages
 * Supports state, city, and style landing pages with structured content sections
 */

export interface ContentSection {
  /** Optional H2 heading for the section */
  heading?: string
  /** Array of paragraph strings for the section */
  paragraphs: string[]
}

/**
 * Editorial content for state browse pages
 * Target: ~380 words total across 4 sections
 */
export interface StateEditorialContent {
  /** State slug (e.g., 'texas', 'california') */
  stateSlug: string
  /** Hero introduction (100-120 words) */
  hero: ContentSection
  /** Cultural context and influences (120-150 words) */
  cultural: ContentSection
  /** Scene overview - cities and styles (80-100 words) */
  overview: ContentSection
  /** Finding your artist CTA (50-80 words) */
  finding: ContentSection
  /** SEO keywords for this state */
  keywords: string[]
}

/**
 * Editorial content for city browse pages
 * Target: ~440 words total across 4 sections
 */
export interface CityEditorialContent {
  /** City slug (e.g., 'austin', 'los-angeles') */
  citySlug: string
  /** State slug for context */
  stateSlug: string
  /** Hero introduction - city's tattoo personality (100-120 words) */
  hero: ContentSection
  /** Local scene deep dive - neighborhoods, influences (150-180 words) */
  scene: ContentSection
  /** Artist community context (80-100 words) */
  community: ContentSection
  /** Browsing by style section (70-80 words) */
  styles: ContentSection
  /** SEO keywords for this city */
  keywords: string[]
  /** Optional: Popular styles in this city */
  popularStyles?: string[]
}

/**
 * Editorial content for style landing pages
 * Target: ~480 words total across 4 sections
 * Note: Content is city-specific (e.g., "Traditional in Austin" vs "Traditional in NYC")
 */
export interface StyleEditorialContent {
  /** Style slug (e.g., 'traditional', 'neo-traditional') */
  styleSlug: string
  /** City slug - content is city-specific */
  citySlug: string
  /** State slug for context */
  stateSlug: string
  /** Style introduction - characteristics and appeal (120-150 words) */
  intro: ContentSection
  /** City-specific context - how style manifests locally (150-180 words) */
  cityContext: ContentSection
  /** What to expect - sessions, pain, healing, placement (100-120 words) */
  expectations: ContentSection
  /** Finding the right artist - portfolio tips (80-100 words) */
  finding: ContentSection
  /** SEO keywords for this style×city combination */
  keywords: string[]
  /** Optional: Related styles for internal linking */
  relatedStyles?: string[]
}
