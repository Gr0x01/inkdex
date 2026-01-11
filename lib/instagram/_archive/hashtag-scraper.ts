/**
 * Hashtag Scraper
 *
 * Apify wrapper for scraping Instagram posts from hashtags.
 * Uses apidojo/instagram-scraper for cost efficiency ($0.40/1K profiles).
 */

import { ApifyClient } from 'apify-client';
import { z } from 'zod';

// Apify actor for hashtag scraping
// apidojo/instagram-scraper is more cost-effective than official actor
const HASHTAG_ACTOR_ID = 'apify/instagram-hashtag-scraper';

// Zod schema for Apify hashtag post response (loose validation with fallbacks)
const ApifyHashtagPostSchema = z.object({
  ownerUsername: z.string().optional(),
  username: z.string().optional(),
  ownerId: z.string().optional(),
  userId: z.string().optional(),
  id: z.string().optional(),
  postId: z.string().optional(),
  shortCode: z.string().optional(),
  code: z.string().optional(),
  caption: z.string().optional(),
  displayUrl: z.string().optional(),
  imageUrl: z.string().optional(),
  timestamp: z.union([z.string(), z.number()]).optional(),
  takenAtTimestamp: z.union([z.string(), z.number()]).optional(),
  likesCount: z.number().optional(),
  likeCount: z.number().optional(),
  commentsCount: z.number().optional(),
  commentCount: z.number().optional(),
  locationName: z.string().optional(),
  locationId: z.string().optional(),
}).passthrough(); // Allow extra fields we don't use

// Cost per 1K results (approximate)
const COST_PER_1K_POSTS = 2.60; // Official actor pricing

export interface HashtagPost {
  // Post author
  ownerUsername: string;
  ownerId: string;

  // Post data
  id: string;
  shortCode: string;
  caption: string;
  displayUrl: string;
  timestamp: string;

  // Engagement
  likesCount: number;
  commentsCount: number;

  // Hashtags in caption
  hashtags: string[];

  // Location (if tagged)
  locationName?: string;
  locationId?: string;
}

export interface HashtagScraperOptions {
  // Hashtag to scrape (with or without #)
  hashtag: string;

  // Maximum posts to fetch (default: 5000)
  maxPosts?: number;

  // Only posts newer than this date
  onlyPostsNewerThan?: Date;

  // Timeout in seconds (default: 300)
  timeoutSecs?: number;
}

export interface HashtagScraperResult {
  // Posts scraped
  posts: HashtagPost[];

  // Unique usernames found
  uniqueUsernames: string[];

  // Scraping stats
  totalPosts: number;
  uniqueUsers: number;

  // Apify run info
  runId: string;
  estimatedCost: number;
}

/**
 * Validate and normalize hashtag (remove # prefix if present)
 * @throws Error if hashtag contains invalid characters
 */
export function normalizeHashtag(hashtag: string): string {
  const cleaned = hashtag.replace(/^#/, '').toLowerCase().trim();
  if (!cleaned) {
    throw new Error('Hashtag cannot be empty');
  }
  if (!/^[a-z0-9_]+$/.test(cleaned)) {
    throw new Error(`Invalid hashtag format: "${hashtag}" - only letters, numbers, and underscores allowed`);
  }
  if (cleaned.length > 100) {
    throw new Error(`Hashtag too long: "${hashtag}" - max 100 characters`);
  }
  return cleaned;
}

/**
 * Extract hashtags from caption text
 */
function extractHashtags(caption: string): string[] {
  const matches = caption.match(/#[a-zA-Z0-9_]+/g);
  return matches ? matches.map(h => h.toLowerCase()) : [];
}

/**
 * Scrape Instagram posts from a hashtag
 *
 * @param options - Scraping options
 * @returns Scraped posts and metadata
 */
export async function scrapeHashtag(
  options: HashtagScraperOptions
): Promise<HashtagScraperResult> {
  const apifyToken = process.env.APIFY_API_TOKEN;
  if (!apifyToken) {
    throw new Error('APIFY_API_TOKEN environment variable is not set');
  }

  const client = new ApifyClient({ token: apifyToken });

  const hashtag = normalizeHashtag(options.hashtag);
  const maxPosts = options.maxPosts ?? 5000;
  const timeoutSecs = options.timeoutSecs ?? 300;

  console.log(`[HashtagScraper] Scraping #${hashtag} (max ${maxPosts} posts)...`);

  // Run the Apify actor
  const run = await client.actor(HASHTAG_ACTOR_ID).call(
    {
      hashtags: [hashtag],
      resultsLimit: maxPosts,
      searchType: 'hashtag',
      ...(options.onlyPostsNewerThan && {
        onlyPostsNewerThan: options.onlyPostsNewerThan.toISOString(),
      }),
    },
    {
      waitSecs: timeoutSecs, // Wait for completion
    }
  );

  console.log(`[HashtagScraper] Apify run ${run.id} completed`);

  // Fetch results from dataset
  const { items } = await client.dataset(run.defaultDatasetId).listItems();

  // Transform and validate results
  const posts: HashtagPost[] = [];
  let invalidCount = 0;

  for (const item of items) {
    const parsed = ApifyHashtagPostSchema.safeParse(item);
    if (!parsed.success) {
      invalidCount++;
      if (invalidCount <= 3) {
        console.warn(`[HashtagScraper] Invalid item schema:`, parsed.error.issues[0]);
      }
      continue;
    }

    const data = parsed.data;
    const username = data.ownerUsername || data.username || '';
    if (!username) continue; // Skip items without username

    posts.push({
      ownerUsername: username,
      ownerId: data.ownerId || data.userId || '',
      id: data.id || data.postId || '',
      shortCode: data.shortCode || data.code || '',
      caption: data.caption || '',
      displayUrl: data.displayUrl || data.imageUrl || '',
      timestamp: String(data.timestamp || data.takenAtTimestamp || ''),
      likesCount: data.likesCount || data.likeCount || 0,
      commentsCount: data.commentsCount || data.commentCount || 0,
      hashtags: extractHashtags(data.caption || ''),
      locationName: data.locationName,
      locationId: data.locationId,
    });
  }

  if (invalidCount > 0) {
    console.warn(`[HashtagScraper] Skipped ${invalidCount} items with invalid schema`);
  }

  // Extract unique usernames
  const usernameSet = new Set<string>();
  posts.forEach(post => {
    if (post.ownerUsername) {
      usernameSet.add(post.ownerUsername.toLowerCase());
    }
  });
  const uniqueUsernames = Array.from(usernameSet);

  // Calculate estimated cost
  const estimatedCost = (posts.length / 1000) * COST_PER_1K_POSTS;

  console.log(`[HashtagScraper] Found ${posts.length} posts from ${uniqueUsernames.length} unique users`);
  console.log(`[HashtagScraper] Estimated cost: $${estimatedCost.toFixed(4)}`);

  return {
    posts,
    uniqueUsernames,
    totalPosts: posts.length,
    uniqueUsers: uniqueUsernames.length,
    runId: run.id,
    estimatedCost,
  };
}

/**
 * Scrape multiple hashtags in sequence
 *
 * @param hashtags - Array of hashtags to scrape
 * @param options - Common options for all hashtags
 * @param delayMs - Delay between hashtags in milliseconds (default: 5000)
 * @returns Combined results from all hashtags
 */
export async function scrapeMultipleHashtags(
  hashtags: string[],
  options: Omit<HashtagScraperOptions, 'hashtag'> = {},
  delayMs: number = 5000
): Promise<{
  results: Map<string, HashtagScraperResult>;
  allUniqueUsernames: string[];
  totalPosts: number;
  totalEstimatedCost: number;
  failedHashtags: string[];
}> {
  const results = new Map<string, HashtagScraperResult>();
  const allUsernamesSet = new Set<string>();
  const failedHashtags: string[] = [];
  let totalPosts = 0;
  let totalEstimatedCost = 0;

  for (let i = 0; i < hashtags.length; i++) {
    const hashtag = hashtags[i];

    try {
      console.log(`[HashtagScraper] Processing hashtag ${i + 1}/${hashtags.length}: #${normalizeHashtag(hashtag)}`);

      const result = await scrapeHashtag({
        ...options,
        hashtag,
      });

      results.set(normalizeHashtag(hashtag), result);
      result.uniqueUsernames.forEach(u => allUsernamesSet.add(u));
      totalPosts += result.totalPosts;
      totalEstimatedCost += result.estimatedCost;

    } catch (error) {
      console.error(`[HashtagScraper] Failed to scrape #${hashtag}:`, error);
      failedHashtags.push(hashtag);
    }

    // Delay between hashtags (except for last one)
    if (i < hashtags.length - 1) {
      console.log(`[HashtagScraper] Waiting ${delayMs}ms before next hashtag...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  console.log(`[HashtagScraper] Completed ${results.size}/${hashtags.length} hashtags`);
  console.log(`[HashtagScraper] Total: ${totalPosts} posts, ${allUsernamesSet.size} unique users`);
  console.log(`[HashtagScraper] Total estimated cost: $${totalEstimatedCost.toFixed(4)}`);

  return {
    results,
    allUniqueUsernames: Array.from(allUsernamesSet),
    totalPosts,
    totalEstimatedCost,
    failedHashtags,
  };
}

/**
 * Get cost estimate for scraping hashtags
 *
 * @param hashtags - Hashtags to scrape
 * @param postsPerHashtag - Posts per hashtag
 * @returns Estimated cost in USD
 */
export function estimateHashtagScrapingCost(
  hashtags: string[],
  postsPerHashtag: number
): number {
  const totalPosts = hashtags.length * postsPerHashtag;
  return (totalPosts / 1000) * COST_PER_1K_POSTS;
}
