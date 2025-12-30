import dotenv from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

// Load environment variables before anything else
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function checkFeaturedData() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Check follower counts
  console.log('=== Top 10 Artists by Follower Count ===');
  const { data: artists, error: artistsError } = await supabase
    .from('artists')
    .select('name, instagram_handle, follower_count')
    .order('follower_count', { ascending: false, nullsFirst: false })
    .limit(10);

  if (artistsError) {
    console.error('Error fetching artists:', artistsError);
  } else {
    artists?.forEach((artist, i) => {
      console.log(
        `${i + 1}. ${artist.name} (@${artist.instagram_handle}): ${artist.follower_count?.toLocaleString() || 'N/A'} followers`
      );
    });
  }

  // Check distribution of follower counts
  const { data: followerStats } = await supabase
    .from('artists')
    .select('follower_count')
    .not('follower_count', 'is', null);

  if (followerStats && followerStats.length > 0) {
    const counts = followerStats.map((a) => a.follower_count as number);
    console.log('\n=== Follower Count Statistics ===');
    console.log('Total artists with follower data:', counts.length);
    console.log('Min:', Math.min(...counts).toLocaleString());
    console.log('Max:', Math.max(...counts).toLocaleString());
    console.log(
      'Average:',
      Math.round(counts.reduce((a, b) => a + b, 0) / counts.length).toLocaleString()
    );
    console.log(
      'Median:',
      counts.sort((a, b) => a - b)[Math.floor(counts.length / 2)].toLocaleString()
    );

    // Distribution by threshold
    const thresholds = [1000, 5000, 10000, 50000, 100000];
    console.log('\n=== Distribution by Follower Threshold ===');
    thresholds.forEach((threshold) => {
      const count = counts.filter((c) => c >= threshold).length;
      const pct = ((count / counts.length) * 100).toFixed(1);
      console.log(`${threshold.toLocaleString()}+: ${count} artists (${pct}%)`);
    });
  } else {
    console.log('\n⚠️  No follower count data available');
    console.log('Follower counts were not scraped during Instagram data collection');
  }

  // Check if featured field is set on images
  const { count: featuredCount } = await supabase
    .from('portfolio_images')
    .select('*', { count: 'exact', head: true })
    .eq('featured', true);

  console.log('\n=== Featured Images ===');
  console.log('Images with featured=true:', featuredCount || 0);

  // Check likes counts
  console.log('\n=== Top 5 Most Liked Posts ===');
  const { data: topLiked, error: likesError } = await supabase
    .from('portfolio_images')
    .select('likes_count, instagram_url, artist:artists(name, instagram_handle)')
    .order('likes_count', { ascending: false, nullsFirst: false })
    .limit(5);

  if (likesError) {
    console.error('Error fetching top liked:', likesError);
  } else {
    topLiked?.forEach((post: any, i) => {
      console.log(
        `${i + 1}. ${post.likes_count?.toLocaleString() || 'N/A'} likes - ${post.artist?.name} (@${post.artist?.instagram_handle})`
      );
    });
  }
}

checkFeaturedData().catch(console.error);
