#!/usr/bin/env npx tsx
/**
 * Debug script to check an artist's images and style tags
 *
 * Usage:
 *   npx tsx scripts/debug/check-artist-tags.ts <artistId>
 *   npx tsx scripts/debug/check-artist-tags.ts --count-profiles
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// If --count-profiles flag, count unique artists with profiles
if (process.argv.includes('--count-profiles')) {
  (async () => {
    console.log('Counting unique artists with style profiles...');
    const uniqueArtists = new Set<string>();
    let offset = 0;

    while (true) {
      const { data, error } = await supabase
        .from('artist_style_profiles')
        .select('artist_id')
        .range(offset, offset + 999);

      if (error) { console.error(error); break; }
      if (data === null || data.length === 0) break;

      data.forEach(p => uniqueArtists.add(p.artist_id));
      offset += 1000;

      if (offset % 10000 === 0) {
        console.log(`  Scanned ${offset} rows, found ${uniqueArtists.size} unique artists...`);
      }
    }

    console.log(`\nTotal unique artists with profiles: ${uniqueArtists.size}`);
    process.exit(0);
  })();
} else {
  // Original check function
}

async function check() {
  const artistId = process.argv[2] || '815ef618-1040-4d9e-a726-8b584609c2a2';

  console.log(`Checking artist: ${artistId}\n`);

  // Check images
  const { data: images, error: imgErr } = await supabase
    .from('portfolio_images')
    .select('id, instagram_post_id, status, embedding')
    .eq('artist_id', artistId);

  if (imgErr) {
    console.error('Image query error:', imgErr);
    return;
  }

  console.log(`Images found: ${images?.length || 0}`);

  let imagesWithEmbeddings = 0;
  let imagesWithTags = 0;

  for (const img of images || []) {
    const hasEmbed = img.embedding !== null;
    if (hasEmbed) imagesWithEmbeddings++;

    // Check tags for this image
    const { data: tags } = await supabase
      .from('image_style_tags')
      .select('style_name, confidence')
      .eq('image_id', img.id);

    if (tags && tags.length > 0) imagesWithTags++;

    console.log(`  ${img.instagram_post_id}: status=${img.status}, embedding=${hasEmbed}, tags=${tags?.length || 0}`);
    if (tags?.length) {
      tags.forEach(t => console.log(`    - ${t.style_name}: ${t.confidence.toFixed(2)}`));
    }
  }

  console.log(`\nSummary: ${imagesWithEmbeddings}/${images?.length} have embeddings, ${imagesWithTags}/${images?.length} have tags`);

  // Check artist_style_profiles
  const { data: profiles } = await supabase
    .from('artist_style_profiles')
    .select('style_name, percentage, image_count')
    .eq('artist_id', artistId);

  console.log(`\nArtist style profiles: ${profiles?.length || 0}`);
  profiles?.forEach(p => console.log(`  ${p.style_name}: ${p.percentage.toFixed(1)}% (${p.image_count} images)`));
}

check();
