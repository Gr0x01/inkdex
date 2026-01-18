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
const imagesPerArtistArg = args.find((a) => a.startsWith('--images'));
const ARTIST_COUNT = artistCountArg
  ? parseInt(artistCountArg.split('=')[1] || args[args.indexOf('--artists') + 1])
  : 500;
const IMAGES_PER_ARTIST = imagesPerArtistArg
  ? parseInt(imagesPerArtistArg.split('=')[1] || args[args.indexOf('--images') + 1])
  : 6;
const ALL_IMAGES = args.includes('--all-images');

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

// Write stream for incremental file writing (avoids memory issues with large datasets)
let writeStream: fs.WriteStream;
let totalBytesWritten = 0;

function writeLine(line: string) {
  writeStream.write(line + '\n');
  totalBytesWritten += line.length + 1;
}

function writeLines(lines: string[]) {
  for (const line of lines) {
    writeLine(line);
  }
}

async function main() {
  console.log(`\n🔄 Dumping production data for local development...`);
  const imageInfo = ALL_IMAGES ? 'all images' : `~${IMAGES_PER_ARTIST} images/artist`;
  console.log(`   Target: ${ARTIST_COUNT} artists, ${imageInfo}\n`);

  // Create write stream for incremental output
  writeStream = fs.createWriteStream(OUTPUT_FILE, { encoding: 'utf-8' });

  // Header
  writeLines([
    `-- Production data seed for local Supabase development`,
    `-- Generated: ${new Date().toISOString()}`,
    `-- Artists: ${ARTIST_COUNT}, Images: ${ALL_IMAGES ? 'all' : IMAGES_PER_ARTIST + ' per artist'}`,
    ``,
    `-- Enable required extensions`,
    `CREATE EXTENSION IF NOT EXISTS vector;`,
    `CREATE EXTENSION IF NOT EXISTS pg_trgm;`,
    ``,
  ]);

  // 1. Export all style_seeds (required for search)
  console.log('📦 Exporting style_seeds...');
  const { data: styleSeeds, error: styleSeedsError } = await supabase
    .from('style_seeds')
    .select('*');

  if (styleSeedsError) {
    console.error('❌ Failed to fetch style_seeds:', styleSeedsError.message);
    process.exit(1);
  }

  writeLine(`-- Style Seeds (${styleSeeds?.length || 0} styles)`);
  const styleSeedColumns = styleSeeds && styleSeeds.length > 0 ? Object.keys(styleSeeds[0]) : [];

  for (const seed of styleSeeds || []) {
    writeLine(generateInsert('style_seeds', seed, styleSeedColumns));
  }
  writeLine(``);
  console.log(`   ✅ ${styleSeeds?.length || 0} style seeds`);

  // 2. Get top artists by follower count (paginated to work around 5000 row limit)
  console.log('📦 Exporting artists...');
  const artists: Array<Record<string, unknown>> = [];
  const PAGE_SIZE = 1000;

  for (let offset = 0; offset < ARTIST_COUNT; offset += PAGE_SIZE) {
    const limit = Math.min(PAGE_SIZE, ARTIST_COUNT - offset);
    process.stdout.write(`\r   Fetching artists... ${offset}/${ARTIST_COUNT}`);

    const { data, error: artistsError } = await supabase
      .from('artists')
      .select('*')
      .is('deleted_at', null)
      .order('follower_count', { ascending: false, nullsFirst: false })
      .range(offset, offset + limit - 1);

    if (artistsError) {
      console.error(`\n❌ Failed to fetch artists at offset ${offset}:`, artistsError.message);
      break;
    }

    if (!data || data.length === 0) {
      console.log(`\n   Reached end of artists at ${artists.length}`);
      break;
    }

    artists.push(...data);
  }

  const artistIds = artists.map((a) => a.id as string);
  console.log(`\r   ✅ ${artists.length} artists                    `);

  writeLine(`-- Artists (${artists?.length || 0})`);
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

    writeLine(generateInsert('artists', artist, artistColumns));
  }
  writeLine(``);

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

  writeLine(`-- Artist Locations (${allLocations.length})`);
  for (const loc of allLocations) {
    writeLine(generateInsert('artist_locations', loc, locationColumns));
  }
  writeLine(``);
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
    // With retry logic for network failures
    let retries = 3;
    let images: Array<Record<string, unknown>> | null = null;
    while (retries > 0 && !images) {
      const { data, error: imagesError } = await supabase
        .from('portfolio_images')
        .select('*')
        .in('artist_id', batchIds)
        .eq('status', 'active')
        .not('embedding', 'is', null)
        .order('likes_count', { ascending: false, nullsFirst: false });

      if (imagesError) {
        retries--;
        if (retries === 0) {
          console.error(`\n⚠️ Failed to fetch images for batch ${i}-${i + batchIds.length}:`, imagesError.message);
          failedBatches.push(i);
        } else {
          await new Promise((r) => setTimeout(r, 1000));
        }
      } else {
        images = data;
      }
    }

    if (!images) continue;

    // Set columns from first batch
    if (imageColumns.length === 0 && images && images.length > 0) {
      imageColumns = Object.keys(images[0]);
    }

    // Group by artist and take top N per artist (or all if --all-images)
    const imagesByArtist = new Map<string, Array<Record<string, unknown>>>();
    for (const img of images || []) {
      const artistId = img.artist_id as string;
      if (!imagesByArtist.has(artistId)) {
        imagesByArtist.set(artistId, []);
      }
      const artistImages = imagesByArtist.get(artistId)!;
      if (ALL_IMAGES || artistImages.length < IMAGES_PER_ARTIST) {
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

  writeLine(`-- Portfolio Images (${allImages.length})`);
  const exportedImageIds: string[] = [];

  for (const img of allImages) {
    writeLine(generateInsert('portfolio_images', img, imageColumns));
    exportedImageIds.push(img.id as string);
  }
  writeLine(``);
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
    writeLine(`-- Artist Style Profiles (${allStyleProfiles.length})`);
    for (const profile of allStyleProfiles) {
      writeLine(generateInsert('artist_style_profiles', profile, styleProfileColumns));
    }
    writeLine(``);
    console.log(`   ✅ ${allStyleProfiles.length} style profiles`);
  } else {
    console.log(`   ⚠️ No style profiles found`);
  }

  // 6. artist_color_profiles table removed - color is now stored at image level (portfolio_images.is_color)
  // Color boosting happens directly in the search function using image-level is_color

  // 7. Skip image_style_tags - regenerate locally with ML classifier
  // This avoids network issues with large batch queries and gives a fresh slate
  // for tagging iteration
  console.log('📦 Skipping image_style_tags (regenerate locally with ML classifier)');
  console.log(`   Run: npx tsx scripts/styles/tag-images-ml.ts --clear --concurrency 200`);

  // 8. Add vector index recreation at the end
  // Calculate optimal lists parameter: sqrt(row_count), min 10
  const lists = Math.max(10, Math.floor(Math.sqrt(allImages.length)));
  writeLine(`-- Recreate vector index after data load (lists=${lists} for ${allImages.length} images)`);
  writeLine(`DROP INDEX IF EXISTS idx_portfolio_embeddings;`);
  writeLine(
    `CREATE INDEX idx_portfolio_embeddings ON portfolio_images USING ivfflat (embedding vector_cosine_ops) WITH (lists = ${lists});`
  );
  writeLine(``);

  // Close the write stream
  await new Promise<void>((resolve) => writeStream.end(resolve));

  const fileSizeMB = (fs.statSync(OUTPUT_FILE).size / 1024 / 1024).toFixed(1);
  console.log(`\n✅ Seed file generated successfully!`);
  console.log(`   File: ${OUTPUT_FILE}`);
  console.log(`   Size: ${fileSizeMB} MB`);
  console.log(`   Artists: ${artists.length}`);
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
