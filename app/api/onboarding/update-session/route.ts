/**
 * Onboarding Session Update
 *
 * Updates onboarding session data during onboarding
 *
 * POST /api/onboarding/update-session
 *
 * Request: {
 *   sessionId: string,
 *   step: 'info' | 'preview' | 'portfolio' | 'booking',  // 'info' is new, others for backward compat
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
    const rateLimit = await checkOnboardingRateLimit(user.id);
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

    // Define session update data type
    interface SessionUpdateData {
      profile_updates?: Record<string, unknown>
      booking_link?: string | null
      current_step?: number
      selected_image_ids?: string[]
    }

    // 6. Update session based on step
    let updateData: SessionUpdateData = {};
    let newStep: number = session.current_step;

    switch (step) {
      case 'info':
        // Step 1 - Combined profile info + booking + sync preferences
        {
          const infoData = data as {
            name?: string
            bio?: string
            locations?: Array<{ city?: string; region?: string }>
            city?: string
            state?: string
            bookingLink?: string
            autoSyncEnabled?: boolean
            filterNonTattoo?: boolean
          };
          updateData = {
            profile_updates: {
              name: infoData.name,
              bio: infoData.bio,
              locations: infoData.locations,
              // Legacy format for backward compatibility
              city: infoData.locations?.[0]?.city || infoData.city || '',
              state: infoData.locations?.[0]?.region || infoData.state || '',
              // Sync preferences (Pro-only, enforced server-side in finalize)
              autoSyncEnabled: infoData.autoSyncEnabled || false,
              filterNonTattoo: infoData.filterNonTattoo !== undefined ? infoData.filterNonTattoo : true,
            },
            booking_link: infoData.bookingLink || null,
            current_step: 1,
          };
          newStep = 1;
        }
        break;

      case 'locations':
        // Step 2: Location selection
        {
          const locationsData = data as {
            locations?: Array<{
              city?: string | null;
              region?: string | null;
              countryCode?: string;
              locationType?: string;
              isPrimary?: boolean;
            }>;
            city?: string;
            state?: string;
          };

          // Get existing profile_updates to merge
          const { data: currentSession } = await supabase
            .from('onboarding_sessions')
            .select('profile_updates')
            .eq('id', sessionId)
            .single();

          const existingUpdates = (currentSession?.profile_updates || {}) as Record<string, unknown>;

          updateData = {
            profile_updates: {
              ...existingUpdates,
              locations: locationsData.locations,
              city: locationsData.locations?.[0]?.city || locationsData.city || '',
              state: locationsData.locations?.[0]?.region || locationsData.state || '',
            },
            current_step: 2,
          };
          newStep = 2;
        }
        break;

      case 'sync_preferences':
        // Step 3: Sync preferences (NEW)
        {
          const syncData = data as { autoSyncEnabled?: boolean; filterNonTattoo?: boolean };

          // Get existing profile_updates to merge
          const { data: currentSession } = await supabase
            .from('onboarding_sessions')
            .select('profile_updates')
            .eq('id', sessionId)
            .single();

          const existingUpdates = (currentSession?.profile_updates || {}) as Record<string, unknown>;

          updateData = {
            profile_updates: {
              ...existingUpdates,
              autoSyncEnabled: syncData.autoSyncEnabled || false,
              filterNonTattoo: syncData.filterNonTattoo !== undefined ? syncData.filterNonTattoo : true,
            },
            current_step: 3,
          };
          newStep = 3;
        }
        break;

      case 'preview':
        // Step 2: Profile data
        updateData = {
          profile_updates: data as Record<string, unknown>,
          current_step: 2,
        };
        newStep = 2;
        break;

      case 'portfolio':
        // Step 3: Portfolio selection (legacy)
        {
          const portfolioData = data as { selectedImageIds?: string[] };
          if ('selectedImageIds' in portfolioData) {
            updateData = {
              selected_image_ids: portfolioData.selectedImageIds,
              current_step: 3,
            };
            newStep = 3;
          } else {
            return NextResponse.json(
              { error: 'Invalid portfolio data' },
              { status: 400 }
            );
          }
        }
        break;

      case 'booking':
        // Step 4: Booking link (legacy)
        {
          const bookingData = data as { bookingLink?: string };
          if ('bookingLink' in bookingData) {
            updateData = {
              booking_link: bookingData.bookingLink || null,
              current_step: 4,
            };
            newStep = 4;
          } else {
            return NextResponse.json(
              { error: 'Invalid booking data' },
              { status: 400 }
            );
          }
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
