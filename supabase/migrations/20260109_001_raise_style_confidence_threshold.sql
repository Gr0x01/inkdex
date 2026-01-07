-- Migration: Raise style tagging confidence threshold from 0.25 to 0.35
-- Purpose: Reduce false positives for specific styles like Japanese
--
-- At 0.25 threshold, 30.7% of artists were tagged as "Japanese" style
-- when it should realistically be ~5-10%. This was causing styles like
-- Japanese irezumi to be over-tagged on non-Japanese work.

-- Recreate the compute_image_style_tags trigger function with higher threshold
CREATE OR REPLACE FUNCTION compute_image_style_tags()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  style_record RECORD;
  similarity FLOAT;
  min_confidence FLOAT := 0.35;  -- Raised from 0.25
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
        confidence = EXCLUDED.confidence,
        updated_at = NOW();
      tag_count := tag_count + 1;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION compute_image_style_tags IS
  'Trigger function that computes style tags for portfolio images based on CLIP embedding similarity. Threshold: 0.35';
