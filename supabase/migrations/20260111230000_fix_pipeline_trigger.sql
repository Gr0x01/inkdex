-- Migration: Fix pipeline_status trigger
-- Problem: trigger_update_pipeline_on_embedding tries to update artists.pipeline_status
--          but that column was moved to artist_pipeline_state table
-- Solution: Update function to use artist_pipeline_state instead

-- Drop the old trigger first
DROP TRIGGER IF EXISTS trigger_update_pipeline_on_embedding ON portfolio_images;
DROP TRIGGER IF EXISTS update_pipeline_on_embedding ON portfolio_images;

-- Recreate function to update artist_pipeline_state instead of artists
CREATE OR REPLACE FUNCTION update_artist_pipeline_on_embedding()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only run when embedding changes from NULL to a value
  IF OLD.embedding IS NULL AND NEW.embedding IS NOT NULL THEN
    -- Check if ALL images for this artist now have embeddings
    IF NOT EXISTS (
      SELECT 1 FROM portfolio_images
      WHERE artist_id = NEW.artist_id
      AND embedding IS NULL
      AND status != 'deleted'
    ) THEN
      -- All images have embeddings, mark artist complete in pipeline state
      UPDATE artist_pipeline_state
      SET
        pipeline_status = 'complete',
        updated_at = NOW()
      WHERE artist_id = NEW.artist_id
      AND pipeline_status = 'pending_embeddings';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION update_artist_pipeline_on_embedding() IS
  'Auto-updates artist_pipeline_state.embedding_status to complete when all their images have embeddings';

-- Recreate the trigger
CREATE TRIGGER trigger_update_pipeline_on_embedding
  AFTER UPDATE OF embedding ON portfolio_images
  FOR EACH ROW
  EXECUTE FUNCTION update_artist_pipeline_on_embedding();
