-- Migration: Hashtag and Follower Mining Discovery Tracking
-- Description: Tables to track bulk artist discovery via Instagram hashtags and follower graphs
-- Created: 2026-01-07

-- ============================================================================
-- HASHTAG MINING RUNS
-- Tracks each hashtag scraping operation for cost tracking and resumability
-- ============================================================================

CREATE TABLE IF NOT EXISTS hashtag_mining_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Hashtag being scraped (without # prefix for consistency)
  hashtag TEXT NOT NULL,

  -- Scraping stats
  posts_scraped INTEGER DEFAULT 0,
  unique_handles_found INTEGER DEFAULT 0,

  -- Filtering stats (two-stage: bio + image)
  bio_filter_passed INTEGER DEFAULT 0,
  image_filter_passed INTEGER DEFAULT 0,
  artists_inserted INTEGER DEFAULT 0,
  artists_skipped_duplicate INTEGER DEFAULT 0,

  -- Cost tracking
  apify_cost_estimate DECIMAL(10, 4) DEFAULT 0,
  openai_cost_estimate DECIMAL(10, 4) DEFAULT 0,

  -- Apify run metadata
  apify_run_id TEXT,

  -- Status tracking
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  error_message TEXT,

  -- Timestamps
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for checking already-processed hashtags
CREATE INDEX IF NOT EXISTS idx_hashtag_mining_runs_hashtag
  ON hashtag_mining_runs(hashtag);

-- Index for status queries
CREATE INDEX IF NOT EXISTS idx_hashtag_mining_runs_status
  ON hashtag_mining_runs(status);

-- Index for cost reporting
CREATE INDEX IF NOT EXISTS idx_hashtag_mining_runs_created
  ON hashtag_mining_runs(created_at DESC);


-- ============================================================================
-- FOLLOWER MINING RUNS
-- Tracks each seed account's follower scraping operation
-- ============================================================================

CREATE TABLE IF NOT EXISTS follower_mining_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Seed account info
  seed_account TEXT NOT NULL,
  seed_type TEXT CHECK (seed_type IN ('supply_company', 'convention', 'industry', 'macro_artist')),
  seed_follower_count INTEGER, -- Follower count of seed at time of scrape

  -- Scraping stats
  followers_scraped INTEGER DEFAULT 0,

  -- Filtering stats (two-stage: bio + image)
  bio_filter_passed INTEGER DEFAULT 0,
  image_filter_passed INTEGER DEFAULT 0,
  artists_inserted INTEGER DEFAULT 0,
  artists_skipped_duplicate INTEGER DEFAULT 0,
  artists_skipped_private INTEGER DEFAULT 0,

  -- Cost tracking
  apify_cost_estimate DECIMAL(10, 4) DEFAULT 0,
  openai_cost_estimate DECIMAL(10, 4) DEFAULT 0,

  -- Apify run metadata
  apify_run_id TEXT,

  -- Status tracking
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  error_message TEXT,

  -- Timestamps
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for checking already-processed seeds
CREATE INDEX IF NOT EXISTS idx_follower_mining_runs_seed
  ON follower_mining_runs(seed_account);

-- Index for status queries
CREATE INDEX IF NOT EXISTS idx_follower_mining_runs_status
  ON follower_mining_runs(status);

-- Index for cost reporting
CREATE INDEX IF NOT EXISTS idx_follower_mining_runs_created
  ON follower_mining_runs(created_at DESC);


-- ============================================================================
-- MINING CANDIDATES (Optional: intermediate storage for batch processing)
-- Stores discovered handles before full classification
-- ============================================================================

CREATE TABLE IF NOT EXISTS mining_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Instagram handle (no @ prefix)
  instagram_handle TEXT NOT NULL,

  -- Source tracking
  source_type TEXT NOT NULL CHECK (source_type IN ('hashtag', 'follower')),
  source_id UUID NOT NULL, -- References hashtag_mining_runs or follower_mining_runs
  source_hashtag TEXT, -- For hashtag source
  source_seed TEXT, -- For follower source

  -- Profile data (fetched during classification)
  bio TEXT,
  follower_count INTEGER,
  is_private BOOLEAN DEFAULT false,

  -- Classification status
  classification_status TEXT DEFAULT 'pending' CHECK (classification_status IN ('pending', 'bio_passed', 'image_passed', 'failed', 'skipped')),
  classification_method TEXT CHECK (classification_method IN ('bio', 'image')),
  classification_confidence DECIMAL(3, 2),

  -- Location extraction
  extracted_city TEXT,
  extracted_state TEXT,
  location_confidence TEXT CHECK (location_confidence IN ('high', 'medium', 'low')),

  -- Final status
  artist_id UUID REFERENCES artists(id) ON DELETE SET NULL, -- Set after insertion
  skipped_reason TEXT, -- 'duplicate', 'private', 'failed_classification', 'no_posts'

  -- Timestamps
  discovered_at TIMESTAMPTZ DEFAULT NOW(),
  classified_at TIMESTAMPTZ,
  inserted_at TIMESTAMPTZ,

  -- Unique constraint to prevent duplicate candidates
  UNIQUE(instagram_handle, source_type, source_id)
);

-- Index for processing pending candidates
CREATE INDEX IF NOT EXISTS idx_mining_candidates_status
  ON mining_candidates(classification_status)
  WHERE classification_status = 'pending';

-- Index for deduplication checks
CREATE INDEX IF NOT EXISTS idx_mining_candidates_handle
  ON mining_candidates(instagram_handle);

-- Index for source tracking
CREATE INDEX IF NOT EXISTS idx_mining_candidates_source
  ON mining_candidates(source_type, source_id);


-- ============================================================================
-- ROW LEVEL SECURITY
-- All mining tables are service role only (script access)
-- ============================================================================

ALTER TABLE hashtag_mining_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE follower_mining_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE mining_candidates ENABLE ROW LEVEL SECURITY;

-- Service role has full access
CREATE POLICY "Service role full access to hashtag_mining_runs"
  ON hashtag_mining_runs FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to follower_mining_runs"
  ON follower_mining_runs FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to mining_candidates"
  ON mining_candidates FOR ALL
  USING (auth.role() = 'service_role');


-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get mining statistics summary
CREATE OR REPLACE FUNCTION get_mining_stats()
RETURNS TABLE (
  total_hashtags_processed INTEGER,
  total_seeds_processed INTEGER,
  total_posts_scraped BIGINT,
  total_followers_scraped BIGINT,
  total_artists_discovered INTEGER,
  total_apify_cost DECIMAL,
  total_openai_cost DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*)::INTEGER FROM hashtag_mining_runs WHERE status = 'completed'),
    (SELECT COUNT(*)::INTEGER FROM follower_mining_runs WHERE status = 'completed'),
    (SELECT COALESCE(SUM(posts_scraped), 0) FROM hashtag_mining_runs),
    (SELECT COALESCE(SUM(followers_scraped), 0) FROM follower_mining_runs),
    (SELECT COUNT(*)::INTEGER FROM artists WHERE discovery_source IN ('hashtag_mining', 'follower_mining')),
    (SELECT COALESCE(SUM(apify_cost_estimate), 0) FROM hashtag_mining_runs) +
      (SELECT COALESCE(SUM(apify_cost_estimate), 0) FROM follower_mining_runs),
    (SELECT COALESCE(SUM(openai_cost_estimate), 0) FROM hashtag_mining_runs) +
      (SELECT COALESCE(SUM(openai_cost_estimate), 0) FROM follower_mining_runs);
END;
$$;


-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE hashtag_mining_runs IS 'Tracks Instagram hashtag scraping operations for artist discovery';
COMMENT ON TABLE follower_mining_runs IS 'Tracks Instagram follower graph mining operations for artist discovery';
COMMENT ON TABLE mining_candidates IS 'Intermediate storage for discovered handles pending classification';
COMMENT ON FUNCTION get_mining_stats IS 'Returns aggregated statistics for all mining operations';
