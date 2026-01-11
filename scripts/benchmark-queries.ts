#!/usr/bin/env npx tsx
/**
 * Query Performance Benchmark Script
 *
 * Measures execution time of critical database queries to detect regressions.
 * Run this script after database migrations or when performance is a concern.
 *
 * Usage:
 *   npx tsx scripts/benchmark-queries.ts
 *
 * Environment:
 *   Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env
 *
 * Thresholds (fail if exceeded):
 *   - get_location_counts (countries): 500ms
 *   - get_location_counts (regions): 500ms
 *   - get_location_counts (cities): 1000ms
 *   - search_artists_by_embedding: 2000ms (with location filter)
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface BenchmarkResult {
  name: string
  duration: number
  threshold: number
  passed: boolean
}

const results: BenchmarkResult[] = []

async function benchmark(
  name: string,
  threshold: number,
  fn: () => Promise<void>
): Promise<void> {
  const start = performance.now()
  try {
    await fn()
    const duration = performance.now() - start
    const passed = duration <= threshold
    results.push({ name, duration, threshold, passed })
    const icon = passed ? '✅' : '❌'
    console.log(`${icon} ${name}: ${duration.toFixed(2)}ms (threshold: ${threshold}ms)`)
  } catch (error) {
    console.error(`❌ ${name}: FAILED - ${error}`)
    results.push({ name, duration: -1, threshold, passed: false })
  }
}

async function runBenchmarks(): Promise<void> {
  console.log('\n🚀 Running Query Performance Benchmarks\n')
  console.log('=' .repeat(60))

  // Benchmark: get_location_counts (countries)
  await benchmark('get_location_counts(countries)', 500, async () => {
    const { error } = await supabase.rpc('get_location_counts', {
      p_grouping: 'countries'
    })
    if (error) throw error
  })

  // Benchmark: get_location_counts (regions)
  await benchmark('get_location_counts(regions, US)', 500, async () => {
    const { error } = await supabase.rpc('get_location_counts', {
      p_grouping: 'regions',
      p_country_code: 'US'
    })
    if (error) throw error
  })

  // Benchmark: get_location_counts (cities)
  await benchmark('get_location_counts(cities, US, TX)', 1000, async () => {
    const { error } = await supabase.rpc('get_location_counts', {
      p_grouping: 'cities',
      p_country_code: 'US',
      p_region: 'TX',
      p_min_count: 1
    })
    if (error) throw error
  })

  // Benchmark: artist_locations join query
  await benchmark('artist_locations country filter', 1000, async () => {
    const { error } = await supabase
      .from('artist_locations')
      .select('artist_id, city, region, country_code')
      .eq('country_code', 'US')
      .limit(100)
    if (error) throw error
  })

  // Benchmark: artist_locations with region filter
  await benchmark('artist_locations country+region filter', 1000, async () => {
    const { error } = await supabase
      .from('artist_locations')
      .select('artist_id, city, region, country_code')
      .eq('country_code', 'US')
      .ilike('region', 'TX')
      .limit(100)
    if (error) throw error
  })

  console.log('=' .repeat(60))

  // Summary
  const passed = results.filter(r => r.passed).length
  const failed = results.filter(r => !r.passed).length

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`)

  if (failed > 0) {
    console.log('\n⚠️  Performance thresholds exceeded! Consider:')
    console.log('   - Reviewing query plans with EXPLAIN ANALYZE')
    console.log('   - Adding or optimizing indexes')
    console.log('   - Caching frequently accessed data')
    process.exit(1)
  }

  console.log('\n✅ All benchmarks passed!\n')
}

runBenchmarks().catch(console.error)
