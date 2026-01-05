-- Add 'pending' status for images awaiting embedding generation
-- This allows images to be uploaded but not yet searchable until embeddings are generated

ALTER TABLE portfolio_images DROP CONSTRAINT IF EXISTS valid_status;

ALTER TABLE portfolio_images ADD CONSTRAINT valid_status
  CHECK (status IN ('pending', 'active', 'hidden', 'deleted'));

COMMENT ON CONSTRAINT valid_status ON portfolio_images IS
'Valid image statuses:
- pending: Image uploaded, awaiting embedding generation
- active: Image has embedding and is searchable
- hidden: Image hidden from search results
- deleted: Soft-deleted image';
