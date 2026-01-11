-- Restore increment_pipeline_progress function for embedding scripts
-- Updated to use pipeline_jobs table (was pipeline_runs)

CREATE OR REPLACE FUNCTION public.increment_pipeline_progress(run_id uuid, processed_delta integer, failed_delta integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE pipeline_jobs
  SET
    processed_items = COALESCE(processed_items, 0) + processed_delta,
    failed_items = COALESCE(failed_items, 0) + failed_delta,
    updated_at = now()
  WHERE id = run_id;
END;
$$;

COMMENT ON FUNCTION public.increment_pipeline_progress(uuid, integer, integer)
IS 'Atomically increments pipeline job progress counters. Used by embedding scripts.';
