/**
 * Color Analyzer for Query Images
 *
 * Analyzes uploaded search images to determine if they are colorful or black-and-gray.
 * Uses saturation analysis in HSL color space - same algorithm as batch script.
 */

import sharp from 'sharp'

// Saturation threshold - images with average saturation below this are B&G
const DEFAULT_SATURATION_THRESHOLD = 0.15

export interface ColorAnalysisResult {
  isColor: boolean
  avgSaturation: number
}

/**
 * Analyze an image buffer to determine if it's colorful or black-and-gray
 * Uses average saturation in HSL color space
 */
export async function analyzeImageColor(
  imageBuffer: Buffer,
  threshold: number = DEFAULT_SATURATION_THRESHOLD
): Promise<ColorAnalysisResult> {
  // Resize to small sample for speed (100x100 = 10k pixels)
  const { data, info } = await sharp(imageBuffer)
    .resize(100, 100, { fit: 'cover' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  // Calculate average saturation
  let totalSaturation = 0
  const pixelCount = info.width * info.height

  for (let i = 0; i < data.length; i += 3) {
    const r = data[i] / 255
    const g = data[i + 1] / 255
    const b = data[i + 2] / 255

    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const l = (max + min) / 2

    // Saturation in HSL
    let s = 0
    if (max !== min) {
      s = l > 0.5 ? (max - min) / (2 - max - min) : (max - min) / (max + min)
    }

    totalSaturation += s
  }

  const avgSaturation = totalSaturation / pixelCount
  const isColor = avgSaturation > threshold

  return { isColor, avgSaturation }
}

/**
 * Analyze a File object (from form upload) for color
 */
export async function analyzeFileColor(
  file: File,
  threshold: number = DEFAULT_SATURATION_THRESHOLD
): Promise<ColorAnalysisResult> {
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  return analyzeImageColor(buffer, threshold)
}

/**
 * Analyze an image from a URL for color
 */
export async function analyzeUrlColor(
  imageUrl: string,
  threshold: number = DEFAULT_SATURATION_THRESHOLD
): Promise<ColorAnalysisResult | null> {
  try {
    const response = await fetch(imageUrl)
    if (!response.ok) {
      return null
    }

    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    return analyzeImageColor(buffer, threshold)
  } catch (error) {
    console.error('Error analyzing image color from URL:', error)
    return null
  }
}
