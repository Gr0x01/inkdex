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
-- get_admin_location_counts
-- Aggregated location counts for admin filter dropdown
-- ============================================
DROP FUNCTION IF EXISTS get_admin_location_counts();

CREATE OR REPLACE FUNCTION get_admin_location_counts()
RETURNS TABLE (
  city text,
  region text,
  country_code text,
  count bigint
)
LANGUAGE sql STABLE
AS $$
  SELECT
    al.city,
    al.region,
    COALESCE(al.country_code, 'US') as country_code,
    COUNT(*) as count
  FROM artist_locations al
  WHERE al.is_primary = true
    AND al.city IS NOT NULL
    AND al.region IS NOT NULL
  GROUP BY al.city, al.region, al.country_code
  ORDER BY count DESC;
$$;

COMMENT ON FUNCTION get_admin_location_counts IS
  'Returns aggregated city/region/country counts for admin location filter dropdown.';


-- ============================================
-- get_artists_with_image_counts
-- Paginated artist list for admin dashboard
-- ============================================
DROP FUNCTION IF EXISTS get_artists_with_image_counts(integer, integer, text, text, text, text, boolean, boolean, text, text);
DROP FUNCTION IF EXISTS get_artists_with_image_counts(integer, integer, text, text, text, text, boolean, boolean, text, text, integer, integer, integer, integer);
DROP FUNCTION IF EXISTS get_artists_with_image_counts(integer, integer, text, text, text, text, text, boolean, boolean, text, text, integer, integer, integer, integer);
DROP FUNCTION IF EXISTS get_artists_with_image_counts(integer, integer, text, text, text, text, text, boolean, boolean, text, text, integer, integer, integer, integer, boolean);

CREATE OR REPLACE FUNCTION get_artists_with_image_counts(
  p_offset integer DEFAULT 0,
  p_limit integer DEFAULT 20,
  p_search text DEFAULT NULL,
  p_location_city text DEFAULT NULL,
  p_location_state text DEFAULT NULL,
  p_location_country text DEFAULT NULL,
  p_tier text DEFAULT NULL,
  p_is_featured boolean DEFAULT NULL,
  p_has_images boolean DEFAULT NULL,
  p_sort_by text DEFAULT 'instagram_handle',
  p_sort_order text DEFAULT 'asc',
  p_min_followers integer DEFAULT NULL,
  p_max_followers integer DEFAULT NULL,
  p_min_images integer DEFAULT NULL,
  p_max_images integer DEFAULT NULL,
  p_show_blacklisted boolean DEFAULT FALSE
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
  follower_count integer,
  slug text,
  deleted_at timestamp with time zone,
  image_count bigint,
  total_count bigint,
  is_blacklisted boolean
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
      COUNT(pi.id) FILTER (WHERE pi.hidden = false) AS ai_image_count,
      COALESCE(aps.scraping_blacklisted, FALSE) AS ai_is_blacklisted
    FROM artists a
    LEFT JOIN artist_locations al ON al.artist_id = a.id AND al.is_primary = TRUE
    LEFT JOIN portfolio_images pi ON a.id = pi.artist_id
    LEFT JOIN artist_pipeline_state aps ON aps.artist_id = a.id
    WHERE a.deleted_at IS NULL
      AND (
        p_show_blacklisted = TRUE
        OR COALESCE(aps.scraping_blacklisted, FALSE) = FALSE
      )
      AND (
        p_search IS NULL
        OR a.name ILIKE '%' || p_search || '%'
        OR a.instagram_handle ILIKE '%' || p_search || '%'
      )
      AND (p_location_city IS NULL OR al.city = p_location_city)
      AND (p_location_state IS NULL OR al.region = p_location_state)
      AND (p_location_country IS NULL OR al.country_code = p_location_country)
      AND (
        p_tier IS NULL
        OR (p_tier = 'unclaimed' AND a.verification_status = 'unclaimed')
        OR (p_tier = 'free' AND a.verification_status = 'claimed' AND a.is_pro = false)
        OR (p_tier = 'pro' AND a.verification_status = 'claimed' AND a.is_pro = true)
      )
      AND (p_is_featured IS NULL OR a.is_featured = p_is_featured)
      AND (p_min_followers IS NULL OR a.follower_count >= p_min_followers)
      AND (p_max_followers IS NULL OR a.follower_count <= p_max_followers)
    GROUP BY a.id, al.city, al.region, aps.scraping_blacklisted
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
    COUNT(*) OVER() AS total_count,
    ai.ai_is_blacklisted
  FROM artist_images ai
  WHERE
    (p_has_images IS NULL
      OR (p_has_images = true AND ai.ai_image_count > 0)
      OR (p_has_images = false AND ai.ai_image_count = 0))
    AND (p_min_images IS NULL OR ai.ai_image_count >= p_min_images)
    AND (p_max_images IS NULL OR ai.ai_image_count <= p_max_images)
  ORDER BY
    -- Numeric sorting (image_count, follower_count, is_featured)
    CASE WHEN p_sort_by = 'image_count' AND p_sort_order = 'asc' THEN ai.ai_image_count END ASC NULLS LAST,
    CASE WHEN p_sort_by = 'image_count' AND p_sort_order = 'desc' THEN ai.ai_image_count END DESC NULLS LAST,
    CASE WHEN p_sort_by = 'follower_count' AND p_sort_order = 'asc' THEN ai.ai_follower_count END ASC NULLS LAST,
    CASE WHEN p_sort_by = 'follower_count' AND p_sort_order = 'desc' THEN ai.ai_follower_count END DESC NULLS LAST,
    CASE WHEN p_sort_by = 'is_featured' AND p_sort_order = 'asc' THEN ai.ai_is_featured::int END ASC,
    CASE WHEN p_sort_by = 'is_featured' AND p_sort_order = 'desc' THEN ai.ai_is_featured::int END DESC,
    -- Text sorting (instagram_handle, name, city, verification_status)
    CASE WHEN p_sort_by IN ('instagram_handle', 'name', 'city', 'verification_status') AND p_sort_order = 'asc' THEN
      CASE p_sort_by
        WHEN 'instagram_handle' THEN ai.ai_instagram_handle
        WHEN 'name' THEN ai.ai_name
        WHEN 'city' THEN ai.ai_city
        WHEN 'verification_status' THEN ai.ai_verification_status
      END
    END ASC NULLS LAST,
    CASE WHEN p_sort_by IN ('instagram_handle', 'name', 'city', 'verification_status') AND p_sort_order = 'desc' THEN
      CASE p_sort_by
        WHEN 'instagram_handle' THEN ai.ai_instagram_handle
        WHEN 'name' THEN ai.ai_name
        WHEN 'city' THEN ai.ai_city
        WHEN 'verification_status' THEN ai.ai_verification_status
      END
    END DESC NULLS LAST,
    -- Default fallback
    ai.ai_instagram_handle ASC NULLS LAST
  OFFSET p_offset
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION get_artists_with_image_counts IS
  'Returns paginated artist list with image counts for admin dashboard.';


-- ============================================
-- get_artist_stats
-- Used for admin dashboard tier counts
-- ============================================
CREATE OR REPLACE FUNCTION get_artist_stats()
RETURNS json
LANGUAGE plpgsql STABLE
AS $$
BEGIN
  RETURN (
    SELECT json_build_object(
      'total', COUNT(*),
      'unclaimed', COUNT(*) FILTER (WHERE verification_status = 'unclaimed'),
      'free', COUNT(*) FILTER (WHERE verification_status = 'claimed' AND is_pro = false),
      'pro', COUNT(*) FILTER (WHERE verification_status = 'claimed' AND is_pro = true)
    )
    FROM artists
    WHERE deleted_at IS NULL
  );
END;
$$;

COMMENT ON FUNCTION get_artist_stats IS
  'Returns aggregate counts by tier for admin dashboard (total, unclaimed, free, pro).';


-- ============================================
-- get_homepage_stats
-- ============================================
CREATE OR REPLACE FUNCTION get_homepage_stats()
RETURNS TABLE (
  artist_count bigint,
  image_count bigint,
  city_count bigint,
  country_count bigint
)
LANGUAGE plpgsql STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM artists WHERE deleted_at IS NULL)::bigint AS artist_count,
    (SELECT COUNT(*) FROM portfolio_images WHERE status = 'active')::bigint AS image_count,
    (SELECT COUNT(DISTINCT city) FROM artist_locations WHERE country_code = 'US')::bigint AS city_count,
    (SELECT COUNT(DISTINCT al.country_code)
     FROM artist_locations al
     INNER JOIN artists a ON a.id = al.artist_id
     WHERE a.deleted_at IS NULL
       AND al.country_code IS NOT NULL
       AND NOT is_gdpr_country(al.country_code))::bigint AS country_count;
END;
$$;

COMMENT ON FUNCTION get_homepage_stats IS
  'Returns aggregate counts (artists, images, cities, countries) for homepage hero section.';


-- ============================================
-- Performance Indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_artists_not_gdpr_blocked
ON artists(id) WHERE is_gdpr_blocked = FALSE OR is_gdpr_blocked IS NULL;

CREATE INDEX IF NOT EXISTS idx_artist_locations_artist_primary
ON artist_locations(artist_id) WHERE is_primary = TRUE;


-- ============================================
-- get_recent_search_appearances
-- Recent search appearances for Pro artist analytics
-- ============================================
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


-- ============================================
-- CLEANUP: Remove legacy sync trigger
-- ============================================
DROP TRIGGER IF EXISTS sync_artist_location_on_change ON artists;
DROP TRIGGER IF EXISTS sync_artist_location_on_insert ON artists;
DROP FUNCTION IF EXISTS sync_artist_to_locations();
