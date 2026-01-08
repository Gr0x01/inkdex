-- ============================================================================
-- Migration: Fix sync_primary_location - columns were removed
-- Date: 2026-02-03
-- Issue: The city/state columns were removed from artists table during refactor.
--        This trigger tried to sync them but now fails.
--        Since all location data is in artist_locations, this trigger is no longer needed.
-- ============================================================================

-- Make the trigger a no-op since the columns no longer exist
CREATE OR REPLACE FUNCTION sync_primary_location()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- This trigger is now a no-op
  -- The city/state columns were removed from artists table
  -- All location data is managed in artist_locations table
  RETURN NEW;
END;
$$;

-- Alternatively, we could drop the trigger entirely:
-- DROP TRIGGER IF EXISTS sync_primary_location_trigger ON artist_locations;
