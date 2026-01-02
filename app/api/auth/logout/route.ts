import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { deleteInstagramTokens } from '@/lib/supabase/vault'

/**
 * POST /api/auth/logout
 *
 * Logs out user:
 * 1. Deletes Instagram tokens from Vault
 * 2. Signs out from Supabase Auth
 * 3. Redirects to homepage
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      // Delete tokens from Vault
      await deleteInstagramTokens(user.id)

      // Sign out from Supabase Auth
      await supabase.auth.signOut()
    }

    // Redirect to homepage
    return NextResponse.redirect(new URL('/', request.url))
  } catch (error) {
    console.error('[Logout] Error:', error)
    return NextResponse.redirect(new URL('/', request.url))
  }
}
