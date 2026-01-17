/**
 * Check Admin Status
 * GET /api/admin/check-status
 *
 * Returns whether the current user is an admin.
 * Used by client components to conditionally render admin features.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdminEmail } from '@/lib/admin/whitelist'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const isAdmin = user ? isAdminEmail(user.email) : false

    return NextResponse.json({ isAdmin })
  } catch {
    return NextResponse.json({ isAdmin: false })
  }
}
