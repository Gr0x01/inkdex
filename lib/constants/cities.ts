/**
 * Supported cities for Inkdex
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
  {
    name: 'Atlanta',
    slug: 'atlanta',
    state: 'GA',
    fullName: 'Atlanta, GA',
    opportunityScore: 75, // Estimated (not from Phase 0 analysis)
    monthlySearches: 250000, // Estimated
    competition: 50, // Estimated
  },
] as const

export const STATES = [
  {
    name: 'Texas',
    code: 'TX',
    slug: 'texas',
    cities: ['austin'],
  },
  {
    name: 'California',
    code: 'CA',
    slug: 'california',
    cities: ['los-angeles'],
  },
  {
    name: 'Georgia',
    code: 'GA',
    slug: 'georgia',
    cities: ['atlanta'],
  },
] as const

export type City = typeof CITIES[number]
export type CitySlug = City['slug']
export type State = typeof STATES[number]
export type StateSlug = State['slug']
