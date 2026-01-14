import * as dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function updateLocation(handle: string, newCity: string) {
  const { data: artist } = await supabase
    .from('artists')
    .select('id, name')
    .eq('instagram_handle', handle)
    .single()

  if (!artist) {
    console.log(`Artist @${handle} not found`)
    return
  }

  console.log(`Found: ${artist.name} (${artist.id})`)

  const { error } = await supabase
    .from('artist_locations')
    .update({ city: newCity })
    .eq('artist_id', artist.id)
    .eq('is_primary', true)

  if (error) {
    console.log('Error:', error.message)
  } else {
    console.log(`Updated location to ${newCity}`)
  }
}

// Usage: npx tsx scripts/maintenance/fix-artist-location.ts nickadamtattoo Worcester
const [handle, city] = process.argv.slice(2)
if (!handle || !city) {
  console.log('Usage: npx tsx scripts/maintenance/fix-artist-location.ts <handle> <city>')
  process.exit(1)
}

updateLocation(handle, city)
