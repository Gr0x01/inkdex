-- Production Readiness Audit Fixes
-- Date: 2026-01-05
-- Addresses security and performance issues identified during production audit

-- ============================================
-- 1. Add RLS to scraping_jobs (CRITICAL)
-- Risk: Scraping status, error messages, artist job history visible to public
-- ============================================
ALTER TABLE scraping_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to scraping_jobs"
  ON scraping_jobs
  FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- 2. Fix pipeline_runs RLS (CRITICAL)
-- Risk: Current policy uses USING (true) which allows ALL roles access
-- ============================================
DROP POLICY IF EXISTS "Service role full access to pipeline_runs" ON pipeline_runs;

CREATE POLICY "Service role full access to pipeline_runs"
  ON pipeline_runs
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================
-- 3. Add RLS to image_style_tags (MEDIUM)
-- Risk: Style confidence data publicly writable without RLS
-- ============================================
ALTER TABLE image_style_tags ENABLE ROW LEVEL SECURITY;

-- Allow public read access (style tags are derived/non-sensitive data)
CREATE POLICY "Public read image style tags"
  ON image_style_tags
  FOR SELECT
  USING (true);

-- Only service role can insert/update/delete
CREATE POLICY "Service role manage style tags"
  ON image_style_tags
  FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- 4. Add missing index on artist_locations.artist_id (PERFORMANCE)
-- Impact: Used in JOINs throughout search functions
-- ============================================
CREATE INDEX IF NOT EXISTS idx_artist_locations_artist_id
  ON artist_locations(artist_id);

-- ============================================
-- Comments for documentation
-- ============================================
COMMENT ON POLICY "Service role full access to scraping_jobs" ON scraping_jobs
  IS 'Only service role can access scraping job data (admin operations only)';

COMMENT ON POLICY "Service role full access to pipeline_runs" ON pipeline_runs
  IS 'Only service role can access pipeline run data (admin operations only)';

COMMENT ON POLICY "Public read image style tags" ON image_style_tags
  IS 'Style tags are derived data from CLIP embeddings - safe for public read';

COMMENT ON POLICY "Service role manage style tags" ON image_style_tags
  IS 'Only service role can modify style tags (batch processing scripts)';
