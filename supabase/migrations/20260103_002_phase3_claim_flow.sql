-- ============================================================================
-- PHASE 3: CLAIM FLOW - HANDLE-BASED MATCHING
-- ============================================================================
-- Migration: 20260103_002_phase3_claim_flow.sql
-- Purpose: Update can_claim_artist() to support instagram_handle matching
-- Context: Database has instagram_handle but NOT instagram_id populated
-- ============================================================================

-- Update can_claim_artist() to support handle-based matching
CREATE OR REPLACE FUNCTION can_claim_artist(
  p_artist_id UUID,
  p_instagram_id TEXT DEFAULT NULL,
  p_instagram_handle TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM artists
    WHERE id = p_artist_id
      AND verification_status = 'unclaimed'
      AND deleted_at IS NULL
      AND (
        -- Match on instagram_id (if populated in future)
        (p_instagram_id IS NOT NULL AND instagram_id = p_instagram_id)
        OR
        -- Match on instagram_handle (PRIMARY METHOD)
        (p_instagram_handle IS NOT NULL
         AND LOWER(instagram_handle) = LOWER(REPLACE(p_instagram_handle, '@', '')))
      )
  );
$$;

COMMENT ON FUNCTION can_claim_artist IS 'Verifies if user can claim artist by instagram_id OR instagram_handle (case-insensitive)';

-- Helper function to get artist by handle
CREATE OR REPLACE FUNCTION get_artist_by_handle(p_instagram_handle TEXT)
RETURNS TABLE (
  id UUID,
  name TEXT,
  slug TEXT,
  instagram_handle TEXT,
  verification_status TEXT,
  claimed_by_user_id UUID
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    id, name, slug, instagram_handle,
    verification_status, claimed_by_user_id
  FROM artists
  WHERE LOWER(instagram_handle) = LOWER(REPLACE(p_instagram_handle, '@', ''))
    AND deleted_at IS NULL
  LIMIT 1;
$$;

COMMENT ON FUNCTION get_artist_by_handle IS 'Fetches artist by Instagram handle (case-insensitive, strips @ prefix)';
