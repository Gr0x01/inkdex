/**
 * Storybook Test Data Utilities
 *
 * Fetches real test users from Supabase for use in Storybook stories.
 * Uses the same test seed users created by scripts/seed/create-test-users.ts
 *
 * Benefits:
 * - Real production data and code paths
 * - No need to whitelist external image domains
 * - Single source of truth for test data
 * - Accurate visual testing
 */

import { createClient } from '@supabase/supabase-js';
import type { FeaturedArtist } from '@/lib/mock/featured-data';
import type { SearchResult } from '@/types/search';

// Use env vars (loaded by Storybook/Next.js)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[Storybook] Supabase env vars not found. Test data will use fallbacks.');
}

const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Test user Instagram handles (from seed script)
export const TEST_USERS = {
  UNCLAIMED: 'test_unclaimed_artist',  // Jamie Chen
  FREE_TIER: 'test_free_tier_artist',  // Alex Rivera
  PRO_TIER: 'test_pro_tier_artist',    // Morgan Black
} as const;

/**
 * Fetch a test user's artist data with portfolio images
 * Returns data in FeaturedArtist format for use in CompactArtistCard, etc.
 */
export async function getTestArtist(handle: string): Promise<FeaturedArtist & { city: string; state: string }> {
  if (!supabase) {
    throw new Error('Supabase client not initialized. Check env vars.');
  }

  const { data: artist, error } = await supabase
    .from('artists')
    .select(`
      id,
      name,
      slug,
      shop_name,
      bio,
      instagram_handle,
      instagram_url,
      verification_status,
      follower_count,
      is_pro,
      artist_locations!left (
        city,
        region,
        is_primary
      )
    `)
    .eq('instagram_handle', handle)
    .single();

  if (error || !artist) {
    throw new Error(`Test user not found: ${handle}. Run: npx tsx scripts/seed/create-test-users.ts`);
  }

  // Extract primary location from artist_locations (single source of truth)
  interface LocationData { city: string | null; region: string | null; is_primary: boolean }
  const locations = artist.artist_locations as LocationData[] | null;
  const primaryLoc = Array.isArray(locations)
    ? locations.find(l => l.is_primary) || locations[0]
    : null;

  // Fetch portfolio images
  const { data: images } = await supabase
    .from('portfolio_images')
    .select('id, instagram_url, storage_thumb_640, likes_count')
    .eq('artist_id', artist.id)
    .eq('hidden', false)
    .order('created_at', { ascending: false })
    .limit(10);

  const portfolioImages = (images || []).map((img) => ({
    id: img.id,
    url: img.storage_thumb_640 || img.instagram_url,
    instagram_url: img.instagram_url,
    likes_count: img.likes_count,
  }));

  return {
    id: artist.id,
    name: artist.name,
    slug: artist.slug,
    city: primaryLoc?.city || '',
    state: primaryLoc?.region || '',
    shop_name: artist.shop_name,
    instagram_handle: artist.instagram_handle || '',
    verification_status: artist.verification_status,
    follower_count: artist.follower_count,
    is_pro: artist.is_pro || false,
    portfolio_images: portfolioImages,
  };
}

/**
 * Fetch a test user as a search result
 * Returns data in SearchResult format for use in ArtistCard
 */
export async function getTestSearchResult(handle: string): Promise<SearchResult & { is_pro?: boolean }> {
  if (!supabase) {
    throw new Error('Supabase client not initialized. Check env vars.');
  }

  const { data: artist, error } = await supabase
    .from('artists')
    .select(`
      id,
      name,
      slug,
      profile_image_url,
      instagram_url,
      verification_status,
      follower_count,
      is_pro,
      is_featured,
      artist_locations!left (
        city,
        region,
        is_primary
      )
    `)
    .eq('instagram_handle', handle)
    .single();

  if (error || !artist) {
    throw new Error(`Test user not found: ${handle}. Run: npx tsx scripts/seed/create-test-users.ts`);
  }

  // Extract primary location from artist_locations (single source of truth)
  interface LocationData { city: string | null; region: string | null; is_primary: boolean }
  const locations = artist.artist_locations as LocationData[] | null;
  const primaryLoc = Array.isArray(locations)
    ? locations.find(l => l.is_primary) || locations[0]
    : null;

  // Fetch portfolio images for matching_images
  const { data: images } = await supabase
    .from('portfolio_images')
    .select('instagram_url, storage_thumb_640, likes_count')
    .eq('artist_id', artist.id)
    .eq('hidden', false)
    .order('created_at', { ascending: false })
    .limit(3);

  const matchingImages = (images || []).map((img, idx) => ({
    url: img.storage_thumb_640 || img.instagram_url,
    instagramUrl: img.instagram_url,
    similarity: 0.35 - (idx * 0.05), // Simulated similarity scores
    likes_count: img.likes_count,
  }));

  return {
    artist_id: artist.id,
    artist_name: artist.name,
    artist_slug: artist.slug,
    city: primaryLoc?.city || '',
    profile_image_url: artist.profile_image_url,
    instagram_url: artist.instagram_url || '',
    is_verified: artist.verification_status === 'verified' || artist.verification_status === 'claimed',
    is_pro: artist.is_pro || false,
    is_featured: artist.is_featured || false,
    follower_count: artist.follower_count,
    similarity: 0.35,
    matching_images: matchingImages,
  };
}

/**
 * Create mock/fallback data when Supabase isn't available
 * Useful for when stories are viewed offline or in isolated environments
 */
export const FALLBACK_ARTIST: FeaturedArtist & { city: string; state: string } = {
  id: 'fallback-1',
  name: 'Test Artist',
  slug: 'test-artist',
  city: 'Los Angeles',
  state: 'California',
  shop_name: 'Test Studio',
  instagram_handle: 'test_artist',
  verification_status: 'verified',
  follower_count: 15000,
  is_pro: false,
  portfolio_images: [
    {
      id: 'img-1',
      url: 'https://placehold.co/400x600/1a1a1a/ffffff?text=Test+Image+1',
      instagram_url: 'https://instagram.com/p/test1',
      likes_count: 500,
    },
    {
      id: 'img-2',
      url: 'https://placehold.co/400x600/1a1a1a/ffffff?text=Test+Image+2',
      instagram_url: 'https://instagram.com/p/test2',
      likes_count: 350,
    },
  ],
};

/**
 * Helper to safely fetch test data with fallback
 */
export async function getTestArtistSafe(handle: string): Promise<FeaturedArtist & { city: string; state: string }> {
  try {
    return await getTestArtist(handle);
  } catch (error) {
    console.warn(`[Storybook] Failed to fetch test user ${handle}, using fallback:`, error);
    return FALLBACK_ARTIST;
  }
}
