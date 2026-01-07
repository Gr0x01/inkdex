import { ImageResponse } from 'next/og'
import { loadAllFonts } from '@/lib/og/fonts'
import { size, styles, getFontConfig } from '@/lib/og/styles'
import { validateCityParams } from '@/lib/og/validation'
import { slugToName } from '@/lib/utils/location'
import { createServiceClient } from '@/lib/supabase/service'

export const runtime = 'edge'
export const alt = 'Tattoo Artists'
export { size }
export const contentType = 'image/png'
export const revalidate = 86400 // 24 hours

export default async function Image({
  params,
}: {
  params: Promise<{ country: string; region: string; city: string }>
}) {
  const { country, region, city } = await params
  const fonts = await loadAllFonts()

  // Validate input
  const validation = validateCityParams({ country, region, city })
  if (!validation.valid) {
    console.error(`[OG Image] ${validation.error}`)
    return new ImageResponse(
      (
        <div style={styles.rootLight}>
          <div style={styles.branding}>INKDEX</div>
          <div style={styles.centerContent}>
            <div style={styles.titleMedium}>Tattoo Artists</div>
            <div style={styles.subtitleSmall}>Find your artist</div>
          </div>
        </div>
      ),
      { ...size, fonts: getFontConfig(fonts) }
    )
  }

  const { countryCode, regionCode, citySlug } = validation.data
  const cityName = slugToName(citySlug)

  // Fetch artist count with error handling
  // Using .eq() instead of .ilike() to prevent SQL injection via wildcards
  const supabase = createServiceClient()
  const { count, error } = await supabase
    .from('artist_locations')
    .select('*', { count: 'exact', head: true })
    .eq('country_code', countryCode)
    .eq('region', regionCode)
    .ilike('city', cityName) // Case-insensitive but validated input

  if (error) {
    console.error(`[OG Image] Database error for city ${cityName}:`, error)
  }

  const artistCount = count ?? 0

  return new ImageResponse(
    (
      <div style={styles.rootLight}>
        <div style={styles.branding}>INKDEX</div>

        <div style={styles.centerContent}>
          <div style={styles.titleLarge}>
            {cityName}, {regionCode}
          </div>
          <div style={styles.subtitle}>Tattoo Artists</div>
        </div>

        <div style={styles.statContainer}>
          <div style={styles.statNumberLarge}>{String(artistCount)}</div>
          <div style={styles.statLabel}>
            {artistCount === 1 ? 'Artist' : 'Artists'}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: getFontConfig(fonts),
    }
  )
}
