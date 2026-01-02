/**
 * Self-Add OAuth Redirect
 *
 * Simple redirect to Instagram OAuth with return path to verification page
 * Leverages existing Phase 2 OAuth infrastructure
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Redirect to Instagram OAuth with return path to verification page
  const baseUrl = request.nextUrl.origin;
  const redirectUrl = `${baseUrl}/api/auth/instagram?redirect=/add-artist/verify`;

  return NextResponse.redirect(redirectUrl);
}
