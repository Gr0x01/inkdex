/**
 * Image constants for performance optimization
 */

/**
 * Generic blur placeholder - tiny 1x1 gray pixel
 * Used for Next.js Image placeholder="blur" to show instant blur
 * while the real image loads. Only ~50 bytes vs generating unique placeholders.
 *
 * This neutral gray works well for both light and dark images.
 */
export const BLUR_DATA_URL =
  'data:image/gif;base64,R0lGODlhAQABAIAAAMLCwgAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw=='
