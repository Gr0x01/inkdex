import { createClient } from '@/lib/supabase/server'

/**
 * Represents a style match from classifying a query embedding
 */
export interface StyleMatch {
  style_name: string
  confidence: number
  taxonomy?: 'technique' | 'theme'
}

/**
 * Multi-axis style classification result
 */
export interface StyleClassification {
  techniques: StyleMatch[]  // Max 1, threshold 0.35
  themes: StyleMatch[]       // Max 2, threshold 0.45
}

/**
 * Classifies a query embedding against style seeds using multi-axis taxonomy
 * Returns separate technique and theme classifications
 *
 * - Techniques (HOW): ONE best match above 0.35 threshold
 * - Themes (WHAT): Up to 2 matches above 0.45 threshold (tighter to reduce false positives)
 *
 * @param embedding - 768-dim CLIP embedding to classify
 * @returns StyleClassification with separate techniques and themes arrays
 */
export async function classifyQueryStyles(
  embedding: number[]
): Promise<StyleClassification> {
  const supabase = await createClient()

  // Classify techniques (max 1, threshold 0.35)
  const { data: techniques, error: techError } = await supabase.rpc('classify_embedding_styles', {
    p_embedding: `[${embedding.join(',')}]`,
    p_max_styles: 1,
    p_min_confidence: 0.35,
    p_taxonomy: 'technique',
  })

  if (techError) {
    console.error('[Style Classifier] Technique classification failed:', techError)
  }

  // Classify themes (max 2, higher threshold 0.45)
  const { data: themes, error: themeError } = await supabase.rpc('classify_embedding_styles', {
    p_embedding: `[${embedding.join(',')}]`,
    p_max_styles: 2,
    p_min_confidence: 0.45,
    p_taxonomy: 'theme',
  })

  if (themeError) {
    console.error('[Style Classifier] Theme classification failed:', themeError)
  }

  return {
    techniques: (techniques as StyleMatch[]) || [],
    themes: (themes as StyleMatch[]) || [],
  }
}

/**
 * Legacy function for backward compatibility
 * Returns flat array of all style matches (techniques + themes)
 *
 * @deprecated Use classifyQueryStyles() for multi-axis support
 */
export async function classifyQueryStylesFlat(
  embedding: number[],
  maxStyles = 3,
  minConfidence = 0.35
): Promise<StyleMatch[]> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('classify_embedding_styles', {
    p_embedding: `[${embedding.join(',')}]`,
    p_max_styles: maxStyles,
    p_min_confidence: minConfidence,
    // No p_taxonomy = returns all styles
  })

  if (error) {
    console.error('[Style Classifier] Classification failed:', error)
    return []
  }

  return (data as StyleMatch[]) || []
}
