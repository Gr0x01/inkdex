/**
 * Supported cities for tattoo artist discovery
 * Based on Phase 0 market analysis (Dec 29, 2025)
 */

export const CITIES = [
  {
    name: 'Austin',
    slug: 'austin',
    state: 'TX',
    fullName: 'Austin, TX',
    opportunityScore: 78,
    monthlySearches: 262100,
    competition: 46,
  },
  {
    name: 'Los Angeles',
    slug: 'los-angeles',
    state: 'CA',
    fullName: 'Los Angeles, CA',
    opportunityScore: 77,
    monthlySearches: 261920,
    competition: 52,
  },
] as const

export type City = typeof CITIES[number]
export type CitySlug = City['slug']
