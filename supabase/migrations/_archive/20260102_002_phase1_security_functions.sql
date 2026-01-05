-- Phase 1: User & Artist Account Implementation - Security & Functions
-- RLS policies, triggers, and helper functions for account management

-- ============================================================================
-- 1. ENABLE RLS ON NEW TABLES
-- ============================================================================

ALTER TABLE artist_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE artist_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE instagram_sync_log ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. RLS POLICIES - USERS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Service role full access to users" ON users;

CREATE POLICY "Users can read own data"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON users FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Service role full access to users"
  ON users FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- 3. RLS POLICIES - ARTISTS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Public can read artists" ON artists;
DROP POLICY IF EXISTS "Public can read active artists" ON artists;
DROP POLICY IF EXISTS "Artists can update own profile" ON artists;
DROP POLICY IF EXISTS "Artists can delete own profile" ON artists;
DROP POLICY IF EXISTS "Service role full access to artists" ON artists;

CREATE POLICY "Public can read active artists"
  ON artists FOR SELECT
  TO public
  USING (deleted_at IS NULL);

CREATE POLICY "Artists can update own profile"
  ON artists FOR UPDATE
  USING (claimed_by_user_id = auth.uid() AND deleted_at IS NULL);

CREATE POLICY "Service role full access to artists"
  ON artists FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- 4. RLS POLICIES - PORTFOLIO_IMAGES TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Public can read visible images" ON portfolio_images;
DROP POLICY IF EXISTS "Artists can read own images" ON portfolio_images;
DROP POLICY IF EXISTS "Artists can update own images" ON portfolio_images;
DROP POLICY IF EXISTS "Artists can insert own images" ON portfolio_images;
DROP POLICY IF EXISTS "Artists can delete own images" ON portfolio_images;
DROP POLICY IF EXISTS "Artists can manage own images" ON portfolio_images;
DROP POLICY IF EXISTS "Service role full access to portfolio_images" ON portfolio_images;

CREATE POLICY "Public can read visible images"
  ON portfolio_images FOR SELECT
  TO public
  USING (
    hidden = FALSE
    AND artist_id IN (SELECT id FROM artists WHERE deleted_at IS NULL)
  );

CREATE POLICY "Artists can read own images"
  ON portfolio_images FOR SELECT
  USING (
    artist_id IN (SELECT id FROM artists WHERE claimed_by_user_id = auth.uid())
  );

CREATE POLICY "Artists can update own images"
  ON portfolio_images FOR UPDATE
  USING (
    artist_id IN (SELECT id FROM artists WHERE claimed_by_user_id = auth.uid())
  );

CREATE POLICY "Artists can insert own images"
  ON portfolio_images FOR INSERT
  WITH CHECK (
    artist_id IN (SELECT id FROM artists WHERE claimed_by_user_id = auth.uid())
  );

CREATE POLICY "Artists can delete own images"
  ON portfolio_images FOR DELETE
  USING (
    artist_id IN (SELECT id FROM artists WHERE claimed_by_user_id = auth.uid())
  );

CREATE POLICY "Service role full access to portfolio_images"
  ON portfolio_images FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- 5. RLS POLICIES - ARTIST_SUBSCRIPTIONS TABLE
-- ============================================================================

CREATE POLICY "Users can read own subscriptions"
  ON artist_subscriptions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Service role full access to subscriptions"
  ON artist_subscriptions FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- 6. RLS POLICIES - PROMO_CODES TABLE
-- ============================================================================

CREATE POLICY "Public can read active promo codes"
  ON promo_codes FOR SELECT
  TO public
  USING (active = TRUE AND (expires_at IS NULL OR expires_at > NOW()));

CREATE POLICY "Service role full access to promo codes"
  ON promo_codes FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- 7. RLS POLICIES - ARTIST_ANALYTICS TABLE
-- ============================================================================

CREATE POLICY "Artists can read own analytics"
  ON artist_analytics FOR SELECT
  USING (
    artist_id IN (SELECT id FROM artists WHERE claimed_by_user_id = auth.uid())
  );

CREATE POLICY "Service role full access to analytics"
  ON artist_analytics FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- 8. RLS POLICIES - INSTAGRAM_SYNC_LOG TABLE
-- ============================================================================

CREATE POLICY "Artists can read own sync logs"
  ON instagram_sync_log FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Service role full access to sync logs"
  ON instagram_sync_log FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- 9. TRIGGERS FOR UPDATED_AT
-- ============================================================================

CREATE TRIGGER update_artist_subscriptions_updated_at
  BEFORE UPDATE ON artist_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_promo_codes_updated_at
  BEFORE UPDATE ON promo_codes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 10. ANALYTICS TRACKING FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION increment_profile_view(p_artist_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO artist_analytics (artist_id, date, profile_views)
  VALUES (p_artist_id, CURRENT_DATE, 1)
  ON CONFLICT (artist_id, date)
  DO UPDATE SET profile_views = artist_analytics.profile_views + 1;
END;
$$;

CREATE OR REPLACE FUNCTION increment_instagram_click(p_artist_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO artist_analytics (artist_id, date, instagram_clicks)
  VALUES (p_artist_id, CURRENT_DATE, 1)
  ON CONFLICT (artist_id, date)
  DO UPDATE SET instagram_clicks = artist_analytics.instagram_clicks + 1;
END;
$$;

CREATE OR REPLACE FUNCTION increment_booking_click(p_artist_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO artist_analytics (artist_id, date, booking_link_clicks)
  VALUES (p_artist_id, CURRENT_DATE, 1)
  ON CONFLICT (artist_id, date)
  DO UPDATE SET booking_link_clicks = artist_analytics.booking_link_clicks + 1;
END;
$$;

CREATE OR REPLACE FUNCTION increment_search_appearances(p_artist_ids UUID[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  artist_id UUID;
BEGIN
  FOREACH artist_id IN ARRAY p_artist_ids
  LOOP
    INSERT INTO artist_analytics (artist_id, date, search_appearances)
    VALUES (artist_id, CURRENT_DATE, 1)
    ON CONFLICT (artist_id, date)
    DO UPDATE SET search_appearances = artist_analytics.search_appearances + 1;
  END LOOP;
END;
$$;

-- ============================================================================
-- 11. PORTFOLIO & ACCOUNT HELPER FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION get_artist_portfolio(p_artist_id UUID)
RETURNS TABLE (
  id UUID,
  instagram_post_id TEXT,
  instagram_url TEXT,
  storage_thumb_640 TEXT,
  storage_thumb_320 TEXT,
  storage_thumb_1280 TEXT,
  post_caption TEXT,
  post_timestamp TIMESTAMPTZ,
  likes_count INTEGER,
  is_pinned BOOLEAN,
  pinned_position INTEGER,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    pi.id,
    pi.instagram_post_id,
    pi.instagram_url,
    pi.storage_thumb_640,
    pi.storage_thumb_320,
    pi.storage_thumb_1280,
    pi.post_caption,
    pi.post_timestamp,
    pi.likes_count,
    pi.is_pinned,
    pi.pinned_position,
    pi.created_at
  FROM portfolio_images pi
  WHERE pi.artist_id = p_artist_id
    AND pi.hidden = FALSE
    AND pi.artist_id IN (SELECT id FROM artists WHERE deleted_at IS NULL)
  ORDER BY
    pi.is_pinned DESC,
    pi.pinned_position ASC NULLS LAST,
    pi.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION can_claim_artist(p_artist_id UUID, p_instagram_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM artists
    WHERE id = p_artist_id
      AND instagram_id = p_instagram_id
      AND verification_status = 'unclaimed'
      AND deleted_at IS NULL
  );
$$;

CREATE OR REPLACE FUNCTION get_artist_subscription_status(p_artist_id UUID)
RETURNS TABLE (
  subscription_type TEXT,
  status TEXT,
  is_active BOOLEAN,
  current_period_end TIMESTAMPTZ
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    subscription_type,
    status,
    (status = 'active' AND current_period_end > NOW()) as is_active,
    current_period_end
  FROM artist_subscriptions
  WHERE artist_id = p_artist_id
  ORDER BY created_at DESC
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION validate_promo_code(p_code TEXT)
RETURNS TABLE (
  id UUID,
  discount_type TEXT,
  discount_value INTEGER,
  is_valid BOOLEAN,
  error_message TEXT
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  promo promo_codes%ROWTYPE;
BEGIN
  SELECT * INTO promo FROM promo_codes WHERE code = p_code;

  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, NULL::INTEGER, FALSE, 'Promo code not found'::TEXT;
    RETURN;
  END IF;

  IF NOT promo.active THEN
    RETURN QUERY SELECT promo.id, promo.discount_type, promo.discount_value, FALSE, 'Promo code is no longer active'::TEXT;
    RETURN;
  END IF;

  IF promo.expires_at IS NOT NULL AND promo.expires_at < NOW() THEN
    RETURN QUERY SELECT promo.id, promo.discount_type, promo.discount_value, FALSE, 'Promo code has expired'::TEXT;
    RETURN;
  END IF;

  IF promo.max_uses IS NOT NULL AND promo.current_uses >= promo.max_uses THEN
    RETURN QUERY SELECT promo.id, promo.discount_type, promo.discount_value, FALSE, 'Promo code has reached maximum uses'::TEXT;
    RETURN;
  END IF;

  RETURN QUERY SELECT promo.id, promo.discount_type, promo.discount_value, TRUE, NULL::TEXT;
END;
$$;

-- ============================================================================
-- 12. COMMENTS
-- ============================================================================

COMMENT ON FUNCTION increment_profile_view IS 'Increment profile views for analytics';
COMMENT ON FUNCTION increment_instagram_click IS 'Increment Instagram link clicks for analytics';
COMMENT ON FUNCTION increment_booking_click IS 'Increment booking link clicks for analytics';
COMMENT ON FUNCTION increment_search_appearances IS 'Batch increment search appearances for analytics';
COMMENT ON FUNCTION get_artist_portfolio IS 'Get portfolio in display order (pinned first, then chronological)';
COMMENT ON FUNCTION can_claim_artist IS 'Check if user can claim artist (matches Instagram ID, unclaimed)';
COMMENT ON FUNCTION get_artist_subscription_status IS 'Get current subscription status for artist';
COMMENT ON FUNCTION validate_promo_code IS 'Validate promo code and return discount or error';
