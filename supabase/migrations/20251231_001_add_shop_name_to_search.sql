-- Add shop_name to search_artists_by_embedding function
-- This ensures shop name is returned in search results and related artists

DROP FUNCTION IF EXISTS search_artists_by_embedding(vector, float, int, text, int);

CREATE OR REPLACE FUNCTION search_artists_by_embedding(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.5,
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
  follower_count integer,
  shop_name text,
  instagram_url text,
  is_verified boolean,
  similarity float,
  matching_images jsonb,
  max_likes integer
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH filtered_artists AS (
    -- Apply city filter first to reduce dataset
    SELECT id, name, slug, artists.city, artists.profile_image_url,
           artists.follower_count, artists.shop_name, artists.instagram_url,
           (verification_status = 'verified') as is_verified
    FROM artists
    WHERE (city_filter IS NULL OR artists.city = city_filter)
  ),
  ranked_images AS (
    -- Find matching images with similarity scores
    SELECT
      pi.artist_id,
      pi.id as image_id,
      pi.instagram_url as image_url,
      pi.storage_thumb_640,
      pi.likes_count,
      1 - (pi.embedding <=> query_embedding) as similarity_score,
      ROW_NUMBER() OVER (
        PARTITION BY pi.artist_id
        ORDER BY pi.embedding <=> query_embedding
      ) as rank_in_artist
    FROM portfolio_images pi
    INNER JOIN filtered_artists fa ON pi.artist_id = fa.id
    WHERE pi.status = 'active'
      AND pi.embedding IS NOT NULL
      AND (1 - (pi.embedding <=> query_embedding)) >= match_threshold
    ORDER BY pi.embedding <=> query_embedding
    LIMIT (match_count * 10)  -- Fetch extra to ensure we have enough after grouping
  ),
  aggregated_artists AS (
    -- Group images by artist and aggregate matching images
    SELECT
      ri.artist_id,
      MAX(ri.similarity_score) as best_similarity,
      MAX(ri.likes_count) as max_likes,
      jsonb_agg(
        jsonb_build_object(
          'image_id', ri.image_id,
          'image_url', ri.image_url,
          'thumbnail_url', ri.storage_thumb_640,
          'likes_count', ri.likes_count,
          'similarity', ROUND(ri.similarity_score::numeric, 3)
        )
        ORDER BY ri.similarity_score DESC
      ) FILTER (WHERE ri.rank_in_artist <= 3) as matching_images_json
    FROM ranked_images ri
    GROUP BY ri.artist_id
    ORDER BY best_similarity DESC
    LIMIT match_count
    OFFSET offset_param
  )
  -- Join with artist details (use AS to match RETURNS TABLE field names)
  SELECT
    fa.id AS artist_id,
    fa.name AS artist_name,
    fa.slug AS artist_slug,
    fa.city,
    fa.profile_image_url,
    fa.follower_count,
    fa.shop_name,
    fa.instagram_url,
    fa.is_verified,
    aa.best_similarity AS similarity,
    aa.matching_images_json AS matching_images,
    aa.max_likes
  FROM aggregated_artists aa
  INNER JOIN filtered_artists fa ON fa.id = aa.artist_id
  ORDER BY aa.best_similarity DESC;
END;
$$;

COMMENT ON FUNCTION search_artists_by_embedding IS
  'Optimized vector similarity search for artists. Returns profile metadata including shop name, follower count, and max likes. Filters by city early, uses CTEs for better query planning, and limits results efficiently.';
