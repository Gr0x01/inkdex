-- Update portfolio_images table to use Supabase Storage instead of R2
-- Migration created: 2025-12-29
-- Description: Replace R2 storage path columns with Supabase Storage path columns

-- Remove R2 columns (these were never used since we switched to Supabase Storage)
ALTER TABLE portfolio_images
  DROP COLUMN IF EXISTS r2_original_path,
  DROP COLUMN IF EXISTS r2_thumbnail_small,
  DROP COLUMN IF EXISTS r2_thumbnail_medium,
  DROP COLUMN IF EXISTS r2_thumbnail_large;

-- Add Supabase Storage columns
-- Path format: "portfolio/original/{artist_id}/{post_id}.jpg"
-- Public URLs will be: https://{project}.supabase.co/storage/v1/object/public/portfolio-images/{path}
ALTER TABLE portfolio_images
  ADD COLUMN storage_original_path TEXT,      -- Original image (JPEG/PNG)
  ADD COLUMN storage_thumb_320 TEXT,          -- 320w thumbnail (WebP)
  ADD COLUMN storage_thumb_640 TEXT,          -- 640w thumbnail (WebP)
  ADD COLUMN storage_thumb_1280 TEXT;         -- 1280w thumbnail (WebP)

-- Add comment for documentation
COMMENT ON COLUMN portfolio_images.storage_original_path IS 'Supabase Storage path for original image (e.g., portfolio/original/{artist_id}/{post_id}.jpg)';
COMMENT ON COLUMN portfolio_images.storage_thumb_320 IS 'Supabase Storage path for 320w WebP thumbnail';
COMMENT ON COLUMN portfolio_images.storage_thumb_640 IS 'Supabase Storage path for 640w WebP thumbnail';
COMMENT ON COLUMN portfolio_images.storage_thumb_1280 IS 'Supabase Storage path for 1280w WebP thumbnail';
