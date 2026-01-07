-- ============================================================================
-- COUNTRY EDITORIAL CONTENT TABLE
-- ============================================================================
-- Stores auto-generated SEO editorial content for country browse pages.
-- Content is generated via cron when new countries reach artist threshold.
-- ============================================================================

-- Create the country_editorial_content table
CREATE TABLE IF NOT EXISTS country_editorial_content (
  country_code CHAR(2) PRIMARY KEY,
  hero_text TEXT NOT NULL,
  scene_heading TEXT,
  scene_text TEXT NOT NULL,
  tips_heading TEXT,
  tips_text TEXT NOT NULL,
  keywords TEXT[] DEFAULT '{}',
  major_cities TEXT[] DEFAULT '{}',
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  generated_by TEXT DEFAULT 'cron'
);

-- Add comment for documentation
COMMENT ON TABLE country_editorial_content IS
  'Auto-generated SEO editorial content for country browse pages. Simpler than city content (~300 words).';

COMMENT ON COLUMN country_editorial_content.country_code IS
  'ISO 3166-1 alpha-2 country code (e.g., MX, CA, JP)';
COMMENT ON COLUMN country_editorial_content.hero_text IS
  'Hero introduction paragraph about the country''s tattoo culture (80-100 words)';
COMMENT ON COLUMN country_editorial_content.scene_heading IS
  'Optional heading for the scene section';
COMMENT ON COLUMN country_editorial_content.scene_text IS
  'Scene overview paragraph: major cities, style preferences, influences (100-120 words)';
COMMENT ON COLUMN country_editorial_content.tips_heading IS
  'Optional heading for the tips section';
COMMENT ON COLUMN country_editorial_content.tips_text IS
  'Practical searching tips paragraph (60-80 words)';
COMMENT ON COLUMN country_editorial_content.keywords IS
  'SEO keywords for this country';
COMMENT ON COLUMN country_editorial_content.major_cities IS
  'Major tattoo cities in this country';
COMMENT ON COLUMN country_editorial_content.generated_at IS
  'Timestamp when content was generated';
COMMENT ON COLUMN country_editorial_content.generated_by IS
  'Source of generation: cron, manual, or script name';

-- Enable RLS with public read access
ALTER TABLE country_editorial_content ENABLE ROW LEVEL SECURITY;

-- Public can read country content
CREATE POLICY "Country content is publicly readable"
  ON country_editorial_content
  FOR SELECT
  USING (true);

-- Only service role can insert/update (via cron or admin)
CREATE POLICY "Service role can manage country content"
  ON country_editorial_content
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Index for quick lookups (though PK already indexed)
CREATE INDEX IF NOT EXISTS idx_country_content_generated_at
  ON country_editorial_content(generated_at DESC);
