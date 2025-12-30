-- Add likes_count to search_artists_by_embedding function for featured artist detection

-- Drop existing function first (can't change return type with CREATE OR REPLACE)
DROP FUNCTION IF EXISTS search_artists_by_embedding(vector, float, int, text, int);

CREATE OR REPLACE FUNCTION search_artists_by_embedding(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 20,
  city_filter text DEFAULT NULL,
  offset_param int DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  name text,
  slug text,
  city text,
  profile_image_url text,
  instagram_url text,
  is_verified boolean,
  images jsonb,
  max_similarity float,
  max_likes int  -- Added for featured artist detection
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH filtered_artists AS (
    -- Apply city filter first to reduce dataset
    SELECT artists.id FROM artists
    WHERE (city_filter IS NULL OR artists.city = city_filter)
    AND verification_status IN ('unclaimed', 'pending', 'verified')  -- Exclude any invalid statuses
  ),
  ranked_images AS (
    SELECT
      pi.artist_id,
      pi.r2_thumbnail_medium as image_url,
      pi.instagram_url,
      pi.likes_count,  -- Added for featured artist check
      1 - (pi.embedding <=> query_embedding) as similarity,
      ROW_NUMBER() OVER (
        PARTITION BY pi.artist_id
        ORDER BY (pi.embedding <=> query_embedding)
      ) as rank
    FROM portfolio_images pi
    INNER JOIN filtered_artists fa ON pi.artist_id = fa.id  -- Filter early with JOIN
    WHERE
      pi.status = 'active'
      AND pi.embedding IS NOT NULL
      AND 1 - (pi.embedding <=> query_embedding) > match_threshold
    ORDER BY pi.embedding <=> query_embedding  -- Use index
    LIMIT (match_count * 10)  -- Limit results early to reduce processing
  ),
  artist_matches AS (
    SELECT
      ri.artist_id,
      jsonb_agg(
        jsonb_build_object(
          'url', ri.image_url,
          'instagramUrl', ri.instagram_url,
          'similarity', ri.similarity,
          'likes_count', ri.likes_count  -- Added likes_count to JSONB
        )
        ORDER BY ri.similarity DESC
      ) FILTER (WHERE ri.rank <= 4) as images,
      MAX(ri.similarity) as max_similarity,
      MAX(ri.likes_count) as max_likes  -- Track highest likes count for featured badge
    FROM ranked_images ri
    GROUP BY ri.artist_id
  )
  SELECT
    a.id,
    a.name,
    a.slug,
    a.city,
    a.profile_image_url,
    a.instagram_url,
    (a.verification_status = 'verified') as is_verified,
    am.images,
    am.max_similarity,
    COALESCE(am.max_likes, 0)::int as max_likes  -- Return max likes (0 if null)
  FROM artist_matches am
  JOIN artists a ON a.id = am.artist_id
  ORDER BY am.max_similarity DESC
  LIMIT match_count
  OFFSET offset_param;
END;
$$;

COMMENT ON FUNCTION search_artists_by_embedding IS
  'Search artists by CLIP embedding similarity. Returns top matching artists with their best matching images.
   Includes max_likes for featured artist detection (threshold: 10,000 likes).';
