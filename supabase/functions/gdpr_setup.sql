-- ============================================================================
-- GDPR SETUP - Run once in Supabase SQL Editor
-- ============================================================================
-- This adds the is_gdpr_blocked column to artists and backfills it.
-- After running this, search will be FAST because it's a simple column check
-- instead of a NOT EXISTS subquery on every search.
--
-- Run this BEFORE running search_functions.sql
-- ============================================================================

-- Step 1: Add the column (if it doesn't exist)
ALTER TABLE artists ADD COLUMN IF NOT EXISTS is_gdpr_blocked BOOLEAN DEFAULT FALSE;

-- Step 2: Create index for fast filtering
CREATE INDEX IF NOT EXISTS idx_artists_gdpr_blocked
ON artists(is_gdpr_blocked)
WHERE is_gdpr_blocked = TRUE;

CREATE INDEX IF NOT EXISTS idx_artists_not_gdpr_blocked
ON artists(id)
WHERE is_gdpr_blocked = FALSE OR is_gdpr_blocked IS NULL;

-- Step 3: Backfill - mark artists with EU locations as blocked
UPDATE artists a
SET is_gdpr_blocked = TRUE
WHERE EXISTS (
  SELECT 1 FROM artist_locations al
  WHERE al.artist_id = a.id
  AND al.country_code IN (
    'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
    'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
    'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
    'IS', 'LI', 'NO',
    'GB', 'CH'
  )
)
AND (is_gdpr_blocked = FALSE OR is_gdpr_blocked IS NULL);

-- Step 4: Show results
SELECT
  COUNT(*) FILTER (WHERE is_gdpr_blocked = TRUE) as blocked_artists,
  COUNT(*) FILTER (WHERE is_gdpr_blocked = FALSE OR is_gdpr_blocked IS NULL) as allowed_artists,
  COUNT(*) as total_artists
FROM artists
WHERE deleted_at IS NULL;

-- ============================================================================
-- DONE! Now run search_functions.sql to update the search functions.
-- ============================================================================
