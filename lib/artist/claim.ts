/**
 * Artist Claim Utilities
 *
 * Hard delete scraped images from database + Supabase Storage
 */

import { createServiceClient } from '@/lib/supabase/service'

/**
 * Deletes all scraped portfolio images for an artist
 *
 * Process:
 * 1. Fetch storage paths from portfolio_images
 * 2. Delete from Supabase Storage (batch operation)
 * 3. Delete from database (CASCADE handles references)
 *
 * @param artistId - UUID of artist whose images should be deleted
 * @throws Error if database deletion fails
 */
export async function deleteScrapedImages(artistId: string): Promise<void> {
  const supabase = createServiceClient()

  try {
    console.log(`[Claim] Starting image deletion for artist ${artistId}`)

    // Step 1: Fetch all portfolio image storage paths
    const { data: scrapedImages, error: fetchError } = await supabase
      .from('portfolio_images')
      .select('id, storage_thumb_320, storage_thumb_640, storage_thumb_1280')
      .eq('artist_id', artistId)

    if (fetchError) {
      throw new Error(`Failed to fetch scraped images: ${fetchError.message}`)
    }

    if (!scrapedImages || scrapedImages.length === 0) {
      console.log(`[Claim] No scraped images to delete for artist ${artistId}`)
      return
    }

    console.log(`[Claim] Found ${scrapedImages.length} images to delete`)

    // Step 2: Delete from Supabase Storage (all 3 sizes per image)
    const storagePaths = scrapedImages.flatMap(img => [
      img.storage_thumb_320,
      img.storage_thumb_640,
      img.storage_thumb_1280,
    ].filter(Boolean) as string[])

    if (storagePaths.length > 0) {
      const { error: storageError } = await supabase.storage
        .from('portfolio-images')
        .remove(storagePaths)

      if (storageError) {
        // Log but don't fail - database cleanup is more critical
        console.error('[Claim] Storage deletion failed (non-blocking):', storageError)
      } else {
        console.log(`[Claim] Deleted ${storagePaths.length} storage files`)
      }
    }

    // Step 3: Delete from database (CASCADE handles references)
    const { error: deleteError } = await supabase
      .from('portfolio_images')
      .delete()
      .eq('artist_id', artistId)

    if (deleteError) {
      throw new Error(`Failed to delete portfolio images: ${deleteError.message}`)
    }

    console.log(`[Claim] Successfully deleted all ${scrapedImages.length} scraped images`)
  } catch (error) {
    console.error('[Claim] Image deletion error:', error)
    throw error
  }
}
