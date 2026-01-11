/**
 * ScrapingDog Batch Scraper
 *
 * High-performance Instagram scraper using ScrapingDog API
 * - 50 concurrent requests (Standard plan)
 * - Downloads profile + 12 posts per artist
 * - Incremental processing with process-batch.ts
 *
 * Usage:
 *   npx tsx scripts/scraping/scrapingdog-scraper.ts
 *   npx tsx scripts/scraping/scrapingdog-scraper.ts --limit 100
 *   npx tsx scripts/scraping/scrapingdog-scraper.ts --profile-only
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import postgres from 'postgres';
import { mkdir, writeFile, rm } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { spawn } from 'child_process';
import pLimit from 'p-limit';
import { fetchProfileWithScrapingDog } from '../../lib/instagram/scrapingdog-client';
import { InstagramError } from '../../lib/instagram/post-fetcher';

// Configuration
const TEMP_DIR = '/tmp/instagram';
const CONCURRENCY = 50; // ScrapingDog Standard plan limit
const PROCESS_BATCH_INTERVAL = 20; // Run process-batch every N artists
const MAX_POSTS = 12; // ScrapingDog returns up to 12 posts per request

// Environment validation
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DATABASE_URL = process.env.DATABASE_URL;
const SCRAPINGDOG_API_KEY = process.env.SCRAPINGDOG_API_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

if (!DATABASE_URL) {
  console.error('Missing DATABASE_URL');
  process.exit(1);
}

if (!SCRAPINGDOG_API_KEY) {
  console.error('Missing SCRAPINGDOG_API_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Direct PostgreSQL connection for complex queries
const sql = postgres(DATABASE_URL);

// Graceful shutdown handling
let shutdownRequested = false;
process.on('SIGINT', () => {
  console.log('\n\nShutdown requested, finishing current batch...');
  shutdownRequested = true;
});
process.on('SIGTERM', () => {
  console.log('\n\nSIGTERM received, finishing current batch...');
  shutdownRequested = true;
});

interface PendingArtist {
  id: string;
  instagram_handle: string;
  name: string;
}

interface ScrapeResult {
  artistId: string;
  success: boolean;
  imagesDownloaded: number;
  error?: string;
}

/**
 * Get artists that need scraping based on pipeline_status
 *
 * Selects artists where:
 * - pipeline_status is NULL, 'pending', or 'retry_requested'
 * - NOT blacklisted
 * - NOT private
 * - NOT deleted
 *
 * Prioritizes 'retry_requested' artists first
 */
async function getPendingArtists(limit?: number): Promise<PendingArtist[]> {
  try {
    const rows = await sql`
      SELECT a.id, a.instagram_handle, a.name
      FROM artists a
      LEFT JOIN artist_pipeline_state ps ON ps.artist_id = a.id
      WHERE a.instagram_private != TRUE
        AND (ps.scraping_blacklisted IS NULL OR ps.scraping_blacklisted = FALSE)
        AND a.deleted_at IS NULL
        AND a.instagram_handle IS NOT NULL
        AND (
          ps.pipeline_status IS NULL
          OR ps.pipeline_status = 'pending'
          OR ps.pipeline_status = 'retry_requested'
        )
      ORDER BY
        CASE WHEN ps.pipeline_status = 'retry_requested' THEN 0 ELSE 1 END,
        a.created_at
      ${limit ? sql`LIMIT ${limit}` : sql``}
    `;

    return rows.map((a) => ({
      id: a.id as string,
      instagram_handle: a.instagram_handle as string,
      name: (a.name || a.instagram_handle) as string,
    }));
  } catch (error) {
    console.error('Failed to fetch pending artists:', error);
    return [];
  }
}

/**
 * Get artists needing profile images only
 */
async function getArtistsNeedingProfileImages(limit?: number): Promise<PendingArtist[]> {
  let query = supabase
    .from('artists')
    .select(`
      id,
      instagram_handle,
      name,
      artist_pipeline_state!left(scraping_blacklisted)
    `)
    .is('deleted_at', null)
    .not('instagram_handle', 'is', null)
    .neq('instagram_private', true)
    .is('profile_storage_path', null);

  if (limit) {
    query = query.limit(limit);
  }

  const { data: artists, error } = await query;

  if (error) {
    console.error('Failed to fetch artists:', error);
    return [];
  }

  return (artists || [])
    .filter((a) => {
      const pipelineState = a.artist_pipeline_state as { scraping_blacklisted?: boolean } | null;
      return !pipelineState?.scraping_blacklisted;
    })
    .map((a) => ({
      id: a.id,
      instagram_handle: a.instagram_handle!,
      name: a.name || a.instagram_handle!,
    }));
}

/**
 * Download image from URL to local file
 */
async function downloadImage(url: string, destPath: string): Promise<boolean> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Inkdex/1.0)',
      },
    });

    if (!response.ok) {
      console.error(`    Failed to download: HTTP ${response.status}`);
      return false;
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.startsWith('image/')) {
      console.error(`    Invalid content type: ${contentType}`);
      return false;
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    // Validate size (max 10MB)
    if (buffer.length > 10 * 1024 * 1024) {
      console.error('    Image too large');
      return false;
    }

    // Validate magic bytes
    const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    const isPng = buffer.toString('hex', 0, 8) === '89504e470d0a1a0a';
    if (!isJpeg && !isPng) {
      console.error('    Invalid image format');
      return false;
    }

    await writeFile(destPath, buffer);
    return true;
  } catch (error) {
    console.error(`    Download error: ${error}`);
    return false;
  }
}

/**
 * Create scraping job entry
 */
async function createScrapingJob(artistId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('scraping_jobs')
    .insert({
      artist_id: artistId,
      status: 'running',
      started_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) {
    console.error(`Failed to create scraping job: ${error.message}`);
    return null;
  }

  // Update pipeline state
  await supabase
    .from('artist_pipeline_state')
    .upsert({
      artist_id: artistId,
      pipeline_status: 'scraping',
      updated_at: new Date().toISOString(),
    });

  return data.id;
}

/**
 * Update scraping job status
 */
async function updateScrapingJob(
  jobId: string,
  status: 'completed' | 'failed',
  imagesScraped: number,
  errorMessage?: string,
  artistId?: string
): Promise<void> {
  await supabase
    .from('scraping_jobs')
    .update({
      status,
      images_scraped: imagesScraped,
      error_message: errorMessage || null,
      completed_at: status === 'completed' ? new Date().toISOString() : null,
    })
    .eq('id', jobId);

  // Update pipeline state
  if (artistId) {
    const pipelineStatus = status === 'completed' ? 'pending_embeddings' : 'failed';
    await supabase
      .from('artist_pipeline_state')
      .upsert({
        artist_id: artistId,
        pipeline_status: pipelineStatus,
        updated_at: new Date().toISOString(),
      });
  }
}

/**
 * Update artist profile metadata
 */
async function updateArtistMetadata(
  artistId: string,
  profileImageUrl?: string,
  followerCount?: number
): Promise<void> {
  const updates: Record<string, unknown> = {};
  if (profileImageUrl) updates.profile_image_url = profileImageUrl;
  if (followerCount !== undefined) updates.follower_count = followerCount;

  if (Object.keys(updates).length > 0) {
    await supabase.from('artists').update(updates).eq('id', artistId);
  }

  // Update last_scraped_at
  await supabase
    .from('artist_pipeline_state')
    .upsert({
      artist_id: artistId,
      last_scraped_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
}

/**
 * Scrape a single artist
 */
async function scrapeArtist(artist: PendingArtist, profileOnly: boolean): Promise<ScrapeResult> {
  const artistDir = join(TEMP_DIR, artist.id);

  try {
    // Fetch profile with ScrapingDog
    const profile = await fetchProfileWithScrapingDog(artist.instagram_handle, MAX_POSTS);

    // Create artist directory
    await mkdir(artistDir, { recursive: true });

    let imagesDownloaded = 0;

    // Download profile image
    if (profile.profileImageUrl) {
      const profilePath = join(artistDir, `${artist.id}_profile.jpg`);
      const success = await downloadImage(profile.profileImageUrl, profilePath);
      if (success) {
        console.log(`    Downloaded profile image`);
      }
    }

    // Update artist metadata
    await updateArtistMetadata(artist.id, profile.profileImageUrl, profile.followerCount);

    if (profileOnly) {
      // Create .complete marker
      await writeFile(join(artistDir, '.complete'), '');
      return { artistId: artist.id, success: true, imagesDownloaded: 0 };
    }

    // Download portfolio images
    const metadata: Array<{
      post_id: string;
      post_url: string;
      caption: string;
      timestamp: string;
      likes: number;
    }> = [];

    for (const post of profile.posts) {
      if (shutdownRequested) break;

      const imagePath = join(artistDir, `${post.shortcode}.jpg`);
      const success = await downloadImage(post.displayUrl, imagePath);

      if (success) {
        imagesDownloaded++;
        metadata.push({
          post_id: post.shortcode,
          post_url: post.url,
          caption: post.caption || '',
          timestamp: post.timestamp || new Date().toISOString(),
          likes: post.likesCount || 0,
        });
      }
    }

    // Save metadata
    if (metadata.length > 0) {
      await writeFile(join(artistDir, 'metadata.json'), JSON.stringify(metadata, null, 2));
    }

    // Create .complete marker
    await writeFile(join(artistDir, '.complete'), '');

    return { artistId: artist.id, success: true, imagesDownloaded };
  } catch (error) {
    // Clean up on failure
    if (existsSync(artistDir)) {
      await rm(artistDir, { recursive: true, force: true }).catch(() => {});
    }

    const errorMessage = error instanceof InstagramError ? error.message : String(error);

    // Mark as private if applicable
    if (error instanceof InstagramError && error.code === 'PRIVATE_ACCOUNT') {
      await supabase.from('artists').update({ instagram_private: true }).eq('id', artist.id);
    }

    return { artistId: artist.id, success: false, imagesDownloaded: 0, error: errorMessage };
  }
}

/**
 * Run process-batch.ts in background
 */
function runProcessBatch(): Promise<void> {
  return new Promise((resolve) => {
    console.log('\n  Running process-batch.ts...');
    const child = spawn('npx', ['tsx', 'scripts/scraping/process-batch.ts'], {
      cwd: process.cwd(),
      stdio: 'inherit',
    });

    child.on('close', (code) => {
      if (code === 0) {
        console.log('  process-batch.ts completed\n');
      } else {
        console.log(`  process-batch.ts exited with code ${code}\n`);
      }
      resolve();
    });

    child.on('error', (err) => {
      console.error(`  process-batch.ts error: ${err.message}\n`);
      resolve();
    });
  });
}

/**
 * Update pipeline run progress
 */
async function updatePipelineProgress(
  pipelineRunId: string,
  totalItems: number,
  processedItems: number,
  failedItems: number
): Promise<void> {
  await supabase
    .from('pipeline_runs')
    .update({
      total_items: totalItems,
      processed_items: processedItems,
      failed_items: failedItems,
      last_heartbeat_at: new Date().toISOString(),
    })
    .eq('id', pipelineRunId);
}

/**
 * Main scraping workflow
 */
async function main(): Promise<void> {
  // Parse arguments
  const args = process.argv.slice(2);
  const profileOnly = args.includes('--profile-only');
  const limitArg = args.find((a) => a.startsWith('--limit'));
  const limit = limitArg ? parseInt(limitArg.split('=')[1] || args[args.indexOf('--limit') + 1]) : undefined;

  console.log('='.repeat(60));
  console.log('ScrapingDog Batch Scraper');
  console.log('='.repeat(60));
  console.log(`Concurrency: ${CONCURRENCY}`);
  console.log(`Mode: ${profileOnly ? 'Profile images only' : 'Full portfolio'}`);
  if (limit) console.log(`Limit: ${limit} artists`);
  console.log('');

  // Create temp directory
  await mkdir(TEMP_DIR, { recursive: true });

  // Get pending artists
  console.log('Fetching pending artists...');
  const artists = profileOnly
    ? await getArtistsNeedingProfileImages(limit)
    : await getPendingArtists(limit);

  if (artists.length === 0) {
    console.log('No artists to scrape.');
    return;
  }

  console.log(`Found ${artists.length} artists to scrape\n`);

  // Get pipeline run ID if set
  const pipelineRunId = process.env.PIPELINE_RUN_ID;
  if (pipelineRunId) {
    await updatePipelineProgress(pipelineRunId, artists.length, 0, 0);
    console.log(`Pipeline run: ${pipelineRunId.slice(0, 8)}...\n`);
  }

  // Set up concurrency limiter
  const limiter = pLimit(CONCURRENCY);

  // Stats
  let completed = 0;
  let successful = 0;
  let failed = 0;
  let totalImages = 0;

  // Process artists with concurrency control
  const startTime = Date.now();

  const tasks = artists.map((artist, index) =>
    limiter(async () => {
      if (shutdownRequested) return;

      const artistNum = index + 1;
      console.log(`[${artistNum}/${artists.length}] @${artist.instagram_handle} (${artist.name})`);

      // Create scraping job
      const jobId = await createScrapingJob(artist.id);

      // Scrape
      const result = await scrapeArtist(artist, profileOnly);

      // Update job status
      if (jobId) {
        await updateScrapingJob(
          jobId,
          result.success ? 'completed' : 'failed',
          result.imagesDownloaded,
          result.error,
          artist.id
        );
      }

      // Update stats
      completed++;
      if (result.success) {
        successful++;
        totalImages += result.imagesDownloaded;
        console.log(`  ✓ ${result.imagesDownloaded} images`);
      } else {
        failed++;
        console.log(`  ✗ ${result.error}`);
      }

      // Progress
      const pct = ((completed / artists.length) * 100).toFixed(1);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
      const rate = (completed / (parseInt(elapsed) || 1)).toFixed(1);
      console.log(`  Progress: ${pct}% (${completed}/${artists.length}) - ${rate}/s\n`);

      // Update pipeline progress (every artist for small batches, every 10 for large)
      if (pipelineRunId) {
        const updateFrequency = artists.length <= 20 ? 1 : 10;
        if (completed % updateFrequency === 0) {
          await updatePipelineProgress(pipelineRunId, artists.length, successful, failed);
        }
      }

      // Run process-batch periodically
      if (completed % PROCESS_BATCH_INTERVAL === 0 && !profileOnly) {
        await runProcessBatch();
      }
    })
  );

  // Wait for all tasks
  await Promise.all(tasks);

  // Final process-batch run
  if (!profileOnly && successful > 0) {
    console.log('\nRunning final process-batch...');
    await runProcessBatch();
  }

  // Final progress update
  if (pipelineRunId) {
    await updatePipelineProgress(pipelineRunId, artists.length, successful, failed);
  }

  // Summary
  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('='.repeat(60));
  console.log('Summary');
  console.log('='.repeat(60));
  console.log(`Total time: ${totalTime}s`);
  console.log(`Artists processed: ${completed}/${artists.length}`);
  console.log(`Successful: ${successful}`);
  console.log(`Failed: ${failed}`);
  console.log(`Images downloaded: ${totalImages}`);
  console.log(`Credits used: ~${successful * 15}`);
  console.log('');

  if (shutdownRequested) {
    console.log('Shutdown requested - some artists may not have been processed.');
  }

  // Close database connection
  await sql.end();
}

main().catch(async (error) => {
  console.error('Fatal error:', error);
  await sql.end();
  process.exit(1);
});
