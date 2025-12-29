-- Row Level Security (RLS) for future auth

-- ============================================
-- saved_artists table RLS
-- ============================================
ALTER TABLE saved_artists ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own saved artists
CREATE POLICY "Users can view own saved artists"
  ON saved_artists FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can only insert their own saved artists
CREATE POLICY "Users can save artists"
  ON saved_artists FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only delete their own saved artists
CREATE POLICY "Users can unsave artists"
  ON saved_artists FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- users table RLS
-- ============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- Policy: New users can insert their own profile (during signup)
CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================
-- searches table RLS (privacy)
-- ============================================
ALTER TABLE searches ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own searches (or anonymous searches)
CREATE POLICY "Users can view own searches"
  ON searches FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

-- Policy: Users can insert their own searches (or anonymous)
CREATE POLICY "Users can insert searches"
  ON searches FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- ============================================
-- artists table RLS
-- ============================================
ALTER TABLE artists ENABLE ROW LEVEL SECURITY;

-- Policy: Public read access to all artists (for search and browsing)
CREATE POLICY "Public read access to artists"
  ON artists FOR SELECT
  USING (true);

-- Policy: Only service role can insert artists (from scraping scripts)
CREATE POLICY "Service role can insert artists"
  ON artists FOR INSERT
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- Policy: Claimed artists can update their own profiles
CREATE POLICY "Claimed artists can update own profile"
  ON artists FOR UPDATE
  USING (claimed_by_user_id = auth.uid())
  WITH CHECK (claimed_by_user_id = auth.uid());

-- Policy: Only service role can delete artists (data cleanup)
CREATE POLICY "Service role can delete artists"
  ON artists FOR DELETE
  USING (auth.jwt()->>'role' = 'service_role');

-- ============================================
-- portfolio_images table RLS
-- ============================================
ALTER TABLE portfolio_images ENABLE ROW LEVEL SECURITY;

-- Policy: Public read access to active portfolio images only
CREATE POLICY "Public read access to active portfolio images"
  ON portfolio_images FOR SELECT
  USING (status = 'active');

-- Policy: Only service role can insert portfolio images (from scraping)
CREATE POLICY "Service role can insert portfolio images"
  ON portfolio_images FOR INSERT
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- Policy: Claimed artists can update their own portfolio images (feature/hide)
CREATE POLICY "Claimed artists can manage own portfolio images"
  ON portfolio_images FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM artists
      WHERE artists.id = portfolio_images.artist_id
      AND artists.claimed_by_user_id = auth.uid()
    )
  );

-- Policy: Only service role can delete portfolio images (data cleanup)
CREATE POLICY "Service role can delete portfolio images"
  ON portfolio_images FOR DELETE
  USING (auth.jwt()->>'role' = 'service_role');
