import { ImageResponse } from 'next/og'
import { loadAllFonts } from '@/lib/og/fonts'
import { size, styles, getFontConfig } from '@/lib/og/styles'
import { validateStyleParams, sanitizeDisplayText } from '@/lib/og/validation'
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
  params: Promise<{ country: string; region: string; city: string; style: string }>
}) {
  const { country, region, city, style } = await params
  const fonts = await loadAllFonts()

  // Validate input
  const validation = validateStyleParams({ country, region, city, style })
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

  const { countryCode, regionCode, citySlug, styleSlug } = validation.data
  const cityName = slugToName(citySlug)

  // Fetch style display name with error handling
  const supabase = createServiceClient()
  const { data: styleSeed, error: styleError } = await supabase
    .from('style_seeds')
    .select('display_name')
    .eq('style_name', styleSlug)
    .single()

  if (styleError && styleError.code !== 'PGRST116') {
    // PGRST116 = no rows returned (not an error for us)
    console.error(`[OG Image] Style lookup error for ${styleSlug}:`, styleError)
  }

  // Sanitize display name for safe rendering
  const styleName = sanitizeDisplayText(
    styleSeed?.display_name ?? slugToName(styleSlug),
    50
  )

  // Get artist count for this city
  // Note: Shows city-wide count, not style-specific (would require complex join)
  const { count, error: countError } = await supabase
    .from('artist_locations')
    .select('*', { count: 'exact', head: true })
    .eq('country_code', countryCode)
    .eq('region', regionCode)
    .ilike('city', cityName) // Case-insensitive but validated input

  if (countError) {
    console.error(`[OG Image] Database error for city ${cityName}:`, countError)
  }

  const artistCount = count ?? 0

  return new ImageResponse(
    (
      <div style={styles.rootLight}>
        <div style={styles.headerRow}>
          <div style={styles.branding}>INKDEX</div>
          <div style={styles.badgeFilled}>{styleName}</div>
        </div>

        <div style={styles.centerContent}>
          <div style={styles.titleSmall}>{styleName}</div>
          <div style={styles.subtitleXSmall}>
            Tattoo Artists in {cityName}, {regionCode}
          </div>
        </div>

        <div style={styles.statContainer}>
          <div style={styles.statNumber}>{String(artistCount)}</div>
          <div style={styles.statLabel}>Artists in {cityName}</div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: getFontConfig(fonts),
    }
  )
}
