-- Vector index (IVFFlat - better for larger datasets)
-- Use IVFFlat instead of HNSW for better performance with 10k+ vectors
-- NOTE: This index creation is removed in migration 008 (defer until data exists)
-- CREATE INDEX idx_portfolio_embeddings ON portfolio_images
-- USING ivfflat (embedding vector_cosine_ops)
-- WITH (lists = 100);
-- Note: lists = sqrt(total_rows) is a good heuristic
-- For 10k images: lists = 100, for 100k: lists = 316

-- Vector search function
CREATE OR REPLACE FUNCTION search_artists_by_embedding(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.7,
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
  instagram_url text,
  is_verified boolean,
  matching_images jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH ranked_images AS (
    SELECT
      pi.artist_id,
      pi.r2_thumbnail_medium as image_url,
      pi.instagram_url,
      1 - (pi.embedding <=> query_embedding) as similarity,
      ROW_NUMBER() OVER (
        PARTITION BY pi.artist_id
        ORDER BY (pi.embedding <=> query_embedding)
      ) as rank
    FROM portfolio_images pi
    WHERE
      pi.status = 'active'
      AND 1 - (pi.embedding <=> query_embedding) > match_threshold
  ),
  artist_matches AS (
    SELECT
      ri.artist_id,
      jsonb_agg(
        jsonb_build_object(
          'url', ri.image_url,
          'instagramUrl', ri.instagram_url,
          'similarity', ri.similarity
        )
        ORDER BY ri.similarity DESC
      ) FILTER (WHERE ri.rank <= 4) as images,
      MAX(ri.similarity) as max_similarity
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
    am.max_similarity
  FROM artist_matches am
  JOIN artists a ON a.id = am.artist_id
  WHERE
    (city_filter IS NULL OR a.city = city_filter)
  ORDER BY am.max_similarity DESC
  LIMIT match_count
  OFFSET offset_param;
END;
$$;
