-- ==========================================================================
-- RECONCILIATION MIGRATION: Fix schema drift and missing objects
-- ==========================================================================
-- This migration is IDEMPOTENT (safe to run multiple times)
-- Created: 2026-01-11
--
-- Consolidates fixes from:
--   - 20260109120000_fix_function_search_paths.sql (27 functions)
--   - 20260110_001_fix_vault_permissions.sql (5 vault functions)
--   - 20260110_002_grant_pgsodium_permissions.sql (permission grants)
--   - Plus: pgcrypto token encryption infrastructure
--
-- Fixes:
--   1. Functions with empty search_path (SET search_path = '')
--   2. Missing encrypted_instagram_tokens table + pgcrypto functions
--   3. Vault functions with proper pgsodium access
--   4. All permission grants for encryption infrastructure
-- ==========================================================================

-- ============================================================================
-- PART 1: ENABLE REQUIRED EXTENSIONS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

-- ============================================================================
-- PART 2: CREATE ENCRYPTED TOKEN TABLE (pgcrypto approach)
-- ============================================================================
CREATE TABLE IF NOT EXISTS encrypted_instagram_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  encrypted_token BYTEA NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE encrypted_instagram_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Only service role can access
DROP POLICY IF EXISTS "Service role full access to encrypted_instagram_tokens" ON encrypted_instagram_tokens;
CREATE POLICY "Service role full access to encrypted_instagram_tokens"
  ON encrypted_instagram_tokens
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================================
-- PART 3: PGCRYPTO TOKEN FUNCTIONS
-- ============================================================================

-- Store encrypted token (upsert)
CREATE OR REPLACE FUNCTION store_encrypted_token(
  p_user_id UUID,
  p_token_data TEXT,
  p_encryption_key TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token_id UUID;
BEGIN
  INSERT INTO encrypted_instagram_tokens (user_id, encrypted_token, updated_at)
  VALUES (
    p_user_id,
    pgp_sym_encrypt(p_token_data, p_encryption_key),
    NOW()
  )
  ON CONFLICT (user_id)
  DO UPDATE SET
    encrypted_token = pgp_sym_encrypt(p_token_data, p_encryption_key),
    updated_at = NOW()
  RETURNING id INTO v_token_id;

  RETURN v_token_id;
END;
$$;

-- Get decrypted token
CREATE OR REPLACE FUNCTION get_decrypted_token(
  p_user_id UUID,
  p_encryption_key TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token TEXT;
BEGIN
  SELECT pgp_sym_decrypt(encrypted_token, p_encryption_key)
  INTO v_token
  FROM encrypted_instagram_tokens
  WHERE user_id = p_user_id;

  RETURN v_token;
END;
$$;

-- Delete encrypted token
CREATE OR REPLACE FUNCTION delete_encrypted_token(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM encrypted_instagram_tokens WHERE user_id = p_user_id;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION store_encrypted_token(UUID, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION get_decrypted_token(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION delete_encrypted_token(UUID) TO service_role;

-- ============================================================================
-- PART 4: FIX FUNCTIONS WITH EMPTY search_path
-- ============================================================================
-- The following functions had SET search_path = '' in baseline
-- They need SET search_path = 'public' to work properly

-- 4.1 increment_search_appearances
CREATE OR REPLACE FUNCTION public.increment_search_appearances(p_artist_ids uuid[])
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $$
  INSERT INTO artist_analytics (artist_id, date, search_appearances)
  SELECT unnest(p_artist_ids), CURRENT_DATE, 1
  ON CONFLICT (artist_id, date)
  DO UPDATE SET search_appearances = artist_analytics.search_appearances + 1;
$$;

-- 4.2 can_receive_email
CREATE OR REPLACE FUNCTION public.can_receive_email(p_email text, p_email_type text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_preferences RECORD;
BEGIN
  SELECT * INTO v_preferences
  FROM email_preferences
  WHERE email = p_email;
  IF v_preferences IS NULL THEN
    RETURN TRUE;
  END IF;
  IF v_preferences.unsubscribed_all THEN
    RETURN FALSE;
  END IF;
  CASE p_email_type
    WHEN 'welcome' THEN
      RETURN v_preferences.receive_welcome;
    WHEN 'sync_failed', 'sync_reauthenticate' THEN
      RETURN v_preferences.receive_sync_notifications;
    WHEN 'subscription_created', 'subscription_cancelled', 'downgrade_warning' THEN
      RETURN v_preferences.receive_subscription_updates;
    ELSE
      RETURN TRUE;
  END CASE;
END;
$$;

-- 4.3 get_artist_subscription_status
CREATE OR REPLACE FUNCTION public.get_artist_subscription_status(p_artist_id uuid)
RETURNS TABLE(subscription_type text, status text, is_active boolean, current_period_end timestamp with time zone)
LANGUAGE sql
STABLE
SET search_path = 'public'
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

-- 4.4 check_and_blacklist_artist
CREATE OR REPLACE FUNCTION public.check_and_blacklist_artist()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
DECLARE
    failure_count INTEGER;
    max_retries INTEGER := 3;
BEGIN
    IF NEW.status = 'failed' THEN
        SELECT COUNT(*)
        INTO failure_count
        FROM scraping_jobs
        WHERE artist_id = NEW.artist_id
        AND status = 'failed';
        IF failure_count >= max_retries THEN
            UPDATE artists
            SET
                scraping_blacklisted = TRUE,
                blacklist_reason = 'Exceeded ' || max_retries || ' failed scraping attempts: ' || NEW.error_message,
                blacklisted_at = NOW()
            WHERE id = NEW.artist_id;
            RAISE NOTICE 'Artist % blacklisted after % failures', NEW.artist_id, failure_count;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

-- 4.5 validate_promo_code
CREATE OR REPLACE FUNCTION public.validate_promo_code(p_code text)
RETURNS TABLE(id uuid, discount_type text, discount_value integer, is_valid boolean)
LANGUAGE plpgsql
STABLE
SET search_path = 'public'
AS $$
DECLARE
  promo promo_codes%ROWTYPE;
  is_code_valid BOOLEAN := FALSE;
BEGIN
  SELECT * INTO promo FROM promo_codes WHERE code = p_code;
  IF FOUND
     AND promo.active
     AND (promo.expires_at IS NULL OR promo.expires_at >= NOW())
     AND (promo.max_uses IS NULL OR promo.current_uses < promo.max_uses) THEN
    is_code_valid := TRUE;
  END IF;
  IF is_code_valid THEN
    RETURN QUERY SELECT promo.id, promo.discount_type, promo.discount_value, TRUE;
  ELSE
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, NULL::INTEGER, FALSE;
  END IF;
END;
$$;

-- 4.6 get_mining_stats
CREATE OR REPLACE FUNCTION public.get_mining_stats()
RETURNS json
LANGUAGE plpgsql
STABLE
SET search_path = 'public'
AS $$
DECLARE
  hashtag_stats JSON;
  follower_stats JSON;
  totals JSON;
BEGIN
  SELECT json_build_object(
    'total', COUNT(*),
    'completed', COUNT(*) FILTER (WHERE status = 'completed'),
    'failed', COUNT(*) FILTER (WHERE status = 'failed'),
    'running', COUNT(*) FILTER (WHERE status = 'running'),
    'postsScraped', COALESCE(SUM(posts_scraped) FILTER (WHERE status = 'completed'), 0),
    'handlesFound', COALESCE(SUM(unique_handles_found) FILTER (WHERE status = 'completed'), 0),
    'bioFilterPassed', COALESCE(SUM(bio_filter_passed) FILTER (WHERE status = 'completed'), 0),
    'imageFilterPassed', COALESCE(SUM(image_filter_passed) FILTER (WHERE status = 'completed'), 0),
    'artistsInserted', COALESCE(SUM(artists_inserted) FILTER (WHERE status = 'completed'), 0),
    'estimatedApifyCost', COALESCE(SUM(apify_cost_estimate) FILTER (WHERE status = 'completed'), 0),
    'estimatedOpenAICost', COALESCE(SUM(openai_cost_estimate) FILTER (WHERE status = 'completed'), 0)
  ) INTO hashtag_stats
  FROM hashtag_mining_runs;

  SELECT json_build_object(
    'total', COUNT(*),
    'completed', COUNT(*) FILTER (WHERE status = 'completed'),
    'failed', COUNT(*) FILTER (WHERE status = 'failed'),
    'running', COUNT(*) FILTER (WHERE status = 'running'),
    'followersScraped', COALESCE(SUM(followers_scraped) FILTER (WHERE status = 'completed'), 0),
    'bioFilterPassed', COALESCE(SUM(bio_filter_passed) FILTER (WHERE status = 'completed'), 0),
    'imageFilterPassed', COALESCE(SUM(image_filter_passed) FILTER (WHERE status = 'completed'), 0),
    'artistsInserted', COALESCE(SUM(artists_inserted) FILTER (WHERE status = 'completed'), 0),
    'skippedPrivate', COALESCE(SUM(artists_skipped_private) FILTER (WHERE status = 'completed'), 0),
    'estimatedApifyCost', COALESCE(SUM(apify_cost_estimate) FILTER (WHERE status = 'completed'), 0),
    'estimatedOpenAICost', COALESCE(SUM(openai_cost_estimate) FILTER (WHERE status = 'completed'), 0)
  ) INTO follower_stats
  FROM follower_mining_runs;

  SELECT json_build_object(
    'artistsInserted',
      COALESCE((hashtag_stats->>'artistsInserted')::NUMERIC, 0) +
      COALESCE((follower_stats->>'artistsInserted')::NUMERIC, 0),
    'estimatedApifyCost',
      COALESCE((hashtag_stats->>'estimatedApifyCost')::NUMERIC, 0) +
      COALESCE((follower_stats->>'estimatedApifyCost')::NUMERIC, 0),
    'estimatedOpenAICost',
      COALESCE((hashtag_stats->>'estimatedOpenAICost')::NUMERIC, 0) +
      COALESCE((follower_stats->>'estimatedOpenAICost')::NUMERIC, 0),
    'estimatedTotalCost',
      COALESCE((hashtag_stats->>'estimatedApifyCost')::NUMERIC, 0) +
      COALESCE((follower_stats->>'estimatedApifyCost')::NUMERIC, 0) +
      COALESCE((hashtag_stats->>'estimatedOpenAICost')::NUMERIC, 0) +
      COALESCE((follower_stats->>'estimatedOpenAICost')::NUMERIC, 0),
    'costPerArtist',
      CASE
        WHEN (COALESCE((hashtag_stats->>'artistsInserted')::NUMERIC, 0) +
              COALESCE((follower_stats->>'artistsInserted')::NUMERIC, 0)) > 0
        THEN (COALESCE((hashtag_stats->>'estimatedApifyCost')::NUMERIC, 0) +
              COALESCE((follower_stats->>'estimatedApifyCost')::NUMERIC, 0) +
              COALESCE((hashtag_stats->>'estimatedOpenAICost')::NUMERIC, 0) +
              COALESCE((follower_stats->>'estimatedOpenAICost')::NUMERIC, 0)) /
             (COALESCE((hashtag_stats->>'artistsInserted')::NUMERIC, 0) +
              COALESCE((follower_stats->>'artistsInserted')::NUMERIC, 0))
        ELSE 0
      END
  ) INTO totals;

  RETURN json_build_object(
    'hashtag', hashtag_stats,
    'follower', follower_stats,
    'totals', totals
  );
END;
$$;

-- 4.7 increment_pipeline_progress
CREATE OR REPLACE FUNCTION public.increment_pipeline_progress(run_id uuid, processed_delta integer, failed_delta integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE pipeline_runs
  SET
    processed_items = COALESCE(processed_items, 0) + processed_delta,
    failed_items = COALESCE(failed_items, 0) + failed_delta,
    updated_at = now()
  WHERE id = run_id;
END;
$$;

-- 4.8 get_artist_locations
CREATE OR REPLACE FUNCTION public.get_artist_locations(p_artist_id uuid)
RETURNS TABLE(id uuid, city text, region text, country_code text, location_type text, is_primary boolean, display_order integer, formatted text)
LANGUAGE plpgsql
STABLE
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    al.id,
    al.city,
    al.region,
    al.country_code,
    al.location_type,
    al.is_primary,
    al.display_order,
    format_location(al.city, al.region, al.country_code) as formatted
  FROM artist_locations al
  WHERE al.artist_id = p_artist_id
  ORDER BY al.is_primary DESC, al.display_order ASC;
END;
$$;

-- 4.9 format_location
CREATE OR REPLACE FUNCTION public.format_location(p_city text, p_region text, p_country_code text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = 'public'
AS $$
BEGIN
  IF p_country_code = 'US' THEN
    IF p_city IS NOT NULL AND p_city != '' THEN
      RETURN p_city || ', ' || COALESCE(p_region, '');
    ELSIF p_region IS NOT NULL AND p_region != '' THEN
      RETURN p_region || ' (statewide)';
    ELSE
      RETURN 'United States';
    END IF;
  ELSE
    IF p_city IS NOT NULL AND p_city != '' THEN
      IF p_region IS NOT NULL AND p_region != '' THEN
        RETURN p_city || ', ' || p_region || ', ' || p_country_code;
      ELSE
        RETURN p_city || ', ' || p_country_code;
      END IF;
    ELSIF p_region IS NOT NULL AND p_region != '' THEN
      RETURN p_region || ', ' || p_country_code;
    ELSE
      RETURN p_country_code;
    END IF;
  END IF;
END;
$$;

-- 4.10 update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 4.11 update_marketing_outreach_updated_at
CREATE OR REPLACE FUNCTION public.update_marketing_outreach_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 4.12 increment_booking_click
CREATE OR REPLACE FUNCTION public.increment_booking_click(p_artist_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO artist_analytics (artist_id, date, booking_link_clicks)
  VALUES (p_artist_id, CURRENT_DATE, 1)
  ON CONFLICT (artist_id, date)
  DO UPDATE SET booking_link_clicks = artist_analytics.booking_link_clicks + 1;
END;
$$;

-- 4.13 increment_instagram_click
CREATE OR REPLACE FUNCTION public.increment_instagram_click(p_artist_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO artist_analytics (artist_id, date, instagram_clicks)
  VALUES (p_artist_id, CURRENT_DATE, 1)
  ON CONFLICT (artist_id, date)
  DO UPDATE SET instagram_clicks = artist_analytics.instagram_clicks + 1;
END;
$$;

-- 4.14 get_artist_by_handle
CREATE OR REPLACE FUNCTION public.get_artist_by_handle(p_instagram_handle text)
RETURNS TABLE(id uuid, name text, slug text, instagram_handle text, verification_status text, claimed_by_user_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT
    id, name, slug, instagram_handle,
    verification_status, claimed_by_user_id
  FROM artists
  WHERE LOWER(instagram_handle) = LOWER(REPLACE(p_instagram_handle, '@', ''))
    AND deleted_at IS NULL
  LIMIT 1;
$$;

-- 4.15 get_artist_tier_counts
CREATE OR REPLACE FUNCTION public.get_artist_tier_counts()
RETURNS TABLE(total bigint, unclaimed bigint, claimed_free bigint, pro bigint, featured bigint)
LANGUAGE plpgsql
STABLE
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE deleted_at IS NULL) as total,
    COUNT(*) FILTER (WHERE deleted_at IS NULL AND verification_status = 'unclaimed') as unclaimed,
    COUNT(*) FILTER (WHERE deleted_at IS NULL AND verification_status = 'claimed' AND is_pro = false) as claimed_free,
    COUNT(*) FILTER (WHERE deleted_at IS NULL AND is_pro = true) as pro,
    COUNT(*) FILTER (WHERE deleted_at IS NULL AND is_featured = true) as featured
  FROM artists;
END;
$$;

-- 4.16 count_matching_artists
CREATE OR REPLACE FUNCTION public.count_matching_artists(query_embedding vector, match_threshold double precision DEFAULT 0.5, city_filter text DEFAULT NULL)
RETURNS TABLE(count bigint)
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH filtered_artists AS (
    SELECT a.id
    FROM artists a
    WHERE (city_filter IS NULL OR a.city = city_filter)
  ),
  matching_artists AS (
    SELECT DISTINCT pi.artist_id
    FROM portfolio_images pi
    INNER JOIN filtered_artists fa ON pi.artist_id = fa.id
    WHERE pi.status = 'active'
      AND pi.embedding IS NOT NULL
      AND (1 - (pi.embedding <=> query_embedding)) >= match_threshold
  )
  SELECT COUNT(*) AS count
  FROM matching_artists;
END;
$$;

-- 4.17 can_claim_artist
CREATE OR REPLACE FUNCTION public.can_claim_artist(p_artist_id uuid, p_instagram_id text DEFAULT NULL, p_instagram_handle text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_clean_handle TEXT;
BEGIN
  IF p_instagram_handle IS NOT NULL THEN
    v_clean_handle := LOWER(TRIM(REPLACE(p_instagram_handle, '@', '')));
    IF v_clean_handle !~ '^[a-z0-9._]{1,30}$' THEN
      RETURN FALSE;
    END IF;
  END IF;
  RETURN EXISTS (
    SELECT 1
    FROM artists
    WHERE id = p_artist_id
      AND verification_status = 'unclaimed'
      AND deleted_at IS NULL
      AND (
        (p_instagram_id IS NOT NULL AND instagram_id = p_instagram_id)
        OR
        (v_clean_handle IS NOT NULL AND LOWER(instagram_handle) = v_clean_handle)
      )
  );
END;
$$;

-- 4.18 claim_artist_profile
CREATE OR REPLACE FUNCTION public.claim_artist_profile(p_artist_id uuid, p_user_id uuid, p_instagram_handle text, p_instagram_id text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_artist_handle TEXT;
  v_clean_handle TEXT;
  v_updated_count INT;
BEGIN
  IF p_instagram_handle IS NULL OR p_instagram_handle = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'invalid_handle',
      'message', 'Instagram handle is required'
    );
  END IF;
  v_clean_handle := LOWER(TRIM(REPLACE(p_instagram_handle, '@', '')));
  IF v_clean_handle !~ '^[a-z0-9._]{1,30}$' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'invalid_handle',
      'message', 'Invalid Instagram handle format'
    );
  END IF;
  SELECT instagram_handle INTO v_artist_handle
  FROM artists
  WHERE id = p_artist_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'artist_not_found',
      'message', 'Artist profile not found'
    );
  END IF;
  UPDATE artists
  SET
    claimed_by_user_id = p_user_id,
    claimed_at = NOW(),
    verification_status = 'claimed',
    instagram_id = COALESCE(p_instagram_id, instagram_id)
  WHERE id = p_artist_id
    AND verification_status = 'unclaimed'
    AND deleted_at IS NULL
    AND LOWER(instagram_handle) = v_clean_handle;
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  IF v_updated_count = 0 THEN
    DECLARE
      v_current_status TEXT;
      v_current_handle TEXT;
    BEGIN
      SELECT verification_status, instagram_handle
      INTO v_current_status, v_current_handle
      FROM artists
      WHERE id = p_artist_id AND deleted_at IS NULL;
      IF v_current_status = 'claimed' THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', 'already_claimed',
          'message', 'This profile has already been claimed'
        );
      ELSIF LOWER(v_current_handle) != v_clean_handle THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', 'handle_mismatch',
          'message', 'Instagram handle does not match this profile'
        );
      ELSE
        RETURN jsonb_build_object(
          'success', false,
          'error', 'claim_failed',
          'message', 'Unable to claim profile'
        );
      END IF;
    END;
  END IF;
  DELETE FROM portfolio_images WHERE artist_id = p_artist_id;
  INSERT INTO claim_attempts (
    artist_id,
    user_id,
    instagram_handle_attempted,
    artist_handle,
    outcome
  ) VALUES (
    p_artist_id,
    p_user_id,
    p_instagram_handle,
    v_artist_handle,
    'success'
  );
  RETURN jsonb_build_object(
    'success', true,
    'artist_id', p_artist_id,
    'message', 'Profile claimed successfully'
  );
EXCEPTION
  WHEN OTHERS THEN
    INSERT INTO claim_attempts (
      artist_id,
      user_id,
      instagram_handle_attempted,
      artist_handle,
      outcome
    ) VALUES (
      p_artist_id,
      p_user_id,
      p_instagram_handle,
      COALESCE(v_artist_handle, 'unknown'),
      'error'
    );
    RETURN jsonb_build_object(
      'success', false,
      'error', 'server_error',
      'message', 'An unexpected error occurred'
    );
END;
$$;

-- 4.19 log_email_send
CREATE OR REPLACE FUNCTION public.log_email_send(p_recipient_email text, p_user_id uuid, p_artist_id uuid, p_email_type text, p_subject text, p_success boolean, p_error_message text DEFAULT NULL, p_resend_id text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO email_log (
    recipient_email,
    user_id,
    artist_id,
    email_type,
    subject,
    success,
    error_message,
    resend_id
  ) VALUES (
    p_recipient_email,
    p_user_id,
    p_artist_id,
    p_email_type,
    p_subject,
    p_success,
    p_error_message,
    p_resend_id
  ) RETURNING id INTO v_log_id;
  RETURN v_log_id;
END;
$$;

-- 4.20 check_email_rate_limit
CREATE OR REPLACE FUNCTION public.check_email_rate_limit(p_recipient_email text, p_email_type text, p_max_per_hour integer DEFAULT 10, p_max_per_day integer DEFAULT 50)
RETURNS TABLE(allowed boolean, hourly_count integer, daily_count integer, reason text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_hourly_count INTEGER;
  v_daily_count INTEGER;
  v_one_hour_ago TIMESTAMPTZ;
  v_one_day_ago TIMESTAMPTZ;
BEGIN
  v_one_hour_ago := NOW() - INTERVAL '1 hour';
  v_one_day_ago := NOW() - INTERVAL '24 hours';
  SELECT COUNT(*) INTO v_hourly_count
  FROM email_log
  WHERE recipient_email = p_recipient_email
    AND email_type = p_email_type
    AND sent_at >= v_one_hour_ago
    AND success = TRUE;
  SELECT COUNT(*) INTO v_daily_count
  FROM email_log
  WHERE recipient_email = p_recipient_email
    AND email_type = p_email_type
    AND sent_at >= v_one_day_ago
    AND success = TRUE;
  IF v_hourly_count >= p_max_per_hour THEN
    RETURN QUERY SELECT
      FALSE,
      v_hourly_count,
      v_daily_count,
      format('Rate limit exceeded: %s emails of type %s sent in last hour (max %s)',
        v_hourly_count, p_email_type, p_max_per_hour);
    RETURN;
  END IF;
  IF v_daily_count >= p_max_per_day THEN
    RETURN QUERY SELECT
      FALSE,
      v_hourly_count,
      v_daily_count,
      format('Rate limit exceeded: %s emails of type %s sent in last 24 hours (max %s)',
        v_daily_count, p_email_type, p_max_per_day);
    RETURN;
  END IF;
  RETURN QUERY SELECT
    TRUE,
    v_hourly_count,
    v_daily_count,
    NULL::TEXT;
END;
$$;

-- 4.21 unsubscribe_from_emails
CREATE OR REPLACE FUNCTION public.unsubscribe_from_emails(p_email text, p_unsubscribe_all boolean DEFAULT true, p_reason text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_pref_id UUID;
BEGIN
  INSERT INTO email_preferences (
    email,
    unsubscribed_all,
    unsubscribed_at,
    unsubscribe_reason
  ) VALUES (
    p_email,
    p_unsubscribe_all,
    NOW(),
    p_reason
  )
  ON CONFLICT (email) DO UPDATE SET
    unsubscribed_all = p_unsubscribe_all,
    unsubscribed_at = NOW(),
    unsubscribe_reason = COALESCE(EXCLUDED.unsubscribe_reason, email_preferences.unsubscribe_reason),
    updated_at = NOW()
  RETURNING id INTO v_pref_id;
  RETURN v_pref_id;
END;
$$;

-- 4.22 cleanup_old_email_logs
CREATE OR REPLACE FUNCTION public.cleanup_old_email_logs()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM email_log
  WHERE sent_at < NOW() - INTERVAL '90 days';
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$;

-- 4.23 get_mining_city_distribution
CREATE OR REPLACE FUNCTION public.get_mining_city_distribution()
RETURNS json
LANGUAGE plpgsql
STABLE
SET search_path = 'public'
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(json_object_agg(city, count), '{}'::JSON)
    FROM (
      SELECT
        city,
        COUNT(*) as count
      FROM artists
      WHERE discovery_source LIKE '%mining%'
        AND deleted_at IS NULL
        AND city IS NOT NULL
      GROUP BY city
      ORDER BY count DESC
    ) subquery
  );
END;
$$;

-- 4.24 sync_artist_to_locations (trigger function - no-op after column removal)
CREATE OR REPLACE FUNCTION public.sync_artist_to_locations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- No-op: city/state columns removed from artists table
  -- artist_locations is now source of truth
  RETURN NEW;
END;
$$;

-- 4.25 increment_profile_view
CREATE OR REPLACE FUNCTION public.increment_profile_view(p_artist_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO artist_analytics (artist_id, date, profile_views)
  VALUES (p_artist_id, CURRENT_DATE, 1)
  ON CONFLICT (artist_id, date)
  DO UPDATE SET profile_views = artist_analytics.profile_views + 1;
END;
$$;

-- ============================================================================
-- PART 5: FIX VAULT FUNCTIONS WITH PROPER SCHEMA ACCESS
-- ============================================================================
-- These need access to vault and pgsodium schemas for Supabase Vault encryption

-- 5.1 vault_create_secret
CREATE OR REPLACE FUNCTION vault_create_secret(
  secret TEXT,
  name TEXT,
  description TEXT DEFAULT NULL
)
RETURNS TABLE(id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault, pgsodium
AS $$
DECLARE
  secret_id UUID;
BEGIN
  INSERT INTO vault.secrets (secret, name, description)
  VALUES (secret, name, description)
  RETURNING vault.secrets.id INTO secret_id;
  RETURN QUERY SELECT secret_id;
END;
$$;

-- 5.2 vault_update_secret
CREATE OR REPLACE FUNCTION vault_update_secret(
  secret_id UUID,
  new_secret TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault, pgsodium
AS $$
BEGIN
  UPDATE vault.secrets
  SET secret = new_secret,
      updated_at = NOW()
  WHERE id = secret_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Vault secret % not found', secret_id;
  END IF;
END;
$$;

-- 5.3 vault_delete_secret
CREATE OR REPLACE FUNCTION vault_delete_secret(
  secret_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault, pgsodium
AS $$
BEGIN
  DELETE FROM vault.secrets WHERE id = secret_id;
END;
$$;

-- 5.4 vault_get_decrypted_secret
CREATE OR REPLACE FUNCTION vault_get_decrypted_secret(
  secret_id UUID
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault, pgsodium
AS $$
DECLARE
  decrypted TEXT;
BEGIN
  SELECT decrypted_secret INTO decrypted
  FROM vault.decrypted_secrets
  WHERE id = secret_id;
  RETURN decrypted;
END;
$$;

-- 5.5 user_has_vault_tokens
CREATE OR REPLACE FUNCTION user_has_vault_tokens(user_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  vault_id UUID;
BEGIN
  SELECT instagram_token_vault_id INTO vault_id
  FROM users
  WHERE id = user_id_param;
  IF vault_id IS NULL THEN
    RETURN FALSE;
  END IF;
  RETURN EXISTS (
    SELECT 1
    FROM vault.secrets
    WHERE id = vault_id
  );
END;
$$;

-- Grant execute permissions on vault functions
GRANT EXECUTE ON FUNCTION vault_create_secret(TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION vault_update_secret(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION vault_delete_secret(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION vault_get_decrypted_secret(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION user_has_vault_tokens(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION user_has_vault_tokens(UUID) TO service_role;

-- ============================================================================
-- PART 6: VAULT SCHEMA PERMISSIONS (pgsodium grants removed - platform restriction)
-- ============================================================================
-- Note: pgsodium function grants fail on Supabase platform (permission denied)
-- Since we use pgcrypto for token encryption now, Vault/pgsodium is optional

-- Ensure vault schema permissions (for legacy vault functions if needed)
GRANT USAGE ON SCHEMA vault TO service_role;

-- ============================================================================
-- DONE: All schema drift issues fixed
-- ============================================================================
