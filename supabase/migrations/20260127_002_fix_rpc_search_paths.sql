-- ============================================================================
-- Migration: Fix SECURITY DEFINER functions missing search_path
-- Date: 2026-01-27
-- Issue: Functions with SECURITY DEFINER need SET search_path = public
--        to find tables when running with elevated privileges
-- ============================================================================

-- Fix update_artist_locations
CREATE OR REPLACE FUNCTION update_artist_locations(
  p_artist_id UUID,
  p_locations JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  loc JSONB;
  i INTEGER := 0;
BEGIN
  -- Verify caller owns this artist
  IF NOT EXISTS (
    SELECT 1 FROM artists a
    WHERE a.id = p_artist_id
      AND a.claimed_by_user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Unauthorized: You do not own this artist profile';
  END IF;

  -- Delete all existing locations for this artist
  DELETE FROM artist_locations WHERE artist_id = p_artist_id;

  -- Insert new locations
  FOR loc IN SELECT * FROM jsonb_array_elements(p_locations)
  LOOP
    INSERT INTO artist_locations (
      artist_id,
      city,
      region,
      country_code,
      location_type,
      is_primary,
      display_order
    ) VALUES (
      p_artist_id,
      loc->>'city',
      loc->>'region',
      COALESCE(loc->>'country_code', 'US'),
      (loc->>'location_type')::text,
      COALESCE((loc->>'is_primary')::boolean, i = 0),
      COALESCE((loc->>'display_order')::integer, i)
    );
    i := i + 1;
  END LOOP;
END;
$$;

-- Verify other SECURITY DEFINER functions have search_path set
-- (These were already correct but documenting for completeness)

-- recompute_artist_styles_on_image_delete - has SET search_path = public ✓
-- check_location_limit - has SET search_path = public ✓
-- sync_primary_location - has SET search_path = public ✓
