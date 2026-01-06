/**
 * Production Data Dump Script for Local Supabase
 *
 * Exports a subset of production data (~1000 artists, 5000 images) for local development.
 * Outputs SQL to supabase/seed.sql which is loaded on `supabase db reset`.
 *
 * Usage:
 *   npx tsx scripts/seed/dump-production-seed.ts
 *   npx tsx scripts/seed/dump-production-seed.ts --artists 500  # Custom artist count
 *
 * What gets exported:
 * - All style_seeds (20 styles with embeddings)
 * - Top artists by portfolio image count
 * - Their portfolio_images with embeddings
 * - Matching artist_locations, artist_style_profiles, image_style_tags
 *
 * Output: supabase/seed.sql (~200MB for 1000 artists)
 *
 * Prerequisites:
 * - Production env vars set (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { config } from 'dotenv';

// Load environment variables from .env.local
config({ path: '.env.local' });

// Parse CLI args
const args = process.argv.slice(2);
const artistCountArg = args.find((a) => a.startsWith('--artists'));
const ARTIST_COUNT = artistCountArg
  ? parseInt(artistCountArg.split('=')[1] || args[args.indexOf('--artists') + 1])
  : 500;
const IMAGES_PER_ARTIST = 6;

// Initialize Supabase client with service role (production)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Validate we're pointing to production, not local
if (supabaseUrl.includes('127.0.0.1') || supabaseUrl.includes('localhost')) {
  console.error('❌ ERROR: NEXT_PUBLIC_SUPABASE_URL points to local Supabase!');
  console.error('   This script must connect to production to dump real data.');
  console.error('   Make sure your .env.local has production credentials.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const OUTPUT_FILE = path.join(process.cwd(), 'supabase', 'seed.sql');

// Escape SQL string values
function escapeSQL(value: unknown): string {
  if (value === null || value === undefined) {
    return 'NULL';
  }
  if (typeof value === 'boolean') {
    return value ? 'TRUE' : 'FALSE';
  }
  if (typeof value === 'number') {
    return value.toString();
  }
  if (value instanceof Date) {
    return `'${value.toISOString()}'`;
  }
  if (Array.isArray(value)) {
    // Handle vector arrays (embeddings) - format as pgvector literal
    return `'[${value.join(',')}]'`;
  }
  if (typeof value === 'object') {
    // Cast to jsonb for proper PostgreSQL handling
    return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
  }
  // String - check if it's already a vector string from Supabase (e.g., "[0.1,0.2,...]")
  const strValue = String(value);
  if (strValue.startsWith('[') && strValue.endsWith(']') && strValue.includes(',')) {
    // Likely a vector - return as-is (already formatted)
    return `'${strValue}'`;
  }
  return `'${strValue.replace(/'/g, "''")}'`;
}

// Generate INSERT statement for a row
function generateInsert(table: string, row: Record<string, unknown>, columns: string[]): string {
  const values = columns.map((col) => escapeSQL(row[col]));
  return `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${values.join(', ')}) ON CONFLICT DO NOTHING;`;
}

async function main() {
  console.log(`\n🔄 Dumping production data for local development...`);
  console.log(`   Target: ${ARTIST_COUNT} artists, ~${ARTIST_COUNT * IMAGES_PER_ARTIST} images\n`);

  const sqlStatements: string[] = [];

  // Header
  sqlStatements.push(`-- Production data seed for local Supabase development`);
  sqlStatements.push(`-- Generated: ${new Date().toISOString()}`);
  sqlStatements.push(`-- Artists: ${ARTIST_COUNT}, Images per artist: ${IMAGES_PER_ARTIST}`);
  sqlStatements.push(``);
  sqlStatements.push(`-- Enable required extensions`);
  sqlStatements.push(`CREATE EXTENSION IF NOT EXISTS vector;`);
  sqlStatements.push(`CREATE EXTENSION IF NOT EXISTS pg_trgm;`);
  sqlStatements.push(``);

  // 1. Export all style_seeds (required for search)
  console.log('📦 Exporting style_seeds...');
  const { data: styleSeeds, error: styleSeedsError } = await supabase
    .from('style_seeds')
    .select('*');

  if (styleSeedsError) {
    console.error('❌ Failed to fetch style_seeds:', styleSeedsError.message);
    process.exit(1);
  }

  sqlStatements.push(`-- Style Seeds (${styleSeeds?.length || 0} styles)`);
  const styleSeedColumns = styleSeeds && styleSeeds.length > 0 ? Object.keys(styleSeeds[0]) : [];

  for (const seed of styleSeeds || []) {
    sqlStatements.push(generateInsert('style_seeds', seed, styleSeedColumns));
  }
  sqlStatements.push(``);
  console.log(`   ✅ ${styleSeeds?.length || 0} style seeds`);

  // 2. Get top artists by image count
  console.log('📦 Exporting artists...');
  const { data: artists, error: artistsError } = await supabase
    .from('artists')
    .select('*')
    .is('deleted_at', null)
    .eq('is_gdpr_blocked', false)
    .order('follower_count', { ascending: false, nullsFirst: false })
    .limit(ARTIST_COUNT);

  if (artistsError) {
    console.error('❌ Failed to fetch artists:', artistsError.message);
    process.exit(1);
  }

  const artistIds = (artists || []).map((a) => a.id);
  console.log(`   ✅ ${artists?.length || 0} artists`);

  sqlStatements.push(`-- Artists (${artists?.length || 0})`);
  // Use dynamic columns from first row
  const artistColumns = artists && artists.length > 0 ? Object.keys(artists[0]) : [];

  // Randomize verification_status, is_pro, is_featured for test data
  // Higher percentages to ensure visibility on first page of search results
  // 40% claimed, 15% pro, 10% featured
  for (let i = 0; i < (artists || []).length; i++) {
    const artist = { ...(artists || [])[i] };
    const rand = Math.random();

    // 15% pro (always claimed)
    if (rand < 0.15) {
      artist.is_pro = true;
      artist.verification_status = 'claimed';
    }
    // 25% more claimed (non-pro) = 40% total claimed
    else if (rand < 0.40) {
      artist.is_pro = false;
      artist.verification_status = 'claimed';
    }
    // 60% unclaimed
    else {
      artist.is_pro = false;
      artist.verification_status = 'unclaimed';
    }

    // 10% featured (independent)
    artist.is_featured = Math.random() < 0.10;

    sqlStatements.push(generateInsert('artists', artist, artistColumns));
  }
  sqlStatements.push(``);

  // 3. Export artist_locations for these artists (batched)
  console.log('📦 Exporting artist_locations...');
  const allLocations: Array<Record<string, unknown>> = [];
  let locationColumns: string[] = [];

  for (let i = 0; i < artistIds.length; i += 200) {
    const batch = artistIds.slice(i, i + 200);
    const { data: locations, error: locationsError } = await supabase
      .from('artist_locations')
      .select('*')
      .in('artist_id', batch);

    if (locationsError) {
      console.error(`⚠️ Failed to fetch locations batch ${i}:`, locationsError.message);
      continue;
    }

    if (locationColumns.length === 0 && locations && locations.length > 0) {
      locationColumns = Object.keys(locations[0]);
    }
    if (locations) {
      allLocations.push(...locations);
    }
  }

  sqlStatements.push(`-- Artist Locations (${allLocations.length})`);
  for (const loc of allLocations) {
    sqlStatements.push(generateInsert('artist_locations', loc, locationColumns));
  }
  sqlStatements.push(``);
  console.log(`   ✅ ${allLocations.length} locations`);

  // 4. Export portfolio_images with embeddings (batched for performance)
  console.log('📦 Exporting portfolio_images...');

  // Image columns will be determined from first result
  let imageColumns: string[] = [];

  // Fetch images in batches of artist IDs for better performance
  const BATCH_SIZE = 100;
  const allImages: Array<Record<string, unknown>> = [];
  const failedBatches: number[] = [];

  for (let i = 0; i < artistIds.length; i += BATCH_SIZE) {
    const batchIds = artistIds.slice(i, i + BATCH_SIZE);
    const progress = Math.round(((i + batchIds.length) / artistIds.length) * 100);
    process.stdout.write(`\r   Fetching images... ${progress}%`);

    // Fetch all images for this batch of artists, then limit per artist in JS
    const { data: images, error: imagesError } = await supabase
      .from('portfolio_images')
      .select('*')
      .in('artist_id', batchIds)
      .eq('status', 'active')
      .not('embedding', 'is', null)
      .order('likes_count', { ascending: false, nullsFirst: false });

    if (imagesError) {
      console.error(`\n⚠️ Failed to fetch images for batch ${i}-${i + batchIds.length}:`, imagesError.message);
      failedBatches.push(i);
      continue;
    }

    // Set columns from first batch
    if (imageColumns.length === 0 && images && images.length > 0) {
      imageColumns = Object.keys(images[0]);
    }

    // Group by artist and take top N per artist
    const imagesByArtist = new Map<string, Array<Record<string, unknown>>>();
    for (const img of images || []) {
      const artistId = img.artist_id as string;
      if (!imagesByArtist.has(artistId)) {
        imagesByArtist.set(artistId, []);
      }
      const artistImages = imagesByArtist.get(artistId)!;
      if (artistImages.length < IMAGES_PER_ARTIST) {
        artistImages.push(img);
      }
    }

    // Flatten back to array
    imagesByArtist.forEach((artistImages) => {
      allImages.push(...artistImages);
    });
  }

  console.log(`\r   Fetching images... done!     `);

  if (failedBatches.length > 0) {
    console.warn(`   ⚠️ WARNING: ${failedBatches.length} batches failed. Some images may be missing.`);
  }

  sqlStatements.push(`-- Portfolio Images (${allImages.length})`);
  const exportedImageIds: string[] = [];

  for (const img of allImages) {
    sqlStatements.push(generateInsert('portfolio_images', img, imageColumns));
    exportedImageIds.push(img.id as string);
  }
  sqlStatements.push(``);
  console.log(`   ✅ ${allImages.length} images with embeddings`);

  // 5. Export artist_style_profiles (batched)
  console.log('📦 Exporting artist_style_profiles...');
  const allStyleProfiles: Array<Record<string, unknown>> = [];
  let styleProfileColumns: string[] = [];

  for (let i = 0; i < artistIds.length; i += 200) {
    const batch = artistIds.slice(i, i + 200);
    const { data: styleProfiles, error: styleProfilesError } = await supabase
      .from('artist_style_profiles')
      .select('*')
      .in('artist_id', batch);

    if (styleProfilesError) {
      console.error(`⚠️ Failed to fetch style profiles batch ${i}:`, styleProfilesError.message);
      continue;
    }

    if (styleProfileColumns.length === 0 && styleProfiles && styleProfiles.length > 0) {
      styleProfileColumns = Object.keys(styleProfiles[0]);
    }
    if (styleProfiles) {
      allStyleProfiles.push(...styleProfiles);
    }
  }

  if (allStyleProfiles.length > 0) {
    sqlStatements.push(`-- Artist Style Profiles (${allStyleProfiles.length})`);
    for (const profile of allStyleProfiles) {
      sqlStatements.push(generateInsert('artist_style_profiles', profile, styleProfileColumns));
    }
    sqlStatements.push(``);
    console.log(`   ✅ ${allStyleProfiles.length} style profiles`);
  } else {
    console.log(`   ⚠️ No style profiles found`);
  }

  // 6. Export artist_color_profiles (batched)
  console.log('📦 Exporting artist_color_profiles...');
  const allColorProfiles: Array<Record<string, unknown>> = [];
  let colorProfileColumns: string[] = [];

  for (let i = 0; i < artistIds.length; i += 200) {
    const batch = artistIds.slice(i, i + 200);
    const { data: colorProfiles, error: colorProfilesError } = await supabase
      .from('artist_color_profiles')
      .select('*')
      .in('artist_id', batch);

    if (colorProfilesError) {
      // Table might not exist yet, just skip
      if (i === 0) {
        console.log(`   ⚠️ No color profiles found (table may not exist yet)`);
      }
      break;
    }

    if (colorProfileColumns.length === 0 && colorProfiles && colorProfiles.length > 0) {
      colorProfileColumns = Object.keys(colorProfiles[0]);
    }
    if (colorProfiles) {
      allColorProfiles.push(...colorProfiles);
    }
  }

  if (allColorProfiles.length > 0) {
    sqlStatements.push(`-- Artist Color Profiles (${allColorProfiles.length})`);
    for (const profile of allColorProfiles) {
      sqlStatements.push(generateInsert('artist_color_profiles', profile, colorProfileColumns));
    }
    sqlStatements.push(``);
    console.log(`   ✅ ${allColorProfiles.length} color profiles`);
  }

  // 7. Export image_style_tags for the images we exported
  console.log('📦 Exporting image_style_tags...');

  if (exportedImageIds.length > 0) {
    const allTags: Array<Record<string, unknown>> = [];

    // Fetch in batches of 500 to avoid query limits
    for (let i = 0; i < exportedImageIds.length; i += 500) {
      const batch = exportedImageIds.slice(i, i + 500);
      const progress = Math.round(((i + batch.length) / exportedImageIds.length) * 100);
      process.stdout.write(`\r   Fetching style tags... ${progress}%`);

      const { data: tags, error: tagsError } = await supabase
        .from('image_style_tags')
        .select('*')
        .in('image_id', batch);

      if (!tagsError && tags) {
        allTags.push(...tags);
      }
    }

    console.log(`\r   Fetching style tags... done!     `);

    sqlStatements.push(`-- Image Style Tags (${allTags.length})`);
    const tagColumns = allTags.length > 0 ? Object.keys(allTags[0]) : [];

    for (const tag of allTags) {
      sqlStatements.push(generateInsert('image_style_tags', tag, tagColumns));
    }
    sqlStatements.push(``);
    console.log(`   ✅ ${allTags.length} image style tags`);
  }

  // 8. Add vector index recreation at the end
  // Calculate optimal lists parameter: sqrt(row_count), min 10
  const lists = Math.max(10, Math.floor(Math.sqrt(allImages.length)));
  sqlStatements.push(`-- Recreate vector index after data load (lists=${lists} for ${allImages.length} images)`);
  sqlStatements.push(`DROP INDEX IF EXISTS idx_portfolio_embeddings;`);
  sqlStatements.push(
    `CREATE INDEX idx_portfolio_embeddings ON portfolio_images USING ivfflat (embedding vector_cosine_ops) WITH (lists = ${lists});`
  );
  sqlStatements.push(``);

  // Write to file
  console.log(`\n💾 Writing to ${OUTPUT_FILE}...`);
  fs.writeFileSync(OUTPUT_FILE, sqlStatements.join('\n'), 'utf-8');

  const fileSizeMB = (fs.statSync(OUTPUT_FILE).size / 1024 / 1024).toFixed(1);
  console.log(`\n✅ Seed file generated successfully!`);
  console.log(`   File: ${OUTPUT_FILE}`);
  console.log(`   Size: ${fileSizeMB} MB`);
  console.log(`   Artists: ${artists?.length || 0}`);
  console.log(`   Images: ${allImages.length}`);
  console.log(`   Style seeds: ${styleSeeds?.length || 0}`);
  console.log(`\n📝 Next steps:`);
  console.log(`   1. supabase start`);
  console.log(`   2. supabase db reset  (loads seed.sql automatically)`);
  console.log(`   3. Update .env.local to use local Supabase URLs`);
}

main().catch((err) => {
  console.error('❌ Script failed:', err);
  process.exit(1);
});
