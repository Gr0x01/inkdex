/**
 * Bulk Update Artist Featured Status API
 *
 * POST /api/admin/artists/bulk-featured
 * Body: { artistIds: string[], is_featured: boolean }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/admin/whitelist';
import { logAdminAction, getClientInfo } from '@/lib/admin/audit-log';
import { checkRateLimit } from '@/lib/redis/rate-limiter';
import { invalidateCache } from '@/lib/redis/cache';
import { z } from 'zod';

const bulkUpdateSchema = z.object({
  artistIds: z.array(z.string().uuid()).min(1).max(100),
  is_featured: z.boolean(),
});

export async function POST(request: NextRequest) {
  try {
    // Verify admin access
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !isAdminEmail(user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limit bulk operations (Redis-based, 5 operations per minute)
    const rateLimitResult = await checkRateLimit(
      `admin-bulk-featured:${user.id}`,
      5, // max operations
      60 * 1000 // 1 minute window
    );

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many bulk operations. Please wait before trying again.' },
        { status: 429 }
      );
    }

    // Validate Content-Type
    const contentType = request.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      return NextResponse.json(
        { error: 'Content-Type must be application/json' },
        { status: 415 }
      );
    }

    // Parse and validate body
    const body = await request.json();
    const result = bulkUpdateSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: result.error.issues },
        { status: 400 }
      );
    }

    const { artistIds, is_featured } = result.data;

    // Use service role for the update
    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Update all artists
    const { data: artists, error } = await serviceClient
      .from('artists')
      .update({ is_featured, updated_at: new Date().toISOString() })
      .in('id', artistIds)
      .is('deleted_at', null)
      .select('id, name');

    if (error) {
      console.error('[Admin Bulk Featured] Update error:', error);
      return NextResponse.json(
        { error: 'Failed to update artists' },
        { status: 500 }
      );
    }

    const updatedCount = artists?.length || 0;

    console.log(
      `[Admin] ${user.email} bulk set is_featured=${is_featured} for ${updatedCount} artists`
    );

    // Audit log (non-blocking)
    const clientInfo = getClientInfo(request);
    logAdminAction({
      adminEmail: user.email!,
      action: is_featured ? 'artist.bulk_feature' : 'artist.bulk_unfeature',
      resourceType: 'artist',
      resourceId: artistIds.join(','),
      oldValue: { count: artistIds.length },
      newValue: { is_featured, updated: updatedCount },
      ...clientInfo,
    });

    // Invalidate artist-related caches (fire-and-forget)
    invalidateCache('admin:artists:*');

    const response = NextResponse.json({
      success: true,
      updated: updatedCount,
      requested: artistIds.length,
    });

    // Prevent caching of admin responses
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');

    return response;
  } catch (error) {
    console.error('[Admin Bulk Featured] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
