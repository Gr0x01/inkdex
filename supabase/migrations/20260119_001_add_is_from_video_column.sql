-- Add column to track images sourced from video/Reel thumbnails
-- This enables indexing artists who primarily post Reels by using Instagram's
-- auto-generated video thumbnails as portfolio images.

ALTER TABLE portfolio_images
ADD COLUMN IF NOT EXISTS is_from_video BOOLEAN DEFAULT false;

COMMENT ON COLUMN portfolio_images.is_from_video IS
  'True if this image was extracted from a video/Reel thumbnail, false for regular image posts';
