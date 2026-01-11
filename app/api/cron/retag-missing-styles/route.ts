/**
 * Cron: Retag Images Missing Style Tags
 *
 * Finds images with embeddings but no style tags and re-tags them.
 * Catches any images that failed during style tag insertion.
 *
 * GET /api/cron/retag-missing-styles
 *
 * Authorization: Bearer CRON_SECRET (Vercel-managed)
 * Response: { processed, tagged, noStyles, styleCounts }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { predictStyles } from '@/lib/styles/predictor';

// Vercel Pro: 60s timeout. Process max 300 images to stay safe (~40s processing)
const MAX_IMAGES_PER_RUN = 300;
const BATCH_SIZE = 50;
// Exit 10s before timeout to ensure response is sent
const TIMEOUT_BUFFER_MS = 50000;

/**
 * Verify cron authorization
 */
function verifyCronAuth(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || cronSecret.length < 32) {
    console.error('[Cron] CRON_SECRET not configured or too short');
    return false;
  }

  const authHeader = request.headers.get('Authorization');
  return authHeader === `Bearer ${cronSecret}`;
}

/**
 * Get service client for database operations
 */
function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Missing Supabase configuration');
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function GET(request: NextRequest) {
  // Verify authorization
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();
  const supabase = getServiceClient();

  try {
    // Find images with embeddings but no style tags
    const { data: orphanedImages, error: queryError } = await supabase
      .from('portfolio_images')
      .select(
        `
        id,
        instagram_post_id,
        artist_id,
        embedding,
        image_style_tags!left(id)
      `
      )
      .eq('status', 'active')
      .not('embedding', 'is', null)
      .is('image_style_tags.id', null)
      .order('created_at', { ascending: false })
      .limit(MAX_IMAGES_PER_RUN);

    if (queryError) {
      console.error('[Cron:Retag] Query error:', queryError);
      return NextResponse.json({ error: 'Database query failed' }, { status: 500 });
    }

    if (!orphanedImages || orphanedImages.length === 0) {
      console.log('[Cron:Retag] No orphaned images found');
      return NextResponse.json({
        success: true,
        processed: 0,
        tagged: 0,
        noStyles: 0,
        message: 'No orphaned images found',
      });
    }

    console.log(`[Cron:Retag] Found ${orphanedImages.length} orphaned images`);

    let processed = 0;
    let tagged = 0;
    let noStyles = 0;
    const styleCounts: Record<string, number> = {};

    // Process in batches with timeout protection
    const timeoutAt = startTime + TIMEOUT_BUFFER_MS;

    for (let i = 0; i < orphanedImages.length; i += BATCH_SIZE) {
      // Check timeout before processing batch
      if (Date.now() > timeoutAt) {
        console.log('[Cron:Retag] Timeout approaching, stopping early');
        break;
      }

      const batch = orphanedImages.slice(i, i + BATCH_SIZE);
      const tagsToInsert: { image_id: string; style_name: string; confidence: number }[] = [];

      for (const img of batch) {
        // Parse embedding with error handling
        let embedding: number[];
        try {
          embedding =
            typeof img.embedding === 'string' ? JSON.parse(img.embedding) : img.embedding;
        } catch (_parseError) {
          console.warn(`[Cron:Retag] JSON parse failed for ${img.instagram_post_id}`);
          continue;
        }

        if (!embedding || embedding.length !== 768) {
          console.warn(`[Cron:Retag] Invalid embedding for ${img.instagram_post_id}`);
          continue;
        }

        const predictions = predictStyles(embedding);

        if (predictions.length > 0) {
          tagged++;
          for (const { style, confidence } of predictions) {
            tagsToInsert.push({
              image_id: img.id,
              style_name: style,
              confidence,
            });
            styleCounts[style] = (styleCounts[style] || 0) + 1;
          }
        } else {
          noStyles++;
        }

        processed++;
      }

      // Insert tags
      if (tagsToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('image_style_tags')
          .upsert(tagsToInsert, { onConflict: 'image_id,style_name' });

        if (insertError) {
          console.error('[Cron:Retag] Insert error:', insertError);
          // Log failed image IDs for debugging
          const failedImageIds = [...new Set(tagsToInsert.map((t) => t.image_id))];
          console.error('[Cron:Retag] Failed images:', failedImageIds.slice(0, 10));
        } else {
          console.log(`[Cron:Retag] Inserted ${tagsToInsert.length} tags`);
        }
      }
    }

    const elapsed = Date.now() - startTime;

    console.log(
      `[Cron:Retag] Complete: ${processed} processed, ${tagged} tagged, ${noStyles} no styles (${elapsed}ms)`
    );

    return NextResponse.json({
      success: true,
      processed,
      tagged,
      noStyles,
      styleCounts,
      elapsedMs: elapsed,
    });
  } catch (error) {
    console.error('[Cron:Retag] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
