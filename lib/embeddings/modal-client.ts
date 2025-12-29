/**
 * Modal.com API Client for CLIP Embedding Generation
 *
 * This client calls Modal.com serverless functions to generate CLIP embeddings
 * for both images and text queries using OpenCLIP ViT-L-14 (768 dimensions).
 */

const MOCK_EMBEDDINGS = process.env.NEXT_PUBLIC_MOCK_EMBEDDINGS === 'true'

/**
 * Generate a synthetic 768-dimensional embedding for testing
 * L2 normalized to match real CLIP embeddings
 */
function generateMockEmbedding(): number[] {
  const embedding = Array.from({ length: 768 }, () => Math.random() * 2 - 1)

  // L2 normalize
  const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0))
  return embedding.map(val => val / norm)
}

/**
 * Generate CLIP embedding for an image
 *
 * @param imageFile - Image file (JPEG, PNG, or WebP)
 * @returns 768-dimensional embedding array
 */
export async function generateImageEmbedding(imageFile: File): Promise<number[]> {
  // Mock mode for testing
  if (MOCK_EMBEDDINGS) {
    console.log('[MOCK] Generating synthetic image embedding')
    return generateMockEmbedding()
  }

  // TODO: Implement real Modal.com integration when deployed
  // For now, return mock embedding
  console.warn('[TODO] Modal.com integration not yet deployed. Using mock embeddings.')
  return generateMockEmbedding()

  /*
  // Real implementation (uncomment when Modal.com is deployed):

  const modalUrl = process.env.MODAL_FUNCTION_URL
  if (!modalUrl) {
    throw new Error('MODAL_FUNCTION_URL not configured')
  }

  // Upload image to temporary location (or convert to base64)
  const buffer = await imageFile.arrayBuffer()
  const base64 = Buffer.from(buffer).toString('base64')

  // Call Modal.com function
  const response = await fetch(`${modalUrl}/generate_single_embedding`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      image_data: base64,
    }),
  })

  if (!response.ok) {
    throw new Error(`Modal.com API error: ${response.statusText}`)
  }

  const data = await response.json()
  return data.embedding
  */
}

/**
 * Generate CLIP embedding for a text query
 *
 * @param text - Natural language query (e.g., "dark floral sketchy")
 * @returns 768-dimensional embedding array
 */
export async function generateTextEmbedding(text: string): Promise<number[]> {
  // Mock mode for testing
  if (MOCK_EMBEDDINGS) {
    console.log(`[MOCK] Generating synthetic text embedding for: "${text}"`)
    return generateMockEmbedding()
  }

  // TODO: Implement real Modal.com integration when deployed
  console.warn('[TODO] Modal.com integration not yet deployed. Using mock embeddings.')
  return generateMockEmbedding()

  /*
  // Real implementation (uncomment when Modal.com is deployed):

  const modalUrl = process.env.MODAL_FUNCTION_URL
  if (!modalUrl) {
    throw new Error('MODAL_FUNCTION_URL not configured')
  }

  // Call Modal.com function
  const response = await fetch(`${modalUrl}/generate_text_query_embedding`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
    }),
  })

  if (!response.ok) {
    throw new Error(`Modal.com API error: ${response.statusText}`)
  }

  const data = await response.json()
  return data.embedding
  */
}

/**
 * Generate hybrid embedding (combination of image and text)
 *
 * @param imageFile - Image file
 * @param text - Text modifier (e.g., "but more colorful")
 * @param imageWeight - Weight for image embedding (0-1, default 0.7)
 * @returns 768-dimensional hybrid embedding
 */
export async function generateHybridEmbedding(
  imageFile: File,
  text: string,
  imageWeight: number = 0.7
): Promise<number[]> {
  const imageEmbedding = await generateImageEmbedding(imageFile)
  const textEmbedding = await generateTextEmbedding(text)

  const textWeight = 1 - imageWeight

  // Weighted combination
  const hybrid = imageEmbedding.map((val, i) =>
    val * imageWeight + textEmbedding[i] * textWeight
  )

  // L2 normalize
  const norm = Math.sqrt(hybrid.reduce((sum, val) => sum + val * val, 0))
  return hybrid.map(val => val / norm)
}
