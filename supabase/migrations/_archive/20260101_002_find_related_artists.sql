-- Find related artists using vector similarity
-- Combines embedding fetch + search into single query for better performance
CREATE OR REPLACE FUNCTION find_related_artists(
  source_artist_id uuid,
  city_filter text DEFAULT NULL,
  match_count int DEFAULT 3
)
RETURNS TABLE (
  artist_id uuid,
  artist_name text,
  artist_slug text,
  city text,
  profile_image_url text,
  instagram_url text,
  shop_name text,
  follower_count int,
  is_verified boolean,
  similarity float8
)
LANGUAGE plpgsql STABLE
AS $$
BEGIN
  RETURN QUERY
  WITH source_embedding AS (
    -- Get first portfolio image embedding from source artist
    SELECT pi.embedding
    FROM portfolio_images pi
    WHERE pi.artist_id = source_artist_id
      AND pi.status = 'active'
      AND pi.embedding IS NOT NULL
    ORDER BY pi.created_at ASC
    LIMIT 1
  ),
  ranked_artists AS (
    -- Find similar artists using that embedding
    SELECT
      pi.artist_id,
      MAX(1 - (pi.embedding <=> (SELECT embedding FROM source_embedding))) AS max_similarity
    FROM portfolio_images pi
    INNER JOIN artists a ON a.id = pi.artist_id
    WHERE pi.embedding IS NOT NULL
      AND pi.status = 'active'
      AND pi.artist_id != source_artist_id  -- Exclude source artist
      AND (city_filter IS NULL OR a.city = city_filter)
      AND (1 - (pi.embedding <=> (SELECT embedding FROM source_embedding))) >= 0.5
    GROUP BY pi.artist_id
    ORDER BY max_similarity DESC
    LIMIT match_count
  )
  SELECT
    a.id,
    a.name,
    a.slug,
    a.city,
    a.profile_image_url,
    a.instagram_url,
    a.shop_name,
    a.follower_count,
    CASE WHEN a.verification_status = 'verified' THEN true ELSE false END,
    ra.max_similarity
  FROM ranked_artists ra
  INNER JOIN artists a ON a.id = ra.artist_id
  ORDER BY ra.max_similarity DESC;
END;
$$;

COMMENT ON FUNCTION find_related_artists IS
  'Find related artists using vector similarity search. Combines embedding fetch and search in one query.';
