-- ============================================================================
-- Phase 4: Extract pipeline state from artists table
-- ============================================================================
-- Creates artist_pipeline_state table and migrates existing data.
-- Used by Python scraping scripts for tracking scrape/embed progress.
-- The artists table pipeline columns will be dropped in Phase 5.
-- ============================================================================

-- Create the new pipeline state table
CREATE TABLE IF NOT EXISTS artist_pipeline_state (
  artist_id UUID PRIMARY KEY REFERENCES artists(id) ON DELETE CASCADE,

  -- Scraping state
  pipeline_status TEXT DEFAULT 'pending',  -- pending, scraping, scraped, embedding, complete, failed
  last_scraped_at TIMESTAMPTZ,
  scrape_priority INTEGER DEFAULT 0,       -- Higher = more urgent

  -- Blacklist controls
  scraping_blacklisted BOOLEAN DEFAULT FALSE,
  exclude_from_scraping BOOLEAN DEFAULT FALSE,
  blacklist_reason TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for scraper queries
CREATE INDEX IF NOT EXISTS idx_pipeline_status
ON artist_pipeline_state(pipeline_status);

CREATE INDEX IF NOT EXISTS idx_pipeline_last_scraped
ON artist_pipeline_state(last_scraped_at);

CREATE INDEX IF NOT EXISTS idx_pipeline_priority
ON artist_pipeline_state(scrape_priority DESC)
WHERE pipeline_status IN ('pending', 'failed');

CREATE INDEX IF NOT EXISTS idx_pipeline_not_blacklisted
ON artist_pipeline_state(artist_id)
WHERE scraping_blacklisted = FALSE AND exclude_from_scraping = FALSE;

-- Migrate existing data from artists table
INSERT INTO artist_pipeline_state (
  artist_id,
  pipeline_status,
  last_scraped_at,
  scraping_blacklisted,
  exclude_from_scraping,
  blacklist_reason,
  created_at,
  updated_at
)
SELECT
  id,
  COALESCE(pipeline_status, 'pending'),
  last_scraped_at,
  COALESCE(scraping_blacklisted, FALSE),
  COALESCE(exclude_from_scraping, FALSE),
  blacklist_reason,
  COALESCE(created_at, NOW()),
  NOW()
FROM artists
WHERE pipeline_status IS NOT NULL
   OR last_scraped_at IS NOT NULL
   OR scraping_blacklisted = TRUE
   OR exclude_from_scraping = TRUE
ON CONFLICT (artist_id) DO UPDATE SET
  pipeline_status = EXCLUDED.pipeline_status,
  last_scraped_at = EXCLUDED.last_scraped_at,
  scraping_blacklisted = EXCLUDED.scraping_blacklisted,
  exclude_from_scraping = EXCLUDED.exclude_from_scraping,
  blacklist_reason = EXCLUDED.blacklist_reason,
  updated_at = NOW();

-- RLS policies (service role only - Python scripts use service key)
ALTER TABLE artist_pipeline_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access"
ON artist_pipeline_state FOR ALL
USING (auth.role() = 'service_role');

-- Authenticated users can read their own artist's pipeline state
CREATE POLICY "Artist owners can view pipeline state"
ON artist_pipeline_state FOR SELECT
USING (
  artist_id IN (
    SELECT id FROM artists WHERE claimed_by_user_id = auth.uid()
  )
);

COMMENT ON TABLE artist_pipeline_state IS
  'Stores scraping/embedding pipeline state. Used by Python scripts. Extracted from artists table.';
