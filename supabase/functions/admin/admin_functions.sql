-- ============================================================================
-- ADMIN FUNCTIONS
-- ============================================================================
-- Functions for admin dashboard and internal operations.
--
-- Functions:
--   - get_artists_with_image_counts: Paginated artist list for admin
--   - get_top_artists_by_style: Style-based artist ranking for curation
--   - get_homepage_stats: Aggregate counts for homepage
-- ============================================================================

-- ============================================
-- get_top_artists_by_style
-- Used for marketing curation (admin panel)
-- ============================================
DROP FUNCTION IF EXISTS get_top_artists_by_style(text, int);

CREATE OR REPLACE FUNCTION get_top_artists_by_style(
  p_style_slug text,
  p_limit int DEFAULT 25
)
RETURNS TABLE (
  artist_id uuid,
  artist_name text,
  instagram_handle text,
  city text,
  state text,
  similarity_score float,
  best_image_url text,
  is_pro boolean,
  is_featured boolean
)
LANGUAGE plpgsql STABLE
SECURITY INVOKER
AS $$
DECLARE
  style_embedding vector(768);
BEGIN
  IF p_style_slug IS NULL OR p_style_slug !~ '^[a-z0-9\-]+$' THEN
    RAISE EXCEPTION 'Invalid style_slug format. Use lowercase with hyphens.';
  END IF;

  IF p_limit < 1 OR p_limit > 100 THEN
    RAISE EXCEPTION 'Limit must be between 1 and 100.';
  END IF;

  SELECT ss.embedding INTO style_embedding
  FROM style_seeds ss
  WHERE ss.style_name = p_style_slug;

  IF style_embedding IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH ranked_images AS (
    SELECT
      pi.artist_id as ri_artist_id,
      pi.id as ri_image_id,
      pi.storage_thumb_640 as ri_thumbnail_url,
      1 - (pi.embedding <=> style_embedding) as ri_similarity
    FROM portfolio_images pi
    WHERE pi.status = 'active'
      AND pi.embedding IS NOT NULL
      AND COALESCE(pi.hidden, FALSE) = FALSE
    ORDER BY pi.embedding <=> style_embedding
    LIMIT 500
  ),
  best_per_artist AS (
    SELECT DISTINCT ON (ri.ri_artist_id)
      ri.ri_artist_id as ba_artist_id,
      ri.ri_similarity as ba_similarity,
      ri.ri_thumbnail_url as ba_image_url
    FROM ranked_images ri
    ORDER BY ri.ri_artist_id, ri.ri_similarity DESC
  ),
  filtered_artists AS (
    SELECT DISTINCT ON (bpa.ba_artist_id)
      bpa.ba_artist_id as fa_artist_id,
      a.name as fa_name,
      a.instagram_handle as fa_handle,
      al.city as fa_city,
      al.region as fa_state,
      bpa.ba_similarity as fa_similarity,
      bpa.ba_image_url as fa_image_url,
      COALESCE(a.is_pro, FALSE) as fa_is_pro,
      COALESCE(a.is_featured, FALSE) as fa_is_featured
    FROM best_per_artist bpa
    INNER JOIN artists a ON a.id = bpa.ba_artist_id
    INNER JOIN artist_locations al ON al.artist_id = a.id AND al.is_primary = TRUE
    WHERE a.deleted_at IS NULL
      AND COALESCE(a.is_gdpr_blocked, FALSE) = FALSE
  )
  SELECT
    fa.fa_artist_id,
    fa.fa_name,
    fa.fa_handle,
    fa.fa_city,
    fa.fa_state,
    fa.fa_similarity,
    fa.fa_image_url,
    fa.fa_is_pro,
    fa.fa_is_featured
  FROM filtered_artists fa
  ORDER BY fa.fa_similarity DESC
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION get_top_artists_by_style IS
  'Returns top N artists ranked by similarity to a style seed. Used for marketing curation.';


-- ============================================
-- get_artists_with_image_counts
-- Paginated artist list for admin dashboard
-- ============================================
DROP FUNCTION IF EXISTS get_artists_with_image_counts(integer, integer, text, text, text, text, boolean, boolean, text, text);

CREATE OR REPLACE FUNCTION get_artists_with_image_counts(
  p_offset integer DEFAULT 0,
  p_limit integer DEFAULT 20,
  p_search text DEFAULT NULL,
  p_location_city text DEFAULT NULL,
  p_location_state text DEFAULT NULL,
  p_tier text DEFAULT NULL,
  p_is_featured boolean DEFAULT NULL,
  p_has_images boolean DEFAULT NULL,
  p_sort_by text DEFAULT 'instagram_handle',
  p_sort_order text DEFAULT 'asc'
)
RETURNS TABLE (
  id uuid,
  name text,
  instagram_handle text,
  city text,
  state text,
  is_featured boolean,
  is_pro boolean,
  verification_status text,
  follower_count bigint,
  slug text,
  deleted_at timestamp with time zone,
  image_count bigint,
  total_count bigint
)
LANGUAGE plpgsql STABLE
AS $$
BEGIN
  RETURN QUERY
  WITH artist_images AS (
    SELECT
      a.id AS ai_id,
      a.name AS ai_name,
      a.instagram_handle AS ai_instagram_handle,
      COALESCE(al.city, '') AS ai_city,
      COALESCE(al.region, '') AS ai_state,
      a.is_featured AS ai_is_featured,
      a.is_pro AS ai_is_pro,
      a.verification_status::TEXT AS ai_verification_status,
      a.follower_count AS ai_follower_count,
      a.slug AS ai_slug,
      a.deleted_at AS ai_deleted_at,
      COUNT(pi.id) FILTER (WHERE pi.hidden = false) AS ai_image_count
    FROM artists a
    LEFT JOIN artist_locations al ON al.artist_id = a.id AND al.is_primary = TRUE
    LEFT JOIN portfolio_images pi ON a.id = pi.artist_id
    WHERE a.deleted_at IS NULL
      AND (
        p_search IS NULL
        OR a.name ILIKE '%' || p_search || '%'
        OR a.instagram_handle ILIKE '%' || p_search || '%'
      )
      AND (p_location_city IS NULL OR al.city = p_location_city)
      AND (p_location_state IS NULL OR al.region = p_location_state)
      AND (
        p_tier IS NULL
        OR (p_tier = 'unclaimed' AND a.verification_status = 'unclaimed')
        OR (p_tier = 'free' AND a.verification_status = 'claimed' AND a.is_pro = false)
        OR (p_tier = 'pro' AND a.verification_status = 'claimed' AND a.is_pro = true)
      )
      AND (p_is_featured IS NULL OR a.is_featured = p_is_featured)
    GROUP BY a.id, al.city, al.region
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
    CASE WHEN p_sort_order = 'asc' AND p_sort_by = 'image_count' THEN ai.ai_image_count END ASC NULLS LAST,
    CASE WHEN p_sort_order = 'desc' AND p_sort_by = 'image_count' THEN ai.ai_image_count END DESC NULLS LAST,
    CASE WHEN p_sort_order = 'asc' AND p_sort_by = 'is_featured' THEN ai.ai_is_featured::int END ASC,
    CASE WHEN p_sort_order = 'desc' AND p_sort_by = 'is_featured' THEN ai.ai_is_featured::int END DESC
  OFFSET p_offset
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION get_artists_with_image_counts IS
  'Returns paginated artist list with image counts for admin dashboard.';


-- ============================================
-- get_homepage_stats
-- ============================================
CREATE OR REPLACE FUNCTION get_homepage_stats()
RETURNS TABLE (
  artist_count bigint,
  image_count bigint,
  city_count bigint
)
LANGUAGE plpgsql STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM artists WHERE deleted_at IS NULL)::bigint AS artist_count,
    (SELECT COUNT(*) FROM portfolio_images WHERE status = 'active')::bigint AS image_count,
    (SELECT COUNT(DISTINCT city) FROM artist_locations WHERE country_code = 'US')::bigint AS city_count;
END;
$$;

COMMENT ON FUNCTION get_homepage_stats IS
  'Returns aggregate counts (artists, images, cities) for homepage hero section.';


-- ============================================
-- Performance Indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_artists_not_gdpr_blocked
ON artists(id) WHERE is_gdpr_blocked = FALSE OR is_gdpr_blocked IS NULL;

CREATE INDEX IF NOT EXISTS idx_artist_locations_artist_primary
ON artist_locations(artist_id) WHERE is_primary = TRUE;


-- ============================================
-- CLEANUP: Remove legacy sync trigger
-- ============================================
DROP TRIGGER IF EXISTS sync_artist_location_on_change ON artists;
DROP TRIGGER IF EXISTS sync_artist_location_on_insert ON artists;
DROP FUNCTION IF EXISTS sync_artist_to_locations();
