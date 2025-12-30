import dotenv from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

// Load environment variables before anything else
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function checkFeaturedArtists() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Get all artists with their max likes count
  const { data: artists, error } = await supabase
    .from('artists')
    .select(`
      id,
      name,
      instagram_handle,
      city,
      portfolio_images (
        likes_count
      )
    `)
    .order('name');

  if (error) {
    console.error('Error fetching artists:', error);
    return;
  }

  // Calculate max likes for each artist
  const artistsWithMaxLikes = artists
    .map((artist: any) => {
      const maxLikes = Math.max(
        ...artist.portfolio_images.map((img: any) => img.likes_count || 0),
        0
      );
      return {
        name: artist.name,
        instagram_handle: artist.instagram_handle,
        city: artist.city,
        maxLikes,
        isFeatured: maxLikes >= 10000,
      };
    })
    .sort((a, b) => b.maxLikes - a.maxLikes);

  console.log('=== Featured Artists (>10k likes) ===\n');
  const featured = artistsWithMaxLikes.filter((a) => a.isFeatured);

  if (featured.length === 0) {
    console.log('⚠️  No artists have posts with >10,000 likes');
    console.log('\nTop 10 artists by max likes:');
    artistsWithMaxLikes.slice(0, 10).forEach((artist, i) => {
      console.log(
        `${i + 1}. ${artist.name} (@${artist.instagram_handle}) - ${artist.city} - ${artist.maxLikes.toLocaleString()} likes`
      );
    });
  } else {
    console.log(`Found ${featured.length} featured artists:\n`);
    featured.forEach((artist, i) => {
      console.log(
        `${i + 1}. ${artist.name} (@${artist.instagram_handle}) - ${artist.city} - ${artist.maxLikes.toLocaleString()} likes`
      );
    });

    console.log('\n=== Summary ===');
    console.log(`Total artists: ${artistsWithMaxLikes.length}`);
    console.log(`Featured artists: ${featured.length} (${((featured.length / artistsWithMaxLikes.length) * 100).toFixed(1)}%)`);
  }
}

checkFeaturedArtists().catch(console.error);
