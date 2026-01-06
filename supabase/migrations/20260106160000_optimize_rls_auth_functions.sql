-- ============================================================================
-- Migration: Optimize RLS Policies for Auth Function Performance
-- Description: Wrap auth.uid(), auth.role(), auth.jwt(), auth.email() in
--              subqueries to prevent per-row evaluation during query planning.
--              This resolves "Auth RLS Initialization Plan" warnings from splinter.
-- Date: 2026-01-06
-- ============================================================================

-- The fix: Change `auth.uid()` to `(SELECT auth.uid())` forces PostgreSQL to
-- evaluate the auth function once as a scalar subquery, rather than potentially
-- re-evaluating it for each row during query planning.

-- ============================================================================
-- 1. SAVED_ARTISTS TABLE (3 policies)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own saved artists" ON saved_artists;
CREATE POLICY "Users can view own saved artists" ON saved_artists
  FOR SELECT USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can save artists" ON saved_artists;
CREATE POLICY "Users can save artists" ON saved_artists
  FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can unsave artists" ON saved_artists;
CREATE POLICY "Users can unsave artists" ON saved_artists
  FOR DELETE USING (user_id = (SELECT auth.uid()));

-- ============================================================================
-- 2. USERS TABLE (5 policies)
-- ============================================================================

DROP POLICY IF EXISTS "Users can read own data" ON users;
CREATE POLICY "Users can read own data" ON users
  FOR SELECT USING (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own data" ON users;
CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can insert own data" ON users;
CREATE POLICY "Users can insert own data" ON users
  FOR INSERT WITH CHECK (id = (SELECT auth.uid()));
COMMENT ON POLICY "Users can insert own data" ON users IS 'Allow Supabase Auth to create user records during signup';

DROP POLICY IF EXISTS "Users can insert own profile" ON users;
CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view own profile" ON users;
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Service role full access to users" ON users;
CREATE POLICY "Service role full access to users" ON users
  FOR ALL USING ((SELECT auth.role()) = 'service_role');

-- ============================================================================
-- 3. SEARCHES TABLE (2 policies)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own searches" ON searches;
CREATE POLICY "Users can view own searches" ON searches
  FOR SELECT USING (user_id = (SELECT auth.uid()) OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can insert searches" ON searches;
CREATE POLICY "Users can insert searches" ON searches
  FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()) OR user_id IS NULL);

-- ============================================================================
-- 4. ARTISTS TABLE (5 policies with auth functions)
-- ============================================================================

DROP POLICY IF EXISTS "Artists can update own profile" ON artists;
CREATE POLICY "Artists can update own profile" ON artists
  FOR UPDATE USING (claimed_by_user_id = (SELECT auth.uid()) AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Claimed artists can update own profile" ON artists;
CREATE POLICY "Claimed artists can update own profile" ON artists
  FOR UPDATE USING (claimed_by_user_id = (SELECT auth.uid()))
  WITH CHECK (claimed_by_user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Service role can delete artists" ON artists;
CREATE POLICY "Service role can delete artists" ON artists
  FOR DELETE USING (((SELECT auth.jwt()) ->> 'role') = 'service_role');

DROP POLICY IF EXISTS "Service role can insert artists" ON artists;
CREATE POLICY "Service role can insert artists" ON artists
  FOR INSERT WITH CHECK (((SELECT auth.jwt()) ->> 'role') = 'service_role');

DROP POLICY IF EXISTS "Service role can update artists" ON artists;
CREATE POLICY "Service role can update artists" ON artists
  FOR UPDATE USING (((SELECT auth.jwt()) ->> 'role') = 'service_role');

DROP POLICY IF EXISTS "Service role full access to artists" ON artists;
CREATE POLICY "Service role full access to artists" ON artists
  FOR ALL USING ((SELECT auth.role()) = 'service_role');

-- ============================================================================
-- 5. PORTFOLIO_IMAGES TABLE (8 policies with auth functions)
-- ============================================================================

DROP POLICY IF EXISTS "Artists can delete own images" ON portfolio_images;
CREATE POLICY "Artists can delete own images" ON portfolio_images
  FOR DELETE USING (artist_id IN (
    SELECT id FROM artists WHERE claimed_by_user_id = (SELECT auth.uid())
  ));

DROP POLICY IF EXISTS "Artists can insert own images" ON portfolio_images;
CREATE POLICY "Artists can insert own images" ON portfolio_images
  FOR INSERT WITH CHECK (artist_id IN (
    SELECT id FROM artists WHERE claimed_by_user_id = (SELECT auth.uid())
  ));

DROP POLICY IF EXISTS "Artists can read own images" ON portfolio_images;
CREATE POLICY "Artists can read own images" ON portfolio_images
  FOR SELECT USING (artist_id IN (
    SELECT id FROM artists WHERE claimed_by_user_id = (SELECT auth.uid())
  ));

DROP POLICY IF EXISTS "Artists can update own images" ON portfolio_images;
CREATE POLICY "Artists can update own images" ON portfolio_images
  FOR UPDATE USING (artist_id IN (
    SELECT id FROM artists WHERE claimed_by_user_id = (SELECT auth.uid())
  ));

DROP POLICY IF EXISTS "Claimed artists can manage own portfolio images" ON portfolio_images;
CREATE POLICY "Claimed artists can manage own portfolio images" ON portfolio_images
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM artists
    WHERE artists.id = portfolio_images.artist_id
    AND artists.claimed_by_user_id = (SELECT auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM artists
    WHERE artists.id = portfolio_images.artist_id
    AND artists.claimed_by_user_id = (SELECT auth.uid())
  ));

DROP POLICY IF EXISTS "Service role can delete portfolio images" ON portfolio_images;
CREATE POLICY "Service role can delete portfolio images" ON portfolio_images
  FOR DELETE USING (((SELECT auth.jwt()) ->> 'role') = 'service_role');

DROP POLICY IF EXISTS "Service role can insert portfolio images" ON portfolio_images;
CREATE POLICY "Service role can insert portfolio images" ON portfolio_images
  FOR INSERT WITH CHECK (((SELECT auth.jwt()) ->> 'role') = 'service_role');

DROP POLICY IF EXISTS "Service role can update portfolio images" ON portfolio_images;
CREATE POLICY "Service role can update portfolio images" ON portfolio_images
  FOR UPDATE USING (((SELECT auth.jwt()) ->> 'role') = 'service_role');

DROP POLICY IF EXISTS "Service role full access to portfolio_images" ON portfolio_images;
CREATE POLICY "Service role full access to portfolio_images" ON portfolio_images
  FOR ALL USING ((SELECT auth.role()) = 'service_role');

-- ============================================================================
-- 6. ARTIST_ANALYTICS TABLE (2 policies)
-- ============================================================================

DROP POLICY IF EXISTS "Artists can read own analytics" ON artist_analytics;
CREATE POLICY "Artists can read own analytics" ON artist_analytics
  FOR SELECT USING (artist_id IN (
    SELECT id FROM artists WHERE claimed_by_user_id = (SELECT auth.uid())
  ));

DROP POLICY IF EXISTS "Service role full access to analytics" ON artist_analytics;
CREATE POLICY "Service role full access to analytics" ON artist_analytics
  FOR ALL USING ((SELECT auth.role()) = 'service_role');

-- ============================================================================
-- 7. PORTFOLIO_IMAGE_ANALYTICS TABLE (2 policies)
-- ============================================================================

DROP POLICY IF EXISTS "Artists can read own image analytics" ON portfolio_image_analytics;
CREATE POLICY "Artists can read own image analytics" ON portfolio_image_analytics
  FOR SELECT USING (artist_id IN (
    SELECT id FROM artists WHERE claimed_by_user_id = (SELECT auth.uid())
  ));

DROP POLICY IF EXISTS "Service role full access to image analytics" ON portfolio_image_analytics;
CREATE POLICY "Service role full access to image analytics" ON portfolio_image_analytics
  FOR ALL USING ((SELECT auth.role()) = 'service_role');

-- ============================================================================
-- 8. SEARCH_APPEARANCES TABLE (2 policies)
-- ============================================================================

DROP POLICY IF EXISTS "Artists can read own search appearances" ON search_appearances;
CREATE POLICY "Artists can read own search appearances" ON search_appearances
  FOR SELECT USING (artist_id IN (
    SELECT id FROM artists WHERE claimed_by_user_id = (SELECT auth.uid())
  ));

DROP POLICY IF EXISTS "Service role full access to search appearances" ON search_appearances;
CREATE POLICY "Service role full access to search appearances" ON search_appearances
  FOR ALL USING ((SELECT auth.role()) = 'service_role');

-- ============================================================================
-- 9. INSTAGRAM_SYNC_LOG TABLE (2 policies)
-- ============================================================================

DROP POLICY IF EXISTS "Artists can read own sync logs" ON instagram_sync_log;
CREATE POLICY "Artists can read own sync logs" ON instagram_sync_log
  FOR SELECT USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Service role full access to sync logs" ON instagram_sync_log;
CREATE POLICY "Service role full access to sync logs" ON instagram_sync_log
  FOR ALL USING ((SELECT auth.role()) = 'service_role');

-- ============================================================================
-- 10. ONBOARDING_SESSIONS TABLE (5 policies)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own onboarding sessions" ON onboarding_sessions;
CREATE POLICY "Users can view own onboarding sessions" ON onboarding_sessions
  FOR SELECT USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own onboarding sessions" ON onboarding_sessions;
CREATE POLICY "Users can update own onboarding sessions" ON onboarding_sessions
  FOR UPDATE USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can insert own onboarding sessions" ON onboarding_sessions;
CREATE POLICY "Users can insert own onboarding sessions" ON onboarding_sessions
  FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can delete own onboarding sessions" ON onboarding_sessions;
CREATE POLICY "Users can delete own onboarding sessions" ON onboarding_sessions
  FOR DELETE USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Service role full access to onboarding sessions" ON onboarding_sessions;
CREATE POLICY "Service role full access to onboarding sessions" ON onboarding_sessions
  FOR ALL USING ((SELECT auth.role()) = 'service_role');

-- ============================================================================
-- 11. CLAIM_ATTEMPTS TABLE (2 policies)
-- ============================================================================

DROP POLICY IF EXISTS "Users can read own claim attempts" ON claim_attempts;
CREATE POLICY "Users can read own claim attempts" ON claim_attempts
  FOR SELECT USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Service role full access to claim attempts" ON claim_attempts;
CREATE POLICY "Service role full access to claim attempts" ON claim_attempts
  FOR ALL
  USING ((SELECT auth.role()) = 'service_role')
  WITH CHECK ((SELECT auth.role()) = 'service_role');

-- ============================================================================
-- 12. ARTIST_SUBSCRIPTIONS TABLE (2 policies)
-- ============================================================================

DROP POLICY IF EXISTS "Users can read own subscriptions" ON artist_subscriptions;
CREATE POLICY "Users can read own subscriptions" ON artist_subscriptions
  FOR SELECT USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Service role full access to subscriptions" ON artist_subscriptions;
CREATE POLICY "Service role full access to subscriptions" ON artist_subscriptions
  FOR ALL USING ((SELECT auth.role()) = 'service_role');

-- ============================================================================
-- 13. EMAIL_PREFERENCES TABLE (3 policies)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own email preferences" ON email_preferences;
CREATE POLICY "Users can view their own email preferences" ON email_preferences
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR email = (SELECT auth.email()));

DROP POLICY IF EXISTS "Users can update their own email preferences" ON email_preferences;
CREATE POLICY "Users can update their own email preferences" ON email_preferences
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()) OR email = (SELECT auth.email()));

DROP POLICY IF EXISTS "Users can insert their own email preferences" ON email_preferences;
CREATE POLICY "Users can insert their own email preferences" ON email_preferences
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()) OR email = (SELECT auth.email()));

-- ============================================================================
-- 14. ARTIST_LOCATIONS TABLE (3 policies with auth functions)
-- ============================================================================

DROP POLICY IF EXISTS "artist_locations_insert_own" ON artist_locations;
CREATE POLICY "artist_locations_insert_own" ON artist_locations
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM artists a
    WHERE a.id = artist_locations.artist_id
    AND a.claimed_by_user_id = (SELECT auth.uid())
  ));

DROP POLICY IF EXISTS "artist_locations_update_own" ON artist_locations;
CREATE POLICY "artist_locations_update_own" ON artist_locations
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM artists a
    WHERE a.id = artist_locations.artist_id
    AND a.claimed_by_user_id = (SELECT auth.uid())
  ));

DROP POLICY IF EXISTS "artist_locations_delete_own" ON artist_locations;
CREATE POLICY "artist_locations_delete_own" ON artist_locations
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM artists a
    WHERE a.id = artist_locations.artist_id
    AND a.claimed_by_user_id = (SELECT auth.uid())
  ));

-- ============================================================================
-- 15. PROMO_CODES TABLE (1 policy with auth)
-- ============================================================================

DROP POLICY IF EXISTS "Service role full access to promo codes" ON promo_codes;
CREATE POLICY "Service role full access to promo codes" ON promo_codes
  FOR ALL USING ((SELECT auth.role()) = 'service_role');

-- ============================================================================
-- 16. STYLE_SEEDS TABLE (1 policy with auth)
-- ============================================================================

DROP POLICY IF EXISTS "Service role can manage style seeds" ON style_seeds;
CREATE POLICY "Service role can manage style seeds" ON style_seeds
  FOR ALL USING (((SELECT auth.jwt()) ->> 'role') = 'service_role');

-- ============================================================================
-- 17. IMAGE_STYLE_TAGS TABLE (1 policy with auth)
-- ============================================================================

DROP POLICY IF EXISTS "Service role manage style tags" ON image_style_tags;
CREATE POLICY "Service role manage style tags" ON image_style_tags
  FOR ALL USING ((SELECT auth.role()) = 'service_role');
COMMENT ON POLICY "Service role manage style tags" ON image_style_tags IS 'Only service role can modify style tags (batch processing scripts)';

-- ============================================================================
-- 18. DISCOVERY_QUERIES TABLE (1 policy)
-- ============================================================================

DROP POLICY IF EXISTS "Service role full access" ON discovery_queries;
CREATE POLICY "Service role full access" ON discovery_queries
  FOR ALL USING ((SELECT auth.role()) = 'service_role');

-- ============================================================================
-- 19. HASHTAG_MINING_RUNS TABLE (1 policy)
-- ============================================================================

DROP POLICY IF EXISTS "Service role full access on hashtag_mining_runs" ON hashtag_mining_runs;
CREATE POLICY "Service role full access on hashtag_mining_runs" ON hashtag_mining_runs
  FOR ALL USING ((SELECT auth.role()) = 'service_role');

-- ============================================================================
-- 20. FOLLOWER_MINING_RUNS TABLE (1 policy)
-- ============================================================================

DROP POLICY IF EXISTS "Service role full access on follower_mining_runs" ON follower_mining_runs;
CREATE POLICY "Service role full access on follower_mining_runs" ON follower_mining_runs
  FOR ALL USING ((SELECT auth.role()) = 'service_role');

-- ============================================================================
-- 21. MINING_CANDIDATES TABLE (1 policy)
-- ============================================================================

DROP POLICY IF EXISTS "Service role full access on mining_candidates" ON mining_candidates;
CREATE POLICY "Service role full access on mining_candidates" ON mining_candidates
  FOR ALL USING ((SELECT auth.role()) = 'service_role');

-- ============================================================================
-- 22. PIPELINE_RUNS TABLE (1 policy)
-- ============================================================================

DROP POLICY IF EXISTS "Service role full access to pipeline_runs" ON pipeline_runs;
CREATE POLICY "Service role full access to pipeline_runs" ON pipeline_runs
  FOR ALL
  USING ((SELECT auth.role()) = 'service_role')
  WITH CHECK ((SELECT auth.role()) = 'service_role');
COMMENT ON POLICY "Service role full access to pipeline_runs" ON pipeline_runs IS 'Only service role can access pipeline run data (admin operations only)';

-- ============================================================================
-- 23. SCRAPING_JOBS TABLE (1 policy)
-- ============================================================================

DROP POLICY IF EXISTS "Service role full access to scraping_jobs" ON scraping_jobs;
CREATE POLICY "Service role full access to scraping_jobs" ON scraping_jobs
  FOR ALL USING ((SELECT auth.role()) = 'service_role');
COMMENT ON POLICY "Service role full access to scraping_jobs" ON scraping_jobs IS 'Only service role can access scraping job data (admin operations only)';

-- ============================================================================
-- VERIFICATION: Count policies updated
-- ============================================================================

DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public';

  RAISE NOTICE 'Total RLS policies in public schema: %', policy_count;
END $$;
