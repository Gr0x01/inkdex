-- Migration: Dynamic City Page Generation
-- Description: Add RPC function to get all cities with minimum artist count for static page generation
-- Date: 2026-01-10

-- Get all cities with minimum artist count (for dynamic page generation at build time)
-- Returns cities with at least min_artist_count artists
-- Used by: generateStaticParams() in city and style pages
CREATE OR REPLACE FUNCTION get_all_cities_with_min_artists(min_artist_count integer DEFAULT 3)
RETURNS TABLE (
  city text,
  region text,
  country_code text,
  artist_count bigint
)
LANGUAGE sql STABLE
SECURITY DEFINER
AS $$
  SELECT
    LOWER(al.city) as city,
    al.region,
    al.country_code,
    COUNT(DISTINCT al.artist_id) AS artist_count
  FROM artist_locations al
  INNER JOIN artists a ON a.id = al.artist_id
  WHERE al.city IS NOT NULL
    AND al.country_code = 'US'
    AND a.deleted_at IS NULL
  GROUP BY LOWER(al.city), al.region, al.country_code
  HAVING COUNT(DISTINCT al.artist_id) >= min_artist_count
  ORDER BY artist_count DESC, city ASC;
$$;

-- Grant execute permission to authenticated and anon users
-- (anon needed for build-time execution via Supabase client)
GRANT EXECUTE ON FUNCTION get_all_cities_with_min_artists(integer) TO authenticated, anon;

-- Add comment for documentation
COMMENT ON FUNCTION get_all_cities_with_min_artists IS 'Returns all US cities with at least min_artist_count active artists. Used by Next.js generateStaticParams() for dynamic city and style page generation at build time. Cities are normalized to lowercase for URL slugs.';
