import { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'
import { STATES, CITIES } from '@/lib/constants/cities'
import { styleSeedsData } from '@/scripts/style-seeds/style-seeds-data'

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

  // City pages
  const cityUrls: MetadataRoute.Sitemap = CITIES.map((city) => {
    const state = STATES.find((s) => s.code === city.state)
    return {
      url: `${baseUrl}/${state?.slug}/${city.slug}`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.9,
    }
  })

  // Style landing pages (SEO-critical: [city] × [style] combinations)
  // Use static style data for build-time generation
  const styleUrls: MetadataRoute.Sitemap = []

  for (const city of CITIES) {
    const state = STATES.find((s) => s.code === city.state)
    if (!state) continue

    for (const style of styleSeedsData) {
      styleUrls.push({
        url: `${baseUrl}/${state.slug}/${city.slug}/${style.styleName}`,
        lastModified: new Date(),
        changeFrequency: 'daily' as const,
        priority: 0.9, // Same priority as city pages (high SEO value)
      })
    }
  }

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    ...stateUrls,
    ...cityUrls,
    ...styleUrls,
    ...artistUrls,
  ]
}
