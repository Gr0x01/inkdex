import { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'
import { STATES, CITIES } from '@/lib/constants/cities'
import { styleSeedsData } from '@/scripts/style-seeds/style-seeds-data'
import { getAllCitiesWithMinArtists } from '@/lib/supabase/queries'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://inkdex.io'
  const supabase = await createClient()

  // Fetch all artist slugs
  const { data: artists } = await supabase
    .from('artists')
    .select('slug, updated_at')

  const artistUrls: MetadataRoute.Sitemap =
    artists?.map((artist) => ({
      url: `${baseUrl}/artist/${artist.slug}`,
      lastModified: artist.updated_at
        ? new Date(artist.updated_at)
        : new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.8,
    })) ?? []

  // State pages
  const stateUrls: MetadataRoute.Sitemap = STATES.map((state) => ({
    url: `${baseUrl}/${state.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  // Fetch all cities with 3+ artists for dynamic sitemap generation
  const allCities = await getAllCitiesWithMinArtists(3)
  const featuredCitySlugs: Set<string> = new Set(CITIES.map(c => c.slug as string))

  // Fallback to featured cities if database query fails
  const citiesToUse = (allCities && allCities.length > 0)
    ? allCities
    : CITIES.map(c => ({
        city: c.slug,
        region: c.state,
        country_code: 'US',
        artist_count: 0
      }))

  // City pages - with priority tiers (featured vs auto-generated)
  const cityUrls: MetadataRoute.Sitemap = citiesToUse.map((cityData: any) => {
    const state = STATES.find((s) => s.code === cityData.region)
    if (!state) return null

    const citySlug = (cityData.city as string).toLowerCase().replace(/\s+/g, '-')
    const isFeatured = featuredCitySlugs.has(citySlug)

    return {
      url: `${baseUrl}/${state.slug}/${citySlug}`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: isFeatured ? 0.9 : 0.7, // Featured cities get higher priority
    }
  }).filter(Boolean) as MetadataRoute.Sitemap

  // Style landing pages (SEO-critical: [city] × [style] combinations)
  const styleUrls: MetadataRoute.Sitemap = []

  for (const cityData of citiesToUse) {
    const state = STATES.find((s) => s.code === cityData.region)
    if (!state) continue

    const citySlug = (cityData.city as string).toLowerCase().replace(/\s+/g, '-')
    const isFeatured = featuredCitySlugs.has(citySlug)

    for (const style of styleSeedsData) {
      styleUrls.push({
        url: `${baseUrl}/${state.slug}/${citySlug}/${style.styleName}`,
        lastModified: new Date(),
        changeFrequency: 'daily' as const,
        priority: isFeatured ? 0.85 : 0.65, // Featured cities get higher priority
      })
    }
  }

  // Legal and informational pages
  const legalUrls: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/add-artist`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/legal/terms`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    },
    {
      url: `${baseUrl}/legal/privacy`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    },
  ]

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    ...legalUrls,
    ...stateUrls,
    ...cityUrls,
    ...styleUrls,
    ...artistUrls,
  ]
}
