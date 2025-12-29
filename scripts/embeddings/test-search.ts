/**
 * Test Vector Search Performance
 *
 * Tests the vector similarity search with various queries to validate:
 * 1. Search latency (<500ms target)
 * 2. Result relevance
 * 3. Index performance
 *
 * Usage:
 *   npx tsx scripts/embeddings/test-search.ts
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

async function testSearch() {
  console.log('🔍 Testing Vector Search Performance\n');

  // Step 1: Get sample embeddings for testing
  const { data: sampleImages, error: sampleError } = await supabase
    .from('portfolio_images')
    .select('id, embedding, instagram_url, artist_id')
    .not('embedding', 'is', null)
    .limit(5);

  if (sampleError || !sampleImages || sampleImages.length === 0) {
    console.error('❌ No embeddings found. Run Phase 4 embedding generation first.');
    process.exit(1);
  }

  console.log(`✓ Found ${sampleImages.length} sample images for testing\n`);

  // Step 2: Test search performance with multiple queries
  const testResults: Array<{
    query: string;
    duration: number;
    results: number;
    topMatch: string;
  }> = [];

  for (let i = 0; i < sampleImages.length; i++) {
    const sample = sampleImages[i];
    const embedding = sample.embedding as unknown as number[];

    console.log(`Test ${i + 1}/${sampleImages.length}: Searching for similar images...`);
    console.log(`   Query image: ${sample.id}\n`);

    const startTime = Date.now();

    const { data: results, error: searchError } = await supabase.rpc(
      'search_artists_by_embedding',
      {
        query_embedding: embedding as unknown as string,
        match_threshold: 0.5,
        match_count: 20,
        city_filter: undefined
      }
    );

    const duration = Date.now() - startTime;

    if (searchError) {
      console.error(`   ❌ Search failed:`, searchError);
      continue;
    }

    const resultCount = results?.length || 0;
    const topMatch = results && results.length > 0 ? results[0] : null;

    console.log(`   ⏱️  Duration: ${duration}ms`);
    console.log(`   📊 Results: ${resultCount} artists`);

    if (topMatch) {
      // Type assertion for RPC result (Supabase returns JSONB as 'any')
      const topResult = topMatch as unknown as { artist_name: string; similarity: number };
      console.log(`   🎯 Top match: ${topResult.artist_name} (similarity: ${(topResult.similarity * 100).toFixed(1)}%)`);
    }

    if (duration < 500) {
      console.log(`   ✅ Performance: Excellent (<500ms target)\n`);
    } else if (duration < 1000) {
      console.log(`   ⚠️  Performance: Acceptable but could be faster\n`);
    } else {
      console.log(`   ❌ Performance: Too slow! Consider index tuning\n`);
    }

    testResults.push({
      query: `Image ${sample.id}`,
      duration,
      results: resultCount,
      topMatch: topMatch ? (topMatch as unknown as { artist_name: string }).artist_name : 'No match'
    });
  }

  // Step 3: Performance summary
  console.log('\n📊 Performance Summary:');
  console.log('─'.repeat(80));

  const avgDuration =
    testResults.reduce((sum, r) => sum + r.duration, 0) / testResults.length;
  const maxDuration = Math.max(...testResults.map((r) => r.duration));
  const minDuration = Math.min(...testResults.map((r) => r.duration));

  console.log(`   Average duration: ${avgDuration.toFixed(0)}ms`);
  console.log(`   Min duration:     ${minDuration}ms`);
  console.log(`   Max duration:     ${maxDuration}ms`);

  if (avgDuration < 500) {
    console.log(`\n   🎉 Excellent! Average search time meets target (<500ms)`);
  } else if (avgDuration < 1000) {
    console.log(`\n   ⚠️  Acceptable, but consider tuning for better performance`);
  } else {
    console.log(`\n   ❌ Too slow! Index tuning required`);
  }

  // Step 4: Test city filtering
  console.log('\n\n🌆 Testing City Filtering:');
  console.log('─'.repeat(80));

  const cities = ['Austin, TX', 'Los Angeles, CA'];

  for (const city of cities) {
    const testEmbedding = sampleImages[0].embedding as unknown as number[];

    const startTime = Date.now();

    const { data: cityResults, error: cityError } = await supabase.rpc(
      'search_artists_by_embedding',
      {
        query_embedding: testEmbedding as unknown as string,
        match_threshold: 0.5,
        match_count: 20,
        city_filter: city
      }
    );

    const duration = Date.now() - startTime;

    if (cityError) {
      console.log(`   ${city}: ❌ Error - ${cityError.message}`);
      continue;
    }

    console.log(`   ${city.padEnd(20)} ${duration}ms (${cityResults?.length || 0} results)`);
  }

  // Step 5: Test with different similarity thresholds
  console.log('\n\n🎯 Testing Similarity Thresholds:');
  console.log('─'.repeat(80));

  const thresholds = [0.3, 0.5, 0.7, 0.9];
  const testEmbedding = sampleImages[0].embedding as unknown as number[];

  for (const threshold of thresholds) {
    const { data: thresholdResults } = await supabase.rpc(
      'search_artists_by_embedding',
      {
        query_embedding: testEmbedding as unknown as string,
        match_threshold: threshold,
        match_count: 20,
        city_filter: undefined
      }
    );

    const count = thresholdResults?.length || 0;
    console.log(`   Threshold ${threshold.toFixed(1)}: ${count} results`);
  }

  console.log('\n💡 Recommendation: Use threshold 0.5-0.7 for balanced precision/recall\n');

  // Step 6: Display detailed results from first search
  console.log('\n📋 Sample Search Results (First Query):');
  console.log('─'.repeat(80));

  const { data: detailedResults } = await supabase.rpc(
    'search_artists_by_embedding',
    {
      query_embedding: sampleImages[0].embedding as unknown as string,
      match_threshold: 0.5,
      match_count: 10,
      city_filter: undefined
    }
  );

  if (detailedResults && detailedResults.length > 0) {
    detailedResults.slice(0, 10).forEach((result: unknown, index: number) => {
      // Type assertion for RPC result
      const r = result as { artist_name: string; city: string; similarity: number; instagram_handle: string; matching_images?: unknown[] };
      console.log(`\n   ${index + 1}. ${r.artist_name} (${r.city})`);
      console.log(`      Similarity: ${(r.similarity * 100).toFixed(1)}%`);
      console.log(`      Instagram: @${r.instagram_handle}`);
      console.log(`      Matching images: ${r.matching_images?.length || 0}`);
    });
  }

  console.log('\n\n✅ Search testing complete!\n');
}

// Run the tests
testSearch().catch((error) => {
  console.error('❌ Error testing search:', error);
  process.exit(1);
});
