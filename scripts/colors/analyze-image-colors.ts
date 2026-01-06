#!/usr/bin/env npx tsx
/**
 * Image Color Analysis Script
 *
 * Analyzes portfolio images to determine if they are colorful or black-and-gray.
 * Uses saturation analysis via Sharp - no GPU required.
 *
 * Usage:
 *   npx tsx scripts/colors/analyze-image-colors.ts
 *   npx tsx scripts/colors/analyze-image-colors.ts --dry-run
 *   npx tsx scripts/colors/analyze-image-colors.ts --limit 100
 *   npx tsx scripts/colors/analyze-image-colors.ts --threshold 0.15
 *   npx tsx scripts/colors/analyze-image-colors.ts --concurrency 20
 *
 * Options:
 *   --dry-run         Don't update DB, just show results
 *   --limit N         Process only first N images (for testing)
 *   --threshold N     Saturation threshold for color (default: 0.15)
 *   --concurrency N   Parallel image downloads (default: 20)
 *   --reprocess       Reprocess images that already have is_color set
 */

import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })
dotenv.config()

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

interface PortfolioImage {
  id: string
  storage_thumb_320: string | null
  storage_thumb_640: string | null
}

interface ColorResult {
  id: string
  is_color: boolean
  avg_saturation: number
}

// Parse command line args
function parseArgs() {
  const args = process.argv.slice(2)
  let dryRun = false
  let limit: number | null = null
  let threshold = 0.15
  let concurrency = 20
  let reprocess = false

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dry-run') {
      dryRun = true
    } else if (args[i] === '--limit' && args[i + 1]) {
      limit = parseInt(args[i + 1], 10)
      i++
    } else if (args[i] === '--threshold' && args[i + 1]) {
      threshold = parseFloat(args[i + 1])
      i++
    } else if (args[i] === '--concurrency' && args[i + 1]) {
      concurrency = parseInt(args[i + 1], 10)
      i++
    } else if (args[i] === '--reprocess') {
      reprocess = true
    }
  }

  return { dryRun, limit, threshold, concurrency, reprocess }
}

/**
 * Get the public URL for a storage path
 */
function getStorageUrl(path: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/portfolio-images/${path}`
}

/**
 * Analyze an image to determine if it's colorful or black-and-gray
 * Uses average saturation in HSL color space
 */
async function analyzeImageColor(
  imageUrl: string,
  threshold: number
): Promise<{ isColor: boolean; avgSaturation: number } | null> {
  try {
    const response = await fetch(imageUrl)
    if (!response.ok) {
      return null
    }

    const buffer = await response.arrayBuffer()

    // Resize to small sample for speed (100x100 = 10k pixels)
    const { data, info } = await sharp(Buffer.from(buffer))
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
  } catch (error) {
    console.error(`Error analyzing image: ${error}`)
    return null
  }
}

/**
 * Process a batch of images in parallel
 */
async function processBatch(
  images: PortfolioImage[],
  threshold: number,
  concurrency: number
): Promise<ColorResult[]> {
  const results: ColorResult[] = []

  // Process in chunks of concurrency
  for (let i = 0; i < images.length; i += concurrency) {
    const chunk = images.slice(i, i + concurrency)

    const chunkResults = await Promise.all(
      chunk.map(async (image) => {
        const thumbPath = image.storage_thumb_320 || image.storage_thumb_640
        if (!thumbPath) {
          return null
        }

        const url = getStorageUrl(thumbPath)
        const analysis = await analyzeImageColor(url, threshold)

        if (!analysis) {
          return null
        }

        return {
          id: image.id,
          is_color: analysis.isColor,
          avg_saturation: analysis.avgSaturation,
        }
      })
    )

    results.push(...chunkResults.filter((r): r is ColorResult => r !== null))
  }

  return results
}

async function main() {
  const { dryRun, limit, threshold, concurrency, reprocess } = parseArgs()

  console.log('='.repeat(60))
  console.log('Image Color Analysis')
  console.log('='.repeat(60))
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`)
  console.log(`Saturation threshold: ${threshold}`)
  console.log(`Concurrency: ${concurrency}`)
  console.log(`Reprocess existing: ${reprocess}`)
  if (limit) console.log(`Limit: ${limit} images`)
  console.log('')

  // Fetch images
  console.log('Fetching images...')

  let query = supabase
    .from('portfolio_images')
    .select('id, storage_thumb_320, storage_thumb_640')
    .eq('status', 'active')
    .or('storage_thumb_320.not.is.null,storage_thumb_640.not.is.null')

  if (!reprocess) {
    query = query.is('is_color', null)
  }

  if (limit) {
    query = query.limit(limit)
  }

  const { data: images, error: fetchError } = await query

  if (fetchError) {
    console.error('Error fetching images:', fetchError)
    process.exit(1)
  }

  if (!images || images.length === 0) {
    console.log('No images to process.')
    return
  }

  console.log(`Found ${images.length} images to analyze`)
  console.log('')

  // Process images
  const startTime = Date.now()
  let processedCount = 0
  let colorCount = 0
  let bwCount = 0
  let errorCount = 0

  const PAGE_SIZE = 500
  const allResults: ColorResult[] = []

  for (let offset = 0; offset < images.length; offset += PAGE_SIZE) {
    const batch = images.slice(offset, offset + PAGE_SIZE)
    console.log(
      `Processing batch ${Math.floor(offset / PAGE_SIZE) + 1}/${Math.ceil(images.length / PAGE_SIZE)} (${batch.length} images)...`
    )

    const results = await processBatch(batch, threshold, concurrency)
    allResults.push(...results)

    processedCount += results.length
    colorCount += results.filter((r) => r.is_color).length
    bwCount += results.filter((r) => !r.is_color).length
    errorCount += batch.length - results.length

    const elapsed = (Date.now() - startTime) / 1000
    const rate = processedCount / elapsed
    console.log(
      `  Processed: ${processedCount}/${images.length} | Color: ${colorCount} | B&G: ${bwCount} | Errors: ${errorCount} | Rate: ${rate.toFixed(1)}/sec`
    )
  }

  console.log('')
  console.log('='.repeat(60))
  console.log('Summary')
  console.log('='.repeat(60))
  console.log(`Total processed: ${processedCount}`)
  console.log(`Color images: ${colorCount} (${((colorCount / processedCount) * 100).toFixed(1)}%)`)
  console.log(`B&G images: ${bwCount} (${((bwCount / processedCount) * 100).toFixed(1)}%)`)
  console.log(`Errors: ${errorCount}`)
  console.log(`Time: ${((Date.now() - startTime) / 1000).toFixed(1)}s`)
  console.log('')

  // Update database
  if (!dryRun && allResults.length > 0) {
    console.log('Updating database...')

    const BATCH_SIZE = 500
    for (let i = 0; i < allResults.length; i += BATCH_SIZE) {
      const batch = allResults.slice(i, i + BATCH_SIZE)

      // Update each image individually (Supabase doesn't support bulk update with different values)
      const updates = batch.map((result) =>
        supabase
          .from('portfolio_images')
          .update({ is_color: result.is_color })
          .eq('id', result.id)
      )

      await Promise.all(updates)

      console.log(`  Updated ${Math.min(i + BATCH_SIZE, allResults.length)}/${allResults.length}`)
    }

    console.log('Database updated successfully!')
  } else if (dryRun) {
    console.log('DRY RUN - No database changes made')

    // Show sample results
    console.log('')
    console.log('Sample results:')
    const samples = allResults.slice(0, 10)
    for (const result of samples) {
      console.log(
        `  ${result.id.slice(0, 8)}... | ${result.is_color ? 'COLOR' : 'B&G  '} | sat: ${result.avg_saturation.toFixed(3)}`
      )
    }
  }
}

main().catch(console.error)
