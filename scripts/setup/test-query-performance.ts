/**
 * Query Performance Testing
 *
 * Tests actual query times for critical operations to verify
 * the 5s timeout won't break legitimate use cases.
 *
 * Run: npx tsx scripts/setup/test-query-performance.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config({ path: join(__dirname, '../../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface TestResult {
  name: string;
  duration: number;
  success: boolean;
  error?: string;
  status: 'PASS' | 'WARN' | 'FAIL';
}

async function timeQuery<T>(
  name: string,
  query: () => Promise<T>
): Promise<TestResult> {
  const start = Date.now();
  try {
    await query();
    const duration = Date.now() - start;

    // Status based on duration
    let status: 'PASS' | 'WARN' | 'FAIL' = 'PASS';
    if (duration > 3000) status = 'WARN'; // >3s is concerning
    if (duration > 5000) status = 'FAIL'; // >5s will timeout

    return { name, duration, success: true, status };
  } catch (error: any) {
    const duration = Date.now() - start;
    return {
      name,
      duration,
      success: false,
      error: error.message,
      status: 'FAIL',
    };
  }
}

async function runTests() {
  console.log('🔍 Testing Query Performance\n');
  console.log('Timeout limit: 5,000ms (queries exceeding this will fail)\n');
  console.log('='.repeat(80));
  console.log('\n');

  const results: TestResult[] = [];

  // Test 1: Simple artist lookup
  results.push(
    await timeQuery('Artist lookup by slug', async () => {
      const { data } = await supabase
        .from('artists')
        .select('*')
        .eq('slug', 'austin-tx-tattoo-artist-1')
        .single();
      return data;
    })
  );

  // Test 2: Artist with portfolio images
  results.push(
    await timeQuery('Artist with portfolio (JOIN)', async () => {
      const { data } = await supabase
        .from('artists')
        .select('*, portfolio_images(*)')
        .eq('slug', 'austin-tx-tattoo-artist-1')
        .single();
      return data;
    })
  );

  // Test 3: Browse page query (50 artists)
  results.push(
    await timeQuery('Browse page - 50 artists', async () => {
      const { data } = await supabase
        .from('artists')
        .select('id, name, slug, instagram_username, city, state')
        .eq('city', 'Austin')
        .limit(50);
      return data;
    })
  );

  // Test 4: Vector search (this is the critical one)
  results.push(
    await timeQuery('Vector search (50 results)', async () => {
      // Get a sample embedding
      const { data: sample } = await supabase
        .from('portfolio_images')
        .select('embedding')
        .not('embedding', 'is', null)
        .limit(1)
        .single();

      if (!sample?.embedding) throw new Error('No sample embedding found');

      // Run vector search
      const { data } = await supabase.rpc('search_artists_by_embedding', {
        query_embedding: sample.embedding,
        match_limit: 50,
        similarity_threshold: 0.1,
      });

      return data;
    })
  );

  // Test 5: Count query (aggregation)
  results.push(
    await timeQuery('Count artists by city', async () => {
      const { data } = await supabase
        .from('artists')
        .select('city', { count: 'exact', head: false })
        .not('deleted_at', 'is', null);
      return data;
    })
  );

  // Test 6: Complex join (artists + images + locations)
  results.push(
    await timeQuery('Complex join (artists + locations)', async () => {
      const { data } = await supabase
        .from('artists')
        .select(
          `
          id,
          name,
          slug,
          artist_locations (
            city,
            state,
            country_code
          )
        `
        )
        .eq('city', 'Austin')
        .limit(20);
      return data;
    })
  );

  // Test 7: Search with count
  results.push(
    await timeQuery('Search artists with total count', async () => {
      // Get a sample embedding
      const { data: sample } = await supabase
        .from('portfolio_images')
        .select('embedding')
        .not('embedding', 'is', null)
        .limit(1)
        .single();

      if (!sample?.embedding) throw new Error('No sample embedding found');

      const { data } = await supabase.rpc('search_artists_with_count', {
        query_embedding: sample.embedding,
        match_limit: 50,
        similarity_threshold: 0.1,
      });

      return data;
    })
  );

  // Print results
  console.log('\n📊 Test Results:\n');
  console.log('─'.repeat(80));
  console.log(
    'Test Name'.padEnd(50),
    'Duration'.padStart(10),
    'Status'.padStart(8)
  );
  console.log('─'.repeat(80));

  for (const result of results) {
    const statusIcon =
      result.status === 'PASS' ? '✅' : result.status === 'WARN' ? '⚠️' : '❌';
    const durationStr = `${result.duration}ms`.padStart(10);
    const statusStr = result.status.padStart(8);

    console.log(
      `${statusIcon} ${result.name.padEnd(47)}`,
      durationStr,
      statusStr
    );

    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  }

  console.log('─'.repeat(80));
  console.log('\n');

  // Summary
  const passed = results.filter((r) => r.status === 'PASS').length;
  const warned = results.filter((r) => r.status === 'WARN').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;

  console.log('📈 Summary:\n');
  console.log(`  ✅ PASS: ${passed} (under 3s)`);
  console.log(`  ⚠️  WARN: ${warned} (3-5s - close to timeout)`);
  console.log(`  ❌ FAIL: ${failed} (over 5s - will timeout)\n`);

  // Recommendations
  if (failed > 0) {
    console.log('🚨 CRITICAL: Some queries exceed 5s timeout!\n');
    console.log('Recommendations:');
    console.log('  1. Increase timeout to 10s: ALTER DATABASE postgres SET statement_timeout = \'10s\';');
    console.log('  2. Optimize slow queries with better indexes');
    console.log('  3. Implement per-route timeout overrides for long operations\n');
  } else if (warned > 0) {
    console.log('⚠️  WARNING: Some queries are close to timeout (3-5s)\n');
    console.log('Recommendations:');
    console.log('  1. Monitor these queries in production');
    console.log('  2. Consider adding indexes if they slow down');
    console.log('  3. Load testing recommended before ProductHunt launch\n');
  } else {
    console.log('✅ All queries complete well within 5s timeout!');
    console.log('   System is production-ready.\n');
  }

  // Vector index check
  console.log('🔍 Vector Index Usage:\n');
  const { data: indexStats } = await supabase.rpc('pg_stat_user_indexes_view');
  console.log('   Check if vector search used the index above.');
  console.log('   Expected: "Index Scan using idx_portfolio_embeddings"\n');
}

runTests().catch(console.error);
