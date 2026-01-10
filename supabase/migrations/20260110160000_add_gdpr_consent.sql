-- Add gdpr_consent column to allow GDPR-country artists who explicitly consent
-- to appear in search results

ALTER TABLE artists ADD COLUMN IF NOT EXISTS gdpr_consent boolean DEFAULT FALSE;

COMMENT ON COLUMN artists.gdpr_consent IS 'True if artist from GDPR country has explicitly consented to appear on platform';

-- Set consent for tt_ganz (Swiss artist who gave permission)
UPDATE artists SET gdpr_consent = TRUE WHERE instagram_handle = 'tt_ganz';
