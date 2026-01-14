-- Performance index for is_tattoo filter in search queries
-- Covers the COALESCE(is_tattoo, TRUE) = TRUE pattern used across all public-facing queries

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_portfolio_images_active_tattoo
ON portfolio_images(artist_id)
WHERE status = 'active'
  AND COALESCE(is_tattoo, TRUE) = TRUE;

COMMENT ON INDEX idx_portfolio_images_active_tattoo IS
  'Partial index for search queries filtering active tattoo images. Includes NULL (unclassified) for backwards compatibility.';
