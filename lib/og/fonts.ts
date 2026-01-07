/**
 * Font loading utilities for OG image generation
 * Fonts are fetched from Google Fonts API and cached in module memory
 * Note: Satori requires ttf/woff format, NOT woff2
 */

// Cache font data in module scope to avoid repeated fetches
let playfairDisplay: ArrayBuffer | null = null
let jetbrainsMono: ArrayBuffer | null = null

/**
 * Fetch a font from Google Fonts API with proper error handling
 */
async function fetchGoogleFont(
  fontFamily: string,
  weight: number
): Promise<ArrayBuffer> {
  const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontFamily)}:wght@${weight}&display=swap`

  const response = await fetch(url, {
    headers: {
      // Use a user-agent that doesn't support woff2 to get ttf format
      'User-Agent':
        'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    },
  })

  if (!response.ok) {
    throw new Error(
      `[OG Fonts] Failed to fetch CSS for ${fontFamily}: ${response.status}`
    )
  }

  const css = await response.text()

  // Extract the font URL from the CSS
  const fontUrlMatch = css.match(/src:\s*url\(([^)]+)\)/)
  if (!fontUrlMatch) {
    throw new Error(
      `[OG Fonts] Could not find font URL in CSS response for ${fontFamily}`
    )
  }

  const fontResponse = await fetch(fontUrlMatch[1])
  if (!fontResponse.ok) {
    throw new Error(
      `[OG Fonts] Failed to download ${fontFamily}: ${fontResponse.status}`
    )
  }

  return fontResponse.arrayBuffer()
}

/**
 * Load Playfair Display 900 weight for display text
 * Used for headlines and main titles in OG images
 */
export async function getPlayfairDisplay(): Promise<ArrayBuffer> {
  if (playfairDisplay) return playfairDisplay

  try {
    playfairDisplay = await fetchGoogleFont('Playfair Display', 900)
    return playfairDisplay
  } catch (error) {
    console.error('[OG Fonts] Failed to load Playfair Display:', error)
    throw error
  }
}

/**
 * Load JetBrains Mono 500 weight for labels and mono text
 * Used for small labels, stats, and branding text
 */
export async function getJetBrainsMono(): Promise<ArrayBuffer> {
  if (jetbrainsMono) return jetbrainsMono

  try {
    jetbrainsMono = await fetchGoogleFont('JetBrains Mono', 500)
    return jetbrainsMono
  } catch (error) {
    console.error('[OG Fonts] Failed to load JetBrains Mono:', error)
    throw error
  }
}

/**
 * Load all fonts in parallel with error handling
 * Use this when generating OG images that need both fonts
 */
export async function loadAllFonts(): Promise<{
  playfair: ArrayBuffer
  jetbrains: ArrayBuffer
}> {
  try {
    const [playfair, jetbrains] = await Promise.all([
      getPlayfairDisplay(),
      getJetBrainsMono(),
    ])
    return { playfair, jetbrains }
  } catch (error) {
    console.error('[OG Fonts] Failed to load fonts:', error)
    throw error
  }
}
