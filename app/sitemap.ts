/* eslint-disable @typescript-eslint/no-explicit-any -- Supabase response types vary */
import { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'
import { STATES, CITIES, INDIA_STATES, PAKISTAN_PROVINCES } from '@/lib/constants/cities'
import { styleSeedsData } from '@/scripts/style-seeds/style-seeds-data'
import { getAllCitiesWithMinArtists } from '@/lib/supabase/queries'
import { getAllCityGuides } from '@/lib/content/editorial/guides'
import { getAllStyleGuides } from '@/lib/content/editorial/style-guides'
import { getAllTopicalGuides } from '@/lib/content/editorial/topical-guides'
import { getAllCompetitorSlugs } from '@/lib/content/alternatives'

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

  // State pages - URL format: /us/{state-code} (e.g., /us/tx)
  const stateUrls: MetadataRoute.Sitemap = STATES.map((state) => ({
    url: `${baseUrl}/us/${state.code.toLowerCase()}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  // India state pages - URL format: /in/{state-code} (e.g., /in/mh)
  const indiaStateUrls: MetadataRoute.Sitemap = INDIA_STATES.map((state) => ({
    url: `${baseUrl}/in/${state.code.toLowerCase()}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  // Pakistan province pages - URL format: /pk/{province-code} (e.g., /pk/sd)
  const pakistanProvinceUrls: MetadataRoute.Sitemap = PAKISTAN_PROVINCES.map((province) => ({
    url: `${baseUrl}/pk/${province.code.toLowerCase()}`,
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

  // City pages - URL format: /{country}/{region-code}/{city-slug} (e.g., /us/tx/austin, /in/mh/mumbai)
  const cityUrls: MetadataRoute.Sitemap = citiesToUse.map((cityData: any) => {
    const countryCode = (cityData.country_code || 'US').toLowerCase()
    const regionCode = (cityData.region as string).toLowerCase()
    const citySlug = (cityData.city as string).toLowerCase().replace(/\s+/g, '-')
    const isFeatured = featuredCitySlugs.has(citySlug)

    return {
      url: `${baseUrl}/${countryCode}/${regionCode}/${citySlug}`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: isFeatured ? 0.9 : 0.7, // Featured cities get higher priority
    }
  }).filter(Boolean) as MetadataRoute.Sitemap

  // Style landing pages - URL format: /{country}/{region-code}/{city-slug}/{style} (e.g., /us/tx/austin/blackwork, /in/mh/mumbai/blackwork)
  const styleUrls: MetadataRoute.Sitemap = []

  for (const cityData of citiesToUse) {
    const countryCode = (cityData.country_code || 'US').toLowerCase()
    const regionCode = (cityData.region as string).toLowerCase()
    const citySlug = (cityData.city as string).toLowerCase().replace(/\s+/g, '-')
    const isFeatured = featuredCitySlugs.has(citySlug)

    for (const style of styleSeedsData) {
      styleUrls.push({
        url: `${baseUrl}/${countryCode}/${regionCode}/${citySlug}/${style.styleName}`,
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

  // Marketing and info pages (high SEO value)
  const marketingUrls: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/styles`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/for-artists`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/how-it-works`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/first-tattoo`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/how-to-find-tattoo-artist`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/pricing`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    },
  ]

  // City guide pages (long-form editorial content)
  const cityGuides = getAllCityGuides()
  const guideUrls: MetadataRoute.Sitemap = [
    // Guides index page
    {
      url: `${baseUrl}/guides`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    },
    // Individual city guide pages
    ...cityGuides.map((guide) => ({
      url: `${baseUrl}/guides/${guide.citySlug}`,
      lastModified: guide.updatedAt ? new Date(guide.updatedAt) : new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ]

  // Style guide pages (long-form editorial about tattoo styles)
  const styleGuides = getAllStyleGuides()
  const styleGuideUrls: MetadataRoute.Sitemap = [
    // Style guides index page
    {
      url: `${baseUrl}/guides/styles`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    },
    // Individual style guide pages
    ...styleGuides.map((guide) => ({
      url: `${baseUrl}/guides/styles/${guide.styleSlug}`,
      lastModified: guide.updatedAt ? new Date(guide.updatedAt) : new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ]

  // Topical/learn guide pages (first tattoo tips, aftercare, etc.)
  const topicalGuides = getAllTopicalGuides()
  const learnGuideUrls: MetadataRoute.Sitemap = [
    // Learn guides index page
    {
      url: `${baseUrl}/guides/learn`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    },
    // Individual learn/topical guide pages
    ...topicalGuides.map((guide) => ({
      url: `${baseUrl}/guides/learn/${guide.topicSlug}`,
      lastModified: guide.updatedAt ? new Date(guide.updatedAt) : new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ]

  // Competitor comparison pages (SEO landing pages)
  const competitorSlugs = getAllCompetitorSlugs()
  const alternativesUrls: MetadataRoute.Sitemap = [
    // Alternatives index page
    {
      url: `${baseUrl}/alternatives`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    },
    // Individual competitor comparison pages
    ...competitorSlugs.map((slug) => ({
      url: `${baseUrl}/alternatives/${slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ]

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    ...marketingUrls,
    ...legalUrls,
    ...guideUrls,
    ...styleGuideUrls,
    ...learnGuideUrls,
    ...alternativesUrls,
    ...stateUrls,
    ...indiaStateUrls,
    ...pakistanProvinceUrls,
    ...cityUrls,
    ...styleUrls,
    ...artistUrls,
  ]
}
