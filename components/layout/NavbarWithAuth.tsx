import { createClient } from '@/lib/supabase/server'
import Navbar from './Navbar'

/**
 * Server component wrapper that fetches auth state
 * and passes it to the client Navbar component
 */
export default async function NavbarWithAuth() {
  const supabase = await createClient()

  // Get current user
  const { data: { user: authUser } } = await supabase.auth.getUser()

  let userData = null
  let isPro = false
  let artistSlug = null

  if (authUser) {
    // Fetch user data and artist data in parallel for better performance
    const [userResult, artistResult] = await Promise.all([
      supabase
        .from('users')
        .select('id, avatar_url, instagram_username')
        .eq('id', authUser.id)
        .single(),
      supabase
        .from('artists')
        .select('is_pro, slug')
        .eq('claimed_by_user_id', authUser.id)
        .maybeSingle() // Use maybeSingle since not all users have claimed artists
    ])

    if (userResult.error) {
      console.error('[NavbarWithAuth] Failed to fetch user:', userResult.error)
    }

    if (userResult.data) {
      userData = userResult.data
      isPro = artistResult.data?.is_pro ?? false
      artistSlug = artistResult.data?.slug ?? null
    }
  }

  return <Navbar user={userData} isPro={isPro} artistSlug={artistSlug} />
}
