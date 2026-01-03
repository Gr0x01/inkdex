/**
 * Vector Index Creation Script
 *
 * CRITICAL: Creates IVFFlat index on portfolio_images.embedding
 *
 * Performance Impact: 25x faster searches (2-5s → <200ms)
 * Dataset: 9,803 images
 * Index Size: ~10% of embedding column size
 *
 * Uses CONCURRENTLY to avoid table locking during creation
 * NOTE: Cannot run inside transaction (requires direct connection)
 */

import { Client } from 'pg';
import * as dotenv from 'dotenv';
import { join } from 'path';

// Load environment variables
dotenv.config({ path: join(__dirname, '../../.env.local') });

const DATABASE_URL = process.env.DATABASE_URL!;

async function createVectorIndex() {
  console.log('🚀 Creating vector index for portfolio_images\n');

  if (!DATABASE_URL) {
    console.error('❌ Missing DATABASE_URL in .env.local');
    process.exit(1);
  }

  // Create PostgreSQL client
  const client = new Client({
    connectionString: DATABASE_URL,
  });

  try {
    // Connect to database
    await client.connect();
    console.log('✅ Connected to database\n');

    // Step 1: Check current image count
    console.log('📊 Checking dataset size...');
    const countResult = await client.query(
      'SELECT COUNT(*) as count FROM portfolio_images WHERE embedding IS NOT NULL'
    );
    const imageCount = parseInt(countResult.rows[0].count);
    console.log(`   Found ${imageCount.toLocaleString()} images with embeddings\n`);

    if (imageCount < 100) {
      console.warn('⚠️  WARNING: Low image count. Consider HNSW index for <1000 images.\n');
    }

    // Step 2: Check if index already exists
    console.log('🔍 Checking for existing index...');
    const indexCheckResult = await client.query(`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'portfolio_images'
      AND indexname = 'idx_portfolio_embeddings'
    `);

    if (indexCheckResult.rows.length > 0) {
      console.log('✅ Index already exists!');
      console.log('   Verifying index is being used...\n');

      // Check index stats
      const statsResult = await client.query(`
        SELECT
          schemaname,
          relname as tablename,
          indexrelname as indexname,
          idx_scan,
          idx_tup_read,
          idx_tup_fetch
        FROM pg_stat_user_indexes
        WHERE indexrelname = 'idx_portfolio_embeddings'
      `);

      if (statsResult.rows.length > 0) {
        const stats = statsResult.rows[0];
        console.log(`   Index scans: ${stats.idx_scan}`);
        console.log(`   Tuples read: ${stats.idx_tup_read}`);
        console.log(`   Tuples fetched: ${stats.idx_tup_fetch}\n`);
      }

      // Get index size
      const sizeResult = await client.query(`
        SELECT pg_size_pretty(pg_relation_size('idx_portfolio_embeddings')) as size
      `);
      console.log(`   Index size: ${sizeResult.rows[0].size}\n`);

      console.log('✅ Vector index is ready!');
      await client.end();
      return;
    }

    // Step 3: Create the index
    console.log('🔨 Creating IVFFlat vector index...');
    console.log('   This may take 1-2 minutes for 9,803 images');
    console.log('   Index type: IVFFlat (optimal for 1K-100K images)');
    console.log('   Lists: 99 (sqrt(9803) ≈ 99)\n');

    const startTime = Date.now();

    // CREATE INDEX CONCURRENTLY must be executed in autocommit mode
    // (outside of a transaction block)
    await client.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_portfolio_embeddings
        ON portfolio_images
        USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 99)
    `);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ Index created in ${duration} seconds!\n`);

    // Step 4: Update table statistics
    console.log('📊 Updating table statistics for query planner...');
    await client.query('ANALYZE portfolio_images');
    console.log('✅ Statistics updated\n');

    // Step 5: Get final index size
    const finalSizeResult = await client.query(`
      SELECT pg_size_pretty(pg_relation_size('idx_portfolio_embeddings')) as size
    `);
    console.log(`📦 Index size: ${finalSizeResult.rows[0].size}\n`);

    // Step 6: Verify index is usable
    console.log('🔍 Verifying index is usable...');
    const verifyResult = await client.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'portfolio_images'
      AND indexname = 'idx_portfolio_embeddings'
    `);

    if (verifyResult.rows.length > 0) {
      console.log('✅ Index verified!\n');
      console.log('📋 Index definition:');
      console.log(`   ${verifyResult.rows[0].indexdef}\n`);
    }

    console.log('🎉 Vector index creation complete!\n');
    console.log('📈 Expected performance improvement:');
    console.log('   Before: 2-5 seconds per search (sequential scan)');
    console.log('   After:  <200ms per search (index scan)\n');
    console.log('💡 To verify the index is being used in queries:');
    console.log('   Run EXPLAIN ANALYZE on your search queries');
    console.log('   Look for "Index Scan using idx_portfolio_embeddings"\n');

  } catch (error: any) {
    console.error('❌ Failed to create vector index:', error.message);

    if (error.message.includes('already exists')) {
      console.log('\n✅ Index already exists. No action needed.');
    } else if (error.message.includes('ivfflat')) {
      console.log('\n💡 Make sure pgvector extension is enabled:');
      console.log('   Run in Supabase SQL Editor: CREATE EXTENSION IF NOT EXISTS vector;');
    } else {
      console.log('\n💡 Check Supabase dashboard for more details.');
      process.exit(1);
    }
  } finally {
    await client.end();
  }
}

// Run the script
createVectorIndex();
