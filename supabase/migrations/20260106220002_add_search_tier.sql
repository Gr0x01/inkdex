-- ============================================================================
-- Phase 6: Add search_tier column for scale preparation
-- ============================================================================
-- Prepares for 1M+ images by adding tiered search capability.
-- At scale, we'll use separate HNSW indexes per tier for performance.
--
-- Tiers:
--   - 'active': Recent/popular images, included in main search (default)
--   - 'archive': Older/less popular images, excluded from main search
--
-- Future HNSW migration path (at 1M+ images):
--   1. Create HNSW index on active tier only
--   2. Keep IVFFlat on archive tier for completeness
--   3. Primary search uses active tier, archive as fallback
-- ============================================================================

-- Create enum type for search tier
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'search_tier') THEN
    CREATE TYPE search_tier AS ENUM ('active', 'archive');
  END IF;
END
$$;

-- Add search_tier column to portfolio_images
ALTER TABLE portfolio_images
ADD COLUMN IF NOT EXISTS search_tier search_tier DEFAULT 'active';

-- Index for filtering by tier (fast, small index)
CREATE INDEX IF NOT EXISTS idx_portfolio_images_search_tier
ON portfolio_images(search_tier)
WHERE status = 'active';

-- NOTE: Vector index on active tier should be created separately via SQL Editor
-- due to timeout constraints. Run this AFTER migration:
--
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_portfolio_images_active_embedding
-- ON portfolio_images USING ivfflat (embedding vector_cosine_ops)
-- WITH (lists = 100)
-- WHERE status = 'active' AND search_tier = 'active' AND embedding IS NOT NULL;

-- Comment documenting scale strategy
COMMENT ON COLUMN portfolio_images.search_tier IS
  'Search tier for performance at scale:
   - active: Included in main vector search (recent/popular images)
   - archive: Excluded from main search, used for fallback/completeness

   At 1M+ images, active tier will use HNSW index for fast search.
   Archive tier continues with IVFFlat for recall.';
