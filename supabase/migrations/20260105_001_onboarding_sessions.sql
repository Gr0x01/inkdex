-- Phase 5: Onboarding Sessions Table
-- Purpose: Persist onboarding state across page refreshes and navigation steps
-- Auto-expires after 24 hours for cleanup

CREATE TABLE IF NOT EXISTS onboarding_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  artist_id UUID REFERENCES artists(id) ON DELETE CASCADE,

  -- Instagram fetch results stored as JSON
  -- fetched_images: [{ url: string, instagram_post_id: string, caption: string, classified: boolean }]
  fetched_images JSONB,

  -- profile_data: { bio: string, follower_count: number, username: string }
  profile_data JSONB,

  -- User selections across onboarding steps
  selected_image_ids TEXT[],

  -- profile_updates: { name: string, city: string, state: string, bio: string }
  profile_updates JSONB,

  booking_link TEXT,

  -- Progress tracking (1-5 for steps: fetch, preview, portfolio, booking, complete)
  current_step INTEGER DEFAULT 1 CHECK (current_step >= 1 AND current_step <= 5),

  -- Auto-cleanup metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours',

  -- Ensure one session per user-artist combination
  UNIQUE(user_id, artist_id)
);

-- Indexes for performance
CREATE INDEX idx_onboarding_sessions_user_id ON onboarding_sessions(user_id);
CREATE INDEX idx_onboarding_sessions_expires_at ON onboarding_sessions(expires_at);
CREATE INDEX idx_onboarding_sessions_artist_id ON onboarding_sessions(artist_id) WHERE artist_id IS NOT NULL;

-- RLS Policies
ALTER TABLE onboarding_sessions ENABLE ROW LEVEL SECURITY;

-- Users can only read/update their own onboarding sessions
CREATE POLICY "Users can view own onboarding sessions"
  ON onboarding_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own onboarding sessions"
  ON onboarding_sessions
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own onboarding sessions"
  ON onboarding_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own onboarding sessions"
  ON onboarding_sessions
  FOR DELETE
  USING (auth.uid() = user_id);

-- Service role has full access for API operations
CREATE POLICY "Service role full access to onboarding sessions"
  ON onboarding_sessions
  FOR ALL
  USING (auth.role() = 'service_role');

-- Comments for documentation
COMMENT ON TABLE onboarding_sessions IS 'Temporary storage for artist onboarding state. Auto-expires after 24 hours.';
COMMENT ON COLUMN onboarding_sessions.fetched_images IS 'JSON array of Instagram images fetched during Step 1';
COMMENT ON COLUMN onboarding_sessions.profile_data IS 'JSON object with Instagram profile metadata';
COMMENT ON COLUMN onboarding_sessions.selected_image_ids IS 'Array of image IDs user selected for portfolio (max 20)';
COMMENT ON COLUMN onboarding_sessions.profile_updates IS 'JSON object with user edits to artist profile';
COMMENT ON COLUMN onboarding_sessions.current_step IS 'Current onboarding step (1=fetch, 2=preview, 3=portfolio, 4=booking, 5=complete)';
COMMENT ON COLUMN onboarding_sessions.expires_at IS 'Auto-cleanup timestamp. Sessions expire 24 hours after creation.';
