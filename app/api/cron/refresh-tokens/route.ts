/**
 * Cron: Daily Instagram Token Refresh
 *
 * Runs daily at 3am UTC via Vercel Cron
 * Refreshes Instagram access tokens expiring within 7 days
 *
 * GET /api/cron/refresh-tokens
 *
 * Authorization: Bearer CRON_SECRET (Vercel-managed)
 * Response: { processed, succeeded, failed, results }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { needsTokenRefresh } from '@/lib/instagram/token-refresh';
import { refreshWithLock } from '@/lib/instagram/refresh-lock';

// Batch size for parallel processing
const BATCH_SIZE = 10;

/**
 * Verify cron authorization
 * Vercel sends CRON_SECRET in Authorization header
 */
function verifyCronAuth(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;

  // CRON_SECRET is required and must be at least 32 characters for security
  if (!cronSecret) {
    console.error('[TokenRefresh Cron] CRON_SECRET not configured - cron endpoint disabled');
    return false;
  }

  if (cronSecret.length < 32) {
    console.error('[TokenRefresh Cron] CRON_SECRET must be at least 32 characters - cron endpoint disabled');
    return false;
  }

  const authHeader = request.headers.get('Authorization');
  const isValid = authHeader === `Bearer ${cronSecret}`;

  if (!isValid) {
    console.error('[TokenRefresh Cron] Invalid or missing Authorization header');
  }

  return isValid;
}

/**
 * Get all users with Instagram tokens
 */
async function getUsersWithTokens(): Promise<string[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('Missing Supabase environment variables');
  }

  const supabase = createClient(url, key);

  // Get all Pro artists who have Instagram tokens (claimed accounts)
  const { data: artists, error } = await supabase
    .from('artists')
    .select('claimed_by_user_id')
    .eq('is_pro', true)
    .not('claimed_by_user_id', 'is', null)
    .is('deleted_at', null);

  if (error) {
    console.error('[TokenRefresh Cron] Failed to fetch artists:', error);
    return [];
  }

  // Extract unique user IDs
  const userIds = [...new Set(artists.map((a) => a.claimed_by_user_id).filter(Boolean))] as string[];

  return userIds;
}

/**
 * Process users in parallel batches
 */
async function processBatches(
  userIds: string[]
): Promise<{ userId: string; success: boolean; needsRefresh: boolean; error?: string }[]> {
  const results: { userId: string; success: boolean; needsRefresh: boolean; error?: string }[] = [];

  for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
    const batch = userIds.slice(i, i + BATCH_SIZE);

    console.log(
      `[TokenRefresh Cron] Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(userIds.length / BATCH_SIZE)} (${batch.length} users)`
    );

    const batchResults = await Promise.allSettled(
      batch.map(async (userId) => {
        try {
          // Check if token needs refresh
          const needsRefresh = await needsTokenRefresh(userId);

          if (!needsRefresh) {
            return {
              userId,
              success: true,
              needsRefresh: false,
            };
          }

          // Refresh token with deduplication
          const success = await refreshWithLock(userId);

          return {
            userId,
            success,
            needsRefresh: true,
            error: success ? undefined : 'Refresh failed',
          };
        } catch (error) {
          console.error(`[TokenRefresh Cron] Error for user ${userId}:`, error);
          return {
            userId,
            success: false,
            needsRefresh: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      })
    );

    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        console.error('[TokenRefresh Cron] Batch error:', result.reason);
        results.push({
          userId: 'unknown',
          success: false,
          needsRefresh: false,
          error: result.reason?.message || 'Unknown error',
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
    console.error('[TokenRefresh Cron] Unauthorized access attempt');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('[TokenRefresh Cron] Starting daily Instagram token refresh...');

  try {
    // 2. Get all users with Instagram tokens
    const userIds = await getUsersWithTokens();

    if (userIds.length === 0) {
      console.log('[TokenRefresh Cron] No users with Instagram tokens');
      return NextResponse.json({
        processed: 0,
        succeeded: 0,
        failed: 0,
        refreshed: 0,
        message: 'No users with tokens',
        duration: Date.now() - startTime,
      });
    }

    console.log(`[TokenRefresh Cron] Found ${userIds.length} users with Instagram tokens`);

    // 3. Process in batches
    const results = await processBatches(userIds);

    // 4. Calculate stats
    const succeeded = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;
    const refreshed = results.filter((r) => r.needsRefresh && r.success).length;
    const skipped = results.filter((r) => !r.needsRefresh).length;
    const totalDuration = Date.now() - startTime;

    console.log(
      `[TokenRefresh Cron] Completed: ${refreshed} tokens refreshed, ${skipped} skipped (not expiring), ${failed} failed (${totalDuration}ms)`
    );

    // 5. Return summary
    return NextResponse.json({
      processed: userIds.length,
      succeeded,
      failed,
      refreshed,
      skipped,
      duration: totalDuration,
      results: results
        .filter((r) => r.needsRefresh) // Only return results that needed refresh
        .map((r) => ({
          userId: r.userId,
          success: r.success,
          error: r.error,
        })),
    });
  } catch (error) {
    console.error('[TokenRefresh Cron] Unexpected error:', error);
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
