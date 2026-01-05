/**
 * Migrate Profile Images Script
 * Downloads profile images from existing database URLs and uploads to Supabase Storage
 * No Apify required - uses the profile_image_url values saved during previous scrape
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

// Validate environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// Configuration
const CONCURRENT_DOWNLOADS = 50;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

interface Artist {
  id: string;
  instagram_handle: string;
  profile_image_url: string;
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Download image from URL with retries
 */
async function downloadImage(url: string, retries = MAX_RETRIES): Promise<Buffer | null> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
      });

      if (!response.ok) {
        if (response.status === 404) return null; // Don't retry 404s
        throw new Error(`HTTP ${response.status}`);
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.startsWith('image/')) {
        return null;
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      if (i < retries - 1) {
        await sleep(RETRY_DELAY_MS * (i + 1));
      }
    }
  }
  return null;
}

/**
 * Process image with Sharp and generate thumbnails
 */
async function processImage(buffer: Buffer): Promise<{
  original: Buffer;
  thumb320: Buffer;
  thumb640: Buffer;
} | null> {
  try {
    const image = sharp(buffer);
    const metadata = await image.metadata();

    if (!metadata.width || !metadata.height) return null;

    // Original (max 1280px, JPEG)
    const original = await sharp(buffer)
      .resize(1280, 1280, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();

    // 320px thumbnail (WebP)
    const thumb320 = await sharp(buffer)
      .resize(320, 320, { fit: 'cover' })
      .webp({ quality: 80 })
      .toBuffer();

    // 640px thumbnail (WebP)
    const thumb640 = await sharp(buffer)
      .resize(640, 640, { fit: 'cover' })
      .webp({ quality: 80 })
      .toBuffer();

    return { original, thumb320, thumb640 };
  } catch (error) {
    return null;
  }
}

/**
 * Upload image to Supabase Storage
 */
async function uploadToStorage(
  path: string,
  buffer: Buffer,
  contentType: string
): Promise<boolean> {
  const { error } = await supabase.storage
    .from('portfolio-images')
    .upload(path, buffer, {
      contentType,
      upsert: true
    });

  return !error;
}

/**
 * Process a single artist's profile image
 */
async function processArtist(artist: Artist): Promise<{ success: boolean; error?: string }> {
  try {
    // Download image
    const imageBuffer = await downloadImage(artist.profile_image_url);
    if (!imageBuffer) {
      return { success: false, error: 'Download failed' };
    }

    // Process with Sharp
    const processed = await processImage(imageBuffer);
    if (!processed) {
      return { success: false, error: 'Processing failed' };
    }

    // Generate storage paths
    const paths = {
      original: `profiles/original/${artist.id}.jpg`,
      thumb320: `profiles/320/${artist.id}.webp`,
      thumb640: `profiles/640/${artist.id}.webp`,
    };

    // Upload all versions
    const uploads = await Promise.all([
      uploadToStorage(paths.original, processed.original, 'image/jpeg'),
      uploadToStorage(paths.thumb320, processed.thumb320, 'image/webp'),
      uploadToStorage(paths.thumb640, processed.thumb640, 'image/webp'),
    ]);

    if (uploads.some(success => !success)) {
      return { success: false, error: 'Upload failed' };
    }

    // Update database
    const { error: dbError } = await supabase
      .from('artists')
      .update({
        profile_storage_path: paths.original,
        profile_storage_thumb_320: paths.thumb320,
        profile_storage_thumb_640: paths.thumb640,
      })
      .eq('id', artist.id);

    if (dbError) {
      return { success: false, error: `DB update failed: ${dbError.message}` };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Main migration workflow
 */
async function main() {
  console.log('🖼️  Profile Image Migration\n');
  console.log('Downloading from existing database URLs (no Apify needed)\n');

  // Get artists with CDN URLs that need migration (both cdninstagram and fbcdn)
  const { data: artists, error } = await supabase
    .from('artists')
    .select('id, instagram_handle, profile_image_url')
    .is('profile_storage_path', null)
    .or('profile_image_url.like.%cdninstagram%,profile_image_url.like.%fbcdn.net%')
    .order('created_at');

  if (error) {
    console.error('❌ Failed to fetch artists:', error.message);
    process.exit(1);
  }

  if (!artists || artists.length === 0) {
    console.log('✅ No artists need migration');
    process.exit(0);
  }

  console.log(`📋 Found ${artists.length} artists to migrate\n`);
  console.log(`🚀 Processing ${CONCURRENT_DOWNLOADS} artists in parallel\n`);

  let processed = 0;
  let succeeded = 0;
  let failed = 0;

  // Process in batches
  for (let i = 0; i < artists.length; i += CONCURRENT_DOWNLOADS) {
    const batch = artists.slice(i, i + CONCURRENT_DOWNLOADS);

    const results = await Promise.all(
      batch.map(async (artist) => {
        const result = await processArtist(artist as Artist);
        return { artist, result };
      })
    );

    // Update counts
    for (const { artist, result } of results) {
      processed++;
      if (result.success) {
        succeeded++;
      } else {
        failed++;
        // Only log first few errors to avoid spam
        if (failed <= 10) {
          console.log(`   ⚠️  @${artist.instagram_handle}: ${result.error}`);
        }
      }
    }

    // Progress update
    const progress = ((processed / artists.length) * 100).toFixed(1);
    console.log(`📊 Progress: ${progress}% (${processed}/${artists.length}) - ${succeeded} succeeded, ${failed} failed`);
  }

  // Summary
  console.log('\n📊 Migration Summary:');
  console.log(`   ✅ Succeeded: ${succeeded}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📈 Success rate: ${((succeeded / processed) * 100).toFixed(1)}%`);
}

main().catch(console.error);
