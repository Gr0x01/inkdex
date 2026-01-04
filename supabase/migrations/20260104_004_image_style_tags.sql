-- ============================================
-- Image Style Tags
-- Auto-generated style labels for portfolio images
-- Based on CLIP embedding similarity to style seeds
-- ============================================

-- Table to store style tags per image
CREATE TABLE IF NOT EXISTS image_style_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_id UUID NOT NULL REFERENCES portfolio_images(id) ON DELETE CASCADE,
  style_name TEXT NOT NULL,
  confidence FLOAT NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(image_id, style_name)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_image_style_tags_image_id ON image_style_tags(image_id);
CREATE INDEX IF NOT EXISTS idx_image_style_tags_style_name ON image_style_tags(style_name);
CREATE INDEX IF NOT EXISTS idx_image_style_tags_confidence ON image_style_tags(confidence DESC);
CREATE INDEX IF NOT EXISTS idx_image_style_tags_style_confidence ON image_style_tags(style_name, confidence DESC);

-- Comment
COMMENT ON TABLE image_style_tags IS 'Auto-generated style labels for portfolio images based on CLIP embedding similarity';
COMMENT ON COLUMN image_style_tags.confidence IS 'Cosine similarity score (0-1) between image embedding and style seed embedding';
