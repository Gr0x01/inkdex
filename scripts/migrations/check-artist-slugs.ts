// Load environment variables FIRST before any imports
import { config } from 'dotenv'
config({ path: '.env.local' })

// Now import after env is loaded
import { createServiceClient } from '../../lib/supabase/service'

async function checkArtistSlugs() {
  const supabase = createServiceClient()

  console.log('Checking artist slugs for periods or underscores...\n')

  // Fetch all artist slugs
  const { data: artists, error } = await supabase
    .from('artists')
    .select('slug, name')

  if (error) {
    console.error('Error fetching artists:', error.message)
    process.exit(1)
  }

  // Check for periods or underscores
  const invalidSlugs = artists?.filter((a) =>
    /[._]/.test(a.slug)
  ) || []

  if (invalidSlugs.length === 0) {
    console.log('✅ All artist slugs are valid (no periods or underscores)')
    console.log(`   Checked ${artists?.length || 0} artists`)
  } else {
    console.log('⚠️  Found artists with periods or underscores in slugs:')
    invalidSlugs.forEach((a) => {
      console.log(`   - ${a.slug} (${a.name})`)
    })
    console.log(`\n   Total: ${invalidSlugs.length} / ${artists?.length || 0}`)
    console.log('\n   Note: These will need to be updated if the stricter validation is enforced')
  }
}

checkArtistSlugs().catch((error) => {
  console.error('Check failed:', error)
  process.exit(1)
})
