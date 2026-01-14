-- Add tattoo verification columns to portfolio_images
-- Used for filtering non-tattoo content (selfies, lifestyle photos, etc.)

-- Add columns
ALTER TABLE portfolio_images
ADD COLUMN IF NOT EXISTS is_tattoo boolean,
ADD COLUMN IF NOT EXISTS tattoo_confidence float;

-- Add comment for documentation
COMMENT ON COLUMN portfolio_images.is_tattoo IS 'GPT vision classification: true=tattoo, false=non-tattoo (flagged for review), null=unverified';
COMMENT ON COLUMN portfolio_images.tattoo_confidence IS 'GPT confidence score 0-1. Auto-delete <0.3, flag 0.3-0.5, keep >=0.5';

-- Index for querying unverified images (resume capability)
CREATE INDEX IF NOT EXISTS idx_portfolio_images_is_tattoo_null
ON portfolio_images(id) WHERE is_tattoo IS NULL;

-- Index for querying flagged images (admin review)
CREATE INDEX IF NOT EXISTS idx_portfolio_images_flagged
ON portfolio_images(tattoo_confidence) WHERE is_tattoo = false;
