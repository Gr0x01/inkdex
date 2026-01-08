-- Style Training Labels for ML Classifier
-- Human-labeled style tags for training a classifier on CLIP embeddings

CREATE TABLE IF NOT EXISTS style_training_labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_id UUID NOT NULL REFERENCES portfolio_images(id) ON DELETE CASCADE,
  labeled_by TEXT NOT NULL,  -- admin email who labeled this
  styles TEXT[] NOT NULL DEFAULT '{}',  -- array of style names
  skipped BOOLEAN DEFAULT FALSE,  -- true if image was skipped (unclear)
  notes TEXT,  -- optional notes about the image
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(image_id)  -- one label per image
);

-- Index for finding unlabeled images
CREATE INDEX IF NOT EXISTS idx_training_labels_image_id ON style_training_labels(image_id);

-- Index for querying by labeler
CREATE INDEX IF NOT EXISTS idx_training_labels_labeled_by ON style_training_labels(labeled_by);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_training_label_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update timestamp
DROP TRIGGER IF EXISTS update_training_label_timestamp ON style_training_labels;
CREATE TRIGGER update_training_label_timestamp
  BEFORE UPDATE ON style_training_labels
  FOR EACH ROW
  EXECUTE FUNCTION update_training_label_timestamp();

-- Enable RLS
ALTER TABLE style_training_labels ENABLE ROW LEVEL SECURITY;

-- Policy: Service role can do everything
CREATE POLICY "Service role full access" ON style_training_labels
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Comment on table
COMMENT ON TABLE style_training_labels IS 'Human-labeled style tags for training ML classifier on CLIP embeddings';
