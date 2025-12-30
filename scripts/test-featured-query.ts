import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

async function testFeaturedQuery() {
  console.log('🧪 Testing featured artists query with city="austin"...\n');

  try {
    const { data, error } = await supabase
      .from('artists')
      .select(`
        id,
        name,
        slug,
        follower_count,
        portfolio_images!inner (
          id,
          storage_thumb_640,
          status
        )
      `)
      .eq('city', 'austin')
      .gte('follower_count', 50000)
      .eq('portfolio_images.status', 'active')
      .not('portfolio_images.storage_thumb_640', 'is', null)
      .order('follower_count', { ascending: false })
      .limit(12);

    if (error) {
      console.error('❌ Error:', error);
      return;
    }

    console.log(`✅ Query successful!`);
    console.log(`📊 Found ${data?.length || 0} artist rows\n`);

    if (data && data.length > 0) {
      // Group by artist
      const artistsMap = new Map();
      data.forEach((row: any) => {
        if (!artistsMap.has(row.id)) {
          artistsMap.set(row.id, {
            id: row.id,
            name: row.name,
            slug: row.slug,
            follower_count: row.follower_count,
            images: [],
          });
        }
        const artist = artistsMap.get(row.id);
        artist.images.push(row.portfolio_images);
      });

      const artists = Array.from(artistsMap.values());
      console.log(`🎨 Unique artists: ${artists.length}\n`);

      console.log('Featured Artists (50k+ followers):');
      artists.forEach((artist: any, index) => {
        console.log(`${index + 1}. ${artist.name} (@${artist.slug})`);
        console.log(`   Followers: ${artist.follower_count?.toLocaleString()}`);
        console.log(`   Portfolio images: ${artist.images.length}`);
        console.log('');
      });
    } else {
      console.log('⚠️  No featured artists found.');
      console.log('This might mean:');
      console.log('  1. No artists have 50k+ followers in austin');
      console.log('  2. Artists with 50k+ followers have no images');
      console.log('  3. City name mismatch in database');
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testFeaturedQuery();
