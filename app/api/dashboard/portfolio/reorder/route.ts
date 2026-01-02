/**
 * Dashboard Portfolio: Reorder & Pin Images
 *
 * Pro-only feature for pinning and reordering portfolio images
 * Pinned images appear first in portfolio with custom order
 *
 * POST /api/dashboard/portfolio/reorder
 *
 * Request: {
 *   updates: Array<{
 *     imageId: string
 *     is_pinned: boolean
 *     pinned_position: number | null
 *   }>
 * }
 * Response: { success: true, updated: number }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { MAX_PINNED_IMAGES } from '@/lib/constants/portfolio';

const MAX_PINNED = MAX_PINNED_IMAGES;

const reorderSchema = z.object({
  updates: z.array(
    z.object({
      imageId: z.string().uuid(),
      is_pinned: z.boolean(),
      pinned_position: z.number().int().min(0).max(MAX_PINNED_IMAGES - 1).nullable(),
    })
  ),
});

export async function POST(request: NextRequest) {
  try {
    // 1. Auth + get artist
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: artist, error: artistError } = await supabase
      .from('artists')
      .select('id, is_pro')
      .eq('claimed_by_user_id', user.id)
      .eq('verification_status', 'claimed')
      .single();

    if (artistError || !artist) {
      return NextResponse.json({ error: 'No claimed artist found' }, { status: 404 });
    }

    // 2. Validate request body (pinning available to all users)
    const body = await request.json();
    const validated = reorderSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validated.error.errors },
        { status: 400 }
      );
    }

    const { updates } = validated.data;

    // 3. Validate max pinned limit
    const pinnedCount = updates.filter((u) => u.is_pinned).length;
    if (pinnedCount > MAX_PINNED) {
      return NextResponse.json(
        { error: `Maximum ${MAX_PINNED} images can be pinned` },
        { status: 400 }
      );
    }

    // 4. Validate all image IDs belong to this artist
    const imageIds = updates.map((u) => u.imageId);
    const { data: existingImages, error: fetchError } = await supabase
      .from('portfolio_images')
      .select('id, artist_id')
      .in('id', imageIds);

    if (fetchError) {
      console.error('[Reorder] Failed to fetch images:', fetchError);
      return NextResponse.json({ error: 'Failed to verify image ownership' }, { status: 500 });
    }

    // Check all images exist and belong to artist
    if (!existingImages || existingImages.length !== imageIds.length) {
      return NextResponse.json({ error: 'Some images not found' }, { status: 404 });
    }

    const unauthorizedImages = existingImages.filter((img) => img.artist_id !== artist.id);
    if (unauthorizedImages.length > 0) {
      return NextResponse.json(
        { error: 'You can only reorder your own portfolio images' },
        { status: 403 }
      );
    }

    // 5. Detect if we're unpinning and need to renumber
    const unpinningImages = updates.filter((u) => !u.is_pinned);
    let additionalUpdates: typeof updates = [];

    if (unpinningImages.length > 0) {
      // Fetch all currently pinned images for this artist
      const unpinningIds = unpinningImages.map((u) => u.imageId);
      const { data: allPinned } = await supabase
        .from('portfolio_images')
        .select('id, pinned_position')
        .eq('artist_id', artist.id)
        .eq('is_pinned', true);

      if (allPinned && allPinned.length > 0) {
        // Filter out images being unpinned (client-side, avoids SQL interpolation)
        const currentlyPinned = allPinned.filter((img) => !unpinningIds.includes(img.id));

        if (currentlyPinned.length > 0) {
          // Sort by current position and renumber sequentially
          const sorted = currentlyPinned.sort(
            (a, b) => (a.pinned_position || 0) - (b.pinned_position || 0)
          );
          additionalUpdates = sorted.map((img, idx) => ({
            imageId: img.id,
            is_pinned: true,
            pinned_position: idx,
          }));
        }
      }
    }

    // 6. Batch update all images (original updates + renumbered pinned images)
    const allUpdates = [...updates, ...additionalUpdates];
    console.log(`[Reorder] Updating ${allUpdates.length} images for artist ${artist.id}`);

    const updatePromises = allUpdates.map((update) =>
      supabase
        .from('portfolio_images')
        .update({
          is_pinned: update.is_pinned,
          pinned_position: update.pinned_position,
        })
        .eq('id', update.imageId)
        .eq('artist_id', artist.id) // Double-check ownership
    );

    // Use Promise.allSettled for partial failure handling
    const results = await Promise.allSettled(updatePromises);

    // Check for errors
    const failedUpdates = results.filter((result) => result.status === 'rejected');
    if (failedUpdates.length > 0) {
      console.error('[Reorder] Some updates failed:', failedUpdates);
      const successCount = results.filter((r) => r.status === 'fulfilled').length;
      return NextResponse.json(
        {
          error: `Failed to update ${failedUpdates.length} images (${successCount} succeeded)`,
          partial: true,
        },
        { status: 500 }
      );
    }

    console.log(`[Reorder] Successfully updated ${allUpdates.length} images`);

    return NextResponse.json({
      success: true,
      updated: allUpdates.length,
    });
  } catch (error: any) {
    console.error('[Reorder] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to reorder portfolio' },
      { status: 500 }
    );
  }
}
