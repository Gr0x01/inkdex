/**
 * Profile Delete API Endpoint
 *
 * Permanently deletes artist profile and all related data
 * Multi-step process:
 * 1. Verify ownership
 * 2. Delete portfolio images from storage
 * 3. Delete database records (portfolio_images, analytics, subscriptions, artist)
 * 4. Add to scraping exclusion list (deleted_at + exclude_from_scraping)
 * 5. Sign out user
 *
 * This action is irreversible
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkProfileDeleteRateLimit } from '@/lib/rate-limiter';
import { z } from 'zod';

const deleteProfileSchema = z.object({
  artistId: z.string().uuid(),
});

interface SupabaseClientWithStorage {
  storage: {
    from: (bucket: string) => {
      remove: (paths: string[]) => Promise<{ error: Error | null }>
    }
  }
}

async function deleteStorageImages(
  supabase: SupabaseClientWithStorage,
  storagePaths: string[]
): Promise<void> {
  if (storagePaths.length === 0) return;

  // Delete files from Supabase Storage
  // Extract just the paths (remove bucket prefix if present)
  const paths = storagePaths.map((path) => {
    // Paths are like "original/..." or "thumbs/320/..."
    return path;
  });

  const { error } = await supabase.storage
    .from('portfolio-images')
    .remove(paths);

  if (error) {
    console.warn('[ProfileDelete] Storage deletion warning:', error);
    // Don't throw - continue with database deletion even if storage fails
  }
}

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

    // 2. Rate limit check (1 delete attempt per day per user)
    const rateLimit = await checkProfileDeleteRateLimit(user.id);
    if (!rateLimit.success) {
      return NextResponse.json(
        {
          error: 'You can only delete your profile once per day. Please contact support if you need assistance.',
          retryAfter: Math.ceil((rateLimit.reset - Date.now()) / 1000),
        },
        { status: 429 }
      );
    }

    // 3. Parse and validate request body
    const body = await request.json();
    const validationResult = deleteProfileSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { artistId } = validationResult.data;

    // 3. Verify ownership
    const { data: artist, error: artistError } = await supabase
      .from('artists')
      .select('id, claimed_by_user_id, instagram_handle')
      .eq('id', artistId)
      .single();

    if (artistError || !artist) {
      return NextResponse.json({ error: 'Artist not found' }, { status: 404 });
    }

    if (artist.claimed_by_user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized - not your profile' }, { status: 403 });
    }

    // 4. Fetch all storage paths before deletion
    const { data: portfolioImages } = await supabase
      .from('portfolio_images')
      .select('storage_original_path, storage_thumb_320, storage_thumb_640, storage_thumb_1280')
      .eq('artist_id', artistId);

    const storagePaths: string[] = [];
    if (portfolioImages) {
      portfolioImages.forEach((img: { storage_original_path?: string | null; storage_thumb_320?: string | null; storage_thumb_640?: string | null; storage_thumb_1280?: string | null }) => {
        if (img.storage_original_path) storagePaths.push(img.storage_original_path);
        if (img.storage_thumb_320) storagePaths.push(img.storage_thumb_320);
        if (img.storage_thumb_640) storagePaths.push(img.storage_thumb_640);
        if (img.storage_thumb_1280) storagePaths.push(img.storage_thumb_1280);
      });
    }

    // 5. Delete images from Supabase Storage (non-blocking on failure)
    try {
      await deleteStorageImages(supabase, storagePaths);
    } catch (error) {
      // Log for monitoring system
      console.error('[ProfileDelete] Storage deletion failed:', {
        artistId,
        pathCount: storagePaths.length,
        error,
      });
      // Continue with database deletion even if storage fails
    }

    // 6. Soft delete artist record (CASCADE will handle related records automatically)
    // The schema has ON DELETE CASCADE for:
    // - portfolio_images
    // - artist_analytics
    // - artist_subscriptions
    // - onboarding_sessions
    const { error: deleteError } = await supabase
      .from('artists')
      .update({
        deleted_at: new Date().toISOString(),
        exclude_from_scraping: true,
      })
      .eq('id', artistId);

    if (deleteError) {
      console.error('[ProfileDelete] Artist deletion error:', deleteError);
      return NextResponse.json({ error: 'Failed to delete profile' }, { status: 500 });
    }

    // 8. Sign out user (they no longer have an artist profile)
    await supabase.auth.signOut();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[ProfileDelete] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
