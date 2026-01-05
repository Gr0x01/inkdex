-- Migration: Multi-Location UI Support
-- Description: Add RPC function to get cities with artist counts for dynamic filter
-- Date: 2026-01-09

-- Get cities with artist counts (for dynamic city filter in search UI)
-- Returns cities with at least min_count artists
-- Used by: /api/cities/with-counts endpoint
CREATE OR REPLACE FUNCTION get_cities_with_counts(min_count integer DEFAULT 5)
RETURNS TABLE (
  city text,
  region text,
  artist_count bigint
)
LANGUAGE sql STABLE
SECURITY DEFINER
AS $$
  SELECT
    al.city,
    al.region,
    COUNT(DISTINCT al.artist_id) AS artist_count
  FROM artist_locations al
  INNER JOIN artists a ON a.id = al.artist_id
  WHERE al.city IS NOT NULL
    AND al.country_code = 'US'
    AND a.deleted_at IS NULL
  GROUP BY al.city, al.region
  HAVING COUNT(DISTINCT al.artist_id) >= min_count
  ORDER BY artist_count DESC, al.city ASC;
$$;

-- Grant execute permission to authenticated and anon users
GRANT EXECUTE ON FUNCTION get_cities_with_counts(integer) TO authenticated, anon;

-- Add comment for documentation
COMMENT ON FUNCTION get_cities_with_counts IS 'Returns cities with at least min_count active artists. Used for dynamic city filter dropdown in search UI. Excludes soft-deleted artists.';
