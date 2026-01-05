-- ============================================================================
-- Admin Artist Table Sorting and Image Filtering
-- ============================================================================
-- Adds sorting and image filter support to get_artists_with_image_counts()
-- Used by: /app/api/admin/artists/route.ts
--
-- New parameters:
--   p_has_images BOOLEAN - Filter by has images (true), no images (false), or any (null)
--   p_sort_by TEXT - Column to sort by (instagram_handle, name, city, verification_status, image_count, is_featured)
--   p_sort_order TEXT - Sort order (asc or desc)

-- Drop existing function to replace with new signature
DROP FUNCTION IF EXISTS get_artists_with_image_counts(INT, INT, TEXT, TEXT, TEXT, TEXT, BOOLEAN);

CREATE OR REPLACE FUNCTION get_artists_with_image_counts(
  p_offset INT,
  p_limit INT,
  p_search TEXT DEFAULT NULL,
  p_location_city TEXT DEFAULT NULL,
  p_location_state TEXT DEFAULT NULL,
  p_tier TEXT DEFAULT NULL,
  p_is_featured BOOLEAN DEFAULT NULL,
  p_has_images BOOLEAN DEFAULT NULL,
  p_sort_by TEXT DEFAULT 'instagram_handle',
  p_sort_order TEXT DEFAULT 'asc'
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  instagram_handle TEXT,
  city TEXT,
  state TEXT,
  is_featured BOOLEAN,
  is_pro BOOLEAN,
  verification_status TEXT,
  follower_count INTEGER,
  slug TEXT,
  deleted_at TIMESTAMPTZ,
  image_count BIGINT,
  total_count BIGINT
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  WITH artist_images AS (
    SELECT
      a.id AS ai_id,
      a.name AS ai_name,
      a.instagram_handle AS ai_instagram_handle,
      a.city AS ai_city,
      a.state AS ai_state,
      a.is_featured AS ai_is_featured,
      a.is_pro AS ai_is_pro,
      a.verification_status::TEXT AS ai_verification_status,
      a.follower_count AS ai_follower_count,
      a.slug AS ai_slug,
      a.deleted_at AS ai_deleted_at,
      COUNT(pi.id) FILTER (WHERE pi.hidden = false) AS ai_image_count
    FROM artists a
    LEFT JOIN portfolio_images pi ON a.id = pi.artist_id
    WHERE a.deleted_at IS NULL
      -- Search filter (name or Instagram handle)
      AND (
        p_search IS NULL
        OR a.name ILIKE '%' || p_search || '%'
        OR a.instagram_handle ILIKE '%' || p_search || '%'
      )
      -- Location filter
      AND (p_location_city IS NULL OR a.city = p_location_city)
      AND (p_location_state IS NULL OR a.state = p_location_state)
      -- Tier filter
      AND (
        p_tier IS NULL
        OR (p_tier = 'unclaimed' AND a.verification_status = 'unclaimed')
        OR (p_tier = 'free' AND a.verification_status = 'claimed' AND a.is_pro = false)
        OR (p_tier = 'pro' AND a.verification_status = 'claimed' AND a.is_pro = true)
      )
      -- Featured filter
      AND (p_is_featured IS NULL OR a.is_featured = p_is_featured)
    GROUP BY a.id
  )
  SELECT
    ai.ai_id,
    ai.ai_name,
    ai.ai_instagram_handle,
    ai.ai_city,
    ai.ai_state,
    ai.ai_is_featured,
    ai.ai_is_pro,
    ai.ai_verification_status,
    ai.ai_follower_count,
    ai.ai_slug,
    ai.ai_deleted_at,
    ai.ai_image_count,
    COUNT(*) OVER() AS total_count
  FROM artist_images ai
  WHERE
    -- Has images filter (applied after aggregation)
    p_has_images IS NULL
    OR (p_has_images = true AND ai.ai_image_count > 0)
    OR (p_has_images = false AND ai.ai_image_count = 0)
  ORDER BY
    CASE WHEN p_sort_order = 'asc' THEN
      CASE p_sort_by
        WHEN 'instagram_handle' THEN ai.ai_instagram_handle
        WHEN 'name' THEN ai.ai_name
        WHEN 'city' THEN ai.ai_city
        WHEN 'verification_status' THEN ai.ai_verification_status
        ELSE ai.ai_instagram_handle
      END
    END ASC NULLS LAST,
    CASE WHEN p_sort_order = 'desc' THEN
      CASE p_sort_by
        WHEN 'instagram_handle' THEN ai.ai_instagram_handle
        WHEN 'name' THEN ai.ai_name
        WHEN 'city' THEN ai.ai_city
        WHEN 'verification_status' THEN ai.ai_verification_status
        ELSE ai.ai_instagram_handle
      END
    END DESC NULLS LAST,
    -- Numeric sorts (image_count, is_featured)
    CASE WHEN p_sort_order = 'asc' AND p_sort_by = 'image_count' THEN ai.ai_image_count END ASC NULLS LAST,
    CASE WHEN p_sort_order = 'desc' AND p_sort_by = 'image_count' THEN ai.ai_image_count END DESC NULLS LAST,
    CASE WHEN p_sort_order = 'asc' AND p_sort_by = 'is_featured' THEN ai.ai_is_featured::int END ASC,
    CASE WHEN p_sort_order = 'desc' AND p_sort_by = 'is_featured' THEN ai.ai_is_featured::int END DESC
  OFFSET p_offset
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION get_artists_with_image_counts(INT, INT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN, TEXT, TEXT) IS
  'Returns paginated artist list with image counts. Supports search, location, tier, featured, and image filtering, plus dynamic sorting by any column.';
