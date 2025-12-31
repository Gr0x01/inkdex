/**
 * Embedding aggregation utilities for combining multiple CLIP embeddings.
 * Used for Instagram profile searches where we aggregate embeddings from
 * multiple portfolio images into a single representative vector.
 */

/**
 * Aggregates multiple CLIP embeddings into a single representative embedding.
 *
 * Algorithm:
 * 1. Average all embedding dimensions
 * 2. Re-normalize to unit length (L2 norm = 1)
 *
 * This works well for CLIP embeddings because:
 * - CLIP embeddings are already L2-normalized
 * - Simple average preserves semantic meaning
 * - Re-normalization maintains cosine similarity properties
 *
 * @param embeddings - Array of 768-dimensional CLIP embeddings
 * @returns Single 768-dimensional aggregated embedding
 * @throws Error if no embeddings provided or embeddings have mismatched dimensions
 *
 * @example
 * ```typescript
 * const embeddings = [
 *   [0.1, 0.2, 0.3, ...], // 768 dims
 *   [0.2, 0.3, 0.4, ...], // 768 dims
 * ];
 * const aggregate = aggregateEmbeddings(embeddings);
 * // Returns: [0.15, 0.25, 0.35, ...] (normalized)
 * ```
 */
export function aggregateEmbeddings(embeddings: number[][]): number[] {
  // Validation
  if (!embeddings || embeddings.length === 0) {
    throw new Error('No embeddings provided for aggregation');
  }

  // Single embedding - return as-is
  if (embeddings.length === 1) {
    return embeddings[0];
  }

  // Validate all embeddings have same dimension
  const dim = embeddings[0].length;
  for (let i = 1; i < embeddings.length; i++) {
    if (embeddings[i].length !== dim) {
      throw new Error(
        `Embedding dimension mismatch: expected ${dim}, got ${embeddings[i].length} at index ${i}`
      );
    }
  }

  // Initialize sum array
  const sum = new Array(dim).fill(0);

  // Sum all embeddings element-wise
  embeddings.forEach((embedding) => {
    embedding.forEach((value, index) => {
      sum[index] += value;
    });
  });

  // Compute average
  const avg = sum.map((value) => value / embeddings.length);

  // Re-normalize to unit length (L2 norm = 1)
  const norm = Math.sqrt(avg.reduce((sum, value) => sum + value * value, 0));

  if (norm === 0) {
    throw new Error('Cannot normalize zero vector');
  }

  return avg.map((value) => value / norm);
}

/**
 * Validates that an embedding is properly normalized (L2 norm ≈ 1.0).
 * Useful for testing and debugging.
 *
 * @param embedding - 768-dimensional embedding to validate
 * @param tolerance - Acceptable deviation from 1.0 (default: 0.01)
 * @returns True if embedding is normalized within tolerance
 */
export function isNormalized(
  embedding: number[],
  tolerance: number = 0.01
): boolean {
  const norm = Math.sqrt(
    embedding.reduce((sum, value) => sum + value * value, 0)
  );
  return Math.abs(norm - 1.0) < tolerance;
}

/**
 * Computes the L2 norm (magnitude) of an embedding.
 *
 * @param embedding - N-dimensional embedding
 * @returns L2 norm (magnitude)
 */
export function computeNorm(embedding: number[]): number {
  return Math.sqrt(
    embedding.reduce((sum, value) => sum + value * value, 0)
  );
}
