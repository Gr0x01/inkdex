/**
 * Calculate artist color profile from portfolio images
 *
 * @param colorStats - Array of objects with is_color boolean
 * @returns true = color-heavy (>60%), false = B&G-heavy (<40%), null = mixed
 */
export function calculateColorProfile(
  colorStats: { is_color: boolean | null }[]
): boolean | null {
  // Filter out null values
  const validStats = colorStats.filter(
    (img): img is { is_color: boolean } => img.is_color !== null
  )

  if (validStats.length === 0) {
    return null
  }

  const colorCount = validStats.filter(img => img.is_color === true).length
  const colorPercentage = colorCount / validStats.length

  // >60% color = color-heavy, <40% = B&G-heavy, else mixed
  if (colorPercentage > 0.6) return true
  if (colorPercentage < 0.4) return false
  return null
}
