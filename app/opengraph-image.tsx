import { ImageResponse } from 'next/og'
import { loadAllFonts } from '@/lib/og/fonts'
import { colors, size, getFontConfig } from '@/lib/og/styles'

export const runtime = 'edge'
export const alt = 'Inkdex - Find Your Tattoo Artist'
export { size }
export const contentType = 'image/png'
export const revalidate = 86400 // 24 hours

export default async function Image() {
  const fonts = await loadAllFonts()

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.ink,
          padding: 60,
        }}
      >
        <div
          style={{
            display: 'flex',
            fontFamily: 'Playfair Display',
            fontSize: 140,
            fontWeight: 900,
            color: colors.paper,
            letterSpacing: '-0.02em',
            marginBottom: 32,
          }}
        >
          Inkdex
        </div>

        <div
          style={{
            display: 'flex',
            fontFamily: 'JetBrains Mono',
            fontSize: 28,
            fontWeight: 500,
            color: colors.gray500,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
          }}
        >
          Find Your Tattoo Artist
        </div>
      </div>
    ),
    {
      ...size,
      fonts: getFontConfig(fonts),
    }
  )
}
