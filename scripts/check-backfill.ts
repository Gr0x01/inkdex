import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function check() {
  // Use RPC to efficiently count orphaned artists
  const { data, error } = await supabase.rpc('count_orphaned_artists');

  if (error) {
    // RPC doesn't exist, fall back to a simple count approach
    console.log('RPC not available, using alternative method...');

    // Get count of artists with city
    const { count: artistsWithCity } = await supabase
      .from('artists')
      .select('id', { count: 'exact', head: true })
      .not('city', 'is', null)
      .neq('city', '')
      .is('deleted_at', null);

    // Get count of artists in artist_locations
    const { count: artistsInLocations } = await supabase
      .from('artist_locations')
      .select('artist_id', { count: 'exact', head: true });

    // Get distinct artist_ids in artist_locations (need to paginate for large tables)
    const allArtistIds: string[] = [];
    let offset = 0;
    const PAGE_SIZE = 1000;

    while (true) {
      const { data: locData, error: locErr } = await supabase
        .from('artist_locations')
        .select('artist_id')
        .range(offset, offset + PAGE_SIZE - 1);

      if (locErr || !locData || locData.length === 0) break;
      allArtistIds.push(...locData.map(l => l.artist_id));
      offset += PAGE_SIZE;
      if (locData.length < PAGE_SIZE) break;
    }

    const uniqueArtistIds = new Set(allArtistIds);

    console.log('Artists with city in artists table:', artistsWithCity);
    console.log('Entries in artist_locations:', artistsInLocations);
    console.log('Unique artists in artist_locations:', uniqueArtistIds.size);

    // Sample check - get 10 artists with city and check if they have locations
    const { data: sample } = await supabase
      .from('artists')
      .select('id, name, city, state')
      .not('city', 'is', null)
      .neq('city', '')
      .is('deleted_at', null)
      .limit(10);

    console.log('\nSample check (10 artists):');
    for (const artist of sample || []) {
      const hasLoc = uniqueArtistIds.has(artist.id);
      console.log(`  ${hasLoc ? '✓' : '✗'} ${artist.name} (${artist.city}, ${artist.state})`);
    }

    return;
  }

  console.log('Orphaned artists:', data);
}

check();
