/**
 * ScrapingDog Instagram API Test Script
 *
 * Tests the ScrapingDog API as an alternative to Apify for Instagram scraping.
 *
 * API Endpoints:
 * - Profile: GET https://api.scrapingdog.com/instagram/profile?api_key=KEY&username=USERNAME
 * - Posts: GET https://api.scrapingdog.com/instagram/posts?api_key=KEY&id=USER_ID
 *
 * Cost: 15 credits per request
 *
 * Usage:
 *   npx tsx scripts/scraping/test-scrapingdog.ts
 *   npx tsx scripts/scraping/test-scrapingdog.ts --username inkbybat
 */

import 'dotenv/config';

const SCRAPINGDOG_API_KEY = process.env.SCRAPINGDOG_API_KEY;
const BASE_URL = 'https://api.scrapingdog.com/instagram';

interface ScrapingDogProfile {
  id: string;
  username: string;
  full_name: string;
  biography: string;
  follower_count: number;
  following_count: number;
  media_count: number;
  profile_pic_url: string;
  profile_pic_url_hd: string;
  is_private: boolean;
  is_verified: boolean;
  external_url: string | null;
}

interface ScrapingDogPost {
  id: string;
  shortcode: string;
  display_url: string;
  thumbnail_url: string;
  is_video: boolean;
  caption: string | null;
  like_count: number;
  comment_count: number;
  taken_at_timestamp: number;
}

interface ScrapingDogPostsResponse {
  posts: ScrapingDogPost[];
  next_page?: string;
  has_next_page: boolean;
}

async function fetchProfile(username: string): Promise<ScrapingDogProfile | null> {
  const url = `${BASE_URL}/profile?api_key=${SCRAPINGDOG_API_KEY}&username=${username}`;

  console.log(`\n[ScrapingDog] Fetching profile: @${username}`);
  console.log(`[ScrapingDog] URL: ${url.replace(SCRAPINGDOG_API_KEY!, '***')}`);

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      console.error(`[ScrapingDog] Error: ${response.status}`, data);
      return null;
    }

    console.log(`[ScrapingDog] Profile response:`, JSON.stringify(data, null, 2));
    return data;
  } catch (error) {
    console.error(`[ScrapingDog] Fetch error:`, error);
    return null;
  }
}

async function fetchPosts(userId: string, nextPage?: string): Promise<ScrapingDogPostsResponse | null> {
  let url = `${BASE_URL}/posts?api_key=${SCRAPINGDOG_API_KEY}&id=${userId}`;
  if (nextPage) {
    url += `&next_page=${encodeURIComponent(nextPage)}`;
  }

  console.log(`\n[ScrapingDog] Fetching posts for user ID: ${userId}`);

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      console.error(`[ScrapingDog] Error: ${response.status}`, data);
      return null;
    }

    console.log(`[ScrapingDog] Posts response (first 2):`, JSON.stringify(data.posts?.slice(0, 2), null, 2));
    console.log(`[ScrapingDog] Total posts in response: ${data.posts?.length || 0}`);
    console.log(`[ScrapingDog] Has next page: ${data.has_next_page}`);

    return data;
  } catch (error) {
    console.error(`[ScrapingDog] Fetch error:`, error);
    return null;
  }
}

async function testScrapingDog(username: string) {
  console.log('='.repeat(60));
  console.log('ScrapingDog Instagram API Test');
  console.log('='.repeat(60));

  if (!SCRAPINGDOG_API_KEY) {
    console.error('ERROR: SCRAPINGDOG_API_KEY not set in environment');
    process.exit(1);
  }

  console.log(`API Key: ${SCRAPINGDOG_API_KEY.slice(0, 8)}...`);
  console.log(`Testing with username: @${username}`);

  // Step 1: Fetch profile (15 credits)
  const profile = await fetchProfile(username);

  if (!profile) {
    console.error('\nFailed to fetch profile. Check API key and username.');
    return;
  }

  console.log('\n--- Profile Summary ---');
  console.log(`Username: @${profile.username}`);
  console.log(`Name: ${profile.full_name}`);
  console.log(`Followers: ${profile.follower_count?.toLocaleString()}`);
  console.log(`Posts: ${profile.media_count}`);
  console.log(`Private: ${profile.is_private}`);
  console.log(`Bio: ${profile.biography?.slice(0, 100)}...`);
  console.log(`User ID: ${profile.id}`);

  if (profile.is_private) {
    console.log('\nProfile is private - cannot fetch posts.');
    return;
  }

  // Step 2: Fetch posts (15 credits)
  const postsResponse = await fetchPosts(profile.id);

  if (!postsResponse || !postsResponse.posts) {
    console.error('\nFailed to fetch posts.');
    return;
  }

  console.log('\n--- Posts Summary ---');
  console.log(`Posts fetched: ${postsResponse.posts.length}`);

  // Filter to images only (skip videos)
  const imagePosts = postsResponse.posts.filter(p => !p.is_video);
  console.log(`Image posts: ${imagePosts.length}`);
  console.log(`Video posts: ${postsResponse.posts.length - imagePosts.length}`);

  if (imagePosts.length > 0) {
    console.log('\n--- Sample Image Posts ---');
    imagePosts.slice(0, 3).forEach((post, i) => {
      console.log(`\n[${i + 1}] Shortcode: ${post.shortcode}`);
      console.log(`    Likes: ${post.like_count?.toLocaleString()}`);
      console.log(`    Caption: ${post.caption?.slice(0, 50) || '(none)'}...`);
      console.log(`    Display URL: ${post.display_url?.slice(0, 80)}...`);
    });
  }

  // Cost summary
  console.log('\n--- Cost Summary ---');
  console.log(`Profile request: 15 credits`);
  console.log(`Posts request: 15 credits`);
  console.log(`Total used: 30 credits`);
  console.log(`\nFor 16k artists (profile + 1 page posts each):`);
  console.log(`  Credits needed: ${(16000 * 30).toLocaleString()} credits`);
  console.log(`  Standard plan (1M credits): $90 → covers ~33k artists`);

  // Data structure comparison
  console.log('\n--- Data Structure Comparison ---');
  console.log('ScrapingDog provides:');
  console.log('  ✓ Profile: id, username, full_name, biography, follower_count, profile_pic_url_hd');
  console.log('  ✓ Posts: shortcode, display_url, caption, like_count, taken_at_timestamp');
  console.log('  ✓ Pagination: next_page token for more posts');
  console.log('\nMatches Apify data structure - easy migration!');
}

// Parse CLI args
const args = process.argv.slice(2);
let username = 'inkbybat'; // Default test account

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--username' && args[i + 1]) {
    username = args[i + 1];
  }
}

testScrapingDog(username);
