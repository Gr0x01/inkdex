/**
 * Type definitions for Topical Guide articles
 *
 * Topical guides are educational content (~1,500-2,500 words)
 * targeting informational search intent like "first tattoo guide"
 */

import type { ContentSection } from '../types'

/**
 * FAQ item for topical guides
 */
export interface TopicalFAQ {
  question: string
  answer: string
}

/**
 * Step-by-step section for how-to guides
 */
export interface GuideStep {
  /** Step number */
  number: number
  /** Step title */
  title: string
  /** Step description paragraphs */
  description: string[]
  /** Optional tips for this step */
  tips?: string[]
}

/**
 * Complete topical guide content structure
 * Target: ~1,500-2,500 words across all sections
 */
export interface TopicalGuideContent {
  /** Topic slug (e.g., "first-tattoo") */
  topicSlug: string
  /** Full title for the guide */
  title: string
  /** Meta description for SEO (150-160 chars) */
  metaDescription: string
  /** Publication date (ISO string) */
  publishedAt: string
  /** Last update date (ISO string) */
  updatedAt: string
  /** Category for grouping (e.g., "getting-started", "aftercare", "choosing") */
  category: 'getting-started' | 'aftercare' | 'choosing' | 'process' | 'safety'

  // ============================================================
  // Content Sections
  // ============================================================

  /**
   * Introduction - Hook and overview
   * Target: 150-200 words
   */
  introduction: ContentSection

  /**
   * Main content sections - flexible structure
   * Each section ~200-400 words
   */
  sections: ContentSection[]

  /**
   * Optional step-by-step guide
   */
  steps?: GuideStep[]

  /**
   * Key takeaways or tips
   */
  keyTakeaways?: string[]

  /**
   * FAQ section
   */
  faqs?: TopicalFAQ[]

  // ============================================================
  // SEO & Metadata
  // ============================================================

  /** SEO keywords for this guide */
  keywords: string[]
  /** Related topic slugs for internal linking */
  relatedTopics?: string[]
  /** Related style slugs for internal linking */
  relatedStyles?: string[]
}

/**
 * Simplified topical guide card for listing pages
 */
export interface TopicalGuideCard {
  topicSlug: string
  title: string
  metaDescription: string
  category: string
  publishedAt: string
}

/**
 * Category metadata for grouping
 */
export interface TopicalCategory {
  slug: string
  name: string
  description: string
}

export const TOPICAL_CATEGORIES: TopicalCategory[] = [
  {
    slug: 'getting-started',
    name: 'Getting Started',
    description: 'Everything you need to know before your first tattoo',
  },
  {
    slug: 'choosing',
    name: 'Choosing Your Tattoo',
    description: 'How to pick the right design, style, and artist',
  },
  {
    slug: 'process',
    name: 'The Process',
    description: 'What to expect during your tattoo session',
  },
  {
    slug: 'aftercare',
    name: 'Aftercare',
    description: 'How to care for your new tattoo',
  },
  {
    slug: 'safety',
    name: 'Safety & Health',
    description: 'Important health and safety considerations',
  },
]
