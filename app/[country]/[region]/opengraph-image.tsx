import { ImageResponse } from 'next/og'
import { loadAllFonts } from '@/lib/og/fonts'
import { colors as _colors, size, styles, getFontConfig } from '@/lib/og/styles'
import { validateRegionParams } from '@/lib/og/validation'
import { getCountryName, getRegionName } from '@/lib/utils/location'
import { createServiceClient } from '@/lib/supabase/service'

export const runtime = 'edge'
export const alt = 'Tattoo Artists'
export { size }
export const contentType = 'image/png'
export const revalidate = 86400 // 24 hours

export default async function Image({
  params,
}: {
  params: Promise<{ country: string; region: string }>
}) {
  const { country, region } = await params
  const fonts = await loadAllFonts()

  // Validate input
  const validation = validateRegionParams({ country, region })
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

  const { countryCode, regionCode } = validation.data
  const countryName = getCountryName(countryCode)
  const regionName = getRegionName(regionCode, countryCode)

  // Fetch stats with error handling
  const supabase = createServiceClient()
  const { data: cities, error } = await supabase.rpc('get_location_counts', {
    p_grouping: 'cities',
    p_country_code: countryCode,
    p_region: regionCode,
    p_min_count: 1,
  })

  if (error) {
    console.error(`[OG Image] Database error for region ${regionCode}:`, error)
  }

  const totalArtists =
    cities?.reduce(
      (sum: number, c: { artist_count: number }) => sum + (c.artist_count || 0),
      0
    ) ?? 0
  const cityCount = cities?.length ?? 0

  return new ImageResponse(
    (
      <div style={styles.rootLight}>
        <div style={styles.headerRow}>
          <div style={styles.branding}>INKDEX</div>
          <div style={styles.badgeOutlined}>{countryName}</div>
        </div>

        <div style={styles.centerContent}>
          <div style={styles.titleMedium}>{regionName}</div>
          <div style={styles.subtitleSmall}>Tattoo Artists</div>
        </div>

        <div style={styles.statsRow}>
          <div style={styles.statContainer}>
            <div style={styles.statNumber}>{String(totalArtists)}</div>
            <div style={styles.statLabel}>Artists</div>
          </div>
          <div style={styles.statContainer}>
            <div style={styles.statNumber}>{String(cityCount)}</div>
            <div style={styles.statLabel}>Cities</div>
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
