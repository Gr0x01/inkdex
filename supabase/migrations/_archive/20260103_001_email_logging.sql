-- Email Logging & Rate Limiting (Phase 10)
--
-- Creates tables for:
-- 1. Email send logging (audit trail, debugging)
-- 2. Email rate limiting (prevent abuse)
-- 3. Email preferences (unsubscribe management)
--
-- Created: 2026-01-03

-- ============================================
-- Email Log Table
-- ============================================
-- Tracks all email sends for audit, debugging, and compliance

CREATE TABLE IF NOT EXISTS email_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Recipient info
  recipient_email TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  artist_id UUID REFERENCES artists(id) ON DELETE SET NULL,

  -- Email details
  email_type TEXT NOT NULL CHECK (email_type IN (
    'welcome',
    'sync_failed',
    'sync_reauthenticate',
    'subscription_created',
    'subscription_cancelled',
    'downgrade_warning',
    'profile_deleted'
  )),
  subject TEXT NOT NULL,

  -- Delivery tracking
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success BOOLEAN NOT NULL,
  error_message TEXT,
  resend_id TEXT, -- Resend email ID for tracking

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_email_log_recipient_type_sent
  ON email_log(recipient_email, email_type, sent_at DESC);

CREATE INDEX idx_email_log_sent_at
  ON email_log(sent_at DESC);

CREATE INDEX idx_email_log_user_id
  ON email_log(user_id) WHERE user_id IS NOT NULL;

CREATE INDEX idx_email_log_artist_id
  ON email_log(artist_id) WHERE artist_id IS NOT NULL;

COMMENT ON TABLE email_log IS 'Audit trail of all emails sent by the system';

-- ============================================
-- Email Preferences Table
-- ============================================
-- User email preferences and unsubscribe management

CREATE TABLE IF NOT EXISTS email_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,

  -- Subscription preferences (all default to true)
  receive_welcome BOOLEAN NOT NULL DEFAULT TRUE,
  receive_sync_notifications BOOLEAN NOT NULL DEFAULT TRUE,
  receive_subscription_updates BOOLEAN NOT NULL DEFAULT TRUE,
  receive_marketing BOOLEAN NOT NULL DEFAULT FALSE, -- Future: marketing emails

  -- Unsubscribe tracking
  unsubscribed_all BOOLEAN NOT NULL DEFAULT FALSE,
  unsubscribed_at TIMESTAMPTZ,
  unsubscribe_reason TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  UNIQUE(user_id),
  UNIQUE(email)
);

CREATE INDEX idx_email_preferences_email
  ON email_preferences(email);

CREATE INDEX idx_email_preferences_user_id
  ON email_preferences(user_id) WHERE user_id IS NOT NULL;

COMMENT ON TABLE email_preferences IS 'User email subscription preferences and unsubscribe management';

-- ============================================
-- Helper Functions
-- ============================================

-- Function to log email send
CREATE OR REPLACE FUNCTION log_email_send(
  p_recipient_email TEXT,
  p_user_id UUID,
  p_artist_id UUID,
  p_email_type TEXT,
  p_subject TEXT,
  p_success BOOLEAN,
  p_error_message TEXT DEFAULT NULL,
  p_resend_id TEXT DEFAULT NULL
) RETURNS UUID AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION log_email_send IS 'Log an email send attempt with success/failure status';

-- Function to check email rate limit
CREATE OR REPLACE FUNCTION check_email_rate_limit(
  p_recipient_email TEXT,
  p_email_type TEXT,
  p_max_per_hour INTEGER DEFAULT 10,
  p_max_per_day INTEGER DEFAULT 50
) RETURNS TABLE (
  allowed BOOLEAN,
  hourly_count INTEGER,
  daily_count INTEGER,
  reason TEXT
) AS $$
DECLARE
  v_hourly_count INTEGER;
  v_daily_count INTEGER;
  v_one_hour_ago TIMESTAMPTZ;
  v_one_day_ago TIMESTAMPTZ;
BEGIN
  v_one_hour_ago := NOW() - INTERVAL '1 hour';
  v_one_day_ago := NOW() - INTERVAL '24 hours';

  -- Count emails sent in last hour
  SELECT COUNT(*) INTO v_hourly_count
  FROM email_log
  WHERE recipient_email = p_recipient_email
    AND email_type = p_email_type
    AND sent_at >= v_one_hour_ago
    AND success = TRUE;

  -- Count emails sent in last 24 hours
  SELECT COUNT(*) INTO v_daily_count
  FROM email_log
  WHERE recipient_email = p_recipient_email
    AND email_type = p_email_type
    AND sent_at >= v_one_day_ago
    AND success = TRUE;

  -- Check hourly limit
  IF v_hourly_count >= p_max_per_hour THEN
    RETURN QUERY SELECT
      FALSE,
      v_hourly_count,
      v_daily_count,
      format('Rate limit exceeded: %s emails of type %s sent in last hour (max %s)',
        v_hourly_count, p_email_type, p_max_per_hour);
    RETURN;
  END IF;

  -- Check daily limit
  IF v_daily_count >= p_max_per_day THEN
    RETURN QUERY SELECT
      FALSE,
      v_hourly_count,
      v_daily_count,
      format('Rate limit exceeded: %s emails of type %s sent in last 24 hours (max %s)',
        v_daily_count, p_email_type, p_max_per_day);
    RETURN;
  END IF;

  -- Allowed
  RETURN QUERY SELECT
    TRUE,
    v_hourly_count,
    v_daily_count,
    NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION check_email_rate_limit IS 'Check if email send is within rate limits';

-- Function to check if user can receive email type
CREATE OR REPLACE FUNCTION can_receive_email(
  p_email TEXT,
  p_email_type TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_preferences RECORD;
BEGIN
  -- Get preferences (returns NULL if not found)
  SELECT * INTO v_preferences
  FROM email_preferences
  WHERE email = p_email;

  -- If no preferences exist, allow by default (user hasn't unsubscribed)
  IF v_preferences IS NULL THEN
    RETURN TRUE;
  END IF;

  -- Check if unsubscribed from all emails
  IF v_preferences.unsubscribed_all THEN
    RETURN FALSE;
  END IF;

  -- Check specific email type preferences
  CASE p_email_type
    WHEN 'welcome' THEN
      RETURN v_preferences.receive_welcome;
    WHEN 'sync_failed', 'sync_reauthenticate' THEN
      RETURN v_preferences.receive_sync_notifications;
    WHEN 'subscription_created', 'subscription_cancelled', 'downgrade_warning' THEN
      RETURN v_preferences.receive_subscription_updates;
    ELSE
      -- Unknown type, allow by default
      RETURN TRUE;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION can_receive_email IS 'Check if user has opted in to receive this email type';

-- Function to unsubscribe user from emails
CREATE OR REPLACE FUNCTION unsubscribe_from_emails(
  p_email TEXT,
  p_unsubscribe_all BOOLEAN DEFAULT TRUE,
  p_reason TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_pref_id UUID;
BEGIN
  -- Upsert email preferences
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION unsubscribe_from_emails IS 'Unsubscribe user from emails';

-- ============================================
-- RLS Policies
-- ============================================

-- Email log: Service role only (no user access, for system use only)
ALTER TABLE email_log ENABLE ROW LEVEL SECURITY;

-- No policies - only accessible via service role or SECURITY DEFINER functions

-- Email preferences: Users can manage their own preferences
ALTER TABLE email_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own email preferences"
  ON email_preferences FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR email = auth.email());

CREATE POLICY "Users can update their own email preferences"
  ON email_preferences FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR email = auth.email());

CREATE POLICY "Users can insert their own email preferences"
  ON email_preferences FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR email = auth.email());

-- ============================================
-- Cleanup Job (Optional - can be run via cron)
-- ============================================

-- Function to clean up old email logs (keep last 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_email_logs()
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM email_log
  WHERE sent_at < NOW() - INTERVAL '90 days';

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION cleanup_old_email_logs IS 'Delete email logs older than 90 days (for GDPR compliance)';
