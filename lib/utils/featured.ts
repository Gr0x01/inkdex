/**
 * Featured artist utilities
 *
 * Featured status is now admin-curated via the is_featured column.
 * This file contains legacy utilities for follower-based thresholds.
 */

/**
 * @deprecated Featured status is now controlled by admin via is_featured column.
 * Use artist.is_featured instead of this function.
 * Keeping for reference on what constitutes a "notable" follower count.
 */
const FEATURED_FOLLOWER_THRESHOLD = 50000;

/**
 * @deprecated Use artist.is_featured column instead.
 * Featured status is now admin-curated, not computed from follower count.
 * This function is preserved for backwards compatibility but should not be used.
 */
export function isArtistFeatured(followerCount: number | null | undefined): boolean {
  console.warn('isArtistFeatured() is deprecated. Use artist.is_featured column instead.');
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
