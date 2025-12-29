-- Defer IVFFlat index creation until data exists
-- Creating index on empty table wastes resources and uses suboptimal parameters

-- ============================================
-- Drop premature index
-- ============================================
DROP INDEX IF EXISTS idx_portfolio_embeddings;

-- ============================================
-- Index creation guide (run after loading data)
-- ============================================

/*
  WHEN TO CREATE THE INDEX:
  - After loading initial artist data (>1000 images recommended)
  - During off-peak hours if possible
  - Monitor disk space (index will be ~10% of embedding column size)

  FOR DATASETS < 1000 IMAGES (MVP):
  Consider HNSW index instead for better performance on small datasets:

  CREATE INDEX CONCURRENTLY idx_portfolio_embeddings
    ON portfolio_images
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

  FOR DATASETS 1000-100K IMAGES (Production):
  Use IVFFlat with dynamic list count based on data size:

  CREATE INDEX CONCURRENTLY idx_portfolio_embeddings
    ON portfolio_images
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = (
      SELECT GREATEST(FLOOR(SQRT(COUNT(*))), 10)
      FROM portfolio_images
      WHERE embedding IS NOT NULL
    ));

  FOR DATASETS > 100K IMAGES (Scale):
  Consider HNSW for better recall/performance trade-off:

  CREATE INDEX CONCURRENTLY idx_portfolio_embeddings
    ON portfolio_images
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 128);

  NOTES:
  - Use CONCURRENTLY to avoid table locking
  - Monitor progress: SELECT * FROM pg_stat_progress_create_index;
  - After creation, analyze table: ANALYZE portfolio_images;
*/
