-- Migration: Airtable Marketing Sync
-- Adds featured expiration, Airtable tracking, and sync logging

-- Add featured expiration columns to artists
ALTER TABLE artists
ADD COLUMN IF NOT EXISTS featured_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS featured_expires_at TIMESTAMPTZ;

-- Index for efficient featured expiration lookups
CREATE INDEX IF NOT EXISTS idx_artists_featured_expires
ON artists (featured_expires_at)
WHERE is_featured = true;

-- Add Airtable tracking columns to marketing_outreach
ALTER TABLE marketing_outreach
ADD COLUMN IF NOT EXISTS airtable_record_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS airtable_synced_at TIMESTAMPTZ;

-- Create sync log table for audit trail
CREATE TABLE IF NOT EXISTS airtable_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type TEXT NOT NULL, -- 'outreach', 'featured', 'full'
  direction TEXT NOT NULL, -- 'push', 'pull', 'both'
  records_processed INTEGER DEFAULT 0,
  records_created INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  errors JSONB,
  triggered_by TEXT, -- 'manual', 'cron', 'webhook'
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Index for recent sync lookups
CREATE INDEX IF NOT EXISTS idx_airtable_sync_log_started_at
ON airtable_sync_log (started_at DESC);

-- Function to auto-expire featured artists
-- Should be called daily via pg_cron
CREATE OR REPLACE FUNCTION expire_featured_artists()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE artists
  SET
    is_featured = false,
    updated_at = NOW()
  WHERE is_featured = true
    AND featured_expires_at IS NOT NULL
    AND featured_expires_at < NOW();

  GET DIAGNOSTICS expired_count = ROW_COUNT;

  IF expired_count > 0 THEN
    RAISE NOTICE 'Expired % featured artists', expired_count;
  END IF;
END;
$$;

-- Comment for pg_cron setup (run in Supabase dashboard):
-- SELECT cron.schedule(
--   'expire-featured-artists',
--   '0 0 * * *',  -- Daily at midnight UTC
--   'SELECT expire_featured_artists();'
-- );
