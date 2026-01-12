import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function resetArtistsWithoutImages() {
  console.log('Finding artists without images...');

  // Get all artist IDs
  const { data: artists } = await supabase.from('artists').select('id');

  // Get artist IDs that have images
  const { data: withImages } = await supabase
    .from('portfolio_images')
    .select('artist_id')
    .limit(100000);

  const artistsWithImages = new Set(withImages?.map((i) => i.artist_id) || []);
  const artistsWithoutImages = artists?.filter((a) => !artistsWithImages.has(a.id)) || [];

  console.log(`Found ${artistsWithoutImages.length} artists without images`);

  if (artistsWithoutImages.length === 0) {
    console.log('Nothing to reset');
    return;
  }

  // Reset their pipeline status to pending_scrape
  const artistIds = artistsWithoutImages.map((a) => a.id);

  // Batch update in chunks of 500 to avoid query limits
  const chunkSize = 500;
  let updated = 0;

  for (let i = 0; i < artistIds.length; i += chunkSize) {
    const chunk = artistIds.slice(i, i + chunkSize);
    const { error } = await supabase
      .from('artist_pipeline_state')
      .update({
        pipeline_status: 'pending_scrape',
        retry_count: 0,
        last_error: null,
        permanent_failure: false,
        updated_at: new Date().toISOString(),
      })
      .in('artist_id', chunk);

    if (error) {
      console.error('Error updating chunk:', error);
      continue;
    }

    updated += chunk.length;
    console.log(`Updated ${updated}/${artistsWithoutImages.length}`);
  }

  console.log(`Done! Reset ${updated} artists to pending_scrape`);
}

resetArtistsWithoutImages();
