/**
 * Profile Update API Endpoint
 *
 * Updates artist profile information for claimed artists
 * Validates pro status before allowing pro-only field updates
 * Supports multi-location for Pro artists
 * Requires authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkProfileUpdateRateLimit } from '@/lib/rate-limiter';
import { z } from 'zod';

// Location schema for international support
const locationSchema = z.object({
  id: z.string().optional(), // Optional for new locations
  city: z.string().max(100).nullable(),
  region: z.string().max(100).nullable(),
  countryCode: z.string().length(2).default('US'),
  locationType: z.enum(['city', 'region', 'country']),
  isPrimary: z.boolean(),
  displayOrder: z.number().optional(),
});

const updateProfileSchema = z.object({
  artistId: z.string().uuid(),
  name: z.string().trim().min(1, 'Name is required').max(100),
  // Legacy fields kept for backward compatibility but now populated from primary location
  city: z.string().trim().max(100).optional(),
  state: z.string().trim().max(100).optional(),
  // New locations array (optional - only update if provided)
  locations: z.array(locationSchema).min(1, 'At least one location is required').max(20).optional(),
  bioOverride: z.string().trim().max(500).nullable(),
  bookingLink: z.string().url('Invalid URL').nullable(),
  pricingInfo: z.string().trim().max(100).nullable(),
  availabilityStatus: z.enum(['available', 'booking_soon', 'waitlist']).nullable(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Auth check
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Rate limit check (10 updates per hour per user)
    const rateLimit = await checkProfileUpdateRateLimit(user.id);
    if (!rateLimit.success) {
      return NextResponse.json(
        {
          error: 'Too many profile updates. Please try again later.',
          retryAfter: Math.ceil((rateLimit.reset - Date.now()) / 1000),
        },
        { status: 429 }
      );
    }

    // 3. Parse and validate request body
    const body = await request.json();
    const validationResult = updateProfileSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const {
      artistId,
      name,
      locations,
      bioOverride,
      bookingLink,
      pricingInfo,
      availabilityStatus,
    } = validationResult.data;

    // 4. Verify ownership and get pro status
    const { data: artist, error: artistError } = await supabase
      .from('artists')
      .select('id, claimed_by_user_id, is_pro')
      .eq('id', artistId)
      .single();

    if (artistError || !artist) {
      return NextResponse.json({ error: 'Artist not found' }, { status: 404 });
    }

    if (artist.claimed_by_user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized - not your profile' }, { status: 403 });
    }

    // 5. Validate location count based on tier (only if locations provided)
    if (locations && locations.length > 0) {
      const maxLocations = artist.is_pro ? 20 : 1;
      if (locations.length > maxLocations) {
        return NextResponse.json(
          { error: `Free tier limited to ${maxLocations} location. Upgrade to Pro for multiple locations.` },
          { status: 400 }
        );
      }

      // 6. Validate and normalize primary location
      // Ensure exactly one primary location exists
      const primaryCount = locations.filter(loc => loc.isPrimary).length;
      if (primaryCount === 0 && locations.length > 0) {
        // Auto-set first location as primary if none specified
        locations[0].isPrimary = true;
      } else if (primaryCount > 1) {
        return NextResponse.json(
          { error: 'Only one location can be marked as primary' },
          { status: 400 }
        );
      }
    }

    // 8. Build update object (location data is stored in artist_locations only)
    const updateData: Record<string, unknown> = {
      name,
      bio_override: bioOverride || null,
      booking_url: bookingLink || null,
      updated_at: new Date().toISOString(),
    };

    // Only update pro fields if user is pro
    if (artist.is_pro) {
      updateData.pricing_info = pricingInfo || null;
      updateData.availability_status = availabilityStatus;
    }

    // 8. Update artist record
    const { error: updateError } = await supabase
      .from('artists')
      .update(updateData)
      .eq('id', artistId);

    if (updateError) {
      console.error('[ProfileUpdate] Database error:', updateError);
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    }

    // 9. Update locations only if provided
    if (locations && locations.length > 0) {
      const locationInserts = locations.map((loc, index) => ({
        city: loc.city || null,
        region: loc.region || null,
        country_code: loc.countryCode || 'US',
        location_type: loc.locationType,
        is_primary: loc.isPrimary || index === 0,
        display_order: loc.displayOrder ?? index,
      }));

      const { error: locationsError } = await supabase.rpc('update_artist_locations', {
        p_artist_id: artistId,
        p_locations: locationInserts,
        p_user_id: user.id,  // Pass verified user ID for ownership check (auth.uid() returns NULL from SSR client)
      });

      if (locationsError) {
        console.error('[ProfileUpdate] Failed to update locations:', locationsError);
        return NextResponse.json({ error: 'Failed to save locations' }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[ProfileUpdate] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
