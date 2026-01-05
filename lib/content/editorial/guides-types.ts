/**
 * Type definitions for City Guide articles
 *
 * City guides are long-form editorial content (~1,500-2,000 words)
 * targeting informational search intent like "tattoo culture in Austin"
 */

import type { ContentSection } from '../types'

/**
 * Neighborhood section for city guides
 * Describes tattoo culture and characteristics of specific city areas
 */
export interface NeighborhoodSection {
  /** Neighborhood name (e.g., "South Congress (SoCo)") */
  name: string
  /** URL-friendly slug */
  slug: string
  /** 2-3 descriptive paragraphs */
  description: string[]
  /** Characteristics tags (e.g., "vintage-inspired", "walk-in friendly") */
  characteristics: string[]
}

/**
 * Complete city guide content structure
 * Target: ~1,500-2,000 words across all sections
 */
export interface CityGuideContent {
  /** City slug (e.g., "austin") */
  citySlug: string
  /** State slug (e.g., "texas") */
  stateSlug: string
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
   * Introduction - What makes this city's tattoo scene unique
   * Target: 150-200 words
   */
  introduction: ContentSection

  /**
   * Neighborhood guide - 3-5 key areas with characteristics
   * Target: 400-600 words total
   */
  neighborhoods: NeighborhoodSection[]

  /**
   * Local culture - How music/art/demographics shape tattooing
   * Target: 200-300 words
   */
  localCulture: ContentSection

  /**
   * Style guide - What styles thrive here and why
   * Target: 200-300 words
   */
  styleGuide: ContentSection

  /**
   * Practical advice - Pricing ranges, booking tips, etiquette
   * Target: 200-300 words
   */
  practicalAdvice: ContentSection

  // ============================================================
  // SEO & Metadata
  // ============================================================

  /** SEO keywords for this guide */
  keywords: string[]
  /** Related style slugs for internal linking */
  relatedStyles?: string[]
}

/**
 * Simplified guide card for listing pages
 */
export interface CityGuideCard {
  citySlug: string
  stateSlug: string
  title: string
  metaDescription: string
  publishedAt: string
  /** Featured image URL (optional) */
  imageUrl?: string
  /** Number of artists in this city */
  artistCount?: number
}

/**
 * Region grouping for the guides index page
 */
export interface GuideRegionGroup {
  region: string
  states: Array<{
    stateSlug: string
    stateName: string
    cities: CityGuideCard[]
  }>
}
