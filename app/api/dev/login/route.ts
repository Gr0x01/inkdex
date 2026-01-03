/**
 * Dev-Only Login Endpoint
 *
 * Allows bypassing OAuth in development for testing with synthetic test users
 *
 * SECURITY: Only works when NODE_ENV=development
 *
 * POST /api/dev/login
 *
 * Request: { userId: string }
 * Response: { success: true, redirectUrl: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAllTestUsers } from '@/lib/dev/test-users';

export async function POST(request: NextRequest) {
  // Security check: Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    // 1. Parse request body
    const body = await request.json();
    const { userId } = body;

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // 2. Verify userId is a valid test user
    const testUsers = getAllTestUsers();
    const testUser = testUsers.find((u) => u.id === userId);

    if (!testUser) {
      return NextResponse.json(
        { error: 'Invalid test user ID' },
        { status: 400 }
      );
    }

    // 3. Create Supabase client with service role (admin privileges required)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // 4. Get user's email from Supabase Auth
    const { data: authData } = await supabase.auth.admin.listUsers();
    const authUser = authData?.users.find((u) => u.id === userId);

    if (!authUser) {
      return NextResponse.json(
        { error: 'Test user not found in Supabase Auth. Please run the seeding script.' },
        { status: 404 }
      );
    }

    console.log(`[Dev] Logging in as test user: ${authUser.email}`);

    // 5. Generate magic link token
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: authUser.email!,
    });

    if (linkError || !linkData) {
      console.error('[Dev] Failed to generate magic link:', linkError);
      return NextResponse.json(
        { error: 'Failed to generate authentication link' },
        { status: 500 }
      );
    }

    // 6. Determine redirect based on user type
    let redirectUrl = '/dashboard';

    // If unclaimed artist, redirect to their profile page
    if (testUser.account_type === 'fan' && testUser.artist) {
      const { slug, city, state } = testUser.artist;
      const stateSlug = state.toLowerCase().replace(/\s+/g, '-');
      const citySlug = city.toLowerCase().replace(/\s+/g, '-');
      redirectUrl = `/${stateSlug}/${citySlug}/artists/${slug}`;
    }

    console.log(`[Dev] Generated auth token for: ${authUser.email}`);

    // 7. Return token_hash to client for verification
    // Client will call verifyOtp() to properly set session cookies
    return NextResponse.json({
      success: true,
      token_hash: linkData.properties.hashed_token,
      email: authUser.email,
      redirectUrl,
    });
  } catch (error) {
    console.error('[Dev] Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
