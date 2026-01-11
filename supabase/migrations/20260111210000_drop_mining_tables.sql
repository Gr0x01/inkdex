-- Drop mining tables (feature never worked reliably, ScrapingDog doesn't support it)
-- Tables: hashtag_mining_runs, follower_mining_runs, mining_candidates
-- Note: These tables may already be dropped - this migration is idempotent

-- Drop tables (CASCADE removes RLS policies and any remaining dependencies)
-- Using CASCADE means we don't need to drop policies separately
DROP TABLE IF EXISTS hashtag_mining_runs CASCADE;
DROP TABLE IF EXISTS follower_mining_runs CASCADE;
DROP TABLE IF EXISTS mining_candidates CASCADE;
