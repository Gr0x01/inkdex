-- Performance optimization indexes
-- Added: 2026-01-10
-- Purpose: Improve style ranking queries and active tier filtering

-- 1. Style tag ranking optimization
-- Eliminates sort operation when getting top tags per image by confidence
-- Impact: +5-10% for style boost queries in search_artists()
CREATE INDEX IF NOT EXISTS idx_image_style_tags_image_confidence
ON image_style_tags(image_id, confidence DESC);

-- 2. Active tier filtering optimization
-- Avoids post-index filtering for queries that filter both status and search_tier
-- Impact: +3-5% for image counting queries
CREATE INDEX IF NOT EXISTS idx_portfolio_images_artist_active_tier
ON portfolio_images(artist_id, status)
WHERE search_tier = 'active';
