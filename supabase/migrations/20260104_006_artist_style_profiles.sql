-- ============================================
-- Artist Style Profiles
-- Aggregated style breakdown per artist
-- Computed from image_style_tags
-- ============================================

CREATE TABLE IF NOT EXISTS artist_style_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  style_name TEXT NOT NULL,
  percentage FLOAT NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
  image_count INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(artist_id, style_name)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_artist_style_profiles_artist ON artist_style_profiles(artist_id);
CREATE INDEX IF NOT EXISTS idx_artist_style_profiles_style ON artist_style_profiles(style_name);
CREATE INDEX IF NOT EXISTS idx_artist_style_profiles_percentage ON artist_style_profiles(style_name, percentage DESC);

-- Comments
COMMENT ON TABLE artist_style_profiles IS 'Aggregated style breakdown per artist, computed from image_style_tags';
COMMENT ON COLUMN artist_style_profiles.percentage IS 'Percentage of artist portfolio in this style (0-100)';
COMMENT ON COLUMN artist_style_profiles.image_count IS 'Number of images tagged with this style';

-- RLS (public read - style data is shown on public profiles)
ALTER TABLE artist_style_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "artist_style_profiles_select"
ON artist_style_profiles FOR SELECT
TO authenticated, anon
USING (true);
