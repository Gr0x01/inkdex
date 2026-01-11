-- Drop mining tables (feature never worked reliably, ScrapingDog doesn't support it)
-- Tables: hashtag_mining_runs, follower_mining_runs, mining_candidates

-- Drop RLS policies first
DROP POLICY IF EXISTS "Service role full access to hashtag_mining_runs" ON hashtag_mining_runs;
DROP POLICY IF EXISTS "Service role full access to follower_mining_runs" ON follower_mining_runs;
DROP POLICY IF EXISTS "Service role full access to mining_candidates" ON mining_candidates;

-- Drop tables (CASCADE removes any remaining dependencies)
DROP TABLE IF EXISTS hashtag_mining_runs CASCADE;
DROP TABLE IF EXISTS follower_mining_runs CASCADE;
DROP TABLE IF EXISTS mining_candidates CASCADE;
