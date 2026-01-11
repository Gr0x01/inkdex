import { NextRequest } from 'next/server'
import { generateImageEmbedding } from '@/lib/embeddings/hybrid-client'
import { classifyQueryStyles } from '@/lib/search/style-classifier'
import { analyzeImageColor } from '@/lib/search/color-analyzer'
import { MAX_FILE_SIZE, ALLOWED_IMAGE_TYPES } from '../schemas'
import type { SearchInput } from '@/lib/search/search-storage'

/**
 * Validation error with status code
 */
export class ImageValidationError extends Error {
  status: number
  constructor(message: string, status = 400) {
    super(message)
    this.name = 'ImageValidationError'
    this.status = status
  }
}

/**
 * Handle image upload search
 *
 * @param request - NextRequest with multipart/form-data
 * @returns SearchInput ready for storage
 * @throws ImageValidationError if validation fails
 */
export async function handleImageSearch(request: NextRequest): Promise<SearchInput> {
  const formData = await request.formData()

  const type = formData.get('type') as string
  const imageFile = formData.get('image') as File | null

  // Validate type
  if (type !== 'image') {
    throw new ImageValidationError('Invalid search type for form data')
  }

  // Validate file exists
  if (!imageFile) {
    throw new ImageValidationError('No image file provided')
  }

  // Validate file size
  if (imageFile.size > MAX_FILE_SIZE) {
    throw new ImageValidationError(
      `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`
    )
  }

  // Validate file type
  if (!ALLOWED_IMAGE_TYPES.includes(imageFile.type)) {
    throw new ImageValidationError(
      `File type must be one of: ${ALLOWED_IMAGE_TYPES.join(', ')}`
    )
  }

  // Convert file to buffer for color analysis
  const imageArrayBuffer = await imageFile.arrayBuffer()
  const imageBuffer = Buffer.from(imageArrayBuffer)

  // Analyze color in parallel with embedding generation
  const [embedding, colorResult] = await Promise.all([
    generateImageEmbedding(imageFile),
    analyzeImageColor(imageBuffer),
  ])

  const isColorQuery = colorResult.isColor
  console.log(
    `[Search] Color analysis: ${isColorQuery ? 'COLOR' : 'B&G'} (sat: ${colorResult.avgSaturation.toFixed(3)})`
  )

  // Classify query image styles for style-weighted search
  const queryStyles = await classifyQueryStyles(embedding)
  if (queryStyles.length > 0) {
    console.log(
      `[Search] Detected styles: ${queryStyles.map((s) => `${s.style_name}(${(s.confidence * 100).toFixed(0)}%)`).join(', ')}`
    )
  }

  return {
    searchType: 'image',
    embedding,
    queryText: null,
    queryStyles,
    isColorQuery,
    instagramUsername: null,
    instagramPostUrl: null,
    artistIdSource: null,
    searchedArtist: null,
  }
}
