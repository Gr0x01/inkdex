-- Add unique constraint to prevent duplicate posts
-- Migration created: 2025-12-29
-- Description: Prevents race conditions when multiple processes insert the same post

-- Add unique constraint on (artist_id, instagram_post_id)
-- This ensures each post can only be inserted once per artist
ALTER TABLE portfolio_images
  ADD CONSTRAINT unique_artist_post
  UNIQUE (artist_id, instagram_post_id);

-- Add comment for documentation
COMMENT ON CONSTRAINT unique_artist_post ON portfolio_images IS
  'Prevents duplicate posts from being inserted (handles race conditions during parallel processing)';
