/**
 * Shared styles and constants for OG image generation
 * These match the Inkdex design system from tailwind.config.ts
 */

// Design system colors
export const colors = {
  paper: '#F8F7F5',
  ink: '#1A1A1A',
  gray700: '#4A4845',
  gray500: '#8B8985',
  gray300: '#D8D6D2',
} as const

// Standard OG image size
export const size = { width: 1200, height: 630 }

// Font definitions for ImageResponse
export function getFontConfig(fonts: {
  playfair: ArrayBuffer
  jetbrains: ArrayBuffer
}) {
  return [
    { name: 'Playfair Display', data: fonts.playfair, weight: 900 as const },
    { name: 'JetBrains Mono', data: fonts.jetbrains, weight: 500 as const },
  ]
}

// Shared style objects for Satori (all divs need display: flex)
export const styles = {
  // Root container - light background
  rootLight: {
    height: '100%',
    width: '100%',
    display: 'flex' as const,
    flexDirection: 'column' as const,
    backgroundColor: colors.paper,
    padding: 60,
  },

  // Root container - dark background
  rootDark: {
    height: '100%',
    width: '100%',
    display: 'flex' as const,
    flexDirection: 'column' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: colors.ink,
    padding: 60,
  },

  // INKDEX branding text
  branding: {
    display: 'flex' as const,
    fontFamily: 'JetBrains Mono',
    fontSize: 18,
    fontWeight: 500,
    color: colors.gray500,
    letterSpacing: '0.2em',
    textTransform: 'uppercase' as const,
  },

  // Header row with branding and badge
  headerRow: {
    display: 'flex' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },

  // Badge (outlined style)
  badgeOutlined: {
    display: 'flex' as const,
    fontFamily: 'JetBrains Mono',
    fontSize: 14,
    fontWeight: 500,
    color: colors.gray700,
    letterSpacing: '0.15em',
    textTransform: 'uppercase' as const,
    padding: '8px 16px',
    border: `2px solid ${colors.gray300}`,
  },

  // Badge (filled style)
  badgeFilled: {
    display: 'flex' as const,
    fontFamily: 'JetBrains Mono',
    fontSize: 14,
    fontWeight: 500,
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
    padding: '10px 20px',
    backgroundColor: colors.ink,
    color: colors.paper,
  },

  // Center content container
  centerContent: {
    display: 'flex' as const,
    flexDirection: 'column' as const,
    justifyContent: 'center' as const,
    flex: 1,
  },

  // Main title (large)
  titleLarge: {
    display: 'flex' as const,
    fontFamily: 'Playfair Display',
    fontSize: 88,
    fontWeight: 900,
    color: colors.ink,
    lineHeight: 1.1,
    marginBottom: 8,
  },

  // Main title (medium)
  titleMedium: {
    display: 'flex' as const,
    fontFamily: 'Playfair Display',
    fontSize: 80,
    fontWeight: 900,
    color: colors.ink,
    lineHeight: 1.1,
    marginBottom: 16,
  },

  // Main title (small - for style pages)
  titleSmall: {
    display: 'flex' as const,
    fontFamily: 'Playfair Display',
    fontSize: 72,
    fontWeight: 900,
    color: colors.ink,
    lineHeight: 1.1,
    marginBottom: 16,
  },

  // Subtitle text
  subtitle: {
    display: 'flex' as const,
    fontFamily: 'Playfair Display',
    fontSize: 44,
    fontWeight: 900,
    color: colors.gray700,
  },

  // Subtitle (smaller)
  subtitleSmall: {
    display: 'flex' as const,
    fontFamily: 'Playfair Display',
    fontSize: 40,
    fontWeight: 900,
    color: colors.gray700,
  },

  // Subtitle (smallest - for style pages)
  subtitleXSmall: {
    display: 'flex' as const,
    fontFamily: 'Playfair Display',
    fontSize: 36,
    fontWeight: 900,
    color: colors.gray700,
  },

  // Stats row container
  statsRow: {
    display: 'flex' as const,
    gap: 60,
  },

  // Single stat container
  statContainer: {
    display: 'flex' as const,
    flexDirection: 'column' as const,
  },

  // Stat number (large)
  statNumberLarge: {
    display: 'flex' as const,
    fontFamily: 'Playfair Display',
    fontSize: 64,
    fontWeight: 900,
    color: colors.ink,
  },

  // Stat number (medium)
  statNumber: {
    display: 'flex' as const,
    fontFamily: 'Playfair Display',
    fontSize: 56,
    fontWeight: 900,
    color: colors.ink,
  },

  // Stat label
  statLabel: {
    display: 'flex' as const,
    fontFamily: 'JetBrains Mono',
    fontSize: 14,
    fontWeight: 500,
    color: colors.gray500,
    letterSpacing: '0.15em',
    textTransform: 'uppercase' as const,
  },
} as const
