/**
 * Toggle Artist Featured Status API
 *
 * PATCH /api/admin/artists/[id]/featured
 * Body: { is_featured: boolean }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/admin/whitelist';
import { logAdminAction, getClientInfo } from '@/lib/admin/audit-log';
import { z } from 'zod';

const updateSchema = z.object({
  is_featured: z.boolean(),
});

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

    // Validate UUID format using zod
    const idResult = z.string().uuid('Invalid artist ID').safeParse(id);
    if (!idResult.success) {
      return NextResponse.json({ error: 'Invalid artist ID' }, { status: 400 });
    }

    // Parse and validate body
    const body = await request.json();
    const result = updateSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    const { is_featured } = result.data;

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

    // Update the artist
    const { data: artist, error } = await serviceClient
      .from('artists')
      .update({ is_featured, updated_at: new Date().toISOString() })
      .eq('id', id)
      .is('deleted_at', null)
      .select('id, name, is_featured')
      .single();

    if (error) {
      console.error('[Admin Featured] Update error:', error);
      return NextResponse.json(
        { error: 'Failed to update artist' },
        { status: 500 }
      );
    }

    if (!artist) {
      return NextResponse.json({ error: 'Artist not found' }, { status: 404 });
    }

    console.log(
      `[Admin] ${user.email} set is_featured=${is_featured} for artist ${artist.name} (${id})`
    );

    // Audit log (non-blocking)
    const clientInfo = getClientInfo(request);
    logAdminAction({
      adminEmail: user.email!,
      action: is_featured ? 'artist.feature' : 'artist.unfeature',
      resourceType: 'artist',
      resourceId: id,
      oldValue: { is_featured: !is_featured },
      newValue: { is_featured },
      ...clientInfo,
    });

    const response = NextResponse.json({
      success: true,
      artist: {
        id: artist.id,
        name: artist.name,
        is_featured: artist.is_featured,
      },
    });

    // Prevent caching of admin responses
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');

    return response;
  } catch (error) {
    console.error('[Admin Featured] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
