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
    opportunityScore: 75,
    monthlySearches: 250000,
    competition: 50,
  },
  {
    name: 'Chicago',
    slug: 'chicago',
    state: 'IL',
    fullName: 'Chicago, IL',
    opportunityScore: 81,
    monthlySearches: 269350,
    competition: 42,
  },
  {
    name: 'New York',
    slug: 'new-york',
    state: 'NY',
    fullName: 'New York, NY',
    opportunityScore: 80,
    monthlySearches: 266530,
    competition: 42,
  },
  {
    name: 'Seattle',
    slug: 'seattle',
    state: 'WA',
    fullName: 'Seattle, WA',
    opportunityScore: 78,
    monthlySearches: 258260,
    competition: 48,
  },
  {
    name: 'Portland',
    slug: 'portland',
    state: 'OR',
    fullName: 'Portland, OR',
    opportunityScore: 77,
    monthlySearches: 258530,
    competition: 54,
  },
  {
    name: 'Miami',
    slug: 'miami',
    state: 'FL',
    fullName: 'Miami, FL',
    opportunityScore: 76,
    monthlySearches: 254910,
    competition: 54,
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
  {
    name: 'Illinois',
    code: 'IL',
    slug: 'illinois',
    cities: ['chicago'],
  },
  {
    name: 'New York',
    code: 'NY',
    slug: 'new-york',
    cities: ['new-york'],
  },
  {
    name: 'Washington',
    code: 'WA',
    slug: 'washington',
    cities: ['seattle'],
  },
  {
    name: 'Oregon',
    code: 'OR',
    slug: 'oregon',
    cities: ['portland'],
  },
  {
    name: 'Florida',
    code: 'FL',
    slug: 'florida',
    cities: ['miami'],
  },
] as const

export type City = typeof CITIES[number]
export type CitySlug = City['slug']
export type State = typeof STATES[number]
export type StateSlug = State['slug']
