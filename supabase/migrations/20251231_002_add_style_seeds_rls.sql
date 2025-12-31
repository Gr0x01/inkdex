-- Migration: Add RLS policies to style_seeds table
-- Date: 2025-12-31
-- Description: Enable Row Level Security on style_seeds table with appropriate policies
-- Security Fix: Critical Issue #1 from code review

-- Enable RLS on style_seeds table
ALTER TABLE style_seeds ENABLE ROW LEVEL SECURITY;

-- Policy 1: Public read access to style seeds
-- Rationale: Style seed data is public and used for SEO landing pages
CREATE POLICY "Public read access to style seeds"
  ON style_seeds FOR SELECT
  USING (true);

-- Policy 2: Service role can manage style seeds
-- Rationale: Only service role should modify seed data (static reference data)
CREATE POLICY "Service role can manage style seeds"
  ON style_seeds FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Verify policies were created
DO $$
BEGIN
  RAISE NOTICE 'RLS enabled on style_seeds table';
  RAISE NOTICE 'Created 2 policies: public read access and service role management';
END $$;
