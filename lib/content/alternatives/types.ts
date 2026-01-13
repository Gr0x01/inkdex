/**
 * Content types for competitive comparison pages (/alternatives/*)
 * Designed for SEO traffic capture targeting searches like "tattoodo alternative"
 */

import type { FAQ } from '@/lib/content/types'

/**
 * Feature comparison row for comparison tables
 * Supports both boolean (checkmark) and string values
 */
export interface ComparisonFeature {
  /** Feature name displayed in first column */
  feature: string
  /** Inkdex value - true for checkmark, false for X, string for text */
  inkdex: string | boolean
  /** Competitor value - true for checkmark, false for X, string for text */
  competitor: string | boolean
  /** Whether to highlight this row as a key differentiator */
  highlight?: boolean
}

/**
 * Pain point from competitor platform with Inkdex solution
 * Used in "Why Artists Are Switching" section
 */
export interface PainPoint {
  /** Short title for the pain point */
  title: string
  /** Description of the problem */
  description: string
  /** Optional quote from public source */
  quote?: string
  /** Source attribution for quote */
  quoteSource?: string
  /** How Inkdex solves this problem */
  inkdexSolution: string
}

/**
 * Step in the "How It Works" section
 */
export interface HowItWorksStep {
  number: number
  title: string
  description: string
}

/**
 * Complete competitor comparison page content
 */
export interface CompetitorComparison {
  // --- Metadata ---
  /** URL slug (e.g., 'tattoodo') */
  slug: string
  /** Display name (e.g., 'Tattoodo') */
  competitorName: string
  /** ISO date string */
  publishedAt: string
  /** ISO date string */
  updatedAt: string

  // --- SEO ---
  /** Page title (without site name suffix) */
  title: string
  /** Meta description (150-160 chars) */
  metaDescription: string
  /** Target keywords for this comparison */
  keywords: string[]

  // --- Hero Section ---
  hero: {
    /** H1 headline */
    headline: string
    /** Supporting text below headline */
    subheadline: string
  }

  // --- Content Sections ---
  introduction: {
    heading: string
    paragraphs: string[]
  }

  /** "Why Artists Are Switching" section */
  painPoints: PainPoint[]

  /** Feature comparison table data */
  comparisonFeatures: ComparisonFeature[]

  /** "How It Works" steps */
  howItWorks: {
    heading: string
    steps: HowItWorksStep[]
  }

  // --- FAQs ---
  faqs: FAQ[]

  // --- Internal Linking ---
  /** Other competitor slugs for related comparisons */
  relatedComparisons?: string[]
}

/**
 * Simplified card data for index page
 */
export interface CompetitorCard {
  slug: string
  name: string
  /** One-liner about this comparison */
  tagline: string
  /** Main Inkdex advantage over this competitor */
  keyDifferentiator: string
}
