import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables first
config({ path: resolve(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.types';
import { isArtistFeatured, FEATURED_FOLLOWER_THRESHOLD } from '../lib/utils/featured';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

async function checkFeaturedArtists() {
  console.log(`🎯 Featured Artist Threshold: ${FEATURED_FOLLOWER_THRESHOLD.toLocaleString()} followers\n`);

  const { data: artists, error } = await supabase
    .from('artists')
    .select('name, instagram_handle, follower_count, city, state')
    .gte('follower_count', FEATURED_FOLLOWER_THRESHOLD)
    .order('follower_count', { ascending: false });

  if (error) {
    console.error('❌ Error fetching artists:', error);
    return;
  }

  if (!artists || artists.length === 0) {
    console.log('⚠️  No featured artists found with the current threshold');
    return;
  }

  console.log(`✨ Featured Artists (${artists.length} total):\n`);
  console.log('Rank | Followers | Name | Handle | Location');
  console.log('-----|-----------|------|--------|----------');

  artists.forEach((artist, index) => {
    const followers = artist.follower_count?.toLocaleString() || 'N/A';
    const name = artist.name || 'Unknown';
    const handle = artist.instagram_handle || 'N/A';
    const location = `${artist.city}, ${artist.state || 'N/A'}`;
    const featured = isArtistFeatured(artist.follower_count);

    console.log(
      `${String(index + 1).padStart(4)} | ${followers.padStart(9)} | ${name.padEnd(25).substring(0, 25)} | @${handle.padEnd(20).substring(0, 20)} | ${location} ${featured ? '✓' : ''}`
    );
  });

  // Get total count for percentage
  const { count: totalCount } = await supabase
    .from('artists')
    .select('*', { count: 'exact', head: true });

  console.log('\n📊 Summary:');
  console.log(`Total artists: ${totalCount || 0}`);
  console.log(`Featured artists: ${artists.length} (${totalCount ? ((artists.length / totalCount) * 100).toFixed(1) : '0'}%)`);

  // Test the isArtistFeatured function
  console.log('\n🧪 Testing isArtistFeatured() function:');
  console.log(`   49,999 followers: ${isArtistFeatured(49999) ? '✓ Featured' : '✗ Not Featured'} (expected: Not Featured)`);
  console.log(`   50,000 followers: ${isArtistFeatured(50000) ? '✓ Featured' : '✗ Not Featured'} (expected: Featured)`);
  console.log(`   50,001 followers: ${isArtistFeatured(50001) ? '✓ Featured' : '✗ Not Featured'} (expected: Featured)`);
  console.log(`   null followers:   ${isArtistFeatured(null) ? '✓ Featured' : '✗ Not Featured'} (expected: Not Featured)`);
  console.log(`   undefined:        ${isArtistFeatured(undefined) ? '✓ Featured' : '✗ Not Featured'} (expected: Not Featured)`);
}

checkFeaturedArtists().catch(console.error);
