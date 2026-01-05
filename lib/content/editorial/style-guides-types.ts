/**
 * Type definitions for Style Guide articles
 *
 * Style guides are long-form editorial content (~1,500-2,000 words)
 * targeting informational search intent like "what is traditional tattoo"
 */

import type { ContentSection } from '../types'

/**
 * Variation section for style guides
 * Describes sub-styles or regional variations
 */
export interface StyleVariation {
  /** Variation name (e.g., "American Traditional") */
  name: string
  /** URL-friendly slug */
  slug: string
  /** 1-2 descriptive paragraphs */
  description: string[]
  /** Characteristics (e.g., "bold outlines", "limited palette") */
  characteristics: string[]
}

/**
 * Complete style guide content structure
 * Target: ~1,500-2,000 words across all sections
 */
export interface StyleGuideContent {
  /** Style slug (e.g., "traditional") */
  styleSlug: string
  /** Display name (e.g., "Traditional") */
  displayName: string
  /** Full title for the guide */
  title: string
  /** Meta description for SEO (150-160 chars) */
  metaDescription: string
  /** Publication date (ISO string) */
  publishedAt: string
  /** Last update date (ISO string) */
  updatedAt: string

  // ============================================================
  // Content Sections (~1,500-2,000 words total)
  // ============================================================

  /**
   * Introduction - What defines this style
   * Target: 150-200 words
   */
  introduction: ContentSection

  /**
   * History - Origins and evolution of the style
   * Target: 200-300 words
   */
  history: ContentSection

  /**
   * Characteristics - Visual elements and techniques
   * Target: 200-300 words
   */
  characteristics: ContentSection

  /**
   * Variations - Sub-styles or regional variations
   * Target: 300-400 words total
   */
  variations: StyleVariation[]

  /**
   * What to expect - Pain, healing, sessions, placement
   * Target: 200-300 words
   */
  expectations: ContentSection

  /**
   * Finding an artist - Portfolio tips, questions to ask
   * Target: 150-200 words
   */
  findingArtist: ContentSection

  // ============================================================
  // SEO & Metadata
  // ============================================================

  /** SEO keywords for this guide */
  keywords: string[]
  /** Related style slugs for internal linking */
  relatedStyles?: string[]
  /** Example image URL (from style seeds) */
  exampleImageUrl?: string
}

/**
 * Simplified style guide card for listing pages
 */
export interface StyleGuideCard {
  styleSlug: string
  displayName: string
  title: string
  metaDescription: string
  publishedAt: string
  exampleImageUrl?: string
}
