/**
 * Check Embedding Generation Progress
 *
 * Verifies how many portfolio images have embeddings generated
 * and provides statistics on processing status.
 *
 * Usage:
 *   npx tsx scripts/embeddings/check-embeddings.ts
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

interface EmbeddingStats {
  total: number;
  with_embeddings: number;
  missing_embeddings: number;
  active: number;
  hidden: number;
}

async function checkEmbeddings() {
  console.log('📊 Checking embedding generation progress...\n');

  // Get overall statistics via direct queries
  const { count: total } = await supabase
    .from('portfolio_images')
    .select('*', { count: 'exact', head: true });

  const { count: withEmbeddings } = await supabase
    .from('portfolio_images')
    .select('*', { count: 'exact', head: true })
    .not('embedding', 'is', null);

  const { count: active } = await supabase
    .from('portfolio_images')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active');

  const { count: hidden } = await supabase
    .from('portfolio_images')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'hidden');

  const stats: EmbeddingStats = {
    total: total || 0,
    with_embeddings: withEmbeddings || 0,
    missing_embeddings: (total || 0) - (withEmbeddings || 0),
    active: active || 0,
    hidden: hidden || 0,
  };

  displayStats(stats);

  // Get per-city breakdown
  console.log('\n📍 Per-City Breakdown:');
  const { data: cityStats, error: cityError } = await supabase
    .from('portfolio_images')
    .select('artists(city), embedding')
    .not('artists.city', 'is', null);

  if (cityStats && !cityError) {
    const cityCounts: Record<string, { total: number; with_embeddings: number }> = {};

    cityStats.forEach((row: any) => {
      const city = row.artists?.city || 'Unknown';
      if (!cityCounts[city]) {
        cityCounts[city] = { total: 0, with_embeddings: 0 };
      }
      cityCounts[city].total++;
      if (row.embedding) cityCounts[city].with_embeddings++;
    });

    Object.entries(cityCounts)
      .sort(([, a], [, b]) => b.total - a.total)
      .forEach(([city, counts]) => {
        const percent = ((counts.with_embeddings / counts.total) * 100).toFixed(1);
        console.log(
          `   ${city.padEnd(20)} ${counts.with_embeddings.toString().padStart(5)} / ${counts.total
            .toString()
            .padStart(5)} (${percent}%)`
        );
      });
  }

  // Sample some embeddings to verify dimensions
  console.log('\n🔬 Embedding Verification:');
  const { data: sampleEmbeddings, error: sampleError } = await supabase
    .from('portfolio_images')
    .select('id, embedding')
    .not('embedding', 'is', null)
    .limit(5);

  if (sampleEmbeddings && !sampleError && sampleEmbeddings.length > 0) {
    const embedding = sampleEmbeddings[0].embedding;
    if (embedding && typeof embedding !== 'string') {
      const firstEmbedding = embedding as unknown as number[];
      console.log(`   ✓ Embedding dimensions: ${firstEmbedding.length}`);
      console.log(`   ✓ First embedding ID: ${sampleEmbeddings[0].id}`);
      console.log(`   ✓ Sample values: [${firstEmbedding.slice(0, 3).map(v => v.toFixed(4)).join(', ')}, ...]`);

      // Check if normalized (L2 norm should be ~1.0)
      const norm = Math.sqrt(firstEmbedding.reduce((sum, val) => sum + val * val, 0));
      console.log(`   ✓ L2 norm: ${norm.toFixed(4)} ${norm > 0.99 && norm < 1.01 ? '(normalized ✓)' : '(not normalized ⚠️)'}`);
    } else {
      console.log('   ⚠️  Embedding data is invalid');
    }
  } else {
    console.log('   ⚠️  No embeddings found to verify');
  }

  // Check for images without embeddings (likely pending or failed)
  console.log('\n⏳ Images Without Embeddings:');
  const { data: pendingImages, error: pendingError } = await supabase
    .from('portfolio_images')
    .select('id, instagram_url, artist_id')
    .is('embedding', null)
    .limit(10);

  if (pendingImages && pendingImages.length > 0) {
    console.log(`   Found ${pendingImages.length} images without embeddings (showing first 10):`);
    pendingImages.forEach((img) => {
      console.log(`   - ID ${img.id}: ${img.instagram_url}`);
    });
    console.log('\n   💡 Tip: Run Phase 4 embedding generation to process these images');
  } else {
    console.log('   ✓ All images have embeddings');
  }

  console.log('\n✅ Check complete!\n');
}

function displayStats(stats: EmbeddingStats) {
  const percent = stats.total > 0 ? ((stats.with_embeddings / stats.total) * 100).toFixed(1) : '0.0';

  console.log('📊 Embedding Statistics:');
  console.log(`   Total images:        ${stats.total.toLocaleString()}`);
  console.log(`   With embeddings:     ${stats.with_embeddings.toLocaleString()} (${percent}%)`);
  console.log(`   Missing embeddings:  ${stats.missing_embeddings.toLocaleString()} (${(100 - parseFloat(percent)).toFixed(1)}%)`);
  console.log(`   Active images:       ${stats.active.toLocaleString()}`);
  console.log(`   Hidden images:       ${stats.hidden.toLocaleString()}`);

  if (stats.with_embeddings === stats.total && stats.total > 0) {
    console.log('\n🎉 All images have embeddings! Ready to create vector index.');
  } else if (stats.with_embeddings > 0) {
    console.log('\n⚠️  Embedding generation in progress...');
  } else {
    console.log('\n⚠️  No embeddings generated yet. Run Phase 4 embedding generation first.');
  }
}

// Run the check
checkEmbeddings().catch((error) => {
  console.error('❌ Error checking embeddings:', error);
  process.exit(1);
});
