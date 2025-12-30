import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

async function checkImageCounts() {
  console.log('🧪 Checking image counts for featured artists (50k+ followers)...\n');

  const { data: artists, error } = await supabase
    .from('artists')
    .select('id, name, follower_count')
    .eq('city', 'austin')
    .gte('follower_count', 50000)
    .order('follower_count', { ascending: false });

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Found ${artists.length} featured artists\n`);

  for (const artist of artists) {
    const { count } = await supabase
      .from('portfolio_images')
      .select('*', { count: 'exact', head: true })
      .eq('artist_id', artist.id)
      .eq('status', 'active')
      .not('storage_thumb_640', 'is', null);

    const hasEnough = count && count >= 4 ? '✓' : '✗';
    console.log(`${hasEnough} ${artist.name}: ${count} images (${artist.follower_count?.toLocaleString()} followers)`);
  }

  // Count how many have 4+ images
  let artistsWith4Plus = 0;
  for (const artist of artists) {
    const { count } = await supabase
      .from('portfolio_images')
      .select('*', { count: 'exact', head: true })
      .eq('artist_id', artist.id)
      .eq('status', 'active')
      .not('storage_thumb_640', 'is', null);

    if (count && count >= 4) {
      artistsWith4Plus++;
    }
  }

  console.log(`\n📊 Summary: ${artistsWith4Plus}/${artists.length} artists have 4+ images`);
}

checkImageCounts();
