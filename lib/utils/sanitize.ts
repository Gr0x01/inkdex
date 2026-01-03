/**
 * Content Sanitization Utilities
 *
 * Prevents XSS attacks by sanitizing user-generated content before rendering.
 * Uses DOMPurify (isomorphic - works in both client and server components).
 *
 * When to use:
 * - Artist bios (bio, bio_override)
 * - Instagram captions (post_caption)
 * - Shop names
 * - Any user-controlled text displayed as HTML
 *
 * Security levels:
 * - sanitizeText: Strips all HTML, returns plain text (most common)
 * - sanitizeHTML: Allows safe HTML tags (links, bold, italic)
 * - sanitizeStrict: Strips everything, no HTML at all
 */

import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitize text content (strips all HTML)
 * Use for: Bios, captions, shop names
 *
 * @param text - User-provided text
 * @returns Sanitized plain text (HTML stripped)
 */
export function sanitizeText(text: string | null | undefined): string {
  if (!text) return '';

  // Strip all HTML tags, return plain text
  return DOMPurify.sanitize(text, {
    ALLOWED_TAGS: [], // No HTML tags allowed
    KEEP_CONTENT: true, // Keep text content
  }).trim();
}

/**
 * Sanitize HTML content (allows safe formatting)
 * Use for: Rich text bios (if we add rich text editor later)
 *
 * @param html - User-provided HTML
 * @returns Sanitized HTML (only safe tags)
 */
export function sanitizeHTML(html: string | null | undefined): string {
  if (!html) return '';

  // Allow basic formatting tags only
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'br', 'p'],
    ALLOWED_ATTR: ['href', 'title'], // Only for links
    ALLOW_DATA_ATTR: false,
  }).trim();
}

/**
 * Sanitize strict (strips everything)
 * Use for: Email addresses, URLs (should be validated separately)
 *
 * @param text - User-provided text
 * @returns Sanitized text (no HTML, no special chars)
 */
export function sanitizeStrict(text: string | null | undefined): string {
  if (!text) return '';

  // Strip all HTML and decode entities
  const stripped = DOMPurify.sanitize(text, {
    ALLOWED_TAGS: [],
    KEEP_CONTENT: true,
  });

  // Remove any remaining special characters that could be dangerous
  return stripped
    .replace(/[<>'"]/g, '') // Remove potential HTML chars
    .trim();
}

/**
 * Sanitize Instagram caption (preserves line breaks)
 * Use for: Instagram post captions
 *
 * @param caption - Instagram caption text
 * @returns Sanitized caption with preserved line breaks
 */
export function sanitizeCaption(caption: string | null | undefined): string {
  if (!caption) return '';

  // Strip HTML but keep line breaks
  const sanitized = DOMPurify.sanitize(caption, {
    ALLOWED_TAGS: ['br'], // Only allow line breaks
    KEEP_CONTENT: true,
  }).trim();

  // Convert \n to <br> for display (after sanitization)
  return sanitized.replace(/\n/g, '<br>');
}

/**
 * Sanitize and truncate text
 * Use for: Previews, meta descriptions
 *
 * @param text - User-provided text
 * @param maxLength - Maximum length (default 155 for meta descriptions)
 * @returns Sanitized and truncated text
 */
export function sanitizeAndTruncate(
  text: string | null | undefined,
  maxLength: number = 155
): string {
  const sanitized = sanitizeText(text);

  if (sanitized.length <= maxLength) {
    return sanitized;
  }

  // Truncate at word boundary
  const truncated = sanitized.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');

  if (lastSpace > maxLength * 0.8) {
    // If we're close to maxLength, cut at last space
    return truncated.substring(0, lastSpace) + '...';
  }

  return truncated + '...';
}

/**
 * Validate and sanitize email
 * Use for: Contact emails
 *
 * @param email - Email address
 * @returns Sanitized email or empty string if invalid
 */
export function sanitizeEmail(email: string | null | undefined): string {
  if (!email) return '';

  const sanitized = sanitizeStrict(email);

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(sanitized)) {
    console.warn(`Invalid email format: "${email}"`);
    return '';
  }

  return sanitized.toLowerCase();
}

/**
 * Validate and sanitize URL
 * Use for: Website URLs, booking URLs
 *
 * @param url - URL string
 * @returns Sanitized URL or empty string if invalid
 */
export function sanitizeURL(url: string | null | undefined): string {
  if (!url) return '';

  const sanitized = sanitizeStrict(url);

  try {
    const parsed = new URL(sanitized);

    // Only allow http/https
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      console.warn(`Invalid URL protocol: "${url}"`);
      return '';
    }

    return parsed.toString();
  } catch (_error) {
    console.warn(`Invalid URL format: "${url}"`);
    return '';
  }
}
