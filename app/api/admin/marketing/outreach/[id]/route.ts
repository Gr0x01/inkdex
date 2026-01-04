/**
 * Marketing Outreach Single Record API
 *
 * PATCH /api/admin/marketing/outreach/[id] - Update outreach record status
 * DELETE /api/admin/marketing/outreach/[id] - Delete outreach record
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser, createAdminClient } from '@/lib/supabase/server';
import { z } from 'zod';

// PATCH body schema
const updateSchema = z.object({
  status: z.enum(['pending', 'generated', 'posted', 'dm_sent', 'claimed', 'converted']).optional(),
  post_text: z.string().optional(),
  post_images: z.array(z.string().url()).optional(),
  notes: z.string().optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    // Verify admin access (uses session, no network call)
    const user = await getAdminUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Validate UUID
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }

    const body = await request.json();
    const updates = updateSchema.parse(body);

    const adminClient = createAdminClient();

    // Build update object with timestamps
    const updateData: Record<string, unknown> = { ...updates };

    // Auto-set timestamps based on status changes
    if (updates.status === 'generated' && updates.post_text) {
      updateData.generated_at = new Date().toISOString();
    }
    if (updates.status === 'posted') {
      updateData.posted_at = new Date().toISOString();
    }
    if (updates.status === 'dm_sent') {
      updateData.dm_sent_at = new Date().toISOString();
    }
    if (updates.status === 'claimed') {
      updateData.claimed_at = new Date().toISOString();
    }

    const { data, error } = await adminClient
      .from('marketing_outreach')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[Marketing Outreach] Update error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, record: data });
  } catch (error) {
    console.error('[Marketing Outreach] Error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid parameters', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // Verify admin access (uses session, no network call)
    const user = await getAdminUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Validate UUID
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }

    const adminClient = createAdminClient();

    const { error } = await adminClient
      .from('marketing_outreach')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[Marketing Outreach] Delete error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Marketing Outreach] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
