-- ============================================================================
-- Phase 13: Artist Analytics - Image View Tracking
-- Created: 2026-01-09
-- ============================================================================
-- This migration adds per-image view tracking infrastructure for the analytics
-- dashboard. It creates a new table to track individual image views and an
-- RPC function to increment both image-level and artist-level view counts.
-- ============================================================================

-- ============================================================================
-- 1. CREATE PORTFOLIO_IMAGE_ANALYTICS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS portfolio_image_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_id UUID NOT NULL REFERENCES portfolio_images(id) ON DELETE CASCADE,
  artist_id UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  view_count INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT unique_image_date UNIQUE(image_id, date),
  CONSTRAINT check_view_count_non_negative CHECK (view_count >= 0)
);

-- Indexes for efficient queries
CREATE INDEX idx_image_analytics_image_date
  ON portfolio_image_analytics(image_id, date DESC);

CREATE INDEX idx_image_analytics_artist_date
  ON portfolio_image_analytics(artist_id, date DESC);

COMMENT ON TABLE portfolio_image_analytics IS 'Per-image view tracking for Pro artist analytics dashboard';
COMMENT ON COLUMN portfolio_image_analytics.view_count IS 'Number of times this image was viewed on this date';

-- ============================================================================
-- 2. ROW LEVEL SECURITY POLICIES
-- ============================================================================

ALTER TABLE portfolio_image_analytics ENABLE ROW LEVEL SECURITY;

-- Artists can read their own image analytics
CREATE POLICY "Artists can read own image analytics"
  ON portfolio_image_analytics FOR SELECT
  USING (
    artist_id IN (
      SELECT id FROM artists WHERE claimed_by_user_id = auth.uid()
    )
  );

-- Service role has full access for tracking operations
CREATE POLICY "Service role full access to image analytics"
  ON portfolio_image_analytics FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- 3. INCREMENT_IMAGE_VIEW RPC FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION increment_image_view(p_image_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_artist_id UUID;
BEGIN
  -- Get artist_id from portfolio_images table
  SELECT artist_id INTO v_artist_id
  FROM portfolio_images
  WHERE id = p_image_id;

  -- Raise exception if image not found
  IF v_artist_id IS NULL THEN
    RAISE EXCEPTION 'Image not found: %', p_image_id;
  END IF;

  -- Increment image-level view count (portfolio_image_analytics)
  -- Use ON CONFLICT for atomic upsert operation
  INSERT INTO portfolio_image_analytics (image_id, artist_id, date, view_count)
  VALUES (p_image_id, v_artist_id, CURRENT_DATE, 1)
  ON CONFLICT (image_id, date)
  DO UPDATE SET
    view_count = portfolio_image_analytics.view_count + 1;

  -- Also increment artist-level image_views aggregate (artist_analytics)
  -- This provides a total count across all images for the artist
  INSERT INTO artist_analytics (artist_id, date, image_views)
  VALUES (v_artist_id, CURRENT_DATE, 1)
  ON CONFLICT (artist_id, date)
  DO UPDATE SET
    image_views = artist_analytics.image_views + 1;

END;
$$;

COMMENT ON FUNCTION increment_image_view IS 'Increment view count for a specific image (both image-level and artist-level aggregates)';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- New table: portfolio_image_analytics (with RLS policies and indexes)
-- New function: increment_image_view(p_image_id UUID)
--
-- Next steps:
-- 1. Regenerate TypeScript types: npx supabase gen types typescript --local
-- 2. Create analytics query helpers in lib/analytics/queries.ts
-- 3. Create tracking API endpoints in app/api/analytics/
-- ============================================================================
