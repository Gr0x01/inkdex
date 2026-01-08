-- ============================================
-- Style-Weighted Search Migration
-- Adds columns to track detected styles for query images
-- Enables style-weighted ranking in search results
-- ============================================

-- Add style classification columns to searches table
ALTER TABLE searches
ADD COLUMN IF NOT EXISTS detected_styles JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS primary_style TEXT DEFAULT NULL;

-- Index for analytics queries (which styles are most commonly detected)
CREATE INDEX IF NOT EXISTS idx_searches_primary_style
ON searches(primary_style) WHERE primary_style IS NOT NULL;

-- Comments for documentation
COMMENT ON COLUMN searches.detected_styles IS
  'Top 3 detected styles from query image: [{"style_name": "geometric", "confidence": 0.85}, ...]';
COMMENT ON COLUMN searches.primary_style IS
  'Dominant style detected in query image (for analytics and debugging)';
