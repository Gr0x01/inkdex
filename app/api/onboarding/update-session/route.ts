/**
 * Onboarding Session Update
 *
 * Updates onboarding session data for steps 2-4
 *
 * POST /api/onboarding/update-session
 *
 * Request: {
 *   sessionId: string,
 *   step: 'preview' | 'portfolio' | 'booking',
 *   data: ProfileData | PortfolioSelection | BookingLink
 * }
 * Response: { success: true }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { updateSessionSchema } from '@/lib/onboarding/validation';
import { checkOnboardingRateLimit } from '@/lib/rate-limiter';
import { ZodError } from 'zod';

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Check rate limit
    const rateLimit = checkOnboardingRateLimit(user.id);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please slow down.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimit.limit.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(rateLimit.reset).toISOString(),
          },
        }
      );
    }

    // 3. Parse and validate request body
    const body = await request.json();
    let validatedData;

    try {
      validatedData = updateSessionSchema.parse(body);
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          { error: 'Validation failed', details: error.errors },
          { status: 400 }
        );
      }
      throw error;
    }

    const { sessionId, step, data } = validatedData;

    // 4. Verify session belongs to authenticated user
    const { data: session, error: fetchError } = await supabase
      .from('onboarding_sessions')
      .select('user_id, current_step, expires_at')
      .eq('id', sessionId)
      .single();

    if (fetchError || !session) {
      return NextResponse.json(
        { error: 'Onboarding session not found' },
        { status: 404 }
      );
    }

    if (session.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized to modify this session' },
        { status: 403 }
      );
    }

    // 5. Check session expiration
    if (session.expires_at && new Date(session.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Onboarding session has expired. Please start over.' },
        { status: 410 } // Gone
      );
    }

    // 6. Update session based on step
    let updateData: any = {};
    let newStep: number = session.current_step;

    switch (step) {
      case 'preview':
        // Step 2: Profile data
        updateData = {
          profile_updates: data,
          current_step: 2,
        };
        newStep = 2;
        break;

      case 'portfolio':
        // Step 3: Portfolio selection
        if ('selectedImageIds' in data) {
          updateData = {
            selected_image_ids: data.selectedImageIds,
            current_step: 3,
          };
          newStep = 3;
        } else {
          return NextResponse.json(
            { error: 'Invalid portfolio data' },
            { status: 400 }
          );
        }
        break;

      case 'booking':
        // Step 4: Booking link
        if ('bookingLink' in data) {
          updateData = {
            booking_link: data.bookingLink || null,
            current_step: 4,
          };
          newStep = 4;
        } else {
          return NextResponse.json(
            { error: 'Invalid booking data' },
            { status: 400 }
          );
        }
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid onboarding step' },
          { status: 400 }
        );
    }

    // 7. Update session in database
    const { error: updateError } = await supabase
      .from('onboarding_sessions')
      .update(updateData)
      .eq('id', sessionId);

    if (updateError) {
      console.error('[Onboarding] Failed to update session:', updateError);
      return NextResponse.json(
        { error: 'Failed to save progress. Please try again.' },
        { status: 500 }
      );
    }

    console.log(`[Onboarding] Session ${sessionId} updated to step ${newStep}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Onboarding] Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
