/**
 * ScrapingDog Batch Test Script
 *
 * Tests the ScrapingDog client with multiple profiles to verify:
 * 1. Consistency across different account types
 * 2. Error handling for private/deleted accounts
 * 3. Cost tracking
 *
 * Usage:
 *   npx tsx scripts/scraping/test-scrapingdog-batch.ts
 */

import 'dotenv/config';
import { fetchProfileWithScrapingDog } from '../../lib/instagram/scrapingdog-client';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface TestResult {
  username: string;
  success: boolean;
  posts?: number;
  followers?: number;
  error?: string;
  timeMs: number;
}

async function testProfile(username: string): Promise<TestResult> {
  const start = Date.now();

  try {
    const profile = await fetchProfileWithScrapingDog(username);
    return {
      username,
      success: true,
      posts: profile.posts.length,
      followers: profile.followerCount,
      timeMs: Date.now() - start,
    };
  } catch (error) {
    return {
      username,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timeMs: Date.now() - start,
    };
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('ScrapingDog Batch Test');
  console.log('='.repeat(60));

  // Get 10 random artists from DB
  const { data: artists, error } = await supabase
    .from('artists')
    .select('instagram_handle')
    .not('instagram_handle', 'is', null)
    .limit(10);

  if (error || !artists) {
    console.error('Failed to fetch artists:', error);
    return;
  }

  const usernames = artists.map(a => a.instagram_handle).filter(Boolean) as string[];

  console.log(`\nTesting ${usernames.length} profiles...\n`);

  const results: TestResult[] = [];

  for (const username of usernames) {
    const result = await testProfile(username);
    results.push(result);

    const status = result.success ? '✓' : '✗';
    const info = result.success
      ? `${result.posts} posts, ${result.followers?.toLocaleString()} followers`
      : result.error;

    console.log(`${status} @${username.padEnd(25)} ${result.timeMs}ms - ${info}`);

    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 500));
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('Summary');
  console.log('='.repeat(60));

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`\nSuccess: ${successful.length}/${results.length}`);
  console.log(`Failed: ${failed.length}/${results.length}`);

  if (successful.length > 0) {
    const avgPosts = successful.reduce((sum, r) => sum + (r.posts || 0), 0) / successful.length;
    const avgTime = successful.reduce((sum, r) => sum + r.timeMs, 0) / successful.length;
    console.log(`\nAvg posts per profile: ${avgPosts.toFixed(1)}`);
    console.log(`Avg response time: ${avgTime.toFixed(0)}ms`);
  }

  if (failed.length > 0) {
    console.log('\nFailed profiles:');
    failed.forEach(r => console.log(`  - @${r.username}: ${r.error}`));
  }

  // Cost estimate
  const creditsUsed = results.length * 15;
  console.log(`\nCredits used: ${creditsUsed}`);
  console.log(`Estimated cost: $${((creditsUsed / 1000000) * 90).toFixed(4)} (Standard plan)`);
}

main().catch(console.error);
