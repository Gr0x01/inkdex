/**
 * Follower Scraper
 *
 * Apify wrapper for scraping Instagram followers from seed accounts.
 * Used for graph-based tattoo artist discovery.
 */

import { ApifyClient } from 'apify-client';
import { z } from 'zod';

// Apify actor for follower scraping
const FOLLOWER_ACTOR_ID = 'apify/instagram-scraper';

// Zod schema for Apify follower profile response (loose validation with fallbacks)
const ApifyFollowerSchema = z.object({
  username: z.string().optional(),
  fullName: z.string().optional(),
  full_name: z.string().optional(),
  id: z.string().optional(),
  userId: z.string().optional(),
  biography: z.string().optional(),
  bio: z.string().optional(),
  followersCount: z.number().optional(),
  follower_count: z.number().optional(),
  followingCount: z.number().optional(),
  following_count: z.number().optional(),
  postsCount: z.number().optional(),
  media_count: z.number().optional(),
  isPrivate: z.boolean().optional(),
  is_private: z.boolean().optional(),
  isVerified: z.boolean().optional(),
  is_verified: z.boolean().optional(),
  isBusiness: z.boolean().optional(),
  is_business_account: z.boolean().optional(),
  profilePicUrl: z.string().optional(),
  profile_pic_url: z.string().optional(),
  externalUrl: z.string().optional(),
  external_url: z.string().optional(),
  category: z.string().optional(),
  category_name: z.string().optional(),
}).passthrough(); // Allow extra fields

// Cost per 1K followers (approximate)
const COST_PER_1K_FOLLOWERS = 0.10;

export interface FollowerProfile {
  // Basic info
  username: string;
  fullName: string;
  userId: string;

  // Profile data
  biography: string;
  followerCount: number;
  followingCount: number;
  postsCount: number;

  // Status
  isPrivate: boolean;
  isVerified: boolean;
  isBusiness: boolean;

  // Optional
  profilePicUrl?: string;
  externalUrl?: string;
  category?: string;
}

export interface FollowerScraperOptions {
  // Account to scrape followers from
  seedAccount: string;

  // Maximum followers to fetch (default: 5000)
  maxFollowers?: number;

  // Skip private accounts in results
  filterPrivate?: boolean;

  // Timeout in seconds (default: 600)
  timeoutSecs?: number;
}

export interface FollowerScraperResult {
  // Followers found
  followers: FollowerProfile[];

  // Seed account info
  seedUsername: string;
  seedFollowerCount: number;

  // Stats
  totalFollowers: number;
  privateCount: number;
  publicCount: number;

  // Apify run info
  runId: string;
  estimatedCost: number;
}

/**
 * Validate and normalize username (remove @ prefix if present)
 * @throws Error if username contains invalid characters
 */
export function normalizeUsername(username: string): string {
  const cleaned = username.replace(/^@/, '').toLowerCase().trim();
  if (!cleaned) {
    throw new Error('Username cannot be empty');
  }
  // Instagram usernames: 1-30 chars, letters, numbers, periods, underscores
  if (!/^[a-z0-9._]+$/.test(cleaned)) {
    throw new Error(`Invalid username format: "${username}" - only letters, numbers, periods, and underscores allowed`);
  }
  if (cleaned.length > 30) {
    throw new Error(`Username too long: "${username}" - max 30 characters`);
  }
  return cleaned;
}

/**
 * Scrape followers from an Instagram account
 *
 * @param options - Scraping options
 * @returns Follower profiles and metadata
 */
export async function scrapeFollowers(
  options: FollowerScraperOptions
): Promise<FollowerScraperResult> {
  const apifyToken = process.env.APIFY_API_TOKEN;
  if (!apifyToken) {
    throw new Error('APIFY_API_TOKEN environment variable is not set');
  }

  const client = new ApifyClient({ token: apifyToken });

  const seedUsername = normalizeUsername(options.seedAccount);
  const maxFollowers = options.maxFollowers ?? 5000;
  const filterPrivate = options.filterPrivate ?? true;
  const timeoutSecs = options.timeoutSecs ?? 600;

  console.log(`[FollowerScraper] Scraping followers of @${seedUsername} (max ${maxFollowers})...`);

  // Run the Apify actor
  const run = await client.actor(FOLLOWER_ACTOR_ID).call(
    {
      directUrls: [`https://www.instagram.com/${seedUsername}/followers/`],
      resultsLimit: maxFollowers,
      resultsType: 'followers',
      searchType: 'user',
    },
    {
      waitSecs: timeoutSecs,
    }
  );

  console.log(`[FollowerScraper] Apify run ${run.id} completed`);

  // Fetch results from dataset
  const { items } = await client.dataset(run.defaultDatasetId).listItems();

  // Transform and validate results
  let followers: FollowerProfile[] = [];
  let invalidCount = 0;

  for (const item of items) {
    const parsed = ApifyFollowerSchema.safeParse(item);
    if (!parsed.success) {
      invalidCount++;
      if (invalidCount <= 3) {
        console.warn(`[FollowerScraper] Invalid item schema:`, parsed.error.issues[0]);
      }
      continue;
    }

    const data = parsed.data;
    const username = data.username || '';
    if (!username) continue; // Skip items without username

    followers.push({
      username,
      fullName: data.fullName || data.full_name || '',
      userId: data.id || data.userId || '',
      biography: data.biography || data.bio || '',
      followerCount: data.followersCount || data.follower_count || 0,
      followingCount: data.followingCount || data.following_count || 0,
      postsCount: data.postsCount || data.media_count || 0,
      isPrivate: data.isPrivate || data.is_private || false,
      isVerified: data.isVerified || data.is_verified || false,
      isBusiness: data.isBusiness || data.is_business_account || false,
      profilePicUrl: data.profilePicUrl || data.profile_pic_url,
      externalUrl: data.externalUrl || data.external_url,
      category: data.category || data.category_name,
    });
  }

  if (invalidCount > 0) {
    console.warn(`[FollowerScraper] Skipped ${invalidCount} items with invalid schema`);
  }

  // Count private before filtering
  const privateCount = followers.filter(f => f.isPrivate).length;
  const publicCount = followers.filter(f => !f.isPrivate).length;

  // Filter private accounts if requested
  if (filterPrivate) {
    followers = followers.filter(f => !f.isPrivate);
  }

  // Get seed account follower count (first item might be the seed)
  const seedFollowerCount = Number(items[0]?.followersCount) || 0;

  // Calculate estimated cost
  const estimatedCost = (items.length / 1000) * COST_PER_1K_FOLLOWERS;

  console.log(`[FollowerScraper] Found ${items.length} followers (${publicCount} public, ${privateCount} private)`);
  console.log(`[FollowerScraper] Estimated cost: $${estimatedCost.toFixed(4)}`);

  return {
    followers,
    seedUsername,
    seedFollowerCount,
    totalFollowers: items.length,
    privateCount,
    publicCount,
    runId: run.id,
    estimatedCost,
  };
}

/**
 * Scrape followers from multiple seed accounts
 *
 * @param seeds - Array of seed accounts with metadata
 * @param options - Common options for all seeds
 * @param delayMs - Delay between seeds in milliseconds (default: 10000)
 */
export async function scrapeMultipleSeeds(
  seeds: Array<{
    account: string;
    type: 'supply_company' | 'convention' | 'industry' | 'macro_artist';
  }>,
  options: Omit<FollowerScraperOptions, 'seedAccount'> = {},
  delayMs: number = 10000
): Promise<{
  results: Map<string, FollowerScraperResult>;
  allFollowers: FollowerProfile[];
  uniqueUsernames: string[];
  totalEstimatedCost: number;
  failedSeeds: string[];
}> {
  const results = new Map<string, FollowerScraperResult>();
  const allFollowersMap = new Map<string, FollowerProfile>();
  const failedSeeds: string[] = [];
  let totalEstimatedCost = 0;

  for (let i = 0; i < seeds.length; i++) {
    const { account, type } = seeds[i];

    try {
      console.log(`\n[FollowerScraper] Processing seed ${i + 1}/${seeds.length}: @${account} (${type})`);

      const result = await scrapeFollowers({
        ...options,
        seedAccount: account,
      });

      results.set(account.toLowerCase(), result);
      totalEstimatedCost += result.estimatedCost;

      // Deduplicate across seeds
      result.followers.forEach(f => {
        const key = f.username.toLowerCase();
        if (!allFollowersMap.has(key)) {
          allFollowersMap.set(key, f);
        }
      });

    } catch (error) {
      console.error(`[FollowerScraper] Failed to scrape @${account}:`, error);
      failedSeeds.push(account);
    }

    // Delay between seeds (except for last one)
    if (i < seeds.length - 1) {
      console.log(`[FollowerScraper] Waiting ${delayMs / 1000}s before next seed...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  const allFollowers = Array.from(allFollowersMap.values());
  const uniqueUsernames = Array.from(allFollowersMap.keys());

  console.log(`\n[FollowerScraper] Completed ${results.size}/${seeds.length} seeds`);
  console.log(`[FollowerScraper] Total unique followers: ${uniqueUsernames.length}`);
  console.log(`[FollowerScraper] Total estimated cost: $${totalEstimatedCost.toFixed(4)}`);

  return {
    results,
    allFollowers,
    uniqueUsernames,
    totalEstimatedCost,
    failedSeeds,
  };
}

/**
 * Get cost estimate for scraping followers
 *
 * @param seeds - Number of seed accounts
 * @param followersPerSeed - Followers per seed
 * @returns Estimated cost in USD
 */
export function estimateFollowerScrapingCost(
  seeds: number,
  followersPerSeed: number
): number {
  const totalFollowers = seeds * followersPerSeed;
  return (totalFollowers / 1000) * COST_PER_1K_FOLLOWERS;
}

// ============================================================================
// Seed Account Configuration
// ============================================================================

export const SEED_ACCOUNTS = {
  // Tattoo supply companies - followers are mostly tattoo artists
  supply_companies: [
    { account: 'fkirons', type: 'supply_company' as const },
    { account: 'worldfamousink', type: 'supply_company' as const },
    { account: 'bishoprotary', type: 'supply_company' as const },
    { account: 'cheyenne_tattoo', type: 'supply_company' as const },
    { account: 'inkjecta', type: 'supply_company' as const },
    { account: 'dynamiccolor', type: 'supply_company' as const },
  ],

  // Tattoo conventions - followers include exhibiting artists
  conventions: [
    { account: 'villainarts', type: 'convention' as const },
    { account: 'tattooconvention', type: 'convention' as const },
    { account: 'londontattooconvention', type: 'convention' as const },
  ],

  // Industry publications - mixed audience but includes artists
  industry: [
    { account: 'tattoodo', type: 'industry' as const },
    { account: 'inkedmag', type: 'industry' as const },
    { account: 'tattoolife', type: 'industry' as const },
  ],

  // Macro artists - their followers include other artists
  macro_artists: [
    { account: 'dr_woo', type: 'macro_artist' as const },
    { account: 'nikko_hurtado', type: 'macro_artist' as const },
    { account: 'bang_bang', type: 'macro_artist' as const },
  ],
};

/**
 * Get all seed accounts as a flat array
 */
export function getAllSeedAccounts(): Array<{
  account: string;
  type: 'supply_company' | 'convention' | 'industry' | 'macro_artist';
}> {
  return [
    ...SEED_ACCOUNTS.supply_companies,
    ...SEED_ACCOUNTS.conventions,
    ...SEED_ACCOUNTS.industry,
    ...SEED_ACCOUNTS.macro_artists,
  ];
}

/**
 * Get seed accounts by type
 */
export function getSeedAccountsByType(
  type: 'supply_company' | 'convention' | 'industry' | 'macro_artist'
): Array<{ account: string; type: typeof type }> {
  return SEED_ACCOUNTS[type === 'supply_company' ? 'supply_companies' :
    type === 'convention' ? 'conventions' :
    type === 'industry' ? 'industry' : 'macro_artists'];
}
