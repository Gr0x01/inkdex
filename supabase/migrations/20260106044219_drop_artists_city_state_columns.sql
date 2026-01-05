-- ============================================================================
-- DROP LEGACY artists.city/state COLUMNS
-- ============================================================================
-- This migration removes the deprecated city and state columns from the
-- artists table. Location data is now EXCLUSIVELY stored in artist_locations.
--
-- PREREQUISITES (must be completed before running this migration):
-- 1. All artists with city/state have been backfilled to artist_locations
-- 2. All discovery scripts write to artist_locations only
-- 3. All components read from artist_locations (via joins)
-- 4. The sync_artist_to_locations trigger has been removed
-- 5. get_artists_with_image_counts RPC uses artist_locations
--
-- ROLLBACK WARNING: This is a destructive migration. The city/state data
-- cannot be recovered after this migration runs. Ensure backfill is complete.
-- ============================================================================

-- First, verify that no artists are missing from artist_locations
-- (This will fail the migration if any artists would lose their location data)
DO $$
DECLARE
    orphan_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO orphan_count
    FROM artists a
    WHERE a.city IS NOT NULL
      AND a.city != ''
      AND a.deleted_at IS NULL
      AND NOT EXISTS (
          SELECT 1 FROM artist_locations al WHERE al.artist_id = a.id
      );

    IF orphan_count > 0 THEN
        RAISE EXCEPTION 'Cannot drop columns: % artists have city but no artist_locations entry. Run backfill first.', orphan_count;
    END IF;
END $$;

-- Drop the columns
ALTER TABLE artists DROP COLUMN IF EXISTS city;
ALTER TABLE artists DROP COLUMN IF EXISTS state;

-- Add a comment to the table documenting the change
COMMENT ON TABLE artists IS 'Core artist profiles. Location data is stored in artist_locations table (single source of truth).';
