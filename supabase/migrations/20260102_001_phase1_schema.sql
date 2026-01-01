-- Phase 1: User & Artist Account Implementation - Schema Changes
-- Adds tables and columns for artist subscriptions, OAuth, analytics, and account management

-- ============================================================================
-- 1. UPDATE EXISTING USERS TABLE
-- ============================================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS instagram_access_token TEXT,
  ADD COLUMN IF NOT EXISTS instagram_token_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS instagram_refresh_token TEXT,
  ADD COLUMN IF NOT EXISTS account_type TEXT NOT NULL DEFAULT 'fan';

ALTER TABLE users
  ADD CONSTRAINT check_account_type
  CHECK (account_type IN ('fan', 'artist_free', 'artist_pro'));

CREATE INDEX IF NOT EXISTS idx_users_account_type ON users(account_type);

COMMENT ON COLUMN users.instagram_access_token IS 'OAuth access token (encrypted in application layer)';
COMMENT ON COLUMN users.instagram_token_expires_at IS 'Token expiration timestamp';
COMMENT ON COLUMN users.instagram_refresh_token IS 'OAuth refresh token (encrypted in application layer)';
COMMENT ON COLUMN users.account_type IS 'User type: fan, artist_free, or artist_pro';

-- ============================================================================
-- 2. UPDATE EXISTING ARTISTS TABLE
-- ============================================================================

ALTER TABLE artists
  ADD COLUMN IF NOT EXISTS is_pro BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS pricing_info TEXT,
  ADD COLUMN IF NOT EXISTS availability_status TEXT,
  ADD COLUMN IF NOT EXISTS last_instagram_sync_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS auto_sync_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS exclude_from_scraping BOOLEAN DEFAULT FALSE;

ALTER TABLE artists
  ADD CONSTRAINT check_availability_status
  CHECK (availability_status IS NULL OR availability_status IN ('available', 'booking_soon', 'waitlist'));

-- Update verification_status to only allow 'unclaimed' or 'claimed'
ALTER TABLE artists DROP CONSTRAINT IF EXISTS check_verification_status;
ALTER TABLE artists
  ADD CONSTRAINT check_verification_status
  CHECK (verification_status IN ('unclaimed', 'claimed'));

-- Migrate any old statuses to 'claimed'
UPDATE artists SET verification_status = 'claimed'
WHERE verification_status NOT IN ('unclaimed', 'claimed');

CREATE INDEX IF NOT EXISTS idx_artists_pro ON artists(is_pro) WHERE is_pro = TRUE;
CREATE INDEX IF NOT EXISTS idx_artists_featured ON artists(is_featured) WHERE is_featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_artists_active ON artists(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_artists_auto_sync ON artists(auto_sync_enabled) WHERE auto_sync_enabled = TRUE;

DROP INDEX IF EXISTS idx_artists_verification;
CREATE INDEX IF NOT EXISTS idx_artists_verification ON artists(verification_status);

COMMENT ON COLUMN artists.is_pro IS 'Pro subscription (search boost, auto-sync, unlimited portfolio)';
COMMENT ON COLUMN artists.is_featured IS 'Editorial curation (admin-controlled, independent of Pro)';
COMMENT ON COLUMN artists.pricing_info IS 'Pro: Pricing info displayed on profile';
COMMENT ON COLUMN artists.availability_status IS 'Pro: Booking availability status';
COMMENT ON COLUMN artists.last_instagram_sync_at IS 'Last successful Instagram sync timestamp';
COMMENT ON COLUMN artists.auto_sync_enabled IS 'Pro: Auto Instagram sync enabled';
COMMENT ON COLUMN artists.deleted_at IS 'Soft delete timestamp (artist deleted page)';
COMMENT ON COLUMN artists.exclude_from_scraping IS 'Prevent re-scraping (set when artist deletes page)';

-- ============================================================================
-- 3. UPDATE EXISTING PORTFOLIO_IMAGES TABLE
-- ============================================================================

ALTER TABLE portfolio_images
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS pinned_position INTEGER,
  ADD COLUMN IF NOT EXISTS hidden BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS auto_synced BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS manually_added BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS import_source TEXT DEFAULT 'scrape';

ALTER TABLE portfolio_images
  ADD CONSTRAINT check_import_source
  CHECK (import_source IN ('scrape', 'oauth_onboarding', 'oauth_sync', 'manual_import'));

ALTER TABLE portfolio_images
  ADD CONSTRAINT check_pinned_position_positive
  CHECK (pinned_position IS NULL OR pinned_position > 0);

CREATE INDEX IF NOT EXISTS idx_portfolio_pinned
  ON portfolio_images(artist_id, pinned_position ASC)
  WHERE is_pinned = TRUE AND hidden = FALSE;

CREATE INDEX IF NOT EXISTS idx_portfolio_auto_synced
  ON portfolio_images(artist_id, created_at DESC)
  WHERE is_pinned = FALSE AND hidden = FALSE;

CREATE INDEX IF NOT EXISTS idx_portfolio_hidden
  ON portfolio_images(artist_id, created_at DESC)
  WHERE hidden = TRUE;

CREATE INDEX IF NOT EXISTS idx_portfolio_import_source
  ON portfolio_images(import_source);

COMMENT ON COLUMN portfolio_images.is_pinned IS 'Pro: Manually pinned to top of portfolio';
COMMENT ON COLUMN portfolio_images.pinned_position IS 'Pro: Display order for pinned images (1 = first)';
COMMENT ON COLUMN portfolio_images.hidden IS 'Hidden from public portfolio';
COMMENT ON COLUMN portfolio_images.auto_synced IS 'Pro: Auto-synced from Instagram';
COMMENT ON COLUMN portfolio_images.manually_added IS 'Manually imported by artist';
COMMENT ON COLUMN portfolio_images.import_source IS 'Source: scrape, oauth_onboarding, oauth_sync, manual_import';

-- Migrate existing 'featured' to 'is_pinned'
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY artist_id ORDER BY created_at DESC) as rn
  FROM portfolio_images
  WHERE featured = TRUE
)
UPDATE portfolio_images
SET is_pinned = TRUE,
    pinned_position = ranked.rn
FROM ranked
WHERE portfolio_images.id = ranked.id;

-- ============================================================================
-- 4. NEW TABLE: ARTIST_SUBSCRIPTIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS artist_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  artist_id UUID REFERENCES artists(id) ON DELETE CASCADE,
  subscription_type TEXT NOT NULL,
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  promo_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, artist_id)
);

ALTER TABLE artist_subscriptions
  ADD CONSTRAINT check_subscription_type CHECK (subscription_type IN ('free', 'pro')),
  ADD CONSTRAINT check_subscription_status CHECK (status IN ('active', 'canceled', 'past_due', 'trialing'));

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON artist_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_artist ON artist_subscriptions(artist_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe ON artist_subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON artist_subscriptions(status);

COMMENT ON TABLE artist_subscriptions IS 'Artist subscription tracking (free and pro tiers)';

-- ============================================================================
-- 5. NEW TABLE: PROMO_CODES
-- ============================================================================

CREATE TABLE IF NOT EXISTS promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  discount_type TEXT NOT NULL,
  discount_value INTEGER NOT NULL,
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE promo_codes
  ADD CONSTRAINT check_discount_type CHECK (discount_type IN ('months_free', 'percent_off')),
  ADD CONSTRAINT check_discount_value_positive CHECK (discount_value > 0),
  ADD CONSTRAINT check_max_uses_positive CHECK (max_uses IS NULL OR max_uses > 0),
  ADD CONSTRAINT check_current_uses_non_negative CHECK (current_uses >= 0);

CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code);
CREATE INDEX IF NOT EXISTS idx_promo_codes_active ON promo_codes(active) WHERE active = TRUE;

COMMENT ON TABLE promo_codes IS 'Promotional codes for Pro subscription discounts';

-- ============================================================================
-- 6. NEW TABLE: ARTIST_ANALYTICS
-- ============================================================================

CREATE TABLE IF NOT EXISTS artist_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID REFERENCES artists(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  profile_views INTEGER DEFAULT 0,
  image_views INTEGER DEFAULT 0,
  instagram_clicks INTEGER DEFAULT 0,
  booking_link_clicks INTEGER DEFAULT 0,
  search_appearances INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(artist_id, date)
);

ALTER TABLE artist_analytics
  ADD CONSTRAINT check_profile_views_non_negative CHECK (profile_views >= 0),
  ADD CONSTRAINT check_image_views_non_negative CHECK (image_views >= 0),
  ADD CONSTRAINT check_instagram_clicks_non_negative CHECK (instagram_clicks >= 0),
  ADD CONSTRAINT check_booking_clicks_non_negative CHECK (booking_link_clicks >= 0),
  ADD CONSTRAINT check_search_appearances_non_negative CHECK (search_appearances >= 0);

CREATE INDEX IF NOT EXISTS idx_analytics_artist_date ON artist_analytics(artist_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_date ON artist_analytics(date DESC);

COMMENT ON TABLE artist_analytics IS 'Daily analytics aggregation for Pro artists';

-- ============================================================================
-- 7. NEW TABLE: INSTAGRAM_SYNC_LOG
-- ============================================================================

CREATE TABLE IF NOT EXISTS instagram_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID REFERENCES artists(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL,
  images_fetched INTEGER,
  images_added INTEGER,
  images_skipped INTEGER,
  status TEXT NOT NULL,
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE instagram_sync_log
  ADD CONSTRAINT check_sync_type CHECK (sync_type IN ('manual', 'auto', 'onboarding')),
  ADD CONSTRAINT check_sync_status CHECK (status IN ('success', 'partial', 'failed')),
  ADD CONSTRAINT check_image_counts_non_negative CHECK (
    images_fetched IS NULL OR images_fetched >= 0 AND
    images_added IS NULL OR images_added >= 0 AND
    images_skipped IS NULL OR images_skipped >= 0
  );

CREATE INDEX IF NOT EXISTS idx_sync_log_artist ON instagram_sync_log(artist_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_log_user ON instagram_sync_log(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_log_status ON instagram_sync_log(status);

COMMENT ON TABLE instagram_sync_log IS 'Instagram portfolio sync operation logs';
