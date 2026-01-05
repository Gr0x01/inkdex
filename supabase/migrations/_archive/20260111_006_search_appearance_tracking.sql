-- ============================================================================
-- Phase 14: Search Appearance Detail Tracking
-- Created: 2026-01-11
-- Migration: 20260111_006_search_appearance_tracking.sql
-- ============================================================================
-- This migration adds individual search appearance tracking for the analytics
-- dashboard. It creates a new table to store detailed search appearance records
-- and RPC functions to insert both individual records and aggregate counts.
-- ============================================================================

-- ============================================================================
-- 1. CREATE TABLE: search_appearances
-- ============================================================================

CREATE TABLE IF NOT EXISTS search_appearances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
  search_id UUID NOT NULL REFERENCES searches (id) ON DELETE CASCADE,
  artist_id UUID NOT NULL REFERENCES artists (id) ON DELETE CASCADE,
  rank_position INTEGER NOT NULL,
  similarity_score FLOAT NOT NULL,
  boosted_score FLOAT NOT NULL,
  matching_images_count INTEGER NOT NULL DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT NOW () NOT NULL,

  CONSTRAINT check_rank_positive CHECK (rank_position > 0),
  CONSTRAINT check_similarity_valid CHECK (similarity_score >= 0 AND similarity_score <= 1),
  CONSTRAINT check_boosted_valid CHECK (boosted_score >= 0 AND boosted_score <= 1.1),
  CONSTRAINT check_images_count_positive CHECK (matching_images_count > 0)
);

-- ============================================================================
-- 2. CREATE INDEXES
-- ============================================================================

-- Primary: Get recent appearances for an artist
CREATE INDEX idx_search_appearances_artist_time
  ON search_appearances (artist_id, created_at DESC);

-- Secondary: Link search to appearances
CREATE INDEX idx_search_appearances_search
  ON search_appearances (search_id);

-- ============================================================================
-- 3. ROW LEVEL SECURITY POLICIES
-- ============================================================================

ALTER TABLE search_appearances ENABLE ROW LEVEL SECURITY;

-- Artists can read their own search appearances
CREATE POLICY "Artists can read own search appearances"
  ON search_appearances FOR SELECT
  USING (
    artist_id IN (
      SELECT id FROM artists WHERE claimed_by_user_id = auth.uid()
    )
  );

-- Service role has full access for tracking operations
CREATE POLICY "Service role full access to search appearances"
  ON search_appearances FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- 4. RPC FUNCTION: track_search_appearances_with_details
-- ============================================================================

CREATE OR REPLACE FUNCTION track_search_appearances_with_details(
  p_search_id UUID,
  p_appearances JSONB  -- Array of {artist_id, rank, similarity, boosted_score, image_count}
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_appearance JSONB;
  v_artist_id UUID;
BEGIN
  -- Loop through each appearance and insert individual record
  FOR v_appearance IN
    SELECT *
    FROM jsonb_array_elements (p_appearances)
  LOOP
    v_artist_id := (v_appearance->>'artist_id')::UUID;

    -- Insert individual search appearance record
    INSERT INTO search_appearances (
      search_id,
      artist_id,
      rank_position,
      similarity_score,
      boosted_score,
      matching_images_count,
      created_at
    ) VALUES (
      p_search_id,
      v_artist_id,
      (v_appearance->>'rank')::INTEGER,
      (v_appearance->>'similarity')::FLOAT,
      (v_appearance->>'boosted_score')::FLOAT,
      COALESCE ((v_appearance->>'image_count')::INTEGER, 3),
      NOW ()
    );

    -- Also increment daily aggregate count (existing behavior)
    INSERT INTO artist_analytics (artist_id, date, search_appearances)
    VALUES (v_artist_id, CURRENT_DATE, 1)
    ON CONFLICT (artist_id, date)
    DO UPDATE SET search_appearances = artist_analytics.search_appearances + 1;
  END LOOP;
END;
$$;

-- ============================================================================
-- 5. RPC FUNCTION: get_recent_search_appearances
-- ============================================================================

CREATE OR REPLACE FUNCTION get_recent_search_appearances (
  p_artist_id UUID,
  p_days INTEGER,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  sa_search_id UUID,
  sa_rank_position INTEGER,
  sa_similarity_score FLOAT,
  sa_boosted_score FLOAT,
  sa_created_at TIMESTAMPTZ,
  s_query_type TEXT,
  s_query_text TEXT,
  s_instagram_username TEXT
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  WITH recent_appearances AS (
    -- ra_ prefix for CTE columns
    SELECT
      sa.search_id AS ra_search_id,
      sa.rank_position AS ra_rank_position,
      sa.similarity_score AS ra_similarity_score,
      sa.boosted_score AS ra_boosted_score,
      sa.created_at AS ra_created_at
    FROM search_appearances sa
    WHERE
      sa.artist_id = p_artist_id
      AND (p_days IS NULL OR sa.created_at >= NOW () - (p_days || ' days')::INTERVAL)
    ORDER BY sa.created_at DESC
    LIMIT p_limit
  )
  SELECT
    ra.ra_search_id,
    ra.ra_rank_position,
    ra.ra_similarity_score,
    ra.ra_boosted_score,
    ra.ra_created_at,
    s.query_type,
    s.query_text,
    s.instagram_username
  FROM recent_appearances ra
  INNER JOIN searches s ON s.id = ra.ra_search_id
  ORDER BY ra.ra_created_at DESC;
END;
$$;

-- ============================================================================
-- 6. COMMENTS
-- ============================================================================

COMMENT ON TABLE search_appearances IS 'Individual search appearance records for Pro artist analytics';
COMMENT ON COLUMN search_appearances.rank_position IS 'Position in search results (1 = first)';
COMMENT ON COLUMN search_appearances.similarity_score IS 'Raw CLIP similarity score (0-1)';
COMMENT ON COLUMN search_appearances.boosted_score IS 'Score with Pro/Featured boosts applied (max 1.07 with both boosts)';
COMMENT ON COLUMN search_appearances.matching_images_count IS 'Number of matching images for this artist (default 3)';

COMMENT ON FUNCTION track_search_appearances_with_details IS 'Track individual search appearances + daily aggregate counts';
COMMENT ON FUNCTION get_recent_search_appearances IS 'Get recent search appearances for artist with query details';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- New table: search_appearances (with RLS policies and indexes)
-- New function: track_search_appearances_with_details(search_id, appearances)
-- New function: get_recent_search_appearances(artist_id, days, limit)
--
-- Next steps:
-- 1. Run migration: npm run db:push
-- 2. Regenerate TypeScript types: npx supabase gen types typescript --local
-- 3. Update app/search/page.tsx tracking logic
-- 4. Update lib/analytics/queries.ts with new helper
-- 5. Update app/api/analytics/[artistId]/route.ts API
-- 6. Create components/analytics/RecentSearchesTable.tsx component
-- 7. Update components/analytics/AnalyticsDashboard.tsx integration
-- ============================================================================
