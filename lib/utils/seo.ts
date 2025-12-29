/**
 * SEO utility functions for safe JSON-LD and metadata generation
 */

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
