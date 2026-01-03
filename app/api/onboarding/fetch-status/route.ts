/**
 * Get Instagram Fetch Status
 *
 * Polls status of background Instagram fetch for dashboard notification.
 * Called by FetchStatusBanner component every 3 seconds.
 *
 * GET /api/onboarding/fetch-status
 *
 * Response: { status: 'pending' | 'in_progress' | 'completed' | 'failed' | null, imageCount: number }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Get most recent onboarding session for this user
    const { data: session } = await supabase
      .from('onboarding_sessions')
      .select('fetch_status, fetched_images')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // 3. No session found - user hasn't started onboarding yet
    if (!session) {
      return NextResponse.json({ status: null, imageCount: 0 });
    }

    // 4. Calculate classified image count
    const fetchedImages = (session.fetched_images as any[]) || [];
    const imageCount = fetchedImages.filter(img => img.classified === true).length;

    // 5. Return status and count
    return NextResponse.json({
      status: session.fetch_status,
      imageCount,
    });

  } catch (error) {
    console.error('[Fetch Status] Error:', error);
    // Return null status on error (banner won't show)
    return NextResponse.json({ status: null, imageCount: 0 });
  }
}
