import { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'
import { STATES, CITIES } from '@/lib/constants/cities'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://yourdomain.com'
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

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    ...stateUrls,
    ...cityUrls,
    ...artistUrls,
  ]
}
