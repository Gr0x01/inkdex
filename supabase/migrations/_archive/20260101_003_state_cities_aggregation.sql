-- Get cities in a state with artist counts
-- Replaces JavaScript aggregation with SQL GROUP BY for better performance
CREATE OR REPLACE FUNCTION get_state_cities_with_counts(
  state_code text
)
RETURNS TABLE (
  city text,
  artist_count bigint
)
LANGUAGE sql STABLE
AS $$
  SELECT
    city,
    COUNT(*) AS artist_count
  FROM artists
  WHERE state = state_code
  GROUP BY city
  ORDER BY artist_count DESC;
$$;

COMMENT ON FUNCTION get_state_cities_with_counts IS
  'Get cities in a state with artist counts. Optimized SQL GROUP BY aggregation.';
