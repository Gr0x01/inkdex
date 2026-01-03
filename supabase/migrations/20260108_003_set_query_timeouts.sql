-- ============================================
-- Database Query Timeouts Configuration
-- ============================================
-- Prevents hung queries from holding connections indefinitely
-- Critical for ProductHunt launch to prevent cascading failures
--
-- Timeout: 5 seconds (5000ms)
-- - Long enough for complex vector searches
-- - Short enough to prevent connection exhaustion
--
-- Created: 2026-01-08
-- Priority: CRITICAL for ProductHunt launch
-- ============================================

-- Set statement timeout for the entire database
-- This applies to all future connections
ALTER DATABASE postgres SET statement_timeout = '5s';

-- Apply timeout to current session immediately
SET statement_timeout = '5s';

-- Log the change
DO $$
BEGIN
  RAISE NOTICE 'Database query timeout set to 5 seconds';
  RAISE NOTICE 'This prevents hung queries from holding connections';
  RAISE NOTICE 'All queries exceeding 5s will be automatically cancelled';
END $$;

-- ============================================
-- Verification
-- ============================================
-- Check current timeout setting:
-- SHOW statement_timeout;
--
-- Should return: 5s
-- ============================================

-- ============================================
-- Monitoring Long Queries
-- ============================================
-- To monitor long-running queries:
--
-- SELECT
--   pid,
--   now() - query_start AS duration,
--   state,
--   query
-- FROM pg_stat_activity
-- WHERE state != 'idle'
--   AND query NOT ILIKE '%pg_stat_activity%'
-- ORDER BY duration DESC
-- LIMIT 10;
-- ============================================

-- ============================================
-- Adjusting Timeout (if needed)
-- ============================================
-- If 5s is too aggressive:
--   ALTER DATABASE postgres SET statement_timeout = '10s';
--
-- If 5s is too lenient:
--   ALTER DATABASE postgres SET statement_timeout = '3s';
--
-- For specific queries that need more time (migrations, analytics):
--   SET LOCAL statement_timeout = '30s';
--   -- Run your long query here
-- ============================================
