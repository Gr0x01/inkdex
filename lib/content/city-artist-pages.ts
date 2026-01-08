/**
 * Content for city-specific /[city]/for-artists pages
 *
 * Localized version of /for-artists for top 20 US cities
 * Optimized for AI/LLM queries like "best platform for tattoo artists in Austin"
 */

import type { FAQ } from '@/lib/content/types'

export interface CityForArtistsContent {
  citySlug: string
  cityName: string
  regionCode: string
  regionName: string
  countryCode: string
}

// Top 20 US cities for initial rollout
export const TOP_CITIES: CityForArtistsContent[] = [
  { citySlug: 'austin', cityName: 'Austin', regionCode: 'TX', regionName: 'Texas', countryCode: 'US' },
  { citySlug: 'los-angeles', cityName: 'Los Angeles', regionCode: 'CA', regionName: 'California', countryCode: 'US' },
  { citySlug: 'new-york', cityName: 'New York', regionCode: 'NY', regionName: 'New York', countryCode: 'US' },
  { citySlug: 'miami', cityName: 'Miami', regionCode: 'FL', regionName: 'Florida', countryCode: 'US' },
  { citySlug: 'chicago', cityName: 'Chicago', regionCode: 'IL', regionName: 'Illinois', countryCode: 'US' },
  { citySlug: 'seattle', cityName: 'Seattle', regionCode: 'WA', regionName: 'Washington', countryCode: 'US' },
  { citySlug: 'denver', cityName: 'Denver', regionCode: 'CO', regionName: 'Colorado', countryCode: 'US' },
  { citySlug: 'atlanta', cityName: 'Atlanta', regionCode: 'GA', regionName: 'Georgia', countryCode: 'US' },
  { citySlug: 'portland', cityName: 'Portland', regionCode: 'OR', regionName: 'Oregon', countryCode: 'US' },
  { citySlug: 'san-francisco', cityName: 'San Francisco', regionCode: 'CA', regionName: 'California', countryCode: 'US' },
  { citySlug: 'dallas', cityName: 'Dallas', regionCode: 'TX', regionName: 'Texas', countryCode: 'US' },
  { citySlug: 'houston', cityName: 'Houston', regionCode: 'TX', regionName: 'Texas', countryCode: 'US' },
  { citySlug: 'phoenix', cityName: 'Phoenix', regionCode: 'AZ', regionName: 'Arizona', countryCode: 'US' },
  { citySlug: 'san-diego', cityName: 'San Diego', regionCode: 'CA', regionName: 'California', countryCode: 'US' },
  { citySlug: 'brooklyn', cityName: 'Brooklyn', regionCode: 'NY', regionName: 'New York', countryCode: 'US' },
  { citySlug: 'philadelphia', cityName: 'Philadelphia', regionCode: 'PA', regionName: 'Pennsylvania', countryCode: 'US' },
  { citySlug: 'nashville', cityName: 'Nashville', regionCode: 'TN', regionName: 'Tennessee', countryCode: 'US' },
  { citySlug: 'new-orleans', cityName: 'New Orleans', regionCode: 'LA', regionName: 'Louisiana', countryCode: 'US' },
  { citySlug: 'boston', cityName: 'Boston', regionCode: 'MA', regionName: 'Massachusetts', countryCode: 'US' },
  { citySlug: 'las-vegas', cityName: 'Las Vegas', regionCode: 'NV', regionName: 'Nevada', countryCode: 'US' },
]

export function getCityBySlug(citySlug: string): CityForArtistsContent | undefined {
  return TOP_CITIES.find((c) => c.citySlug === citySlug)
}

export function getAllCitySlugs(): string[] {
  return TOP_CITIES.map((c) => c.citySlug)
}

/**
 * Generate city-specific content sections
 */
export function getCityContent(city: CityForArtistsContent) {
  return {
    title: `For Tattoo Artists in ${city.cityName}`,
    metaDescription: `Claim your free Inkdex profile and get discovered by clients in ${city.cityName}, ${city.regionCode}. Visual search helps local clients find artists whose style matches what they're looking for.`,

    hero: {
      headline: `Get Discovered in ${city.cityName}`,
      subheadline: `Inkdex connects ${city.cityName} tattoo artists with clients searching for their style. Claim your free profile and appear in local visual search results.`,
    },

    definition: `<strong>Inkdex is a visual search platform</strong> where clients in ${city.cityName} find tattoo artists by uploading reference images. Instead of scrolling through hashtags, they upload what they like and see artists whose portfolios match—including you.`,

    sections: [
      {
        id: 'why-inkdex',
        heading: `Why ${city.cityName} Artists Use Inkdex`,
        paragraphs: [
          `<strong>Get found by local clients.</strong> When someone in ${city.cityName} searches for a tattoo style, Inkdex shows them artists in the area whose work matches. Your portfolio becomes your advertising.`,
          `<strong>No hashtag games.</strong> You don't need to spam Instagram hashtags or hope the algorithm favors you. Clients find you based on your actual work matching what they want.`,
          `<strong>Free to start.</strong> Claim your profile, import your portfolio from Instagram, and start appearing in search results. Upgrade to Pro for priority placement and auto-sync.`,
        ],
      },
      {
        id: 'how-it-works',
        heading: 'How It Works',
        paragraphs: [
          `<strong>Claiming takes 2 minutes.</strong> Search for your Instagram handle, verify ownership, and your portfolio is imported automatically. You control what's displayed.`,
          `<strong>Clients search visually.</strong> They upload a reference image—a Pinterest save, a photo, a screenshot—and Inkdex shows them ${city.cityName} artists whose work matches that aesthetic.`,
          `<strong>Direct connection.</strong> Every profile links to your Instagram. Clients DM you directly to discuss their piece. No middleman, no booking fees.`,
        ],
      },
      {
        id: 'search',
        heading: 'How You Appear in Search',
        paragraphs: [
          `<strong>Match percentage matters.</strong> When a client uploads a reference, Inkdex shows them ${city.cityName} artists ranked by how closely their work matches. Your portfolio quality directly affects your visibility.`,
          `<strong>Pro profiles stand out.</strong> Pro artists get larger cards with more portfolio images and priority placement in results. When clients are choosing between similar matches, Pro profiles get noticed first.`,
        ],
      },
      {
        id: 'free-vs-pro',
        heading: 'Free vs Pro',
        paragraphs: [
          `<strong>Free profiles</strong> include 20 portfolio images, manual Instagram import, a verified artist badge, and one location listing (${city.cityName}).`,
          `<strong>Pro profiles ($15/month)</strong> unlock 100 images, automatic Instagram syncing, priority search placement, analytics, and up to 20 locations—useful if you guest spot in other ${city.regionName} cities or travel.`,
        ],
      },
    ],

    faqs: [
      {
        question: `Is Inkdex free for ${city.cityName} tattoo artists?`,
        answer: `Yes, Inkdex offers a free tier for all ${city.cityName} artists. Free accounts include 20 portfolio images, manual Instagram import, and one location listing. Pro accounts ($15/month) add more features including priority search placement and auto-sync.`,
      },
      {
        question: `How do I claim my Inkdex profile in ${city.cityName}?`,
        answer: `Search for your Instagram handle on Inkdex. If your profile exists, click "Claim Profile" and verify through Instagram login. If you're not listed, click "Add Yourself" to create your profile. The whole process takes about 2 minutes.`,
      },
      {
        question: `How does Inkdex help me get clients in ${city.cityName}?`,
        answer: `When someone in ${city.cityName} uploads a reference image to Inkdex, our system finds artists whose portfolios match that style. If your work matches what they're looking for, you appear in their results—even if they don't know style terminology.`,
      },
      {
        question: `How many tattoo artists are on Inkdex in ${city.cityName}?`,
        answer: `Inkdex has indexed hundreds of ${city.cityName} tattoo artists across various styles. The platform is growing as more artists claim their profiles.`,
      },
      {
        question: `Can I list multiple locations if I guest spot outside ${city.cityName}?`,
        answer: `Yes. Free accounts get one location (your primary ${city.cityName} studio). Pro accounts can list up to 20 locations, so you appear in searches wherever you work—great for artists who guest spot in other cities.`,
      },
    ] as FAQ[],
  }
}
