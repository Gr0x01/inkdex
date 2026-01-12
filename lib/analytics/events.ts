/**
 * PostHog Event Definitions
 *
 * Centralized event names and property types for type-safe analytics tracking.
 * All event tracking should use these constants and types.
 */

// Event name constants
export const EVENTS = {
  // Search funnel
  SEARCH_STARTED: 'Search Started',
  SEARCH_COMPLETED: 'Search Completed',
  SEARCH_RESULT_CLICKED: 'Search Result Clicked',

  // Activation
  FIRST_SEARCH: 'First Search',
  FIRST_PROFILE_VIEW: 'First Profile View',

  // Artist profile
  PROFILE_VIEWED: 'Profile Viewed',
  INSTAGRAM_CLICKED: 'Instagram Click',
  BOOKING_CLICKED: 'Booking Click',
  IMAGE_VIEWED: 'Image View',

  // Claiming funnel
  CLAIM_STARTED: 'Claim Started',
  CLAIM_OAUTH_STARTED: 'Claim OAuth Started',
  CLAIM_COMPLETED: 'Artist Claimed',
  CLAIM_FAILED: 'Claim Failed',

  // Monetization funnel
  PRICING_VIEWED: 'Pricing Page Viewed',
  CHECKOUT_STARTED: 'Checkout Started',
  CHECKOUT_COMPLETED: 'Checkout Completed',
  SUBSCRIPTION_CANCELLED: 'Subscription Cancelled',
} as const

export type EventName = (typeof EVENTS)[keyof typeof EVENTS]

// Search types
export type SearchType = 'image' | 'text' | 'instagram_post' | 'instagram_profile' | 'similar_artist'

// Event property types
export interface SearchStartedProperties {
  search_type: SearchType
  query_preview?: string // First 50 chars of text query
  city_filter?: string
  style_filter?: string
}

export interface SearchCompletedProperties {
  search_type: SearchType
  query_length?: number
  result_count: number
  city_filter?: string
  style_filter?: string
  is_first_search: boolean
  time_to_search_ms?: number
  search_id?: string
}

export interface SearchResultClickedProperties {
  artist_id: string
  artist_slug: string
  result_position: number
  search_id?: string
  search_type?: SearchType
}

export interface FirstSearchProperties {
  search_type: SearchType
  referrer?: string
  landing_page?: string
}

export interface ProfileViewedProperties {
  artist_id: string
  artist_slug: string
  source?: 'search' | 'browse' | 'direct' | 'similar'
  is_first_profile_view?: boolean
}

export interface ClaimStartedProperties {
  artist_id: string
  artist_slug: string
  source_page: string
}

export interface ClaimCompletedProperties {
  artist_id: string
  artist_slug?: string
  follower_count?: number
  value?: number
  currency?: string
}

export interface ClaimFailedProperties {
  artist_id: string
  error_type: 'oauth_denied' | 'handle_mismatch' | 'already_claimed' | 'api_error' | 'unknown'
  error_message?: string
}

export interface PricingViewedProperties {
  source?: string
  current_tier?: 'free' | 'pro'
  referrer?: string
}

export interface CheckoutStartedProperties {
  plan_type: 'monthly' | 'yearly'
  price: number
  promo_code?: string
  artist_id?: string
}

export interface CheckoutCompletedProperties {
  plan_type: 'monthly' | 'yearly'
  price: number
  promo_code?: string
  artist_id?: string
  stripe_customer_id?: string
}

export interface SubscriptionCancelledProperties {
  plan_type: 'monthly' | 'yearly'
  tenure_days: number
  artist_id?: string
  cancellation_reason?: string
}

// User properties (set via identify or $set)
export interface UserProperties {
  subscription_tier?: 'free' | 'pro'
  search_count?: number
  profile_views_count?: number
  is_artist?: boolean
  artist_id?: string
  artist_city?: string
  artist_state?: string
}

// User properties set only once
export interface UserPropertiesSetOnce {
  first_search_at?: string
  first_profile_view_at?: string
  first_visit_at?: string
  acquisition_source?: 'organic' | 'social' | 'direct' | 'unknown'
}
