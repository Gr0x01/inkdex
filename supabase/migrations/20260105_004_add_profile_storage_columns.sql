-- Add storage columns for profile images
-- These mirror the portfolio_images storage pattern but for artist profile photos

ALTER TABLE artists
ADD COLUMN IF NOT EXISTS profile_storage_path text,
ADD COLUMN IF NOT EXISTS profile_storage_thumb_320 text,
ADD COLUMN IF NOT EXISTS profile_storage_thumb_640 text;

-- Add comment explaining the columns
COMMENT ON COLUMN artists.profile_storage_path IS 'Supabase Storage path to original profile image (e.g., profiles/original/{artist_id}.jpg)';
COMMENT ON COLUMN artists.profile_storage_thumb_320 IS 'Supabase Storage path to 320px WebP thumbnail';
COMMENT ON COLUMN artists.profile_storage_thumb_640 IS 'Supabase Storage path to 640px WebP thumbnail';

-- Note: profile_image_url is kept as legacy fallback for artists not yet migrated
