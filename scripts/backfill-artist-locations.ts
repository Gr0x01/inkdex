/**
 * Backfill artist_locations from artists.city/state
 *
 * This ensures all artists with location data have entries in artist_locations
 * before we drop the legacy columns.
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function backfill() {
  console.log('='.repeat(60));
  console.log('Backfilling artist_locations from artists.city/state');
  console.log('='.repeat(60));

  // Get all artist_ids already in artist_locations
  console.log('\nFetching existing artist_locations...');
  const { data: existingLocs } = await supabase
    .from('artist_locations')
    .select('artist_id');

  const existingIds = new Set(existingLocs?.map(l => l.artist_id) || []);
  console.log(`Found ${existingIds.size} artists already in artist_locations`);

  // Get all artists with city that are NOT in artist_locations
  console.log('\nFetching artists with city but no location entry...');
  const { data: artists, error } = await supabase
    .from('artists')
    .select('id, city, state')
    .not('city', 'is', null)
    .neq('city', '')
    .is('deleted_at', null);

  if (error) {
    console.error('Error fetching artists:', error);
    return;
  }

  const orphaned = artists?.filter(a => !existingIds.has(a.id)) || [];
  console.log(`Found ${orphaned.length} artists needing backfill`);

  // Debug: check if first few "orphaned" artists really don't have locations
  if (orphaned.length > 0) {
    console.log('\nDebug - checking first 5 "orphaned" artists:');
    for (const artist of orphaned.slice(0, 5)) {
      const { data: locs, error: locErr } = await supabase
        .from('artist_locations')
        .select('*')
        .eq('artist_id', artist.id);
      console.log(`  ${artist.id}: ${locs?.length || 0} locations (city=${artist.city}, state=${artist.state})`);
      if (locs && locs.length > 0) {
        console.log(`    Existing:`, locs[0]);
      }
    }
  }

  if (orphaned.length === 0) {
    console.log('\nNo backfill needed!');
    return;
  }

  // Batch insert into artist_locations
  console.log('\nInserting into artist_locations...');

  const BATCH_SIZE = 500;
  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < orphaned.length; i += BATCH_SIZE) {
    const batch = orphaned.slice(i, i + BATCH_SIZE);

    const records = batch.map(a => ({
      artist_id: a.id,
      city: a.city,
      region: a.state || null,
      country_code: 'US',
      location_type: 'city',
      is_primary: true,
      display_order: 0,
    }));

    const { error: insertError } = await supabase
      .from('artist_locations')
      .insert(records);

    if (insertError) {
      console.error(`Batch ${Math.floor(i / BATCH_SIZE) + 1} error:`, insertError.message);
      errors += batch.length;
    } else {
      inserted += batch.length;
      console.log(`  Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(orphaned.length / BATCH_SIZE)}: ${batch.length} records`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('BACKFILL COMPLETE');
  console.log('='.repeat(60));
  console.log(`Inserted: ${inserted}`);
  console.log(`Errors: ${errors}`);
}

backfill();
