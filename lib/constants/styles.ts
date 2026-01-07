/**
 * Style Constants for Display
 *
 * DISPLAY_STYLES: Styles shown on artist profile badges.
 * These are styles that artists genuinely specialize in.
 *
 * Other seeds (tribal, trash-polka, biomechanical, sketch, anime)
 * are kept for search relevance but not displayed on profiles.
 */

export const DISPLAY_STYLES = new Set([
  'traditional',
  'neo-traditional',
  'realism',
  'black-and-gray',
  'blackwork',
  'new-school',
  'watercolor',
  'ornamental',
  // japanese and anime excluded until threshold tuning is done
])

// Minimum percentage of portfolio to display a style on profile
export const MIN_STYLE_PERCENTAGE = 25

/**
 * Human-readable display names for styles
 */
export const STYLE_DISPLAY_NAMES: Record<string, string> = {
  'traditional': 'Traditional',
  'neo-traditional': 'Neo-Traditional',
  'japanese': 'Japanese',
  'realism': 'Realism',
  'black-and-gray': 'Black & Gray',
  'blackwork': 'Blackwork',
  'new-school': 'New School',
  'watercolor': 'Watercolor',
  'ornamental': 'Ornamental',
  // Legacy styles (kept for backwards compatibility)
  'fine-line': 'Fine Line',
  'geometric': 'Geometric',
  'dotwork': 'Dotwork',
  'tribal': 'Tribal',
  'illustrative': 'Illustrative',
  'surrealism': 'Surrealism',
  'minimalist': 'Minimalist',
  'lettering': 'Lettering',
  'trash-polka': 'Trash Polka',
  'biomechanical': 'Biomechanical',
  'sketch': 'Sketch',
  'anime': 'Anime',
  'horror': 'Horror',
}
