import 'dotenv/config'
import { createClient } from '@/lib/supabase/server'

/**
 * Verify and update state field in artists table
 * Run: npx tsx scripts/setup/verify-state-field.ts
 */
async function verifyStateField() {
  const supabase = await createClient()

  // Check current state values
  console.log('Checking current state field values...\n')

  const { data: artists, error } = await supabase
    .from('artists')
    .select('id, slug, name, city, state')
    .limit(10)

  if (error) {
    console.error('Error fetching artists:', error)
    return
  }

  console.log('Sample artists:')
  artists?.forEach(artist => {
    console.log(`  ${artist.name} (${artist.slug}): city="${artist.city}", state="${artist.state || 'NULL'}"`)
  })

  // Check how many have null state
  const { count: nullCount } = await supabase
    .from('artists')
    .select('*', { count: 'exact', head: true })
    .is('state', null)

  console.log(`\nArtists with NULL state: ${nullCount}`)

  if (nullCount && nullCount > 0) {
    console.log('\nUpdating state field...')

    // Update Austin artists
    const { error: txError } = await supabase
      .from('artists')
      .update({ state: 'TX' })
      .eq('city', 'Austin')
      .is('state', null)

    if (txError) {
      console.error('Error updating Texas artists:', txError)
    } else {
      console.log('✓ Updated Austin artists to state="TX"')
    }

    // Update Los Angeles artists
    const { error: caError } = await supabase
      .from('artists')
      .update({ state: 'CA' })
      .eq('city', 'Los Angeles')
      .is('state', null)

    if (caError) {
      console.error('Error updating California artists:', caError)
    } else {
      console.log('✓ Updated Los Angeles artists to state="CA"')
    }

    // Verify updates
    const { count: stillNull } = await supabase
      .from('artists')
      .select('*', { count: 'exact', head: true })
      .is('state', null)

    console.log(`\nArtists with NULL state after update: ${stillNull}`)
  } else {
    console.log('\n✓ All artists have state field populated')
  }

  // Show final stats
  const { data: stats } = await supabase
    .from('artists')
    .select('state')

  const stateCounts = stats?.reduce((acc, artist) => {
    const state = artist.state || 'NULL'
    acc[state] = (acc[state] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  console.log('\nState distribution:')
  Object.entries(stateCounts || {}).forEach(([state, count]) => {
    console.log(`  ${state}: ${count} artists`)
  })
}

verifyStateField()
  .then(() => {
    console.log('\n✓ Done')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
