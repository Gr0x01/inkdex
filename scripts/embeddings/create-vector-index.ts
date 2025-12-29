/**
 * Create Vector Index for CLIP Embeddings
 *
 * Creates an optimized IVFFlat or HNSW index based on the number of images.
 * This should be run AFTER embedding generation is complete.
 *
 * Decision Matrix:
 * - <1,000 images: HNSW (better recall, faster)
 * - 1,000-100k images: IVFFlat (faster build, good recall with tuning)
 * - >100k images: IVFFlat with higher lists parameter
 *
 * Usage:
 *   npx tsx scripts/embeddings/create-vector-index.ts
 */

import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { Database } from '../../types/database.types';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

// Load environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function createVectorIndex() {
  console.log('🚀 Vector Index Generator for CLIP Embeddings\n');

  // Step 1: Count images with embeddings
  console.log('📊 Counting images with embeddings...');
  const { count, error: countError } = await supabase
    .from('portfolio_images')
    .select('*', { count: 'exact', head: true })
    .not('embedding', 'is', null);

  if (countError) {
    console.error('❌ Error counting images:', countError);
    process.exit(1);
  }

  const imageCount = count || 0;
  console.log(`✓ Found ${imageCount.toLocaleString()} images with embeddings\n`);

  if (imageCount === 0) {
    console.error('❌ No embeddings found! Run Phase 4 embedding generation first.');
    console.error('   Run: modal run scripts/embeddings/modal_clip_embeddings.py::generate_embeddings_batch');
    process.exit(1);
  }

  // Step 2: Determine optimal index type and parameters
  const indexConfig = getOptimalIndexConfig(imageCount);

  console.log('🎯 Recommended Index Configuration:');
  console.log(`   Type: ${indexConfig.type}`);
  console.log(`   Parameters: ${JSON.stringify(indexConfig.params)}`);
  console.log(`   Rationale: ${indexConfig.rationale}\n`);

  // Step 3: Generate SQL commands
  const dropIndexSQL = 'DROP INDEX CONCURRENTLY IF EXISTS idx_portfolio_embeddings;';
  const createIndexSQL = indexConfig.type === 'HNSW'
    ? buildHNSWIndexSQL(indexConfig.params)
    : buildIVFFlatIndexSQL(indexConfig.params);

  console.log('📝 SQL Commands to Execute:\n');
  console.log('Copy and paste these commands into Supabase SQL Editor:');
  console.log('(Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/sql)\n');
  console.log('='.repeat(80));
  console.log('-- Step 1: Drop existing index (if any)');
  console.log(dropIndexSQL);
  console.log('');
  console.log('-- Step 2: Create optimized vector index');
  console.log(createIndexSQL);
  console.log('='.repeat(80));
  console.log('\n');

  console.log('⏱️  Estimated Time:');
  if (imageCount < 1000) {
    console.log('   ~30-60 seconds (small dataset)');
  } else if (imageCount < 10000) {
    console.log('   ~2-5 minutes (medium dataset)');
  } else {
    console.log('   ~10-20 minutes (large dataset)');
  }
  console.log('   Note: Using CONCURRENTLY prevents table locking\n');

  console.log('✅ Next Steps:');
  console.log('   1. Copy the SQL above');
  console.log('   2. Go to Supabase Dashboard → SQL Editor');
  console.log('   3. Paste and execute both commands');
  console.log('   4. Wait for completion (watch for success message)');
  console.log('   5. Run: npx tsx scripts/embeddings/test-search.ts (to verify)\n');

  console.log('💡 Why Manual Execution?');
  console.log('   - Supabase client doesn\'t support index creation via SDK');
  console.log('   - SQL Editor provides real-time progress feedback');
  console.log('   - Safer for production databases (explicit user control)\n');
}

function getOptimalIndexConfig(imageCount: number): {
  type: 'HNSW' | 'IVFFLAT';
  params: any;
  rationale: string;
} {
  if (imageCount < 1000) {
    return {
      type: 'HNSW',
      params: { m: 16, ef_construction: 64 },
      rationale: `<1k images - HNSW provides better recall and faster queries for small datasets`
    };
  } else if (imageCount < 10000) {
    const lists = Math.max(Math.floor(Math.sqrt(imageCount)), 10);
    return {
      type: 'IVFFLAT',
      params: { lists },
      rationale: `1k-10k images - IVFFlat with lists=${lists} (sqrt(${imageCount}))`
    };
  } else if (imageCount < 100000) {
    const lists = Math.floor(Math.sqrt(imageCount));
    return {
      type: 'IVFFLAT',
      params: { lists },
      rationale: `10k-100k images - IVFFlat with lists=${lists} (sqrt(${imageCount}))`
    };
  } else {
    const lists = Math.floor(Math.sqrt(imageCount));
    return {
      type: 'IVFFLAT',
      params: { lists, probes: 10 },
      rationale: `>100k images - IVFFlat with lists=${lists}, higher probes for better recall`
    };
  }
}

function buildHNSWIndexSQL(params: { m: number; ef_construction: number }): string {
  // Validate params to prevent SQL injection
  const m = Math.floor(Math.abs(params.m));
  const ef_construction = Math.floor(Math.abs(params.ef_construction));

  if (!Number.isFinite(m) || m < 1 || m > 100) {
    throw new Error(`Invalid m parameter: ${params.m} (must be 1-100)`);
  }

  if (!Number.isFinite(ef_construction) || ef_construction < 1 || ef_construction > 1000) {
    throw new Error(`Invalid ef_construction parameter: ${params.ef_construction} (must be 1-1000)`);
  }

  return `
    CREATE INDEX CONCURRENTLY idx_portfolio_embeddings
    ON portfolio_images
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = ${m}, ef_construction = ${ef_construction});
  `.trim();
}

function buildIVFFlatIndexSQL(params: { lists: number; probes?: number }): string {
  // Validate params to prevent SQL injection
  const lists = Math.floor(Math.abs(params.lists));

  if (!Number.isFinite(lists) || lists < 1 || lists > 100000) {
    throw new Error(`Invalid lists parameter: ${params.lists} (must be 1-100000)`);
  }

  return `
    CREATE INDEX CONCURRENTLY idx_portfolio_embeddings
    ON portfolio_images
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = ${lists});
  `.trim();
}


// Run the index creation
createVectorIndex().catch((error) => {
  console.error('❌ Error creating vector index:', error);
  process.exit(1);
});
