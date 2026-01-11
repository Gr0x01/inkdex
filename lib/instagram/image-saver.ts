/**
 * Image Saver Utilities
 *
 * Saves downloaded images to temp directory for processing pipeline
 */

import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import axios from 'axios';

/** UUID validation regex */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Instagram shortcode validation regex (8-15 alphanumeric chars + underscore/hyphen) */
const SHORTCODE_REGEX = /^[A-Za-z0-9_-]{8,15}$/;

/** Maximum image download size (10MB) */
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

const TEMP_DIR = '/tmp/instagram';

export interface ImageWithUrl {
  buffer: Buffer;
  shortcode: string;        // Instagram shortcode (e.g., "ABC123def_-")
  url: string;              // Instagram post URL (https://instagram.com/p/{shortcode}/)
  displayUrl: string;       // CDN URL (for reference/debugging)
  caption: string | null;
  timestamp: string | null; // ISO 8601
  likesCount: number | null;
}

/**
 * Save image buffers to temp directory for processing
 * Used by profile search flow where we already have buffers
 *
 * @param artistId - Artist UUID from database
 * @param images - Array of {url, buffer} objects
 * @param profileImageUrl - Optional profile image URL to download
 */
export async function saveImagesToTempFromBuffers(
  artistId: string,
  images: ImageWithUrl[],
  profileImageUrl?: string
): Promise<{ success: boolean; error?: string }> {
  // Security: Validate artistId is a valid UUID to prevent path traversal
  if (!UUID_REGEX.test(artistId)) {
    console.error(`[ImageSaver] Invalid artistId format: ${artistId}`);
    return { success: false, error: 'Invalid artist ID format' };
  }

  const artistDir = join(TEMP_DIR, artistId);

  try {
    // Create directory
    mkdirSync(artistDir, { recursive: true });

    // Generate metadata for each image
    const metadata: Array<{
      post_id: string;
      post_url: string;
      caption: string | null;
      timestamp: string;
      likes: number | null;
    }> = [];

    // Save each image with real Instagram metadata
    for (let i = 0; i < images.length; i++) {
      const image = images[i];

      // Security: Validate shortcode format to prevent path traversal
      // Instagram shortcodes are 8-15 chars of alphanumeric + underscore/hyphen
      let postId: string;
      if (SHORTCODE_REGEX.test(image.shortcode)) {
        postId = image.shortcode;
      } else {
        // Fallback to generated ID if shortcode is invalid/missing
        console.warn(`[ImageSaver] Invalid shortcode format, using fallback: ${image.shortcode}`);
        postId = `img_${i}_${artistId.slice(0, 8)}`;
      }

      const filename = `${postId}.jpg`;
      writeFileSync(join(artistDir, filename), image.buffer);

      metadata.push({
        post_id: postId,                    // Real shortcode or fallback
        post_url: image.url,                // Real Instagram post URL
        caption: image.caption,
        timestamp: image.timestamp || new Date().toISOString(),
        likes: image.likesCount,
      });
    }

    // Save profile image if available
    if (profileImageUrl) {
      try {
        const profileBuffer = await downloadImage(profileImageUrl);
        if (profileBuffer) {
          writeFileSync(join(artistDir, `${artistId}_profile.jpg`), profileBuffer);
          console.log(`[ImageSaver] Saved profile image for ${artistId}`);
        }
      } catch (err) {
        // Non-fatal - continue without profile image
        console.warn(`[ImageSaver] Failed to save profile image: ${err}`);
      }
    }

    // Write metadata file
    writeFileSync(join(artistDir, 'metadata.json'), JSON.stringify(metadata, null, 2));

    // Create .complete lock file to signal ready for processing
    writeFileSync(join(artistDir, '.complete'), '');

    console.log(`[ImageSaver] Saved ${images.length} images to ${artistDir}`);
    return { success: true };

  } catch (error) {
    console.error(`[ImageSaver] Failed to save images to temp:`, error);

    // Cleanup partial writes on error
    try {
      rmSync(artistDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error saving images'
    };
  }
}

/**
 * Download an image from URL
 */
async function downloadImage(imageUrl: string): Promise<Buffer | null> {
  try {
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 10000,
      maxContentLength: MAX_IMAGE_SIZE,
      maxBodyLength: MAX_IMAGE_SIZE,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    return Buffer.from(response.data);
  } catch (error) {
    console.warn(`[ImageSaver] Failed to download image: ${error instanceof Error ? error.message : 'unknown'}`);
    return null;
  }
}
