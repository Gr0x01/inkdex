#!/usr/bin/env tsx
/**
 * Populate style_seeds table with embeddings
 *
 * This script:
 * 1. Reads seeds-with-embeddings.json
 * 2. Inserts records into style_seeds table
 * 3. Uses first seed image as the representative seed for each style
 *
 * Usage: npx tsx scripts/style-seeds/populate-style-seeds.ts
 */

import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Load environment variables from .env.local
config({ path: path.join(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface SeedWithEmbedding {
  styleName: string;
  displayName: string;
  description: string;
  seedNumber: number;
  storagePath: string;
  embedding: number[];
  embedding_dim: number;
  embedding_norm: number;
}

interface EmbeddingResult {
  results: SeedWithEmbedding[];
  summary: {
    total: number;
    successful: number;
    failed: number;
    model: string;
    pretrained: string;
    embedding_dim: number;
  };
}

/**
 * Get public URL for storage path
 */
function getStorageUrl(storagePath: string): string {
  const { data } = supabase.storage
    .from('portfolio-images')
    .getPublicUrl(storagePath);

  return data.publicUrl;
}

/**
 * Select best seed image for each style
 * Strategy: Use the first seed (seed number 1) as it's typically most representative
 */
function selectRepresentativeSeeds(
  results: SeedWithEmbedding[]
): SeedWithEmbedding[] {
  // Group by style
  const styleGroups = new Map<string, SeedWithEmbedding[]>();

  for (const seed of results) {
    if (!seed.embedding) continue; // Skip failed embeddings

    if (!styleGroups.has(seed.styleName)) {
      styleGroups.set(seed.styleName, []);
    }
    styleGroups.get(seed.styleName)!.push(seed);
  }

  // Select first seed for each style
  const representativeSeeds: SeedWithEmbedding[] = [];

  for (const [styleName, seeds] of styleGroups) {
    // Sort by seed number and take first
    const sorted = seeds.sort((a, b) => a.seedNumber - b.seedNumber);
    const representative = sorted[0];

    console.log(
      `   ${representative.displayName}: Using seed ${representative.seedNumber} (${seeds.length} total seeds)`
    );

    representativeSeeds.push(representative);
  }

  return representativeSeeds;
}

/**
 * Insert seed into database
 */
async function insertSeed(seed: SeedWithEmbedding): Promise<void> {
  const { error } = await supabase.from('style_seeds').insert({
    style_name: seed.styleName,
    display_name: seed.displayName,
    seed_image_url: getStorageUrl(seed.storagePath),
    embedding: JSON.stringify(seed.embedding), // pgvector format
    description: seed.description,
  });

  if (error) {
    throw new Error(`Failed to insert ${seed.styleName}: ${error.message}`);
  }
}

/**
 * Main processing function
 */
async function main() {
  console.log('💾 Populating style_seeds Table');
  console.log('='.repeat(50));

  // Read embeddings JSON
  const embeddingsPath = path.join(
    process.cwd(),
    'scripts',
    'style-seeds',
    'seeds-with-embeddings.json'
  );

  if (!fs.existsSync(embeddingsPath)) {
    console.error('❌ Embeddings file not found:', embeddingsPath);
    console.error('   Run: python3 -m modal run scripts/style-seeds/generate-seed-embeddings.py');
    process.exit(1);
  }

  const embeddingData: EmbeddingResult = JSON.parse(
    fs.readFileSync(embeddingsPath, 'utf-8')
  );

  console.log('📊 Embedding Summary:');
  console.log(`   Total seeds: ${embeddingData.summary.total}`);
  console.log(`   Successful: ${embeddingData.summary.successful}`);
  console.log(`   Failed: ${embeddingData.summary.failed}`);
  console.log(`   Model: ${embeddingData.summary.model} (${embeddingData.summary.pretrained})`);
  console.log(`   Embedding dimension: ${embeddingData.summary.embedding_dim}`);

  if (embeddingData.summary.failed > 0) {
    console.warn('\n⚠️  Some embeddings failed. Proceeding with successful ones only.');
  }

  // Select representative seeds (one per style)
  console.log('\n🎯 Selecting representative seeds:');
  const representativeSeeds = selectRepresentativeSeeds(embeddingData.results);

  console.log(`\n📝 Inserting ${representativeSeeds.length} style seeds into database...`);

  let inserted = 0;
  let errors = 0;

  for (const seed of representativeSeeds) {
    try {
      console.log(`   Inserting: ${seed.displayName}...`);
      await insertSeed(seed);
      inserted++;
      console.log(`   ✅ ${seed.displayName} inserted`);
    } catch (error) {
      errors++;
      console.error(
        `   ❌ Error inserting ${seed.displayName}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 Summary:');
  console.log(`   Inserted: ${inserted}`);
  console.log(`   Errors: ${errors}`);
  console.log(`   Total styles: ${representativeSeeds.length}`);

  if (inserted > 0) {
    console.log('\n✅ Database population complete!');
    console.log('\n📋 Next steps:');
    console.log('1. Verify seeds in database:');
    console.log('   SELECT style_name, display_name FROM style_seeds;');
    console.log('2. Create style landing pages');
    console.log('3. Test style search functionality');
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
