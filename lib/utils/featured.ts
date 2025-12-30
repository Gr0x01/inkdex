/**
 * Featured artist utilities
 *
 * An artist is considered "featured" if they have 50,000+ Instagram followers.
 * This highlights established artists with significant reach and credibility.
 */

const FEATURED_FOLLOWER_THRESHOLD = 50000;

/**
 * Check if an artist should be marked as "featured" based on their follower count
 * @param followerCount - Artist's Instagram follower count
 * @returns true if artist has 50k+ followers
 */
export function isArtistFeatured(followerCount: number | null | undefined): boolean {
  if (followerCount === null || followerCount === undefined) {
    return false;
  }

  return followerCount >= FEATURED_FOLLOWER_THRESHOLD;
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
export { FEATURED_FOLLOWER_THRESHOLD };
