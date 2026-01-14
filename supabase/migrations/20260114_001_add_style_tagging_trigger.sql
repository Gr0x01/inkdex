-- Deploy auto-style-tagging trigger that was missing from production
-- This trigger fires when embeddings are set and auto-tags images with styles

-- Function: Computes style tags using CLIP seed comparison
CREATE OR REPLACE FUNCTION public.compute_image_style_tags()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  technique_record RECORD;
  theme_record RECORD;
  v_technique_threshold float := 0.35;
  v_theme_threshold float := 0.45;
BEGIN
  IF NEW.embedding IS NULL THEN
    RETURN NEW;
  END IF;

  -- Clear existing tags for this image
  DELETE FROM image_style_tags WHERE image_id = NEW.id;

  -- Find best matching technique (ONE only)
  SELECT style_name, (1 - (NEW.embedding <=> embedding)) as similarity
  INTO technique_record
  FROM style_seeds
  WHERE taxonomy = 'technique' AND embedding IS NOT NULL
  ORDER BY NEW.embedding <=> embedding ASC
  LIMIT 1;

  IF technique_record IS NOT NULL AND technique_record.similarity >= v_technique_threshold THEN
    INSERT INTO image_style_tags (image_id, style_name, confidence, taxonomy)
    VALUES (NEW.id, technique_record.style_name, technique_record.similarity, 'technique');
  END IF;

  -- Find up to 2 matching themes
  FOR theme_record IN (
    SELECT style_name, (1 - (NEW.embedding <=> embedding)) as similarity
    FROM style_seeds
    WHERE taxonomy = 'theme' AND embedding IS NOT NULL
      AND (1 - (NEW.embedding <=> embedding)) >= v_theme_threshold
    ORDER BY NEW.embedding <=> embedding ASC
    LIMIT 2
  ) LOOP
    INSERT INTO image_style_tags (image_id, style_name, confidence, taxonomy)
    VALUES (NEW.id, theme_record.style_name, theme_record.similarity, 'theme');
  END LOOP;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.compute_image_style_tags() IS 'Auto-tags images with ONE technique (threshold 0.35) and up to 2 themes (threshold 0.45). Uses CLIP seed comparison for real-time tagging.';

-- Trigger: Fire after embedding is set on insert or update
CREATE OR REPLACE TRIGGER compute_image_style_tags_trigger
AFTER INSERT OR UPDATE OF embedding ON public.portfolio_images
FOR EACH ROW
EXECUTE FUNCTION public.compute_image_style_tags();
