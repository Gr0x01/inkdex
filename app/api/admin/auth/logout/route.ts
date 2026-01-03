/**
 * Admin Logout Endpoint
 *
 * Signs out the admin user and redirects to admin login.
 *
 * POST /api/admin/auth/logout
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Sign out from Supabase Auth
    await supabase.auth.signOut();

    // Redirect to admin login page
    return NextResponse.redirect(new URL('/admin/login', request.url));
  } catch (error) {
    console.error('[Admin Logout] Error:', error);
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }
}
