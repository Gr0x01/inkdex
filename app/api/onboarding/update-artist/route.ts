/**
 * Update Artist API (for optional onboarding steps)
 *
 * Updates artist record directly after profile has been created.
 * Used by optional Steps 2 & 3 of onboarding flow.
 *
 * POST /api/onboarding/update-artist
 *
 * Request: {
 *   artistId: string,
 *   sessionId: string,
 *   bookingUrl?: string,
 *   autoSyncEnabled?: boolean,
 *   filterNonTattoo?: boolean,
 *   locations?: Location[],
 *   deleteSession?: boolean
 * }
 * Response: { success: true }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { updateArtistSchema } from '@/lib/onboarding/validation';
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
      validatedData = updateArtistSchema.parse(body);
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          { error: 'Validation failed', details: error.errors },
          { status: 400 }
        );
      }
      throw error;
    }

    const {
      artistId,
      sessionId,
      bookingUrl,
      autoSyncEnabled,
      filterNonTattoo,
      locations,
      deleteSession,
    } = validatedData;

    // 4. Verify session belongs to authenticated user and matches artist
    const { data: session, error: sessionError } = await supabase
      .from('onboarding_sessions')
      .select('user_id, artist_id, expires_at')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
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

    // Verify artist_id matches session (prevents tampering)
    if (session.artist_id !== artistId) {
      return NextResponse.json(
        { error: 'Artist ID does not match session' },
        { status: 403 }
      );
    }

    // 5. Check session expiration
    if (session.expires_at && new Date(session.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Onboarding session has expired. Please start over.' },
        { status: 410 }
      );
    }

    // 6. Verify artist belongs to user
    const { data: artist, error: artistError } = await supabase
      .from('artists')
      .select('id, claimed_by_user_id, is_pro')
      .eq('id', artistId)
      .single();

    if (artistError || !artist) {
      return NextResponse.json(
        { error: 'Artist not found' },
        { status: 404 }
      );
    }

    if (artist.claimed_by_user_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized to modify this artist' },
        { status: 403 }
      );
    }

    const isPro = artist.is_pro || false;

    // 7. Build update object for artists table
    interface ArtistUpdate {
      booking_url?: string | null;
      filter_non_tattoo_content?: boolean;
    }

    const updateData: ArtistUpdate = {};

    if (bookingUrl !== undefined) {
      updateData.booking_url = bookingUrl || null;
    }

    if (filterNonTattoo !== undefined) {
      // Pro-only: Filter can only be disabled by Pro users (free users always filter)
      updateData.filter_non_tattoo_content = isPro ? filterNonTattoo : true;
    }

    // 8. Update artist if there are changes
    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await supabase
        .from('artists')
        .update(updateData)
        .eq('id', artistId);

      if (updateError) {
        console.error('[UpdateArtist] Failed to update artist:', updateError);
        return NextResponse.json(
          { error: 'Failed to update artist' },
          { status: 500 }
        );
      }
    }

    // 8b. Update auto_sync_enabled in artist_sync_state
    if (autoSyncEnabled !== undefined) {
      const { error: syncStateError } = await supabase
        .from('artist_sync_state')
        .upsert({
          artist_id: artistId,
          auto_sync_enabled: isPro ? autoSyncEnabled : false,
        }, { onConflict: 'artist_id' });

      if (syncStateError) {
        console.error('[UpdateArtist] Failed to update sync state:', syncStateError);
        // Non-critical, continue
      }
    }

    // 9. Update locations if provided
    if (locations && locations.length > 0) {
      // Delete existing locations
      await supabase
        .from('artist_locations')
        .delete()
        .eq('artist_id', artistId);

      // Insert new locations
      const locationInserts = locations.map((loc, index) => ({
        artist_id: artistId,
        city: loc.city || null,
        region: loc.region || null,
        country_code: loc.countryCode || 'US',
        location_type: loc.locationType || 'city',
        is_primary: loc.isPrimary || index === 0,
        display_order: index,
      }));

      const { error: locationsError } = await supabase
        .from('artist_locations')
        .insert(locationInserts);

      if (locationsError) {
        console.error('[UpdateArtist] Failed to insert locations:', locationsError);
        return NextResponse.json(
          { error: 'Failed to save locations. Please try again.' },
          { status: 500 }
        );
      }

      // Also update legacy city/state on artist record for backward compatibility
      const primaryLocation = locations.find(l => l.isPrimary) || locations[0];
      if (primaryLocation) {
        await supabase
          .from('artists')
          .update({
            city: primaryLocation.city || '',
            state: primaryLocation.region || '',
          })
          .eq('id', artistId);
      }
    }

    // 10. Delete session if requested (final step)
    if (deleteSession) {
      const { error: deleteError } = await supabase
        .from('onboarding_sessions')
        .delete()
        .eq('id', sessionId);

      if (deleteError) {
        console.error('[UpdateArtist] Failed to delete session:', deleteError);
        // Non-critical error, continue
      }
    }

    console.log(`[UpdateArtist] Updated artist ${artistId} for user ${user.id}${deleteSession ? ' (session deleted)' : ''}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[UpdateArtist] Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
