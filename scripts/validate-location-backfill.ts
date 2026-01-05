/**
 * Validate that all artists have artist_locations entries
 * Run before deploying location consolidation changes
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function validateBackfill() {
  console.log('Validating artist_locations backfill...\n')

  // 1. Check for orphaned artists (have city but no artist_locations)
  const { data: orphaned, error: orphanedError } = await supabase
    .from('artists')
    .select('id, name, city, state, slug')
    .not('city', 'is', null)
    .neq('city', '')
    .is('deleted_at', null)
    .limit(100)

  if (orphanedError) {
    console.error('Error querying artists:', orphanedError)
    return
  }

  // Check each artist for artist_locations entry
  const missingLocations: typeof orphaned = []

  for (const artist of orphaned || []) {
    const { data: locs } = await supabase
      .from('artist_locations')
      .select('id')
      .eq('artist_id', artist.id)
      .limit(1)

    if (!locs || locs.length === 0) {
      missingLocations.push(artist)
    }
  }

  // 2. Check for artists with no primary location set
  const { data: noPrimary, error: noPrimaryError } = await supabase
    .from('artist_locations')
    .select('artist_id, city, region, is_primary')
    .eq('is_primary', false)
    .limit(100)

  // Get artists that ONLY have non-primary locations
  const artistsWithLocations = new Set<string>()
  const artistsWithPrimary = new Set<string>()

  if (noPrimary) {
    for (const loc of noPrimary) {
      artistsWithLocations.add(loc.artist_id)
    }
  }

  // Check which have a primary
  const { data: primaryLocs } = await supabase
    .from('artist_locations')
    .select('artist_id')
    .eq('is_primary', true)

  if (primaryLocs) {
    for (const loc of primaryLocs) {
      artistsWithPrimary.add(loc.artist_id)
    }
  }

  const missingPrimary = [...artistsWithLocations].filter(id => !artistsWithPrimary.has(id))

  // 3. Get counts
  const { count: totalArtists } = await supabase
    .from('artists')
    .select('id', { count: 'exact', head: true })
    .not('city', 'is', null)
    .neq('city', '')
    .is('deleted_at', null)

  const { count: totalLocations } = await supabase
    .from('artist_locations')
    .select('id', { count: 'exact', head: true })

  const { count: primaryCount } = await supabase
    .from('artist_locations')
    .select('id', { count: 'exact', head: true })
    .eq('is_primary', true)

  // Report
  console.log('=== BACKFILL VALIDATION REPORT ===\n')
  console.log(`Total artists with city: ${totalArtists}`)
  console.log(`Total artist_locations entries: ${totalLocations}`)
  console.log(`Entries with is_primary=true: ${primaryCount}`)
  console.log('')

  if (missingLocations.length === 0) {
    console.log('✅ No orphaned artists found (all artists have artist_locations entries)')
  } else {
    console.log(`❌ CRITICAL: ${missingLocations.length} artists missing from artist_locations:`)
    missingLocations.slice(0, 10).forEach(a => {
      console.log(`   - ${a.name} (${a.city}, ${a.state}) - /artist/${a.slug}`)
    })
    if (missingLocations.length > 10) {
      console.log(`   ... and ${missingLocations.length - 10} more`)
    }
  }

  console.log('')

  if (missingPrimary.length === 0) {
    console.log('✅ All artists with locations have a primary location set')
  } else {
    console.log(`⚠️  WARNING: ${missingPrimary.length} artists have locations but no primary set`)
  }

  console.log('\n=================================')

  if (missingLocations.length > 0) {
    console.log('\n🚫 DO NOT DEPLOY - Orphaned artists will disappear from search!')
    console.log('   Run backfill first or re-sync artist_locations table.')
    process.exit(1)
  } else {
    console.log('\n✅ Safe to deploy location consolidation changes.')
    process.exit(0)
  }
}

validateBackfill().catch(console.error)
