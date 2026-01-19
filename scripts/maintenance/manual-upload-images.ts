/**
 * Manual Image Upload Script
 * Upload local images for an artist who doesn't have scrapable content
 *
 * Usage: npx tsx scripts/maintenance/manual-upload-images.ts --handle kellyedwardstattoo --dir tmp/
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { readdirSync, readFileSync, statSync } from 'fs';
import { join, basename } from 'path';
import { createClient } from '@supabase/supabase-js';
import { processLocalImage } from '../../lib/processing/image-processor';
import { uploadImage, generateImagePaths } from '../../lib/storage/supabase-storage';
import { analyzeImageColor } from '../../lib/search/color-analyzer';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing SUPABASE env vars');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function uploadWithRetry(
  path: string,
  buffer: Buffer,
  options: any,
  retries = 3
): Promise<{ success: boolean; publicUrl?: string; error?: string }> {
  for (let i = 0; i < retries; i++) {
    const result = await uploadImage(path, buffer, options);
    if (result.success) return result;
    if (i < retries - 1) {
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
  return { success: false, error: 'Max retries exceeded' };
}

async function main() {
  const args = process.argv.slice(2);
  const handleIdx = args.indexOf('--handle');
  const dirIdx = args.indexOf('--dir');
  const filterIdx = args.indexOf('--filter');

  if (handleIdx === -1 || dirIdx === -1) {
    console.log('Usage: npx tsx scripts/maintenance/manual-upload-images.ts --handle <instagram_handle> --dir <path_to_images> [--filter <pattern>]');
    process.exit(1);
  }

  const handle = args[handleIdx + 1];
  const imageDir = args[dirIdx + 1];
  const filterPattern = filterIdx !== -1 ? args[filterIdx + 1] : null;

  console.log(`\n🖼️  Manual Image Upload for @${handle}\n`);

  // Get artist ID
  const { data: artist, error: artistError } = await supabase
    .from('artists')
    .select('id, name')
    .eq('instagram_handle', handle)
    .single();

  if (artistError || !artist) {
    console.error(`❌ Artist @${handle} not found`);
    process.exit(1);
  }

  console.log(`✅ Found artist: ${artist.name} (${artist.id})\n`);

  // Find image files (png, jpg, jpeg, webp)
  let imageFiles = readdirSync(imageDir).filter(f =>
    /\.(png|jpg|jpeg|webp)$/i.test(f)
  );

  // Apply filter pattern if provided
  if (filterPattern) {
    imageFiles = imageFiles.filter(f => f.includes(filterPattern));
    console.log(`🔍 Filter: "${filterPattern}"`);
  }

  if (imageFiles.length === 0) {
    console.error(`❌ No image files found in ${imageDir}`);
    process.exit(1);
  }

  console.log(`📷 Found ${imageFiles.length} images to upload\n`);

  let uploaded = 0;
  let errors = 0;

  const timestamp = Date.now();
  for (let i = 0; i < imageFiles.length; i++) {
    const file = imageFiles[i];
    const imagePath = join(imageDir, file);
    const postId = `manual_${timestamp}_${i}`;

    console.log(`Processing ${file}...`);

    try {
      // Process image (generate thumbnails)
      const { success, buffers, error } = await processLocalImage(imagePath);

      if (!success || !buffers) {
        console.error(`   ❌ Failed to process: ${error}`);
        errors++;
        continue;
      }

      // Generate storage paths
      const paths = generateImagePaths(artist.id, postId);

      // Upload all sizes
      const uploadPromises = [
        uploadWithRetry(paths.original, buffers.original, { contentType: 'image/jpeg', upsert: true }),
        uploadWithRetry(paths.thumb320, buffers.thumb320, { contentType: 'image/webp', upsert: true }),
        uploadWithRetry(paths.thumb640, buffers.thumb640, { contentType: 'image/webp', upsert: true }),
        uploadWithRetry(paths.thumb1280, buffers.thumb1280, { contentType: 'image/webp', upsert: true }),
      ];

      const uploadResults = await Promise.all(uploadPromises);

      if (uploadResults.some(r => !r.success)) {
        console.error(`   ❌ Upload failed`);
        errors++;
        continue;
      }

      // Analyze color
      let isColor: boolean | null = null;
      try {
        const colorResult = await analyzeImageColor(buffers.thumb320);
        isColor = colorResult.isColor;
      } catch (e) {
        // Non-fatal
      }

      // Insert into database
      const { error: dbError } = await supabase
        .from('portfolio_images')
        .insert({
          artist_id: artist.id,
          instagram_post_id: postId,
          instagram_url: `https://instagram.com/${handle}`,
          storage_original_path: paths.original,
          storage_thumb_320: paths.thumb320,
          storage_thumb_640: paths.thumb640,
          storage_thumb_1280: paths.thumb1280,
          post_caption: `Manual upload: ${file}`,
          post_timestamp: new Date().toISOString(),
          likes_count: 0,
          status: 'pending',
          is_color: isColor,
        });

      if (dbError) {
        console.error(`   ❌ DB insert failed: ${dbError.message}`);
        errors++;
        continue;
      }

      uploaded++;
      console.log(`   ✅ Uploaded (${uploaded}/${imageFiles.length})`);

    } catch (e: any) {
      console.error(`   ❌ Error: ${e.message}`);
      errors++;
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Uploaded: ${uploaded}`);
  console.log(`   Errors: ${errors}`);

  if (uploaded > 0) {
    console.log(`\n💡 Next steps:`);
    console.log(`   1. Generate embeddings: npx tsx scripts/embeddings/generate-embeddings.ts --artist-id ${artist.id}`);
    console.log(`   2. Tag styles: npx tsx scripts/styles/tag-images-ml.ts --artist-id ${artist.id}`);
  }
}

main().catch(console.error);
