/**
 * Dashboard: Sync Settings
 *
 * Toggle auto-sync on/off for Pro users
 *
 * PATCH /api/dashboard/sync/settings
 *
 * Request: { autoSyncEnabled: boolean }
 * Response: { success, autoSyncEnabled }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const settingsSchema = z.object({
  autoSyncEnabled: z.boolean().optional(),
  filterNonTattoo: z.boolean().optional(),
}).refine(
  (data) => data.autoSyncEnabled !== undefined || data.filterNonTattoo !== undefined,
  { message: 'At least one setting must be provided' }
);

export async function PATCH(request: NextRequest) {
  try {
    // 1. Auth check
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse request body
    const body = await request.json();
    const validated = settingsSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validated.error.errors },
        { status: 400 }
      );
    }

    const { autoSyncEnabled, filterNonTattoo } = validated.data;

    // 3. Get artist and check Pro status
    const { data: artist, error: artistError } = await supabase
      .from('artists')
      .select('id, is_pro')
      .eq('claimed_by_user_id', user.id)
      .eq('verification_status', 'claimed')
      .single();

    if (artistError || !artist) {
      return NextResponse.json({ error: 'No claimed artist found' }, { status: 404 });
    }

    if (!artist.is_pro) {
      return NextResponse.json(
        { error: 'Pro subscription required for sync settings' },
        { status: 403 }
      );
    }

    // 4. Update settings
    const updateData: Record<string, unknown> = {};

    if (autoSyncEnabled !== undefined) {
      updateData.auto_sync_enabled = autoSyncEnabled;
      // If enabling, also reset consecutive failures
      if (autoSyncEnabled) {
        updateData.sync_consecutive_failures = 0;
        updateData.sync_disabled_reason = null;
      }
    }

    if (filterNonTattoo !== undefined) {
      updateData.filter_non_tattoo_content = filterNonTattoo;
    }

    // Add is_pro constraint to prevent race condition
    // (user's Pro status could change between check and update)
    const { data: updateResult, error: updateError } = await supabase
      .from('artists')
      .update(updateData)
      .eq('id', artist.id)
      .eq('is_pro', true) // Only update if still Pro
      .select('id');

    if (updateError) {
      console.error('[SyncSettings] Update failed:', updateError);
      return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
    }

    if (!updateResult || updateResult.length === 0) {
      return NextResponse.json(
        { error: 'Pro subscription no longer active. Please renew to enable auto-sync.' },
        { status: 403 }
      );
    }

    const changes = [];
    if (autoSyncEnabled !== undefined) {
      changes.push(`Auto-sync ${autoSyncEnabled ? 'enabled' : 'disabled'}`);
    }
    if (filterNonTattoo !== undefined) {
      changes.push(`Filter ${filterNonTattoo ? 'enabled' : 'disabled'}`);
    }
    console.log(`[SyncSettings] ${changes.join(', ')} for artist ${artist.id}`);

    return NextResponse.json({
      success: true,
      autoSyncEnabled,
      filterNonTattoo,
    });
  } catch (error) {
    console.error('[SyncSettings] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update settings' },
      { status: 500 }
    );
  }
}
