-- Optimized combined search function that returns both results and total count
-- V2: Uses single table scan with window function instead of double scan
CREATE OR REPLACE FUNCTION search_artists_with_count(
  query_embedding vector(768),
  match_threshold float8 DEFAULT 0.15,
  match_count int DEFAULT 20,
  city_filter text DEFAULT NULL,
  offset_param int DEFAULT 0
)
RETURNS TABLE (
  artist_id uuid,
  artist_name text,
  artist_slug text,
  city text,
  profile_image_url text,
  follower_count int,
  shop_name text,
  instagram_url text,
  is_verified boolean,
  matching_images jsonb,
  similarity float8,
  max_likes int,
  total_count bigint
)
LANGUAGE plpgsql STABLE
AS $$
BEGIN
  RETURN QUERY
  WITH ranked_images AS (
    SELECT
      pi.artist_id,
      pi.thumbnail_url,
      pi.instagram_url AS image_url,
      pi.likes_count,
      (1 - (pi.embedding <=> query_embedding)) AS similarity,
      ROW_NUMBER() OVER (
        PARTITION BY pi.artist_id
        ORDER BY (1 - (pi.embedding <=> query_embedding)) DESC
      ) AS rank,
      -- Use window function to get total count in single scan
      COUNT(DISTINCT pi.artist_id) OVER () AS total_distinct_artists
    FROM portfolio_images pi
    INNER JOIN artists a ON a.id = pi.artist_id
    WHERE pi.embedding IS NOT NULL
      AND pi.status = 'active'
      AND (city_filter IS NULL OR a.city = city_filter)
      AND (1 - (pi.embedding <=> query_embedding)) >= match_threshold
  ),
  top_artists AS (
    SELECT DISTINCT
      ri.artist_id,
      MAX(ri.similarity) AS max_similarity,
      MAX(ri.likes_count) AS max_likes_count,
      MAX(ri.total_distinct_artists) AS total_count
    FROM ranked_images ri
    WHERE ri.rank <= 3
    GROUP BY ri.artist_id
    ORDER BY max_similarity DESC
    LIMIT match_count
    OFFSET offset_param
  )
  SELECT
    a.id,
    a.name,
    a.slug,
    a.city,
    a.profile_image_url,
    a.follower_count,
    a.shop_name,
    a.instagram_url,
    CASE WHEN a.verification_status = 'verified' THEN true ELSE false END,
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'thumbnail_url', ri.thumbnail_url,
          'image_url', ri.image_url,
          'similarity', ri.similarity,
          'likes_count', ri.likes_count
        )
        ORDER BY ri.similarity DESC
      )
      FROM ranked_images ri
      WHERE ri.artist_id = a.id AND ri.rank <= 3
    ),
    ta.max_similarity,
    ta.max_likes_count,
    ta.total_count
  FROM top_artists ta
  INNER JOIN artists a ON a.id = ta.artist_id
  ORDER BY ta.max_similarity DESC;
END;
$$;

COMMENT ON FUNCTION search_artists_with_count IS
  'Combined search function that returns both artist results and total count in a single table scan. V2 optimized with window functions.';
