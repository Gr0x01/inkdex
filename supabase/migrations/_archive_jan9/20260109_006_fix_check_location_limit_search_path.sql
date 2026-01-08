-- ============================================================================
-- Migration: Fix check_location_limit search_path
-- Date: 2026-01-31
-- Issue: Trigger function has search_path="" (empty) instead of search_path=public
--        causing "relation artists does not exist" errors
-- ============================================================================

CREATE OR REPLACE FUNCTION check_location_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public  -- THIS WAS MISSING/EMPTY
AS $$
DECLARE
  is_pro BOOLEAN;
  location_count INTEGER;
  max_locations INTEGER;
BEGIN
  -- Get artist's pro status
  SELECT a.is_pro INTO is_pro
  FROM artists a
  WHERE a.id = NEW.artist_id;

  -- Set limit based on tier
  max_locations := CASE WHEN is_pro THEN 20 ELSE 1 END;

  -- Count existing locations (excluding current for updates)
  SELECT COUNT(*) INTO location_count
  FROM artist_locations
  WHERE artist_id = NEW.artist_id
    AND (TG_OP = 'INSERT' OR id != NEW.id);

  IF location_count >= max_locations THEN
    RAISE EXCEPTION 'Location limit reached. % tier allows % location(s).',
      CASE WHEN is_pro THEN 'Pro' ELSE 'Free' END, max_locations;
  END IF;

  RETURN NEW;
END;
$$;
