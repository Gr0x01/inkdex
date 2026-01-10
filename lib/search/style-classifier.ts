import { createClient } from '@/lib/supabase/server';

/**
 * Represents a style match from classifying a query embedding
 */
export interface StyleMatch {
  style_name: string;
  confidence: number;
}

/**
 * Classifies a query embedding against style seeds
 * Returns array of matching styles with confidence scores
 *
 * @param embedding - 768-dim CLIP embedding to classify
 * @param maxStyles - Maximum number of styles to return (default: 3)
 * @param minConfidence - Minimum confidence threshold (default: 0.35)
 * @returns Array of StyleMatch with style_name and confidence
 */
export async function classifyQueryStyles(
  embedding: number[],
  maxStyles = 3,
  minConfidence = 0.35
): Promise<StyleMatch[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('classify_embedding_styles', {
    p_embedding: `[${embedding.join(',')}]`,
    p_max_styles: maxStyles,
    p_min_confidence: minConfidence,
  });

  if (error) {
    console.error('[Style Classifier] Classification failed:', error);
    return [];
  }

  return (data as StyleMatch[]) || [];
}
