-- ============================================================================
-- Migration: Fix sync_primary_location search_path
-- Date: 2026-02-02
-- Issue: Trigger function has search_path="" (empty) instead of search_path=public
--        causing "relation artists does not exist" errors
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_primary_location()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public  -- THIS WAS EMPTY
AS $$
BEGIN
  -- When a location is marked as primary, update artists table
  IF NEW.is_primary = TRUE THEN
    UPDATE artists
    SET
      city = COALESCE(NEW.city, NEW.region, ''),
      state = CASE
        WHEN NEW.country_code = 'US' THEN COALESCE(NEW.region, '')
        ELSE NEW.country_code
      END
    WHERE id = NEW.artist_id;
  END IF;

  RETURN NEW;
END;
$$;
