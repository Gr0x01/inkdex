/**
 * SEO utility functions for safe JSON-LD and metadata generation
 */

/**
 * Sanitize text for use in JSON-LD structured data to prevent XSS
 * Escapes HTML special characters that could break out of JSON context
 */
export function sanitizeForJsonLd(
  text: string | null | undefined
): string {
  if (!text) return ''

  return text
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/"/g, '\\u0022')
    .replace(/'/g, '\\u0027')
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
