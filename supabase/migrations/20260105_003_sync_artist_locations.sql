-- Sync Artist Locations Migration
--
-- Problem: Artists discovered after the artist_locations table was created
-- don't have entries in artist_locations, causing city pages to 404.
--
-- Solution:
-- 1. Create trigger to auto-sync future artist inserts to artist_locations
-- 2. Backfill existing artists that are missing from artist_locations

-- ============================================================================
-- Part 1: Create Trigger (Auto-sync future artists)
-- ============================================================================

-- Function to sync artist to artist_locations on INSERT
CREATE OR REPLACE FUNCTION sync_artist_to_locations()
RETURNS TRIGGER AS $$
BEGIN
  -- Only sync if artist has city and no existing location
  IF NEW.city IS NOT NULL AND NEW.city != '' THEN
    INSERT INTO artist_locations (
      artist_id,
      city,
      region,
      country_code,
      location_type,
      is_primary,
      display_order
    ) VALUES (
      NEW.id,
      NEW.city,
      NEW.state,
      'US',
      'city',
      TRUE,
      0
    )
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on artists table
CREATE TRIGGER sync_artist_location_on_insert
  AFTER INSERT ON artists
  FOR EACH ROW
  EXECUTE FUNCTION sync_artist_to_locations();

-- ============================================================================
-- Part 2: Backfill Existing Artists
-- ============================================================================

-- Insert artist_locations for all artists that have city/state but no location record
-- This fixes Houston, Dallas, Boston, and other cities from Batch 4+ that were
-- discovered after the artist_locations migration was run
INSERT INTO artist_locations (
  artist_id,
  city,
  region,
  country_code,
  location_type,
  is_primary,
  display_order
)
SELECT
  a.id AS artist_id,
  a.city,
  a.state AS region,
  'US' AS country_code,
  'city' AS location_type,
  TRUE AS is_primary,
  0 AS display_order
FROM artists a
WHERE a.city IS NOT NULL
  AND a.city != ''
  AND NOT EXISTS (
    SELECT 1 FROM artist_locations al WHERE al.artist_id = a.id
  )
ON CONFLICT DO NOTHING;
