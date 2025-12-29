/**
 * Instagram Profile Validator
 *
 * Validates discovered Instagram handles:
 * 1. Checks if profile exists and is public
 * 2. Extracts Instagram user ID (for OAuth matching)
 * 3. Extracts profile data (bio, follower count, profile image)
 * 4. Updates artists table with validation results
 *
 * Note: Uses public Instagram endpoints (no API key required)
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../types/database.types';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ============================================================================
// Types
// ============================================================================

interface InstagramProfile {
  exists: boolean;
  isPrivate: boolean;
  userId?: string;
  username?: string;
  fullName?: string;
  biography?: string;
  followerCount?: number;
  followingCount?: number;
  postCount?: number;
  profilePicUrl?: string;
  externalUrl?: string;
}

// ============================================================================
// Instagram Profile Fetching
// ============================================================================

async function fetchInstagramProfile(handle: string): Promise<InstagramProfile> {
  try {
    // Method 1: Try public Instagram profile page
    // Instagram embeds profile data in the page HTML as JSON
    const response = await axios.get(`https://www.instagram.com/${handle}/`, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
      timeout: 10000,
    });

    // Extract JSON data from script tag
    const scriptMatch = response.data.match(
      /<script type="application\/ld\+json">(.*?)<\/script>/s
    );

    if (scriptMatch) {
      const jsonData = JSON.parse(scriptMatch[1]);

      // Instagram LD+JSON structure
      if (jsonData['@type'] === 'ProfilePage') {
        const mainEntity = jsonData.mainEntity || {};

        return {
          exists: true,
          isPrivate: mainEntity.interactionStatistic === undefined, // Private accounts don't expose stats
          username: mainEntity.alternateName?.replace('@', ''),
          fullName: mainEntity.name,
          biography: mainEntity.description,
          followerCount: extractStatValue(mainEntity.interactionStatistic, 'FollowAction'),
          followingCount: extractStatValue(mainEntity.interactionStatistic, 'SubscribeAction'),
          profilePicUrl: mainEntity.image,
          externalUrl: mainEntity.url,
        };
      }
    }

    // Fallback: Try to extract from shared data
    const sharedDataMatch = response.data.match(/window\._sharedData = ({.*?});/);
    if (sharedDataMatch) {
      const sharedData = JSON.parse(sharedDataMatch[1]);
      const userData = sharedData?.entry_data?.ProfilePage?.[0]?.graphql?.user;

      if (userData) {
        return {
          exists: true,
          isPrivate: userData.is_private,
          userId: userData.id,
          username: userData.username,
          fullName: userData.full_name,
          biography: userData.biography,
          followerCount: userData.edge_followed_by?.count,
          followingCount: userData.edge_follow?.count,
          postCount: userData.edge_owner_to_timeline_media?.count,
          profilePicUrl: userData.profile_pic_url_hd || userData.profile_pic_url,
          externalUrl: userData.external_url,
        };
      }
    }

    // If we got here, profile exists but we couldn't extract data
    return {
      exists: true,
      isPrivate: true, // Assume private if we can't extract data
    };
  } catch (error: any) {
    if (error.response?.status === 404) {
      return { exists: false, isPrivate: false };
    }

    console.error(`   ⚠️  Error fetching @${handle}: ${error.message}`);
    return { exists: false, isPrivate: false };
  }
}

function extractStatValue(
  stats: any[] | undefined,
  type: string
): number | undefined {
  if (!stats) return undefined;
  const stat = stats.find((s) => s['@type'] === type);
  return stat?.userInteractionCount;
}

// ============================================================================
// Database Updates
// ============================================================================

async function validateAndUpdateArtist(artistId: string, handle: string) {
  console.log(`   Validating @${handle}...`);

  const profile = await fetchInstagramProfile(handle);

  if (!profile.exists) {
    console.log(`      ❌ Profile not found`);
    // Mark as invalid or delete
    await supabase.from('artists').delete().eq('id', artistId);
    return { status: 'deleted', reason: 'not_found' };
  }

  if (profile.isPrivate) {
    console.log(`      🔒 Private account (will skip scraping)`);
  } else {
    console.log(`      ✅ Public account - ${profile.followerCount || 'N/A'} followers`);
  }

  // Update artist record
  const { error } = await supabase
    .from('artists')
    .update({
      instagram_private: profile.isPrivate,
      instagram_id: profile.userId,
      bio: profile.biography,
      follower_count: profile.followerCount,
      profile_image_url: profile.profilePicUrl,
      website_url: profile.externalUrl,
    })
    .eq('id', artistId);

  if (error) {
    console.error(`      ❌ Error updating: ${error.message}`);
    return { status: 'error', reason: error.message };
  }

  return {
    status: 'validated',
    isPrivate: profile.isPrivate,
    followerCount: profile.followerCount,
  };
}

// ============================================================================
// Main Validation
// ============================================================================

async function validateAllArtists() {
  console.log('🔍 Instagram Profile Validation\n');
  console.log('='.repeat(60));

  // Fetch all unvalidated artists
  const { data: artists, error } = await supabase
    .from('artists')
    .select('id, instagram_handle, name')
    .is('instagram_id', null) // Only validate if we haven't extracted ID yet
    .order('created_at', { ascending: true });

  if (error) {
    console.error('❌ Error fetching artists:', error.message);
    return;
  }

  if (!artists || artists.length === 0) {
    console.log('✅ No artists to validate');
    return;
  }

  console.log(`\nFound ${artists.length} artists to validate\n`);

  const stats = {
    validated: 0,
    deleted: 0,
    private: 0,
    public: 0,
    errors: 0,
  };

  for (const artist of artists) {
    const result = await validateAndUpdateArtist(
      artist.id,
      artist.instagram_handle
    );

    switch (result.status) {
      case 'validated':
        stats.validated++;
        if (result.isPrivate) {
          stats.private++;
        } else {
          stats.public++;
        }
        break;
      case 'deleted':
        stats.deleted++;
        break;
      case 'error':
        stats.errors++;
        break;
    }

    // Rate limiting - be gentle with Instagram
    await sleep(2000); // 2 seconds between requests
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ VALIDATION COMPLETE');
  console.log('='.repeat(60));
  console.log(`Total processed: ${artists.length}`);
  console.log(`Validated: ${stats.validated}`);
  console.log(`  - Public: ${stats.public}`);
  console.log(`  - Private: ${stats.private}`);
  console.log(`Deleted (not found): ${stats.deleted}`);
  console.log(`Errors: ${stats.errors}`);
  console.log(
    `\n💡 Next: Scrape Instagram posts for ${stats.public} public accounts`
  );
}

// ============================================================================
// Utilities
// ============================================================================

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================================
// Run
// ============================================================================

validateAllArtists().catch(console.error);
