/**
 * Modal.com API Client for CLIP Embedding Generation
 *
 * This client calls Modal.com serverless functions to generate CLIP embeddings
 * for both images and text queries using OpenCLIP ViT-L-14 (768 dimensions).
 */

import { fetchWithTimeout, TIMEOUTS } from '@/lib/utils/fetch-with-timeout';

/**
 * Generate CLIP embedding for an image
 *
 * @param imageFile - Image file (JPEG, PNG, or WebP)
 * @returns 768-dimensional embedding array
 */
export async function generateImageEmbedding(imageFile: File): Promise<number[]> {
  // Validate input - file type and size
  const MAX_SIZE = 10 * 1024 * 1024 // 10MB
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

  if (!ALLOWED_TYPES.includes(imageFile.type)) {
    throw new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.')
  }

  if (imageFile.size > MAX_SIZE) {
    throw new Error('File too large. Maximum size is 10MB.')
  }

  if (imageFile.size === 0) {
    throw new Error('File is empty.')
  }

  // Validate environment configuration
  const modalUrl = process.env.MODAL_FUNCTION_URL
  if (!modalUrl) {
    throw new Error('MODAL_FUNCTION_URL not configured. Please set it in your environment variables.')
  }

  // Validate URL format
  try {
    new URL(modalUrl)
  } catch {
    throw new Error('Invalid MODAL_FUNCTION_URL configuration.')
  }

  // Prevent client-side execution
  if (typeof window !== 'undefined') {
    throw new Error('Modal API client cannot be used in browser context.')
  }

  // Convert image to base64 for API transmission
  const buffer = await imageFile.arrayBuffer()
  const base64 = Buffer.from(buffer).toString('base64')

  // Call Modal.com CLIP embedding function
  let response: Response;
  try {
    response = await fetchWithTimeout(`${modalUrl}/generate_single_embedding`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_data: base64,
      }),
      timeout: TIMEOUTS.VERY_SLOW, // 120s - ML inference can be slow
    })
  } catch (error: any) {
    // Provide specific error message for timeouts
    if (error.message?.includes('timeout')) {
      throw new Error('Image processing timed out after 2 minutes. Please try a smaller image.')
    }
    throw error
  }

  if (!response.ok) {
    const errorText = await response.text()
    console.error(`[Modal API] ${response.status}: ${errorText}`)
    throw new Error('Unable to process image. Please try again.')
  }

  const data = await response.json()

  // Validate response structure
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid API response format.')
  }

  if (!Array.isArray(data.embedding)) {
    throw new Error('Invalid API response: embedding is not an array.')
  }

  if (data.embedding.length !== 768) {
    throw new Error(`Invalid embedding dimension: expected 768, got ${data.embedding.length}.`)
  }

  if (!data.embedding.every((n: unknown) => typeof n === 'number' && isFinite(n))) {
    throw new Error('Invalid embedding: contains non-numeric values.')
  }

  return data.embedding
}

/**
 * Generate CLIP embedding for a text query
 *
 * @param text - Natural language query (e.g., "dark floral sketchy")
 * @returns 768-dimensional embedding array
 */
export async function generateTextEmbedding(text: string): Promise<number[]> {
  // Validate input - text length
  const MIN_LENGTH = 3
  const MAX_LENGTH = 500

  if (!text || text.trim().length < MIN_LENGTH) {
    throw new Error(`Text query too short. Minimum ${MIN_LENGTH} characters required.`)
  }

  if (text.length > MAX_LENGTH) {
    throw new Error(`Text query too long. Maximum ${MAX_LENGTH} characters allowed.`)
  }

  // Validate environment configuration
  const modalUrl = process.env.MODAL_FUNCTION_URL
  if (!modalUrl) {
    throw new Error('MODAL_FUNCTION_URL not configured. Please set it in your environment variables.')
  }

  // Validate URL format
  try {
    new URL(modalUrl)
  } catch {
    throw new Error('Invalid MODAL_FUNCTION_URL configuration.')
  }

  // Prevent client-side execution
  if (typeof window !== 'undefined') {
    throw new Error('Modal API client cannot be used in browser context.')
  }

  // Call Modal.com CLIP text embedding function
  let response: Response;
  try {
    response = await fetchWithTimeout(`${modalUrl}/generate_text_query_embedding`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: text.trim(),
      }),
      timeout: TIMEOUTS.SLOW, // 60s - text embeddings are faster than images
    })
  } catch (error: any) {
    // Provide specific error message for timeouts
    if (error.message?.includes('timeout')) {
      throw new Error('Text query timed out after 60 seconds. Please try a shorter query.')
    }
    throw error
  }

  if (!response.ok) {
    const errorText = await response.text()
    console.error(`[Modal API] ${response.status}: ${errorText}`)
    throw new Error('Unable to process text query. Please try again.')
  }

  const data = await response.json()

  // Validate response structure
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid API response format.')
  }

  if (!Array.isArray(data.embedding)) {
    throw new Error('Invalid API response: embedding is not an array.')
  }

  if (data.embedding.length !== 768) {
    throw new Error(`Invalid embedding dimension: expected 768, got ${data.embedding.length}.`)
  }

  if (!data.embedding.every((n: unknown) => typeof n === 'number' && isFinite(n))) {
    throw new Error('Invalid embedding: contains non-numeric values.')
  }

  return data.embedding
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
