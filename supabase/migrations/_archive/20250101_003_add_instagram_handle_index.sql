-- Migration: Add instagram_handle index for profile searches
-- Purpose: Optimize getArtistByInstagramHandle() queries for Phase 2 Instagram profile support
-- Created: 2025-01-01
-- Phase: Instagram Profile Link Support (Phase 2)

-- Add partial index on instagram_handle for faster lookups
-- Only index non-null handles since null values won't be queried
CREATE INDEX IF NOT EXISTS idx_artists_instagram_handle
ON artists(instagram_handle)
WHERE instagram_handle IS NOT NULL;

-- Comment explaining the index purpose
COMMENT ON INDEX idx_artists_instagram_handle IS
'Optimizes Instagram profile searches by handle. Used for instant search when profile already exists in DB (30% hit rate).';
