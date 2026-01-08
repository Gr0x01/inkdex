-- ============================================
-- Color Analysis Migration
-- Adds color classification for portfolio images
-- Enables color-based search ranking
-- ============================================

-- Add is_color column to portfolio_images
ALTER TABLE portfolio_images
ADD COLUMN IF NOT EXISTS is_color BOOLEAN DEFAULT NULL;

-- Index for filtering by color
CREATE INDEX IF NOT EXISTS idx_portfolio_images_is_color
ON portfolio_images (is_color) WHERE is_color IS NOT NULL;

-- Create artist_color_profiles table for aggregated color data
CREATE TABLE IF NOT EXISTS artist_color_profiles (
  artist_id UUID PRIMARY KEY REFERENCES artists (id) ON DELETE CASCADE,
  color_percentage FLOAT NOT NULL CHECK (color_percentage >= 0 AND color_percentage <= 1),
  color_image_count INT NOT NULL DEFAULT 0,
  bw_image_count INT NOT NULL DEFAULT 0,
  total_image_count INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for filtering artists by color preference
CREATE INDEX IF NOT EXISTS idx_artist_color_profiles_percentage
ON artist_color_profiles (color_percentage);

-- Add is_color to searches table for query image color
ALTER TABLE searches
ADD COLUMN IF NOT EXISTS is_color BOOLEAN DEFAULT NULL;

-- Comments
COMMENT ON COLUMN portfolio_images.is_color IS
  'True if image is colorful, False if black-and-gray. Determined by saturation analysis.';

COMMENT ON TABLE artist_color_profiles IS
  'Aggregated color profile per artist. color_percentage = color_image_count / total_image_count';

COMMENT ON COLUMN searches.is_color IS
  'True if query image is colorful, False if black-and-gray. Used for color-matched search ranking.';
