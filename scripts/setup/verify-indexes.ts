/**
 * Verify Composite Indexes
 *
 * Checks that all critical composite indexes exist and shows usage stats.
 * Run after applying migration 20260108_005_add_composite_indexes.sql
 *
 * Usage: npx tsx scripts/setup/verify-indexes.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config({ path: join(__dirname, '../../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface IndexInfo {
  name: string;
  table: string;
  size: string;
  scans: number;
  description: string;
}

const EXPECTED_INDEXES = [
  {
    name: 'idx_portfolio_images_artist_status',
    table: 'portfolio_images',
    description: 'Artist portfolio filtered by status (active)',
  },
  {
    name: 'idx_portfolio_images_artist_likes',
    table: 'portfolio_images',
    description: 'Top images by likes for artist profiles',
  },
  {
    name: 'idx_portfolio_images_featured_active',
    table: 'portfolio_images',
    description: 'Featured images for homepage',
  },
  {
    name: 'idx_artists_follower_count_desc',
    table: 'artists',
    description: 'Featured artists sorted by followers',
  },
  {
    name: 'idx_artists_verification_follower',
    table: 'artists',
    description: 'Browse pages sorted by verification + followers',
  },
  {
    name: 'idx_artists_instagram_handle_lower',
    table: 'artists',
    description: 'Case-insensitive Instagram handle lookup',
  },
  {
    name: 'idx_searches_artist_source',
    table: 'searches',
    description: 'Similar artist searches (exclude source)',
  },
  {
    name: 'idx_searches_id_type',
    table: 'searches',
    description: 'Search results page lookups',
  },
  {
    name: 'idx_artist_locations_city_region_composite',
    table: 'artist_locations',
    description: 'Multi-location city + region searches',
  },
];

async function verifyIndexes() {
  console.log('🔍 Verifying Composite Indexes\n');
  console.log('='.repeat(100));
  console.log('\n');

  const results: IndexInfo[] = [];
  const missing: string[] = [];

  for (const expected of EXPECTED_INDEXES) {
    // Query pg_stat_user_indexes for index stats
    const { data, error } = await supabase.rpc('execute_sql', {
      query: `
        SELECT
          i.indexrelname as name,
          t.relname as table,
          pg_size_pretty(pg_relation_size(i.indexrelid)) as size,
          s.idx_scan as scans
        FROM pg_stat_user_indexes s
        JOIN pg_index i ON s.indexrelid = i.indexrelid
        JOIN pg_class t ON i.indrelid = t.oid
        WHERE i.indexrelname = '${expected.name}'
      `,
    } as any);

    if (error) {
      console.error(`Error checking ${expected.name}:`, error);
      continue;
    }

    if (!data || data.length === 0) {
      missing.push(expected.name);
      console.log(`❌ MISSING: ${expected.name}`);
      console.log(`   Table: ${expected.table}`);
      console.log(`   Purpose: ${expected.description}\n`);
      continue;
    }

    const indexData = data[0];
    results.push({
      name: indexData.name,
      table: indexData.table,
      size: indexData.size,
      scans: indexData.scans || 0,
      description: expected.description,
    });
  }

  // Print successful indexes
  if (results.length > 0) {
    console.log('✅ Verified Indexes:\n');
    console.log('─'.repeat(100));
    console.log(
      'Index Name'.padEnd(50),
      'Table'.padEnd(20),
      'Size'.padStart(10),
      'Scans'.padStart(8)
    );
    console.log('─'.repeat(100));

    for (const index of results) {
      const usageIndicator = index.scans > 0 ? '✓' : '○';
      console.log(
        `${usageIndicator} ${index.name.padEnd(48)}`,
        index.table.padEnd(20),
        index.size.padStart(10),
        index.scans.toString().padStart(8)
      );
      console.log(`   ${index.description}`);
      console.log();
    }

    console.log('─'.repeat(100));
    console.log('\n');
  }

  // Summary
  const totalIndexes = EXPECTED_INDEXES.length;
  const verified = results.length;
  const missingCount = missing.length;
  const inUse = results.filter((r) => r.scans > 0).length;

  console.log('📊 Summary:\n');
  console.log(`  ✅ Verified: ${verified}/${totalIndexes}`);
  console.log(`  ❌ Missing: ${missingCount}`);
  console.log(`  🔄 In Use: ${inUse}/${verified} (indexes with > 0 scans)`);
  console.log(`  ⏳ Unused: ${verified - inUse} (expected for new indexes)\n`);

  if (missingCount > 0) {
    console.log('⚠️  MISSING INDEXES\n');
    console.log('Run the migration to create missing indexes:');
    console.log('  npm run run-migration 20260108_005_add_composite_indexes\n');
  } else if (inUse === 0) {
    console.log('ℹ️  INDEXES CREATED BUT NOT YET USED\n');
    console.log('This is expected for new indexes.');
    console.log('Run a few queries to populate index statistics:');
    console.log('  - Visit city browse pages: /texas/austin');
    console.log('  - View artist profiles: /artist/[slug]');
    console.log('  - Run searches: /search?id=...\n');
  } else {
    console.log('✅ All indexes verified and in use!');
    console.log('   Performance optimizations active.\n');
  }

  // Index usage analysis
  if (results.length > 0) {
    const totalSize = results.reduce((sum, r) => {
      const sizeMatch = r.size.match(/(\d+)\s*([kMG]B)/);
      if (!sizeMatch) return sum;

      const value = parseInt(sizeMatch[1], 10);
      const unit = sizeMatch[2];

      if (unit === 'kB') return sum + value / 1024;
      if (unit === 'MB') return sum + value;
      if (unit === 'GB') return sum + value * 1024;

      return sum;
    }, 0);

    console.log(`💾 Total Index Size: ~${totalSize.toFixed(1)} MB`);
    console.log(`   Tradeoff: Faster queries, slightly more storage\n`);
  }

  // Performance tips
  console.log('🚀 Performance Tips:\n');
  console.log('  1. Indexes build CONCURRENTLY - no downtime');
  console.log('  2. Unused indexes (0 scans) = normal for new indexes');
  console.log('  3. Monitor index usage in production after traffic spike');
  console.log('  4. Drop unused indexes after 30 days if scans = 0\n');
}

verifyIndexes().catch(console.error);
