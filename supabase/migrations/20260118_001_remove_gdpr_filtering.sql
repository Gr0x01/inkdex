-- Remove GDPR Filtering
-- This migration removes all GDPR-related columns, indexes, and functions
-- EU artists will now be discoverable and shown in search results

-- Drop GDPR columns from artists table
ALTER TABLE artists DROP COLUMN IF EXISTS is_gdpr_blocked;
ALTER TABLE artists DROP COLUMN IF EXISTS gdpr_consent;

-- Drop GDPR-related indexes
DROP INDEX IF EXISTS idx_artists_gdpr_blocked;
DROP INDEX IF EXISTS idx_artists_not_gdpr_blocked;
DROP INDEX IF EXISTS idx_artist_locations_country_code_gdpr;

-- Drop the GDPR helper function
DROP FUNCTION IF EXISTS is_gdpr_country(text);
