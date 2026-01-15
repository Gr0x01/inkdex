-- Migration: Drop unused increment_analytics function
-- Analytics are now tracked via PostHog and synced to analytics_cache table
-- This function wrote to artist_analytics which is no longer the source of truth

DROP FUNCTION IF EXISTS increment_analytics(text, uuid, uuid);
