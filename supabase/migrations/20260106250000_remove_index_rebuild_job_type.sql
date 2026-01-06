-- Remove index_rebuild from pipeline_runs job_type constraint
-- This job type was deprecated in favor of manual SQL execution via Supabase SQL Editor
-- See: memory-bank/development/operations.md for manual vector index rebuild instructions

-- First, delete any historical index_rebuild jobs (they're no longer relevant)
DELETE FROM pipeline_runs WHERE job_type = 'index_rebuild';

-- Now update the constraint
ALTER TABLE pipeline_runs
DROP CONSTRAINT IF EXISTS pipeline_runs_job_type_check;

ALTER TABLE pipeline_runs
ADD CONSTRAINT pipeline_runs_job_type_check
CHECK (job_type = ANY (ARRAY['scraping', 'processing', 'embeddings']));
