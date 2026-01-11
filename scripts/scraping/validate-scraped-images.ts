/**
 * Validation Script
 * Validates scraped images and generates statistics
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { join } from 'path';

// Load environment variables
dotenv.config({ path: join(__dirname, '../../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function validateScrapedImages() {
  console.log('🔍 Validation Report\n');

  try {
    // 1. Get total artists
    const { data: artists, error: artistsError } = await supabase
      .from('artists')
      .select('id, name, instagram_handle');

    if (artistsError) {
      console.error('❌ Failed to fetch artists:', artistsError.message);
      process.exit(1);
    }

    const totalArtists = artists?.length || 0;
    console.log(`📊 Total Artists: ${totalArtists}`);

    // 2. Get scraping job statistics
    const { data: jobs, error: jobsError } = await supabase
      .from('pipeline_jobs')
      .select('status, result_data, error_message')
      .eq('job_type', 'scrape_single');

    if (jobsError) {
      console.error('❌ Failed to fetch pipeline jobs:', jobsError.message);
      process.exit(1);
    }

    const completedJobs = jobs?.filter(j => j.status === 'completed') || [];
    const failedJobs = jobs?.filter(j => j.status === 'failed') || [];
    const inProgressJobs = jobs?.filter(j => j.status === 'running') || [];

    console.log(`\n📋 Scraping Jobs:`);
    console.log(`   Completed: ${completedJobs.length}`);
    console.log(`   Failed: ${failedJobs.length}`);
    console.log(`   In Progress: ${inProgressJobs.length}`);

    // 3. Get portfolio images statistics
    const { data: images, error: imagesError } = await supabase
      .from('portfolio_images')
      .select('id, artist_id, status, storage_original_path, storage_thumb_320, storage_thumb_640, storage_thumb_1280');

    if (imagesError) {
      console.error('❌ Failed to fetch portfolio images:', imagesError.message);
      process.exit(1);
    }

    const totalImages = images?.length || 0;
    console.log(`\n🖼️  Portfolio Images:`);
    console.log(`   Total: ${totalImages}`);

    // Check for missing thumbnails
    const missingThumbnails = images?.filter(img =>
      !img.storage_original_path ||
      !img.storage_thumb_320 ||
      !img.storage_thumb_640 ||
      !img.storage_thumb_1280
    ) || [];

    if (missingThumbnails.length > 0) {
      console.log(`   ⚠️  Missing thumbnails: ${missingThumbnails.length}`);
    } else {
      console.log(`   ✅ All images have complete thumbnails`);
    }

    // 4. Images per artist analysis
    const imagesByArtist = new Map<string, number>();
    images?.forEach(img => {
      const count = imagesByArtist.get(img.artist_id) || 0;
      imagesByArtist.set(img.artist_id, count + 1);
    });

    const artistsWithImages = imagesByArtist.size;
    const artistsWithLowImages = Array.from(imagesByArtist.entries())
      .filter(([_, count]) => count < 10).length;

    console.log(`\n📈 Artist Coverage:`);
    console.log(`   Artists with images: ${artistsWithImages}/${totalArtists}`);
    console.log(`   Average images per artist: ${(totalImages / artistsWithImages).toFixed(1)}`);

    if (artistsWithLowImages > 0) {
      console.log(`   ⚠️  Artists with <10 images: ${artistsWithLowImages}`);
    }

    // 5. List artists with low images
    if (artistsWithLowImages > 0) {
      console.log(`\n   Artists with fewer than 10 images:`);
      const lowImageArtists = Array.from(imagesByArtist.entries())
        .filter(([_, count]) => count < 10)
        .slice(0, 10); // Show first 10

      for (const [artistId, count] of lowImageArtists) {
        const artist = artists?.find(a => a.id === artistId);
        if (artist) {
          console.log(`      ${artist.name} (@${artist.instagram_handle}): ${count} images`);
        }
      }

      if (artistsWithLowImages > 10) {
        console.log(`      ... and ${artistsWithLowImages - 10} more`);
      }
    }

    // 6. Failed jobs report
    if (failedJobs.length > 0) {
      console.log(`\n❌ Failed Jobs (${failedJobs.length}):`);
      failedJobs.slice(0, 10).forEach((job, i) => {
        console.log(`   ${i + 1}. ${job.error_message || 'Unknown error'}`);
      });

      if (failedJobs.length > 10) {
        console.log(`   ... and ${failedJobs.length - 10} more`);
      }
    }

    // 7. Storage quota estimate
    // Approximate size: original ~2MB + 3 thumbnails ~600KB = ~2.6MB per image
    const estimatedStorageGB = (totalImages * 2.6) / 1024;
    console.log(`\n💾 Estimated Storage Usage:`);
    console.log(`   ~${estimatedStorageGB.toFixed(2)} GB (${totalImages} images × ~2.6MB)`);
    console.log(`   Supabase Pro limit: 100 GB`);
    console.log(`   Usage: ${((estimatedStorageGB / 100) * 100).toFixed(1)}%`);

    // 8. Next steps
    console.log(`\n✅ Validation Complete`);

    if (artistsWithImages < totalArtists) {
      console.log(`\n📋 Recommendations:`);
      console.log(`   - ${totalArtists - artistsWithImages} artists still need scraping`);
      console.log(`   - Run: npm run scrape-instagram (will auto-resume)`);
    }

    if (failedJobs.length > 0) {
      console.log(`\n   - ${failedJobs.length} failed jobs`);
      console.log(`   - Review errors and retry if needed`);
      console.log(`   - Run: npm run scrape-instagram:reset (to retry all failures)`);
    }

    if (artistsWithImages === totalArtists && totalImages > 1000) {
      console.log(`\n   ✅ Ready for Phase 4: Generate CLIP embeddings`);
    }

  } catch (error: any) {
    console.error('\n❌ Validation failed:', error.message);
    process.exit(1);
  }
}

validateScrapedImages();
