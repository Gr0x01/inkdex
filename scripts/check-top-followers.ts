import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables first
config({ path: resolve(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

async function checkTopFollowers() {
  console.log('🔍 Fetching top 10 artists by follower count...\n');

  const { data: artists, error } = await supabase
    .from('artists')
    .select('name, instagram_handle, follower_count, city, state')
    .order('follower_count', { ascending: false, nullsFirst: false })
    .limit(10);

  if (error) {
    console.error('❌ Error fetching artists:', error);
    return;
  }

  if (!artists || artists.length === 0) {
    console.log('⚠️  No artists found');
    return;
  }

  console.log('📊 Top 10 Artists by Follower Count:\n');
  console.log('Rank | Followers | Name | Handle | Location');
  console.log('-----|-----------|------|--------|----------');

  artists.forEach((artist, index) => {
    const followers = artist.follower_count?.toLocaleString() || 'N/A';
    const name = artist.name || 'Unknown';
    const handle = artist.instagram_handle || 'N/A';
    const location = `${artist.city}, ${artist.state}`;

    console.log(
      `${String(index + 1).padStart(4)} | ${followers.padStart(9)} | ${name.padEnd(25).substring(0, 25)} | @${handle.padEnd(20).substring(0, 20)} | ${location}`
    );
  });

  // Get some statistics
  console.log('\n📈 Statistics:');

  const { data: stats } = await supabase
    .from('artists')
    .select('follower_count');

  if (stats) {
    const counts = stats
      .map(s => s.follower_count)
      .filter((c): c is number => c !== null)
      .sort((a, b) => b - a);

    if (counts.length > 0) {
      console.log(`Total artists: ${stats.length}`);
      console.log(`Artists with follower data: ${counts.length}`);
      console.log(`Median followers: ${counts[Math.floor(counts.length / 2)]?.toLocaleString()}`);
      console.log(`Average followers: ${Math.round(counts.reduce((a, b) => a + b, 0) / counts.length).toLocaleString()}`);

      // Distribution
      const over100k = counts.filter(c => c >= 100000).length;
      const over50k = counts.filter(c => c >= 50000).length;
      const over25k = counts.filter(c => c >= 25000).length;
      const over10k = counts.filter(c => c >= 10000).length;
      const over5k = counts.filter(c => c >= 5000).length;

      console.log('\n🎯 Distribution:');
      console.log(`  100k+ followers: ${over100k} artists (${((over100k / counts.length) * 100).toFixed(1)}%)`);
      console.log(`   50k+ followers: ${over50k} artists (${((over50k / counts.length) * 100).toFixed(1)}%)`);
      console.log(`   25k+ followers: ${over25k} artists (${((over25k / counts.length) * 100).toFixed(1)}%)`);
      console.log(`   10k+ followers: ${over10k} artists (${((over10k / counts.length) * 100).toFixed(1)}%)`);
      console.log(`    5k+ followers: ${over5k} artists (${((over5k / counts.length) * 100).toFixed(1)}%)`);
    }
  }

  console.log('\n💡 Recommended Featured Artist Thresholds:');
  console.log('   • Conservative (top 5-10%): 25k-50k followers');
  console.log('   • Moderate (top 15-20%): 10k-25k followers');
  console.log('   • Inclusive (top 30-40%): 5k-10k followers');
}

checkTopFollowers().catch(console.error);
