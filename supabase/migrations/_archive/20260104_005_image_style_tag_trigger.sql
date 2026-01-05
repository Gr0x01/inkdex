-- ============================================
-- Auto-tag images with styles when embedding is set
-- Triggers on INSERT or UPDATE of embedding column
-- ============================================

-- Function to compute and insert style tags for an image
CREATE OR REPLACE FUNCTION compute_image_style_tags()
RETURNS TRIGGER AS $$
DECLARE
  style_record RECORD;
  similarity FLOAT;
  min_confidence FLOAT := 0.25;
  max_tags INT := 3;
  tag_count INT := 0;
BEGIN
  -- Only run if embedding is set and not null
  IF NEW.embedding IS NULL THEN
    RETURN NEW;
  END IF;

  -- Skip if embedding hasn't changed (on UPDATE)
  IF TG_OP = 'UPDATE' AND OLD.embedding IS NOT DISTINCT FROM NEW.embedding THEN
    RETURN NEW;
  END IF;

  -- Delete existing tags for this image (will be replaced)
  DELETE FROM image_style_tags WHERE image_id = NEW.id;

  -- Compute similarity to each style seed and insert top N
  FOR style_record IN (
    SELECT
      ss.style_name,
      1 - (NEW.embedding <=> ss.embedding) as similarity
    FROM style_seeds ss
    WHERE ss.embedding IS NOT NULL
    ORDER BY NEW.embedding <=> ss.embedding ASC
    LIMIT max_tags
  ) LOOP
    -- Only insert if above minimum confidence
    IF style_record.similarity >= min_confidence THEN
      INSERT INTO image_style_tags (image_id, style_name, confidence)
      VALUES (NEW.id, style_record.style_name, style_record.similarity)
      ON CONFLICT (image_id, style_name) DO UPDATE SET
        confidence = EXCLUDED.confidence;

      tag_count := tag_count + 1;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on portfolio_images
DROP TRIGGER IF EXISTS trg_compute_style_tags ON portfolio_images;

CREATE TRIGGER trg_compute_style_tags
  AFTER INSERT OR UPDATE OF embedding ON portfolio_images
  FOR EACH ROW
  EXECUTE FUNCTION compute_image_style_tags();

-- Comment
COMMENT ON FUNCTION compute_image_style_tags IS
  'Automatically tags images with top 3 style labels when embedding is set. Min confidence: 0.25';
