#!/usr/bin/env npx tsx
/**
 * Follower Mining Script
 *
 * Discovers tattoo artists by scraping followers of seed accounts.
 * Uses two-stage classification: bio keywords first, then GPT-5-mini image fallback.
 *
 * Usage:
 *   npm run mine:followers                      # Run with default seeds
 *   npm run mine:followers -- --seed fkirons
 *   npm run mine:followers -- --type supply_company
 *   npm run mine:followers -- --dry-run
 *   npm run mine:followers -- --skip-images
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import {
  scrapeFollowers,
  estimateFollowerScrapingCost,
  getAllSeedAccounts,
  getSeedAccountsByType,
  FollowerProfile,
} from '../../lib/instagram/follower-scraper';
import {
  isTattooArtistByBio,
  getMatchingBioKeywords,
  classifyTattooArtist,
} from '../../lib/instagram/classifier';
import { extractLocationFromBio, checkBioForGDPR } from '../../lib/instagram/bio-location-extractor';

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
  followersPerSeed: 5000, // Max followers per seed
  delayBetweenSeeds: 10000, // 10 seconds
  batchSize: 50, // Profiles to process at once
  profileFetchConcurrency: 10, // Parallel profile fetches (Starter plan allows 32 concurrent)
};

const COSTS = {
  apifyPer1KFollowers: 0.10,
  openaiPerClassification: 0.02,
};

// ============================================================================
// Supabase Client
// ============================================================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ============================================================================
// Concurrency Limiter
// ============================================================================

/**
 * Simple concurrency limiter for parallel operations
 */
async function mapWithConcurrency<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  concurrency: number
): Promise<R[]> {
  const results: R[] = [];
  const executing: Promise<void>[] = [];

  for (const item of items) {
    const p = fn(item).then((result) => {
      results.push(result);
    });
    executing.push(p as unknown as Promise<void>);

    if (executing.length >= concurrency) {
      await Promise.race(executing);
      for (let i = executing.length - 1; i >= 0; i--) {
        const status = await Promise.race([
          executing[i].then(() => 'resolved'),
          Promise.resolve('pending'),
        ]);
        if (status === 'resolved') {
          executing.splice(i, 1);
        }
      }
    }
  }

  await Promise.all(executing);
  return results;
}

// ============================================================================
// Helper Functions
// ============================================================================

type SeedType = 'supply_company' | 'convention' | 'industry' | 'macro_artist';

function parseArgs(): {
  seeds: Array<{ account: string; type: SeedType }>;
  dryRun: boolean;
  skipImages: boolean;
} {
  const args = process.argv.slice(2);
  let seeds: Array<{ account: string; type: SeedType }> = [];
  let dryRun = false;
  let skipImages = false;
  let filterType: SeedType | null = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--seed' && args[i + 1]) {
      seeds.push({
        account: args[i + 1].replace(/^@/, ''),
        type: 'macro_artist', // Default type for manual seeds
      });
      i++;
    } else if (args[i] === '--type' && args[i + 1]) {
      filterType = args[i + 1] as SeedType;
      i++;
    } else if (args[i] === '--dry-run') {
      dryRun = true;
    } else if (args[i] === '--skip-images') {
      skipImages = true;
    }
  }

  // Use filtered seeds, specific seeds, or all seeds
  if (seeds.length === 0) {
    if (filterType) {
      seeds = getSeedAccountsByType(filterType);
    } else {
      seeds = getAllSeedAccounts();
    }
  }

  return { seeds, dryRun, skipImages };
}

async function getExistingHandles(): Promise<Set<string>> {
  console.log('[Mining] Fetching existing artist handles...');

  const { data, error } = await supabase
    .from('artists')
    .select('instagram_handle')
    .not('instagram_handle', 'is', null);

  if (error) {
    console.error('[Mining] Error fetching existing handles:', error);
    return new Set();
  }

  const handles = new Set(
    data.map(a => a.instagram_handle?.toLowerCase()).filter(Boolean)
  );

  console.log(`[Mining] Found ${handles.size} existing artists`);
  return handles;
}

async function getFailedCandidates(): Promise<Set<string>> {
  console.log('[Mining] Fetching recently failed candidates...');

  // Get handles that failed classification (bio=false, image=false) in the last 30 days
  // Older failures can be retried in case the account changed
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data, error } = await supabase
    .from('mining_candidates')
    .select('instagram_handle')
    .eq('bio_filter_passed', false)
    .eq('image_filter_passed', false)
    .gte('processed_at', thirtyDaysAgo.toISOString());

  if (error) {
    console.error('[Mining] Error fetching failed candidates:', error);
    return new Set();
  }

  const handles = new Set(
    data.map(c => c.instagram_handle?.toLowerCase()).filter(Boolean)
  );

  console.log(`[Mining] Found ${handles.size} recently failed candidates (will skip for 30 days)`);
  return handles;
}

async function getProcessedSeeds(): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('follower_mining_runs')
    .select('seed_account')
    .eq('status', 'completed');

  if (error) {
    console.error('[Mining] Error fetching processed seeds:', error);
    return new Set();
  }

  return new Set(data.map(r => r.seed_account.toLowerCase()));
}

async function createMiningRun(
  seedAccount: string,
  seedType: string
): Promise<string> {
  const { data, error } = await supabase
    .from('follower_mining_runs')
    .insert({
      seed_account: seedAccount.toLowerCase(),
      seed_type: seedType,
      status: 'running',
      started_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to create mining run: ${error.message}`);
  }

  return data.id;
}

async function updateMiningRun(
  runId: string,
  updates: Record<string, any>
): Promise<void> {
  console.log(`[Mining] Updating run ${runId}:`, JSON.stringify(updates, null, 2));

  const { data, error } = await supabase
    .from('follower_mining_runs')
    .update(updates)
    .eq('id', runId)
    .select();

  if (error) {
    console.error('[Mining] Error updating run:', error);
  } else if (!data || data.length === 0) {
    console.error('[Mining] Warning: Update returned no rows - run may not exist');
  } else {
    console.log(`[Mining] Successfully updated run. followers_scraped=${data[0]?.followers_scraped}`);
  }
}

async function insertArtist(profile: {
  username: string;
  bio?: string;
  followerCount?: number;
  city?: string;
  state?: string;
  discoverySource: string;
}): Promise<boolean> {
  const baseSlug = profile.username.toLowerCase().replace(/[^a-z0-9]/g, '-');

  const { error } = await supabase.from('artists').insert({
    name: profile.username,
    slug: baseSlug,
    instagram_handle: profile.username.toLowerCase(),
    instagram_url: `https://instagram.com/${profile.username}`,
    bio: profile.bio,
    follower_count: profile.followerCount,
    city: profile.city,
    state: profile.state,
    discovery_source: profile.discoverySource,
    verification_status: 'unclaimed',
  });

  if (error) {
    if (error.code === '23505') {
      return false; // Duplicate
    }
    console.error(`[Mining] Error inserting artist ${profile.username}:`, error);
    return false;
  }

  return true;
}

async function saveMiningCandidate(candidate: {
  handle: string;
  sourceType: 'follower';
  sourceId: string;
  bio?: string;
  followerCount?: number;
  bioFilterPassed: boolean | null;
  imageFilterPassed?: boolean | null;
  extractedCity?: string;
  extractedState?: string;
  locationConfidence?: 'high' | 'medium' | 'low';
  insertedAsArtistId?: string;
}): Promise<void> {
  const { error } = await supabase.from('mining_candidates').insert({
    instagram_handle: candidate.handle.toLowerCase(),
    source_type: candidate.sourceType,
    source_id: candidate.sourceId,
    biography: candidate.bio,
    follower_count: candidate.followerCount,
    bio_filter_passed: candidate.bioFilterPassed,
    image_filter_passed: candidate.imageFilterPassed ?? null,
    extracted_city: candidate.extractedCity,
    extracted_state: candidate.extractedState,
    location_confidence: candidate.locationConfidence,
    inserted_as_artist_id: candidate.insertedAsArtistId,
    processed_at: candidate.bioFilterPassed !== null ? new Date().toISOString() : null,
  });

  if (error) {
    console.error(`[Mining] Failed to save candidate @${candidate.handle}:`, error.message);
  }
}

// ============================================================================
// Main Processing Logic
// ============================================================================

async function processSeed(
  seedAccount: string,
  seedType: SeedType,
  existingHandles: Set<string>,
  failedCandidates: Set<string>,
  skipImages: boolean
): Promise<{
  followersScraped: number;
  newFollowers: number;
  bioFilterPassed: number;
  imageFilterPassed: number;
  artistsInserted: number;
  skippedPrivate: number;
  apifyCost: number;
  openaiCost: number;
}> {
  const stats = {
    followersScraped: 0,
    newFollowers: 0,
    bioFilterPassed: 0,
    imageFilterPassed: 0,
    artistsInserted: 0,
    skippedPrivate: 0,
    skippedGDPR: 0,
    apifyCost: 0,
    openaiCost: 0,
  };

  // Create mining run record
  const runId = await createMiningRun(seedAccount, seedType);

  try {
    // Step 1: Scrape followers
    console.log(`\n[Mining] Scraping followers of @${seedAccount}...`);
    const scrapeResult = await scrapeFollowers({
      seedAccount,
      maxFollowers: CONFIG.followersPerSeed,
      filterPrivate: true, // Filter out private accounts
    });

    stats.followersScraped = scrapeResult.totalFollowers;
    stats.skippedPrivate = scrapeResult.privateCount;
    stats.apifyCost = scrapeResult.estimatedCost;

    await updateMiningRun(runId, {
      followers_scraped: stats.followersScraped,
      artists_skipped_private: stats.skippedPrivate,
      seed_follower_count: scrapeResult.seedFollowerCount,
      apify_run_id: scrapeResult.runId,
      apify_cost_estimate: stats.apifyCost,
    });

    // Step 2: Filter out existing handles and previously failed candidates
    const existingCount = scrapeResult.followers.filter(
      f => existingHandles.has(f.username.toLowerCase())
    ).length;
    const failedCount = scrapeResult.followers.filter(
      f => !existingHandles.has(f.username.toLowerCase()) && failedCandidates.has(f.username.toLowerCase())
    ).length;

    const newFollowers = scrapeResult.followers.filter(
      f => !existingHandles.has(f.username.toLowerCase()) && !failedCandidates.has(f.username.toLowerCase())
    );
    stats.newFollowers = newFollowers.length;

    console.log(`[Mining] ${newFollowers.length} new followers (${existingCount} already exist, ${failedCount} previously failed)`);

    if (newFollowers.length === 0) {
      await updateMiningRun(runId, {
        status: 'completed',
        completed_at: new Date().toISOString(),
      });
      return stats;
    }

    // Step 3: Classify followers
    console.log(`[Mining] Classifying ${newFollowers.length} profiles...`);

    for (let i = 0; i < newFollowers.length; i += CONFIG.batchSize) {
      const batch = newFollowers.slice(i, i + CONFIG.batchSize);
      console.log(`[Mining] Processing batch ${Math.floor(i / CONFIG.batchSize) + 1}/${Math.ceil(newFollowers.length / CONFIG.batchSize)}`);

      await mapWithConcurrency(batch, async (follower: FollowerProfile) => {
        const { username, biography, followerCount } = follower;

        try {
          // Stage 1: Bio keyword check (we already have bio from follower scrape)
          const bioMatch = isTattooArtistByBio(biography);

          if (bioMatch) {
            stats.bioFilterPassed++;

            const location = extractLocationFromBio(biography);

            // GDPR compliance: Skip EU artists
            if (location?.isGDPR) {
              stats.skippedGDPR++;
              console.log(`[Mining] 🇪🇺 Skipped EU artist: @${username} (${location.countryCode})`);

              await saveMiningCandidate({
                handle: username,
                sourceType: 'follower',
                sourceId: runId,
                bio: biography,
                followerCount,
                bioFilterPassed: true,
                extractedCity: location?.city ?? undefined,
                extractedState: location?.stateCode ?? undefined,
                locationConfidence: location?.confidence,
              });
              return;
            }

            const inserted = await insertArtist({
              username,
              bio: biography,
              followerCount,
              city: location?.city ?? undefined,
              state: location?.stateCode ?? undefined,
              discoverySource: `follower_${seedAccount}`,
            });

            if (inserted) {
              stats.artistsInserted++;
              existingHandles.add(username.toLowerCase());
              console.log(`[Mining] ✅ Inserted: @${username} (bio match: ${getMatchingBioKeywords(biography).join(', ')})`);
            }

            // Save candidate record (bio passed)
            await saveMiningCandidate({
              handle: username,
              sourceType: 'follower',
              sourceId: runId,
              bio: biography,
              followerCount,
              bioFilterPassed: true,
              extractedCity: location?.city ?? undefined,
              extractedState: location?.stateCode ?? undefined,
              locationConfidence: location?.confidence,
            });

            return;
          }

          // Stage 2: Image classification (if not skipped)
          if (!skipImages) {
            stats.openaiCost += COSTS.openaiPerClassification;

            const classResult = await classifyTattooArtist(username);

            if (classResult.passed) {
              stats.imageFilterPassed++;

              const location = extractLocationFromBio(classResult.bio);

              // GDPR compliance: Skip EU artists
              if (location?.isGDPR) {
                stats.skippedGDPR++;
                console.log(`[Mining] 🇪🇺 Skipped EU artist: @${username} (${location.countryCode})`);

                await saveMiningCandidate({
                  handle: username,
                  sourceType: 'follower',
                  sourceId: runId,
                  bio: classResult.bio,
                  followerCount: classResult.follower_count,
                  bioFilterPassed: false,
                  imageFilterPassed: true,
                  extractedCity: location?.city ?? undefined,
                  extractedState: location?.stateCode ?? undefined,
                  locationConfidence: location?.confidence,
                });
                return;
              }

              const inserted = await insertArtist({
                username,
                bio: classResult.bio,
                followerCount: classResult.follower_count,
                city: location?.city ?? undefined,
                state: location?.stateCode ?? undefined,
                discoverySource: `follower_${seedAccount}`,
              });

              if (inserted) {
                stats.artistsInserted++;
                existingHandles.add(username.toLowerCase());
                console.log(`[Mining] ✅ Inserted: @${username} (image classification: ${classResult.confidence.toFixed(2)})`);
              }

              // Save candidate record (image passed)
              await saveMiningCandidate({
                handle: username,
                sourceType: 'follower',
                sourceId: runId,
                bio: classResult.bio,
                followerCount: classResult.follower_count,
                bioFilterPassed: false,
                imageFilterPassed: true,
                extractedCity: location?.city ?? undefined,
                extractedState: location?.stateCode ?? undefined,
                locationConfidence: location?.confidence,
              });
            } else {
              // Save candidate record (image failed)
              await saveMiningCandidate({
                handle: username,
                sourceType: 'follower',
                sourceId: runId,
                bio: biography,
                followerCount,
                bioFilterPassed: false,
                imageFilterPassed: false,
              });
            }
          } else if (!bioMatch) {
            // Bio failed and images skipped - save as pending for later classification
            await saveMiningCandidate({
              handle: username,
              sourceType: 'follower',
              sourceId: runId,
              bio: biography,
              followerCount,
              bioFilterPassed: false,
              imageFilterPassed: null, // Pending - not yet classified
            });
            console.log(`[Mining] 📋 Queued for image classification: @${username}`);
          }
        } catch (error) {
          console.log(`[Mining] ⚠️ Skipped @${username}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }, CONFIG.profileFetchConcurrency);

      // Small delay between batches
      if (i + CONFIG.batchSize < newFollowers.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Update final stats
    await updateMiningRun(runId, {
      bio_filter_passed: stats.bioFilterPassed,
      image_filter_passed: stats.imageFilterPassed,
      artists_inserted: stats.artistsInserted,
      openai_cost_estimate: stats.openaiCost,
      status: 'completed',
      completed_at: new Date().toISOString(),
    });

  } catch (error) {
    console.error(`[Mining] Error processing @${seedAccount}:`, error);
    await updateMiningRun(runId, {
      status: 'failed',
      error_message: error instanceof Error ? error.message : 'Unknown error',
      completed_at: new Date().toISOString(),
    });
  }

  return stats;
}

// ============================================================================
// Main Entry Point
// ============================================================================

async function main() {
  console.log('='.repeat(60));
  console.log('FOLLOWER MINING - Tattoo Artist Discovery');
  console.log('='.repeat(60));

  const { seeds, dryRun, skipImages } = parseArgs();

  console.log(`\nConfiguration:`);
  console.log(`  Seed accounts: ${seeds.length}`);
  console.log(`  Followers per seed: ${CONFIG.followersPerSeed}`);
  console.log(`  Dry run: ${dryRun}`);
  console.log(`  Skip image classification: ${skipImages}`);

  // Show seed accounts by type
  const byType = seeds.reduce((acc, s) => {
    acc[s.type] = (acc[s.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  console.log(`\nSeed breakdown:`);
  Object.entries(byType).forEach(([type, count]) => {
    console.log(`  ${type}: ${count}`);
  });

  // Estimate costs
  const estimatedApifyCost = estimateFollowerScrapingCost(seeds.length, CONFIG.followersPerSeed);
  // Assume ~10% of followers need image classification
  const estimatedOpenAICost = skipImages ? 0 :
    seeds.length * CONFIG.followersPerSeed * 0.1 * COSTS.openaiPerClassification;

  console.log(`\nEstimated costs:`);
  console.log(`  Apify: $${estimatedApifyCost.toFixed(2)}`);
  console.log(`  OpenAI (image classification): $${estimatedOpenAICost.toFixed(2)}`);
  console.log(`  Total: $${(estimatedApifyCost + estimatedOpenAICost).toFixed(2)}`);

  if (dryRun) {
    console.log('\n[Dry Run] Exiting without scraping.');
    return;
  }

  // Get existing handles and failed candidates for deduplication
  const existingHandles = await getExistingHandles();
  const failedCandidates = await getFailedCandidates();
  const processedSeeds = await getProcessedSeeds();

  // Filter out already-processed seeds
  const seedsToProcess = seeds.filter(s => !processedSeeds.has(s.account.toLowerCase()));

  if (seedsToProcess.length < seeds.length) {
    console.log(`\n[Mining] Skipping ${seeds.length - seedsToProcess.length} already-processed seeds`);
  }

  if (seedsToProcess.length === 0) {
    console.log('[Mining] All seeds already processed. Exiting.');
    return;
  }

  console.log(`\n[Mining] Processing ${seedsToProcess.length} seeds...`);

  // Process each seed
  const totalStats = {
    followersScraped: 0,
    newFollowers: 0,
    bioFilterPassed: 0,
    imageFilterPassed: 0,
    artistsInserted: 0,
    skippedPrivate: 0,
    skippedGDPR: 0,
    apifyCost: 0,
    openaiCost: 0,
  };

  for (let i = 0; i < seedsToProcess.length; i++) {
    const { account, type } = seedsToProcess[i];

    console.log(`\n${'─'.repeat(60)}`);
    console.log(`Seed ${i + 1}/${seedsToProcess.length}: @${account} (${type})`);
    console.log('─'.repeat(60));

    const stats = await processSeed(account, type, existingHandles, failedCandidates, skipImages);

    // Aggregate stats
    totalStats.followersScraped += stats.followersScraped;
    totalStats.newFollowers += stats.newFollowers;
    totalStats.bioFilterPassed += stats.bioFilterPassed;
    totalStats.imageFilterPassed += stats.imageFilterPassed;
    totalStats.artistsInserted += stats.artistsInserted;
    totalStats.skippedPrivate += stats.skippedPrivate;
    totalStats.skippedGDPR += stats.skippedGDPR;
    totalStats.apifyCost += stats.apifyCost;
    totalStats.openaiCost += stats.openaiCost;

    // Delay between seeds
    if (i < seedsToProcess.length - 1) {
      console.log(`\n[Mining] Waiting ${CONFIG.delayBetweenSeeds / 1000}s before next seed...`);
      await new Promise(resolve => setTimeout(resolve, CONFIG.delayBetweenSeeds));
    }
  }

  // Final summary
  console.log('\n' + '='.repeat(60));
  console.log('MINING COMPLETE');
  console.log('='.repeat(60));
  console.log(`\nResults:`);
  console.log(`  Followers scraped: ${totalStats.followersScraped.toLocaleString()}`);
  console.log(`  Skipped (private): ${totalStats.skippedPrivate.toLocaleString()}`);
  console.log(`  New followers: ${totalStats.newFollowers.toLocaleString()}`);
  console.log(`  Bio filter passed: ${totalStats.bioFilterPassed.toLocaleString()}`);
  console.log(`  Image filter passed: ${totalStats.imageFilterPassed.toLocaleString()}`);
  console.log(`  Artists inserted: ${totalStats.artistsInserted.toLocaleString()}`);
  if (totalStats.skippedGDPR > 0) {
    console.log(`  EU/GDPR skipped: ${totalStats.skippedGDPR.toLocaleString()}`);
  }
  console.log(`\nCosts:`);
  console.log(`  Apify: $${totalStats.apifyCost.toFixed(4)}`);
  console.log(`  OpenAI: $${totalStats.openaiCost.toFixed(4)}`);
  console.log(`  Total: $${(totalStats.apifyCost + totalStats.openaiCost).toFixed(4)}`);
}

// Run
main().catch(console.error);
