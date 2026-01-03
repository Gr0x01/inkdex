/**
 * Create Composite Indexes (CONCURRENTLY)
 *
 * Builds composite indexes without blocking production queries.
 * CONCURRENTLY mode requires autocommit, so we can't use migration runner.
 *
 * Run: npx tsx scripts/setup/create-composite-indexes.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config({ path: join(__dirname, '../../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface IndexDef {
  name: string;
  sql: string;
  description: string;
}

const INDEXES: IndexDef[] = [
  {
    name: 'idx_portfolio_images_artist_status',
    description: 'Portfolio images filtered by artist + status',
    sql: `
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_portfolio_images_artist_status
        ON portfolio_images(artist_id, status)
        WHERE status = 'active'
    `,
  },
  {
    name: 'idx_portfolio_images_artist_likes',
    description: 'Top images by likes for artist profiles',
    sql: `
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_portfolio_images_artist_likes
        ON portfolio_images(artist_id, likes_count DESC NULLS LAST)
        WHERE status = 'active'
    `,
  },
  {
    name: 'idx_portfolio_images_featured_active',
    description: 'Featured images for homepage',
    sql: `
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_portfolio_images_featured_active
        ON portfolio_images(featured, created_at DESC)
        WHERE status = 'active' AND featured = true
    `,
  },
  {
    name: 'idx_artists_follower_count_desc',
    description: 'Featured artists sorted by followers',
    sql: `
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_artists_follower_count_desc
        ON artists(follower_count DESC NULLS LAST)
        WHERE follower_count >= 50000 AND deleted_at IS NULL
    `,
  },
  {
    name: 'idx_artists_verification_follower',
    description: 'Browse pages sorted by verification + followers',
    sql: `
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_artists_verification_follower
        ON artists(verification_status, follower_count DESC NULLS LAST)
        WHERE deleted_at IS NULL
    `,
  },
  {
    name: 'idx_artists_instagram_handle_lower',
    description: 'Case-insensitive Instagram handle lookup',
    sql: `
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_artists_instagram_handle_lower
        ON artists(LOWER(instagram_handle))
        WHERE deleted_at IS NULL
    `,
  },
  {
    name: 'idx_searches_artist_source',
    description: 'Similar artist searches (exclude source)',
    sql: `
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_searches_artist_source
        ON searches(artist_id_source)
        WHERE artist_id_source IS NOT NULL
    `,
  },
  {
    name: 'idx_searches_id_type',
    description: 'Search results page lookups',
    sql: `
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_searches_id_type
        ON searches(id, query_type)
    `,
  },
  {
    name: 'idx_artist_locations_city_region_composite',
    description: 'Multi-location city + region searches',
    sql: `
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_artist_locations_city_region_composite
        ON artist_locations(LOWER(city), region, country_code)
        WHERE city IS NOT NULL
    `,
  },
];

async function createIndexes() {
  console.log('🔧 Creating Composite Indexes (CONCURRENTLY)\n');
  console.log('='.repeat(80));
  console.log('\n');

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const index of INDEXES) {
    console.log(`📊 ${index.name}`);
    console.log(`   ${index.description}`);

    try {
      // Execute via direct SQL (not in transaction)
      const { error } = await supabase.rpc('execute_sql', {
        query: index.sql.trim(),
      } as any);

      if (error) {
        // Check if index already exists
        if (error.message?.includes('already exists')) {
          console.log(`   ✓ Already exists (skipped)\n`);
          skipped++;
        } else {
          console.error(`   ❌ Failed: ${error.message}\n`);
          failed++;
        }
      } else {
        console.log(`   ✅ Created successfully\n`);
        created++;
      }
    } catch (err: any) {
      console.error(`   ❌ Error: ${err.message}\n`);
      failed++;
    }

    // Small delay between index creations
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  console.log('='.repeat(80));
  console.log('\n');
  console.log('📊 Summary:\n');
  console.log(`  ✅ Created: ${created}`);
  console.log(`  ⏭️  Skipped (already exist): ${skipped}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log(`  📈 Total: ${INDEXES.length}\n`);

  if (failed > 0) {
    console.log('⚠️  Some indexes failed to create.');
    console.log('   Check error messages above for details.\n');
  } else if (created > 0) {
    console.log('✅ All new indexes created successfully!\n');
    console.log('🔍 Verify indexes with:');
    console.log('   npx tsx scripts/setup/verify-indexes.ts\n');
  } else {
    console.log('ℹ️  All indexes already exist (no action needed).\n');
  }

  // Estimated performance impact
  if (created > 0 || skipped > 0) {
    console.log('🚀 Expected Performance Improvements:\n');
    console.log('  - Portfolio queries: 2-3x faster (200ms → 70ms)');
    console.log('  - Featured artists: 2-3x faster (300ms → 100ms)');
    console.log('  - Browse pages: 1.5-2x faster (combined with JOIN optimization)');
    console.log('  - Similar artist searches: 2x faster');
    console.log('  - Instagram handle lookups: 2-3x faster\n');

    console.log('💾 Storage Impact: +15-20 MB (worth it for read performance)\n');
  }
}

createIndexes().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
