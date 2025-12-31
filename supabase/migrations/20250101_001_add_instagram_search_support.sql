-- Migration: Add Instagram search support
-- Created: 2025-01-01
-- Description: Adds support for Instagram post/profile searches and similar artist searches

-- Add Instagram-related columns to searches table
ALTER TABLE searches
ADD COLUMN IF NOT EXISTS instagram_username TEXT,
ADD COLUMN IF NOT EXISTS instagram_post_id TEXT,
ADD COLUMN IF NOT EXISTS artist_id_source UUID REFERENCES artists(id);

-- Add index for Instagram username lookups (partial index for performance)
CREATE INDEX IF NOT EXISTS idx_searches_instagram_username
ON searches(instagram_username)
WHERE instagram_username IS NOT NULL;

-- Add index for artist_id_source lookups
CREATE INDEX IF NOT EXISTS idx_searches_artist_source
ON searches(artist_id_source)
WHERE artist_id_source IS NOT NULL;

-- Add comment explaining new columns
COMMENT ON COLUMN searches.instagram_username IS 'Username from Instagram post/profile search (for attribution)';
COMMENT ON COLUMN searches.instagram_post_id IS 'Instagram post ID from post searches (for attribution)';
COMMENT ON COLUMN searches.artist_id_source IS 'Artist ID for similar_artist searches';

-- Note: query_type column already allows TEXT values, so we don't need to alter enum
-- New valid values: 'instagram_post', 'instagram_profile', 'similar_artist'
-- These will be validated at the application layer
