/**
 * ML Style Predictor
 *
 * Predicts tattoo styles from CLIP embeddings using trained logistic regression classifiers.
 * Extracted from scripts/styles/tag-images-ml.ts for use in processing pipelines.
 */

import * as fs from 'fs';
import * as path from 'path';

// Classifier structure
interface StyleClassifier {
  styles: string[];
  classifiers: Record<string, { coef: number[]; intercept: number }>;
}

// Lazy-loaded singleton classifier
let _classifier: StyleClassifier | null = null;

// Per-style threshold overrides (higher = more strict)
// These styles tend to have more false positives, so require higher confidence
// Jan 9, 2026: Raised anime/japanese significantly after finding blackwork images
// being incorrectly tagged at 0.74-0.76 confidence
const STYLE_THRESHOLDS: Record<string, number> = {
  anime: 0.80, // Raised from 0.65 - blackwork was being tagged at 0.74
  japanese: 0.75, // Raised from 0.60 - blackwork was being tagged at 0.72-0.76
  surrealism: 0.55, // Was over-tagging at 28%
};

const DEFAULT_THRESHOLD = 0.5;

/**
 * Load classifier model (lazy singleton)
 */
function getClassifier(): StyleClassifier {
  if (!_classifier) {
    const classifierPath = path.join(process.cwd(), 'models', 'style-classifier.json');
    if (!fs.existsSync(classifierPath)) {
      throw new Error(`Style classifier not found at ${classifierPath}`);
    }
    _classifier = JSON.parse(fs.readFileSync(classifierPath, 'utf-8'));
  }
  return _classifier!;
}

/**
 * Sigmoid function for logistic regression
 */
function sigmoid(x: number): number {
  if (x < -500) return 0;
  if (x > 500) return 1;
  return 1 / (1 + Math.exp(-x));
}

export interface StylePrediction {
  style: string;
  confidence: number;
}

/**
 * Predict styles for a CLIP embedding
 *
 * @param embedding - 768-dimensional CLIP embedding
 * @param defaultThreshold - Default confidence threshold (default: 0.50)
 * @returns Array of predicted styles with confidence scores
 */
export function predictStyles(
  embedding: number[],
  defaultThreshold: number = DEFAULT_THRESHOLD
): StylePrediction[] {
  const classifier = getClassifier();
  const predictions: StylePrediction[] = [];

  for (const style of classifier.styles) {
    const classifierData = classifier.classifiers[style];
    if (!classifierData?.coef) continue;

    const { coef, intercept } = classifierData;

    // Compute logit: w·x + b
    let logit = intercept;
    for (let j = 0; j < embedding.length; j++) {
      logit += coef[j] * embedding[j];
    }

    const prob = sigmoid(logit);

    // Use per-style threshold if defined
    const threshold = STYLE_THRESHOLDS[style] ?? defaultThreshold;

    if (prob >= threshold) {
      predictions.push({ style, confidence: prob });
    }
  }

  return predictions;
}

/**
 * Get all available styles from the classifier
 */
export function getAvailableStyles(): string[] {
  return getClassifier().styles;
}

/**
 * Get the threshold for a specific style
 */
export function getStyleThreshold(style: string): number {
  return STYLE_THRESHOLDS[style] ?? DEFAULT_THRESHOLD;
}
