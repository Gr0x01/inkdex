-- Fix duplicate search_id values in get_recent_search_appearances
-- This was causing React key errors in the dashboard RecentSearchesTable component
--
-- Root cause: search_appearances table can have multiple rows for the same
-- (search_id, artist_id) pair if tracking runs multiple times. The function
-- didn't deduplicate, causing duplicate keys in the UI.
--
-- Fix: Use DISTINCT ON (sa.search_id) to ensure unique search IDs

DROP FUNCTION IF EXISTS get_recent_search_appearances(uuid, integer, integer);

CREATE OR REPLACE FUNCTION get_recent_search_appearances(
  p_artist_id uuid,
  p_days integer,
  p_limit integer DEFAULT 20
)
RETURNS TABLE (
  sa_search_id uuid,
  sa_rank_position integer,
  sa_similarity_score double precision,
  sa_boosted_score double precision,
  sa_created_at timestamp with time zone,
  s_query_type text,
  s_query_text text,
  s_instagram_username text
)
LANGUAGE plpgsql STABLE
AS $$
BEGIN
  RETURN QUERY
  WITH recent_appearances AS (
    -- Use DISTINCT ON to ensure unique search_id (prevents duplicate key errors in UI)
    SELECT DISTINCT ON (sa.search_id)
      sa.search_id AS ra_search_id,
      sa.rank_position AS ra_rank_position,
      sa.similarity_score AS ra_similarity_score,
      sa.boosted_score AS ra_boosted_score,
      sa.created_at AS ra_created_at
    FROM search_appearances sa
    WHERE
      sa.artist_id = p_artist_id
      AND (p_days IS NULL OR sa.created_at >= NOW() - (p_days || ' days')::INTERVAL)
    ORDER BY sa.search_id, sa.created_at DESC
  )
  SELECT
    ra.ra_search_id,
    ra.ra_rank_position,
    ra.ra_similarity_score,
    ra.ra_boosted_score,
    ra.ra_created_at,
    s.query_type,
    s.query_text,
    s.instagram_username
  FROM recent_appearances ra
  INNER JOIN searches s ON s.id = ra.ra_search_id
  ORDER BY ra.ra_created_at DESC
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION get_recent_search_appearances IS
  'Get recent search appearances for artist with query details. Uses DISTINCT ON to prevent duplicate search_id values.';
