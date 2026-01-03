/**
 * Start Background Instagram Fetch
 *
 * Triggers Instagram fetch in background without blocking user flow.
 * Called when user lands on /onboarding/info page.
 *
 * POST /api/onboarding/start-fetch
 *
 * Request: { sessionId: string }
 * Response: { success: true, status: 'started' }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse request body
    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    // 3. Verify session belongs to user
    const { data: session, error: sessionError } = await supabase
      .from('onboarding_sessions')
      .select('id, user_id, fetch_status')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // 4. Check if fetch already started or completed
    if (session.fetch_status === 'in_progress' || session.fetch_status === 'completed') {
      return NextResponse.json({
        success: true,
        status: session.fetch_status,
        message: 'Fetch already in progress or completed'
      });
    }

    // 5. Update session to mark fetch as started
    const { error: updateError } = await supabase
      .from('onboarding_sessions')
      .update({
        fetch_status: 'in_progress',
        fetch_started_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    if (updateError) {
      console.error('[Start Fetch] Failed to update session:', updateError);
      return NextResponse.json({ error: 'Failed to start fetch' }, { status: 500 });
    }

    // 6. Spawn background job (non-blocking)
    // Use fetch() to call existing fetch-instagram endpoint
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    fetch(`${appUrl}/api/onboarding/fetch-instagram`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    }).catch(err => {
      console.error('[Start Fetch] Background fetch failed:', err);
      // Update session to mark as failed
      supabase
        .from('onboarding_sessions')
        .update({
          fetch_status: 'failed',
          fetch_completed_at: new Date().toISOString(),
          fetch_error: err.message || 'Unknown error',
        })
        .eq('id', sessionId)
        .then(() => {
          console.error('[Start Fetch] Marked session as failed');
        });
    });

    console.log(`[Start Fetch] Background fetch started for session ${sessionId}`);

    // 7. Return immediately (don't wait for fetch to complete)
    return NextResponse.json({
      success: true,
      status: 'started',
      message: 'Instagram fetch started in background'
    });

  } catch (error) {
    console.error('[Start Fetch] Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
