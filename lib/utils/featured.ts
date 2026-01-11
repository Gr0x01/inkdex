/**
 * Featured artist utilities
 */

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

