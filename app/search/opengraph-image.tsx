import { ImageResponse } from 'next/og'
import { loadAllFonts } from '@/lib/og/fonts'
import { colors, size, getFontConfig, styles } from '@/lib/og/styles'

export const runtime = 'edge'
export const alt = 'Search Results | Inkdex'
export { size }
export const contentType = 'image/png'

// Dynamic OG image for search results
// Shows query text and encourages clicks from social shares
export default async function Image({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; id?: string }>
}) {
  const params = await searchParams
  // Sanitize query to prevent XSS/rendering issues
  const queryText = (params.q || '').replace(/[<>"'&]/g, '').slice(0, 100)

  const fonts = await loadAllFonts()

  // Truncate long queries
  const displayQuery = queryText.length > 40
    ? queryText.substring(0, 37) + '...'
    : queryText

  return new ImageResponse(
    (
      <div style={styles.rootLight}>
        {/* Header */}
        <div style={styles.headerRow}>
          <div style={styles.branding}>INKDEX</div>
          <div style={styles.badgeFilled}>Visual Search</div>
        </div>

        {/* Center content */}
        <div style={styles.centerContent}>
          {queryText ? (
            <>
              {/* Query display */}
              <div
                style={{
                  display: 'flex',
                  fontFamily: 'JetBrains Mono',
                  fontSize: 24,
                  fontWeight: 500,
                  color: colors.gray500,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  marginBottom: 16,
                }}
              >
                Search Results For
              </div>
              <div
                style={{
                  display: 'flex',
                  fontFamily: 'Playfair Display',
                  fontSize: displayQuery.length > 20 ? 64 : 80,
                  fontWeight: 900,
                  color: colors.ink,
                  lineHeight: 1.1,
                  marginBottom: 24,
                }}
              >
                &ldquo;{displayQuery}&rdquo;
              </div>
              <div
                style={{
                  display: 'flex',
                  fontFamily: 'Playfair Display',
                  fontSize: 36,
                  fontWeight: 900,
                  color: colors.gray700,
                }}
              >
                Tattoo Artists Matching Your Style
              </div>
            </>
          ) : (
            <>
              {/* Generic search page */}
              <div style={styles.titleMedium}>
                Find Your Artist
              </div>
              <div style={styles.subtitleSmall}>
                Visual Search for Tattoos
              </div>
            </>
          )}
        </div>

        {/* Footer hint */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            marginTop: 'auto',
          }}
        >
          <div
            style={{
              display: 'flex',
              fontFamily: 'JetBrains Mono',
              fontSize: 16,
              fontWeight: 500,
              color: colors.gray500,
              letterSpacing: '0.05em',
            }}
          >
            inkdex.io
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
