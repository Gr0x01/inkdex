/**
 * Style Classification Thresholds
 *
 * Centralized threshold configuration for ML style classification.
 * Higher thresholds = more strict (fewer false positives).
 *
 * Used by:
 * - lib/styles/predictor.ts (real-time tagging)
 * - scripts/styles/tag-images-ml.ts (batch tagging)
 */

// Per-style threshold overrides (higher = more strict)
// These styles tend to have more false positives, so require higher confidence
// Jan 9, 2026: Raised anime/japanese significantly after finding blackwork images
// being incorrectly tagged at 0.74-0.76 confidence
export const STYLE_THRESHOLDS: Record<string, number> = {
  anime: 0.8, // Raised from 0.65 - blackwork was being tagged at 0.74
  japanese: 0.75, // Raised from 0.60 - blackwork was being tagged at 0.72-0.76
  surrealism: 0.55, // Was over-tagging at 28%
};

export const DEFAULT_THRESHOLD = 0.5;

/**
 * Get the threshold for a specific style
 */
export function getStyleThreshold(style: string): number {
  return STYLE_THRESHOLDS[style] ?? DEFAULT_THRESHOLD;
}
