/**
 * Cron: Daily Instagram Auto-Sync
 *
 * Runs daily at 2am UTC via Vercel Cron
 * Syncs all Pro artists with auto_sync_enabled=true
 *
 * GET /api/cron/sync-instagram
 *
 * Authorization: Bearer CRON_SECRET (Vercel-managed)
 * Response: { processed, succeeded, failed, results }
 */

import { NextRequest, NextResponse } from 'next/server';
import { syncArtistPortfolio, getEligibleArtists, SyncResult } from '@/lib/instagram/auto-sync';

// Batch size for parallel processing
const BATCH_SIZE = 5;

/**
 * Verify cron authorization
 * Vercel sends CRON_SECRET in Authorization header
 */
function verifyCronAuth(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;

  // CRON_SECRET is required and must be at least 32 characters for security
  if (!cronSecret) {
    console.error('[Cron] CRON_SECRET not configured - cron endpoint disabled');
    return false;
  }

  if (cronSecret.length < 32) {
    console.error('[Cron] CRON_SECRET must be at least 32 characters - cron endpoint disabled');
    return false;
  }

  const authHeader = request.headers.get('Authorization');
  const isValid = authHeader === `Bearer ${cronSecret}`;

  if (!isValid) {
    console.error('[Cron] Invalid or missing Authorization header');
  }

  return isValid;
}

/**
 * Process artists in parallel batches
 */
async function processBatches(
  artists: { id: string; userId: string; instagramHandle: string }[]
): Promise<SyncResult[]> {
  const results: SyncResult[] = [];

  for (let i = 0; i < artists.length; i += BATCH_SIZE) {
    const batch = artists.slice(i, i + BATCH_SIZE);

    console.log(
      `[Cron] Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(artists.length / BATCH_SIZE)} (${batch.length} artists)`
    );

    const batchResults = await Promise.allSettled(
      batch.map((artist) => syncArtistPortfolio(artist.id, artist.userId, 'auto'))
    );

    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        console.error('[Cron] Batch sync error:', result.reason);
        // Create a failed result for tracking
        results.push({
          success: false,
          artistId: 'unknown',
          imagesFetched: 0,
          imagesAdded: 0,
          imagesSkipped: 0,
          status: 'failed',
          errorMessage: result.reason?.message || 'Unknown error',
          duration: 0,
        });
      }
    }
  }

  return results;
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  // 1. Verify authorization
  if (!verifyCronAuth(request)) {
    console.error('[Cron] Unauthorized access attempt');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('[Cron] Starting daily Instagram auto-sync...');

  try {
    // 2. Get eligible artists
    const artists = await getEligibleArtists();

    if (artists.length === 0) {
      console.log('[Cron] No eligible artists for auto-sync');
      return NextResponse.json({
        processed: 0,
        succeeded: 0,
        failed: 0,
        message: 'No eligible artists',
        duration: Date.now() - startTime,
      });
    }

    console.log(`[Cron] Found ${artists.length} eligible artists for auto-sync`);

    // 3. Process in batches
    const results = await processBatches(artists);

    // 4. Calculate stats
    const succeeded = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;
    const totalImagesAdded = results.reduce((sum, r) => sum + r.imagesAdded, 0);
    const totalDuration = Date.now() - startTime;

    console.log(
      `[Cron] Completed: ${succeeded}/${artists.length} succeeded, ${totalImagesAdded} images added (${totalDuration}ms)`
    );

    // 5. Return summary
    return NextResponse.json({
      processed: artists.length,
      succeeded,
      failed,
      totalImagesAdded,
      duration: totalDuration,
      results: results.map((r) => ({
        artistId: r.artistId,
        success: r.success,
        imagesAdded: r.imagesAdded,
        status: r.status,
        errorMessage: r.errorMessage,
      })),
    });
  } catch (error) {
    console.error('[Cron] Unexpected error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Disable body parsing for this route
export const dynamic = 'force-dynamic';
