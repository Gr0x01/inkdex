-- ============================================================================
-- Migration: Fix City and State Data
-- Date: 2025-01-01
-- Issue: Database has NULL states and slugified city names
-- Solution: Backfill proper city names ("Austin") and state codes ("TX")
-- ============================================================================
-- Problem: Discovery scripts inserted:
--   - city as slugs: "austin", "atlanta", "los-angeles"
--   - state as NULL (never set)
--
-- Frontend expects:
--   - city as proper case: "Austin", "Atlanta", "Los Angeles"
--   - state as codes: "TX", "GA", "CA"
-- ============================================================================

BEGIN;

-- Step 1: Backfill state codes based on city slugs (case-insensitive)
UPDATE artists
SET state = CASE
  -- Original 3 cities
  WHEN LOWER(city) = 'austin' THEN 'TX'
  WHEN LOWER(city) = 'atlanta' THEN 'GA'
  WHEN LOWER(city) IN ('los angeles', 'los-angeles') THEN 'CA'
  -- New cities (added Jan 1, 2026)
  WHEN LOWER(city) = 'chicago' THEN 'IL'
  WHEN LOWER(city) IN ('new york', 'new-york') THEN 'NY'
  WHEN LOWER(city) = 'seattle' THEN 'WA'
  WHEN LOWER(city) = 'portland' THEN 'OR'
  WHEN LOWER(city) = 'miami' THEN 'FL'
  ELSE state  -- Preserve existing if not null
END
WHERE state IS NULL;

-- Step 2: Normalize city names to proper case (case-insensitive matching)
UPDATE artists
SET city = CASE
  -- Original 3 cities
  WHEN LOWER(city) = 'austin' THEN 'Austin'
  WHEN LOWER(city) = 'atlanta' THEN 'Atlanta'
  WHEN LOWER(city) IN ('los angeles', 'los-angeles') THEN 'Los Angeles'
  -- New cities (added Jan 1, 2026)
  WHEN LOWER(city) = 'chicago' THEN 'Chicago'
  WHEN LOWER(city) IN ('new york', 'new-york') THEN 'New York'
  WHEN LOWER(city) = 'seattle' THEN 'Seattle'
  WHEN LOWER(city) = 'portland' THEN 'Portland'
  WHEN LOWER(city) = 'miami' THEN 'Miami'
  ELSE city  -- Preserve if already proper case
END;

-- Step 3: Verify results (show counts by city/state)
DO $$
DECLARE
  null_state_count INTEGER;
  city_record RECORD;
BEGIN
  -- Check for any remaining NULL states
  SELECT COUNT(*) INTO null_state_count FROM artists WHERE state IS NULL;

  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Migration 20250101_006 - City/State Fix';
  RAISE NOTICE '===========================================';

  IF null_state_count > 0 THEN
    RAISE WARNING '% artists still have NULL state after migration', null_state_count;
  ELSE
    RAISE NOTICE 'SUCCESS: All artists have state codes';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE 'City/State Breakdown:';
  RAISE NOTICE '-------------------------------------------';

  -- Show all cities with counts
  FOR city_record IN
    SELECT city, state, COUNT(*) as cnt
    FROM artists
    GROUP BY city, state
    ORDER BY cnt DESC
  LOOP
    RAISE NOTICE '  % (%) : % artists', city_record.city, COALESCE(city_record.state, 'NULL'), city_record.cnt;
  END LOOP;

  RAISE NOTICE '===========================================';
END $$;

COMMIT;

-- Final verification query (commented out for migration, but useful for manual checks)
-- SELECT city, state, COUNT(*) as artist_count
-- FROM artists
-- GROUP BY city, state
-- ORDER BY artist_count DESC;
