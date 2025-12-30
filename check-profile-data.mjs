import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkProfileData() {
  const { data } = await supabase
    .from('artists')
    .select('name, profile_image_url, instagram_handle')
    .limit(10)

  if (data) {
    console.log('Sample artists:\n')
    data.forEach(artist => {
      const hasPhoto = artist.profile_image_url ? '✓ HAS PHOTO' : '✗ NO PHOTO'
      console.log(`${hasPhoto} - ${artist.name} (@${artist.instagram_handle})`)
    })

    const withPhotos = data.filter(a => a.profile_image_url).length
    console.log(`\n${withPhotos}/${data.length} artists have profile photos`)
  }
}

checkProfileData()
