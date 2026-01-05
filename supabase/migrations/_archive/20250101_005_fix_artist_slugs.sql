-- ============================================================================
-- Migration: Fix Invalid Artist Slugs (Use Instagram Handles Directly)
-- Date: 2025-01-01
-- Issue: Broken slug generation using unsanitized Instagram handle prefixes
-- Solution: Regenerate slugs from Instagram handles (globally unique)
-- ============================================================================
-- Problem: Discovery scripts appended 6-char Instagram handle prefixes WITHOUT
-- sanitization, creating invalid slugs like:
--   - amanda-boyd-duh.ta (contains period from @duh.tattoos)
--   - doc-woo-_dr_wo (contains underscores from @_dr_woo_)
--   - unknown-artist-ink_by (contains underscore from @ink_by_stax)
--
-- Solution: Use Instagram handles directly as slugs (globally unique):
--   - @duh.tattoos → duh-tattoos ✅
--   - @_dr_woo_ → dr-woo ✅
--   - @ink_by_stax → ink-by-stax ✅
-- ============================================================================

BEGIN;

-- Step 1: Create backup table for rollback capability
CREATE TABLE IF NOT EXISTS artists_slug_backup (
  id UUID PRIMARY KEY,
  old_slug TEXT NOT NULL,
  instagram_handle TEXT NOT NULL,
  backed_up_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clear any existing backup (idempotent)
TRUNCATE TABLE artists_slug_backup;

-- Insert current slugs into backup
INSERT INTO artists_slug_backup (id, old_slug, instagram_handle)
SELECT id, slug, instagram_handle FROM artists;

COMMENT ON TABLE artists_slug_backup IS
  'Backup of old slugs before migration (2025-01-01). Safe to drop after verification.';

-- Step 2: Create function to generate new slugs (matches TypeScript utility)
CREATE OR REPLACE FUNCTION generate_slug_from_instagram(handle TEXT)
RETURNS TEXT AS $$
DECLARE
  sanitized TEXT;
BEGIN
  -- Remove @ prefix and trim whitespace
  sanitized := TRIM(REGEXP_REPLACE(handle, '^@', ''));

  -- Validate non-empty
  IF sanitized IS NULL OR LENGTH(sanitized) = 0 THEN
    RAISE EXCEPTION 'Instagram handle cannot be empty';
  END IF;

  -- Sanitize: lowercase and replace non-alphanumeric with hyphens
  sanitized := LOWER(sanitized);
  sanitized := REGEXP_REPLACE(sanitized, '[^a-z0-9]+', '-', 'g');

  -- Remove leading and trailing hyphens
  sanitized := REGEXP_REPLACE(sanitized, '^-+', '', 'g');
  sanitized := REGEXP_REPLACE(sanitized, '-+$', '', 'g');

  -- Truncate to 50 chars
  sanitized := SUBSTRING(sanitized, 1, 50);

  -- Validate result is non-empty (all special characters case)
  IF sanitized IS NULL OR LENGTH(sanitized) = 0 THEN
    RAISE EXCEPTION 'Instagram handle "%" produces invalid slug (all special characters)', handle;
  END IF;

  -- Validate against regex (defense in depth)
  IF sanitized !~ '^[a-z0-9-]+$' THEN
    RAISE EXCEPTION 'Generated slug "%" contains invalid characters', sanitized;
  END IF;

  RETURN sanitized;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Step 3: Detect slug collisions BEFORE updating (safety check)
DO $$
DECLARE
  collision_count INTEGER;
  rec RECORD;
BEGIN
  -- Count how many duplicate slugs would be created
  SELECT COUNT(*) INTO collision_count
  FROM (
    SELECT
      generate_slug_from_instagram(instagram_handle) AS new_slug,
      COUNT(*) AS artist_count
    FROM artists
    GROUP BY generate_slug_from_instagram(instagram_handle)
    HAVING COUNT(*) > 1
  ) collisions;

  IF collision_count > 0 THEN
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'COLLISION ALERT: Found % slug collisions', collision_count;
    RAISE NOTICE '==========================================';

    -- List all collisions with affected handles
    FOR rec IN (
      SELECT
        generate_slug_from_instagram(instagram_handle) AS new_slug,
        ARRAY_AGG(instagram_handle ORDER BY instagram_handle) AS handles,
        COUNT(*) as count
      FROM artists
      GROUP BY generate_slug_from_instagram(instagram_handle)
      HAVING COUNT(*) > 1
    ) LOOP
      RAISE NOTICE 'Slug "%" would be used by % artists:', rec.new_slug, rec.count;
      RAISE NOTICE '  Handles: %', rec.handles;
    END LOOP;

    RAISE EXCEPTION 'Slug collisions detected. Manual resolution required before migration.';
  END IF;

  RAISE NOTICE '✅ No slug collisions detected. Safe to proceed.';
END $$;

-- Step 4: Update all artist slugs (atomic operation)
-- Drop UNIQUE constraint temporarily to allow updates
ALTER TABLE artists DROP CONSTRAINT IF EXISTS artists_slug_key;

-- Update all slugs using the sanitization function
UPDATE artists
SET slug = generate_slug_from_instagram(instagram_handle);

-- Re-add UNIQUE constraint
ALTER TABLE artists ADD CONSTRAINT artists_slug_key UNIQUE (slug);

-- Step 5: Verify all slugs pass validation
DO $$
DECLARE
  invalid_count INTEGER;
  rec RECORD;
BEGIN
  -- Count slugs that fail validation
  SELECT COUNT(*) INTO invalid_count
  FROM artists
  WHERE
    slug !~ '^[a-z0-9-]+$'  -- Invalid characters
    OR slug ~ '^-'           -- Starts with hyphen
    OR slug ~ '-$'           -- Ends with hyphen
    OR LENGTH(slug) > 50     -- Too long
    OR LENGTH(slug) = 0;     -- Empty

  IF invalid_count > 0 THEN
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'VALIDATION FAILURE: Found % invalid slugs', invalid_count;
    RAISE NOTICE '==========================================';

    -- List all invalid slugs
    FOR rec IN (
      SELECT id, instagram_handle, slug, LENGTH(slug) as len
      FROM artists
      WHERE
        slug !~ '^[a-z0-9-]+$'
        OR slug ~ '^-'
        OR slug ~ '-$'
        OR LENGTH(slug) > 50
        OR LENGTH(slug) = 0
      LIMIT 20
    ) LOOP
      RAISE NOTICE 'Artist % (@%): slug = "%" (length: %)',
        rec.id, rec.instagram_handle, rec.slug, rec.len;
    END LOOP;

    RAISE EXCEPTION 'Invalid slugs detected after migration. Rolling back transaction.';
  END IF;

  RAISE NOTICE '✅ All % artist slugs validated successfully.', (SELECT COUNT(*) FROM artists);
END $$;

-- Step 6: Clean up temporary function
DROP FUNCTION generate_slug_from_instagram(TEXT);

-- Step 7: Log migration summary
DO $$
DECLARE
  total_artists INTEGER;
  changed_count INTEGER;
  unchanged_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_artists FROM artists;

  -- Count how many slugs actually changed
  SELECT COUNT(*) INTO changed_count
  FROM artists a
  JOIN artists_slug_backup b ON a.id = b.id
  WHERE a.slug != b.old_slug;

  unchanged_count := total_artists - changed_count;

  RAISE NOTICE '==========================================';
  RAISE NOTICE 'SLUG MIGRATION COMPLETE ✅';
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'Total artists: %', total_artists;
  RAISE NOTICE 'Slugs changed: %', changed_count;
  RAISE NOTICE 'Slugs unchanged: %', unchanged_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Backup table "artists_slug_backup" created for rollback.';
  RAISE NOTICE 'Safe to drop after verification:';
  RAISE NOTICE '  DROP TABLE artists_slug_backup;';
END $$;

COMMIT;

-- ============================================================================
-- ROLLBACK PROCEDURE (if needed):
-- ============================================================================
-- Run this if migration causes issues:
--
-- BEGIN;
-- ALTER TABLE artists DROP CONSTRAINT artists_slug_key;
-- UPDATE artists a
-- SET slug = b.old_slug
-- FROM artists_slug_backup b
-- WHERE a.id = b.id;
-- ALTER TABLE artists ADD CONSTRAINT artists_slug_key UNIQUE (slug);
-- COMMIT;
-- ============================================================================
