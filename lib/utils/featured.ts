/**
 * Featured artist utilities
 *
 * An artist is considered "featured" if they have any portfolio image with >10,000 likes.
 * This is a simple engagement-based metric for highlighting high-performing artists.
 */

const FEATURED_LIKES_THRESHOLD = 10000;

/**
 * Check if an artist should be marked as "featured" based on their portfolio engagement
 * @param portfolioImages - Array of portfolio images with likes_count
 * @returns true if artist has at least one post with >10k likes
 */
export function isArtistFeatured(
  portfolioImages: Array<{ likes_count: number | null }> | undefined
): boolean {
  if (!portfolioImages || portfolioImages.length === 0) {
    return false;
  }

  return portfolioImages.some(
    (image) => image.likes_count !== null && image.likes_count >= FEATURED_LIKES_THRESHOLD
  );
}

/**
 * Get the highest like count from an artist's portfolio
 * @param portfolioImages - Array of portfolio images with likes_count
 * @returns Maximum likes count or 0 if no images
 */
export function getMaxLikes(
  portfolioImages: Array<{ likes_count: number | null }> | undefined
): number {
  if (!portfolioImages || portfolioImages.length === 0) {
    return 0;
  }

  return Math.max(
    ...portfolioImages.map((image) => image.likes_count || 0),
    0
  );
}

/**
 * Featured artist threshold for display
 */
export { FEATURED_LIKES_THRESHOLD };
