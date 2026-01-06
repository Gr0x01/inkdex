/**
 * Centralized Pricing Configuration
 *
 * Single source of truth for all pricing-related values and feature lists.
 * Used by PricingCards, SubscriptionManager, ProShowcase, and onboarding upgrade page.
 */

export const PRICING = {
  monthly: {
    amount: 15,
    interval: 'month' as const,
  },
  yearly: {
    amount: 150,
    interval: 'year' as const,
  },
  yearlySavings: 30, // (15 * 12) - 150
} as const;

export const FREE_FEATURES = [
  '20 portfolio images',
  'Manual import from Instagram',
  'Basic profile page',
  'Verified artist badge',
  '1 location listing',
] as const;

export const PRO_FEATURES = [
  '100 portfolio images (vs 20 free)',
  'Auto-sync new Instagram posts',
  'Auto style tagging',
  'Pin up to 6 images to top',
  'Priority search placement',
  'Pro badge on profile',
  'Analytics dashboard',
  'Up to 20 location listings',
] as const;

// Type exports for consumers
export type PricingPlan = keyof typeof PRICING;
export type FreeFeature = (typeof FREE_FEATURES)[number];
export type ProFeature = (typeof PRO_FEATURES)[number];
