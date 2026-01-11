/**
 * Parse embeddings from database format
 *
 * pgvector returns embeddings as strings like "[0.1,0.2,...]"
 * This function handles both string and array formats
 *
 * @throws Error if embedding string is malformed JSON
 */
export function parseDbEmbeddings(
  images: { embedding: string | number[] }[]
): number[][] {
  return images.map((img, index) => {
    if (typeof img.embedding === 'string') {
      try {
        return JSON.parse(img.embedding) as number[]
      } catch (e) {
        throw new Error(
          `Failed to parse embedding at index ${index}: ${e instanceof Error ? e.message : 'invalid JSON'}`
        )
      }
    }
    return img.embedding
  })
}
