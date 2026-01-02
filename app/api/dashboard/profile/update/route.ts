/**
 * Profile Update API Endpoint
 *
 * Updates artist profile information for claimed artists
 * Validates pro status before allowing pro-only field updates
 * Requires authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkProfileUpdateRateLimit } from '@/lib/rate-limiter';
import { z } from 'zod';

const updateProfileSchema = z.object({
  artistId: z.string().uuid(),
  name: z.string().trim().min(1, 'Name is required').max(100),
  city: z.string().trim().min(1, 'City is required').max(100),
  state: z.string().trim().length(2, 'State must be 2 characters').regex(/^[A-Z]{2}$/, 'State must be uppercase'),
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
    const rateLimit = checkProfileUpdateRateLimit(user.id);
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
      city,
      state,
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

    // 4. Build update object (conditionally include pro fields)
    const updateData: any = {
      name,
      city,
      state,
      bio_override: bioOverride || null,
      booking_url: bookingLink || null,
      updated_at: new Date().toISOString(),
    };

    // Only update pro fields if user is pro
    if (artist.is_pro) {
      updateData.pricing_info = pricingInfo || null;
      updateData.availability_status = availabilityStatus;
    }

    // 5. Update artist record
    const { error: updateError } = await supabase
      .from('artists')
      .update(updateData)
      .eq('id', artistId);

    if (updateError) {
      console.error('[ProfileUpdate] Database error:', updateError);
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[ProfileUpdate] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
