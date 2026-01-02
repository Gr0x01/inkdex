-- Phase 12: Add Pro/Featured boost to search ranking
-- Pro artists get +0.05 similarity boost (5-10% of typical scores)
-- Featured artists get +0.02 boost (smaller, quality signal)
-- Both flags: +0.07 total
-- Natural high-quality matches can still outrank boosted artists

-- ============================================
-- Drop and recreate search function with boosts
-- ============================================
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
  instagram_url text,
  is_verified boolean,
  is_pro boolean,
  is_featured boolean,
  similarity float,
  matching_images jsonb
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH filtered_artists AS (
    -- Apply city filter first to reduce dataset
    SELECT id, name, slug, artists.city, artists.profile_image_url,
           artists.instagram_url,
           (verification_status = 'verified' OR verification_status = 'claimed') as is_verified,
           COALESCE(artists.is_pro, FALSE) as is_pro,
           COALESCE(artists.is_featured, FALSE) as is_featured
    FROM artists
    WHERE (city_filter IS NULL OR artists.city = city_filter)
      AND artists.deleted_at IS NULL  -- Exclude soft-deleted artists
  ),
  ranked_images AS (
    -- Find matching images with similarity scores
    SELECT
      pi.artist_id,
      pi.id as image_id,
      pi.instagram_url as image_url,
      pi.storage_thumb_640 as thumbnail_url,
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
      AND COALESCE(pi.hidden, FALSE) = FALSE  -- Exclude hidden images
      AND (1 - (pi.embedding <=> query_embedding)) >= match_threshold
    ORDER BY pi.embedding <=> query_embedding
    LIMIT (match_count * 10)  -- Fetch extra to ensure we have enough after grouping
  ),
  aggregated_artists AS (
    -- Group images by artist and aggregate matching images
    SELECT
      ri.artist_id,
      MAX(ri.similarity_score) as best_similarity,
      jsonb_agg(
        jsonb_build_object(
          'image_id', ri.image_id,
          'image_url', ri.image_url,
          'thumbnail_url', ri.thumbnail_url,
          'likes_count', ri.likes_count,
          'similarity', ROUND(ri.similarity_score::numeric, 3)
        )
        ORDER BY ri.similarity_score DESC
      ) FILTER (WHERE ri.rank_in_artist <= 3) as matching_images_json
    FROM ranked_images ri
    GROUP BY ri.artist_id
  ),
  boosted_artists AS (
    -- Apply Pro/Featured boosts to ranking
    -- Pro boost: +0.05 (5-10% of typical 0.15-0.40 scores)
    -- Featured boost: +0.02 (quality signal, not pay-to-win)
    SELECT
      aa.artist_id,
      aa.best_similarity,
      aa.matching_images_json,
      fa.is_pro,
      fa.is_featured,
      -- Boosted score for ranking only (original similarity still returned)
      aa.best_similarity
        + CASE WHEN fa.is_pro THEN 0.05 ELSE 0 END
        + CASE WHEN fa.is_featured THEN 0.02 ELSE 0 END as boosted_score
    FROM aggregated_artists aa
    INNER JOIN filtered_artists fa ON fa.id = aa.artist_id
  )
  -- Join with artist details, order by boosted score
  SELECT
    fa.id,
    fa.name,
    fa.slug,
    fa.city,
    fa.profile_image_url,
    fa.instagram_url,
    fa.is_verified,
    fa.is_pro,
    fa.is_featured,
    ba.best_similarity,  -- Return original similarity (not boosted)
    ba.matching_images_json
  FROM boosted_artists ba
  INNER JOIN filtered_artists fa ON fa.id = ba.artist_id
  ORDER BY ba.boosted_score DESC  -- Rank by boosted score
  LIMIT match_count
  OFFSET offset_param;
END;
$$;

-- Add helpful comment
COMMENT ON FUNCTION search_artists_by_embedding IS
  'Vector similarity search with Pro/Featured ranking boosts. Pro: +0.05, Featured: +0.02. Filters soft-deleted artists and hidden images.';

-- ============================================
-- Update search_artists_with_count to include boosts
-- ============================================
DROP FUNCTION IF EXISTS search_artists_with_count(vector, float, int, text, int);

CREATE OR REPLACE FUNCTION search_artists_with_count(
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
  follower_count int,
  shop_name text,
  instagram_url text,
  is_verified boolean,
  is_pro boolean,
  is_featured boolean,
  similarity float,
  max_likes bigint,
  matching_images jsonb,
  total_count bigint
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH filtered_artists AS (
    SELECT id, name, slug, artists.city, artists.profile_image_url,
           artists.follower_count, artists.shop_name, artists.instagram_url,
           (verification_status = 'verified' OR verification_status = 'claimed') as is_verified,
           COALESCE(artists.is_pro, FALSE) as is_pro,
           COALESCE(artists.is_featured, FALSE) as is_featured
    FROM artists
    WHERE (city_filter IS NULL OR artists.city = city_filter)
      AND artists.deleted_at IS NULL
  ),
  ranked_images AS (
    SELECT
      pi.artist_id,
      pi.id as image_id,
      pi.instagram_url as image_url,
      pi.storage_thumb_640 as thumbnail_url,
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
      AND COALESCE(pi.hidden, FALSE) = FALSE
      AND (1 - (pi.embedding <=> query_embedding)) >= match_threshold
    ORDER BY pi.embedding <=> query_embedding
    LIMIT (match_count * 10)
  ),
  aggregated_artists AS (
    SELECT
      ri.artist_id,
      MAX(ri.similarity_score) as best_similarity,
      MAX(COALESCE(ri.likes_count, 0)) as max_likes,
      jsonb_agg(
        jsonb_build_object(
          'image_id', ri.image_id,
          'image_url', ri.image_url,
          'thumbnail_url', ri.thumbnail_url,
          'likes_count', ri.likes_count,
          'similarity', ROUND(ri.similarity_score::numeric, 3)
        )
        ORDER BY ri.similarity_score DESC
      ) FILTER (WHERE ri.rank_in_artist <= 3) as matching_images_json
    FROM ranked_images ri
    GROUP BY ri.artist_id
  ),
  boosted_artists AS (
    SELECT
      aa.artist_id,
      aa.best_similarity,
      aa.max_likes,
      aa.matching_images_json,
      fa.is_pro,
      fa.is_featured,
      aa.best_similarity
        + CASE WHEN fa.is_pro THEN 0.05 ELSE 0 END
        + CASE WHEN fa.is_featured THEN 0.02 ELSE 0 END as boosted_score
    FROM aggregated_artists aa
    INNER JOIN filtered_artists fa ON fa.id = aa.artist_id
  ),
  total AS (
    SELECT COUNT(DISTINCT artist_id) as cnt FROM aggregated_artists
  )
  SELECT
    fa.id,
    fa.name,
    fa.slug,
    fa.city,
    fa.profile_image_url,
    fa.follower_count,
    fa.shop_name,
    fa.instagram_url,
    fa.is_verified,
    fa.is_pro,
    fa.is_featured,
    ba.best_similarity,
    ba.max_likes,
    ba.matching_images_json,
    (SELECT cnt FROM total)
  FROM boosted_artists ba
  INNER JOIN filtered_artists fa ON fa.id = ba.artist_id
  ORDER BY ba.boosted_score DESC
  LIMIT match_count
  OFFSET offset_param;
END;
$$;

COMMENT ON FUNCTION search_artists_with_count IS
  'Vector similarity search with count and Pro/Featured ranking boosts. Includes total count for pagination.';
