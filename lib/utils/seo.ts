/**
 * SEO utility functions for safe JSON-LD and metadata generation
 */

import { DISPLAY_STYLES, STYLE_DISPLAY_NAMES } from '@/lib/constants/styles'

/**
 * Format style list for meta descriptions
 * Converts style slugs to properly capitalized names and limits to top N styles
 * Sorts by percentage to show strongest styles first
 */
export function formatStyleList(
  styles: Array<{ style_name: string; percentage: number }> | null | undefined,
  limit = 3
): string {
  if (!styles?.length) return ''

  const displayStyles = styles
    .filter((s) => DISPLAY_STYLES.has(s.style_name))
    .sort((a, b) => b.percentage - a.percentage) // Show strongest styles first
    .slice(0, limit)
    .map((s) => STYLE_DISPLAY_NAMES[s.style_name] || s.style_name.replace(/-/g, ' '))

  return displayStyles.join(', ')
}

/**
 * Sanitize text for use in JSON-LD structured data to prevent XSS
 * Removes HTML tags and escapes special characters for JSON context
 */
export function sanitizeForJsonLd(
  text: string | null | undefined
): string {
  if (!text) return ''

  // Remove all HTML tags first
  const withoutTags = text.replace(/<[^>]*>/g, '')

  // Return sanitized text (JSON.stringify will handle proper escaping)
  return withoutTags
}

/**
 * Safely serialize JSON-LD data to prevent script injection
 * Escapes </script> tags that could break out of JSON-LD script context
 *
 * IMPORTANT: Use this instead of JSON.stringify() for JSON-LD data
 * to prevent XSS attacks via premature script tag closure
 */
export function serializeJsonLd(data: unknown): string {
  const json = JSON.stringify(data)

  // Prevent </script> injection by escaping the closing tag
  // This ensures the JSON-LD script block cannot be prematurely closed
  return json.replace(/<\/script/gi, '<\\/script')
}

/**
 * Truncate text for meta descriptions
 */
export function truncateDescription(
  text: string | null | undefined,
  maxLength: number = 160
): string {
  if (!text) return ''
  if (text.length <= maxLength) return text

  return text.slice(0, maxLength - 3) + '...'
}

/**
 * Generate safe alt text from caption
 */
export function generateAltText(
  caption: string | null | undefined,
  fallback: string,
  maxLength: number = 125
): string {
  if (!caption) return fallback

  const sanitized = caption.slice(0, maxLength)
  return sanitized.length < caption.length ? sanitized + '...' : sanitized
}
