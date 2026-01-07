import { ImageResponse } from 'next/og'
import { loadAllFonts } from '@/lib/og/fonts'
import { colors, size, styles, getFontConfig } from '@/lib/og/styles'
import { validateCountryParams } from '@/lib/og/validation'
import { getCountryName } from '@/lib/utils/location'
import { createServiceClient } from '@/lib/supabase/service'

export const runtime = 'edge'
export const alt = 'Tattoo Artists'
export { size }
export const contentType = 'image/png'
export const revalidate = 86400 // 24 hours

export default async function Image({
  params,
}: {
  params: Promise<{ country: string }>
}) {
  const { country } = await params
  const fonts = await loadAllFonts()

  // Validate input
  const validation = validateCountryParams({ country })
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

  const { countryCode } = validation.data
  const countryName = getCountryName(countryCode)

  // Fetch stats with error handling
  const supabase = createServiceClient()
  const { data: regions, error } = await supabase.rpc('get_regions_with_counts', {
    p_country_code: countryCode,
  })

  if (error) {
    console.error(`[OG Image] Database error for country ${countryCode}:`, error)
  }

  const totalArtists =
    regions?.reduce(
      (sum: number, r: { artist_count: number }) => sum + (r.artist_count || 0),
      0
    ) ?? 0
  const stateCount = regions?.length ?? 0

  return new ImageResponse(
    (
      <div style={styles.rootLight}>
        <div style={styles.branding}>INKDEX</div>

        <div style={styles.centerContent}>
          <div style={styles.titleMedium}>{countryName}</div>
          <div style={styles.subtitleSmall}>Tattoo Artists</div>
        </div>

        <div style={styles.statsRow}>
          <div style={styles.statContainer}>
            <div style={styles.statNumber}>{String(totalArtists)}</div>
            <div style={styles.statLabel}>Artists</div>
          </div>
          <div style={styles.statContainer}>
            <div style={styles.statNumber}>{String(stateCount)}</div>
            <div style={styles.statLabel}>States</div>
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
