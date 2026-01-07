import { createClient } from '@/lib/supabase/server'

/**
 * Represents a style match from classifying a query embedding
 */
export interface StyleMatch {
  style_name: string
  confidence: number
}

/**
 * Classifies a query embedding against style seeds
 * Returns top N styles with confidence scores above threshold
 *
 * Uses the same cosine similarity math as compute_image_style_tags trigger
 * so results are consistent with how portfolio images are classified
 *
 * @param embedding - 768-dim CLIP embedding to classify
 * @param maxStyles - Maximum number of styles to return (default: 3)
 * @param minConfidence - Minimum confidence threshold (default: 0.35)
 * @returns Array of style matches sorted by confidence descending
 */
export async function classifyQueryStyles(
  embedding: number[],
  maxStyles = 3,
  minConfidence = 0.35
): Promise<StyleMatch[]> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('classify_embedding_styles', {
    p_embedding: `[${embedding.join(',')}]`,
    p_max_styles: maxStyles,
    p_min_confidence: minConfidence,
  })

  if (error) {
    console.error('[Style Classifier] Classification failed:', error)
    // Return empty array on error - search will proceed without style boost
    return []
  }

  return (data as StyleMatch[]) || []
}
