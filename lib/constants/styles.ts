/**
 * Style Constants for Display
 *
 * DISPLAY_STYLES: Styles shown on artist profile badges (11 styles).
 * These are styles that artists genuinely specialize in.
 *
 * Other styles (tribal, trash-polka, biomechanical, sketch, etc.)
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
  'fine-line',
  'japanese',
  'anime',
])

// Minimum percentage of portfolio to display a style on profile
export const MIN_STYLE_PERCENTAGE = 25

/**
 * All styles available for labeling in admin UI
 * Used to train ML classifier
 */
export const ALL_LABELING_STYLES = [
  // Core display styles (9)
  'traditional',
  'neo-traditional',
  'realism',
  'black-and-gray',
  'blackwork',
  'new-school',
  'watercolor',
  'ornamental',
  'fine-line',
  // Niche styles (8)
  'tribal',
  'biomechanical',
  'trash-polka',
  'sketch',
  'geometric',
  'dotwork',
  'surrealism',
  'lettering',
  // Content-based (2) - need ML for accurate detection
  'anime',
  'japanese',
] as const

export type LabelingStyle = typeof ALL_LABELING_STYLES[number]

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
