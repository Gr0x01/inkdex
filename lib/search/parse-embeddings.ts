/**
 * Parse embeddings from database format
 *
 * pgvector returns embeddings as strings like "[0.1,0.2,...]"
 * This function handles both string and array formats
 */
export function parseDbEmbeddings(
  images: { embedding: string | number[] }[]
): number[][] {
  return images.map((img) => {
    if (typeof img.embedding === 'string') {
      return JSON.parse(img.embedding) as number[]
    }
    return img.embedding
  })
}
