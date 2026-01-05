-- Atomic Pipeline Progress Increment
-- Allows multiple workers to safely update progress concurrently

CREATE OR REPLACE FUNCTION increment_pipeline_progress(
  run_id uuid,
  processed_delta integer,
  failed_delta integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE pipeline_runs
  SET
    processed_items = COALESCE(processed_items, 0) + processed_delta,
    failed_items = COALESCE(failed_items, 0) + failed_delta,
    updated_at = now()
  WHERE id = run_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION increment_pipeline_progress TO authenticated, anon, service_role;
