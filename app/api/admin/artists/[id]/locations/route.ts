/**
 * Admin Artist Locations API
 *
 * PATCH /api/admin/artists/[id]/locations - Update artist locations
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/admin/whitelist';
import { logAdminAction, getClientInfo } from '@/lib/admin/audit-log';
import { invalidateCache } from '@/lib/redis/cache';
import { VALID_COUNTRY_CODES } from '@/lib/constants/countries';
import { z } from 'zod';

const locationSchema = z.object({
  id: z.string().uuid().optional(),
  city: z.string().max(100).nullable(),
  region: z.string().max(100).nullable(),
  countryCode: z
    .string()
    .length(2)
    .refine((code) => VALID_COUNTRY_CODES.has(code), {
      message: 'Invalid country code',
    })
    .default('US'),
  locationType: z.enum(['city', 'region', 'country']),
  isPrimary: z.boolean(),
  displayOrder: z.number().optional(),
});

const updateLocationsSchema = z.object({
  locations: z.array(locationSchema).min(1).max(20),
});

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

/**
 * PATCH /api/admin/artists/[id]/locations
 * Update artist locations (atomic replace)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify admin access
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !isAdminEmail(user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Validate UUID format
    const idResult = z.string().uuid('Invalid artist ID').safeParse(id);
    if (!idResult.success) {
      return NextResponse.json({ error: 'Invalid artist ID' }, { status: 400 });
    }

    // Parse and validate body
    const body = await request.json();
    const result = updateLocationsSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: result.error.flatten() },
        { status: 400 }
      );
    }

    const { locations } = result.data;

    // Validate exactly one primary location
    const primaryCount = locations.filter((l) => l.isPrimary).length;
    if (primaryCount !== 1) {
      return NextResponse.json(
        { error: 'Exactly one location must be marked as primary' },
        { status: 400 }
      );
    }

    const serviceClient = getServiceClient();

    // Fetch artist to check tier and get current locations
    const { data: artist, error: artistError } = await serviceClient
      .from('artists')
      .select('id, name, is_pro')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (artistError || !artist) {
      return NextResponse.json({ error: 'Artist not found' }, { status: 404 });
    }

    // Enforce tier limits
    const maxLocations = artist.is_pro ? 20 : 1;
    if (locations.length > maxLocations) {
      return NextResponse.json(
        {
          error: `${artist.is_pro ? 'Pro' : 'Free'} tier allows maximum ${maxLocations} location(s)`,
        },
        { status: 400 }
      );
    }

    // Fetch current locations for audit log and potential rollback
    const { data: oldLocations } = await serviceClient
      .from('artist_locations')
      .select('city, region, country_code, location_type, is_primary, display_order')
      .eq('artist_id', id);

    // Delete existing locations
    const { error: deleteError } = await serviceClient
      .from('artist_locations')
      .delete()
      .eq('artist_id', id);

    if (deleteError) {
      console.error('[Admin Locations] Delete error:', deleteError);
      return NextResponse.json(
        { error: 'Failed to update locations' },
        { status: 500 }
      );
    }

    // Insert new locations
    const locationsToInsert = locations.map((loc, index) => ({
      artist_id: id,
      city: loc.city,
      region: loc.region,
      country_code: loc.countryCode,
      location_type: loc.locationType,
      is_primary: loc.isPrimary,
      display_order: loc.displayOrder ?? index,
    }));

    const { data: newLocations, error: insertError } = await serviceClient
      .from('artist_locations')
      .insert(locationsToInsert)
      .select('id, city, region, country_code, location_type, is_primary, display_order');

    if (insertError) {
      console.error('[Admin Locations] Insert error:', insertError);

      // Rollback: restore old locations if they existed
      if (oldLocations && oldLocations.length > 0) {
        const rollbackData = oldLocations.map((loc, index) => ({
          artist_id: id,
          city: loc.city,
          region: loc.region,
          country_code: loc.country_code,
          location_type: loc.location_type,
          is_primary: loc.is_primary,
          display_order: loc.display_order ?? index,
        }));

        const { error: rollbackError } = await serviceClient
          .from('artist_locations')
          .insert(rollbackData);

        if (rollbackError) {
          console.error('[Admin Locations] Rollback failed:', rollbackError);
        } else {
          console.log('[Admin Locations] Rollback successful - restored old locations');
        }
      }

      return NextResponse.json(
        { error: 'Failed to save locations' },
        { status: 500 }
      );
    }

    // Audit log
    const clientInfo = getClientInfo(request);
    logAdminAction({
      adminEmail: user.email!,
      action: 'artist.locations_updated',
      resourceType: 'artist',
      resourceId: id,
      oldValue: { artistName: artist.name, locations: oldLocations },
      newValue: { artistName: artist.name, locations: locationsToInsert },
      ...clientInfo,
    });

    console.log(
      `[Admin] ${user.email} updated locations for artist ${artist.name} (${id}): ${locations.length} location(s)`
    );

    // Invalidate caches
    invalidateCache('admin:artists:*');

    // Transform response to component format
    const transformedLocations = (newLocations || []).map((loc) => ({
      id: loc.id,
      city: loc.city,
      region: loc.region,
      countryCode: loc.country_code,
      locationType: loc.location_type,
      isPrimary: loc.is_primary,
      displayOrder: loc.display_order,
    }));

    const response = NextResponse.json({
      success: true,
      locations: transformedLocations,
    });

    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    return response;
  } catch (error) {
    console.error('[Admin Locations] PATCH error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
