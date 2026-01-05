-- Count matching artists for pagination
-- Mirrors filtering logic from search_artists_by_embedding() but returns count only

CREATE OR REPLACE FUNCTION count_matching_artists(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.5,
  city_filter text DEFAULT NULL
)
RETURNS TABLE (count bigint)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH filtered_artists AS (
    -- Apply city filter first (same as search function)
    SELECT id
    FROM artists
    WHERE (city_filter IS NULL OR artists.city = city_filter)
  ),
  matching_artists AS (
    -- Find artists with at least one matching image
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

COMMENT ON FUNCTION count_matching_artists IS
  'Count total matching artists for pagination. Mirrors search_artists_by_embedding() filtering logic.';
