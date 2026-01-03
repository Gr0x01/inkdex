-- Pipeline Unique Constraint: Prevent duplicate running jobs
-- Migration: 20260108_004_pipeline_unique_constraint.sql

-- Create a partial unique index to prevent multiple running/pending jobs of the same type.
-- This handles the race condition where two admins might try to trigger the same job type
-- at nearly the same time.
--
-- The index only applies to jobs with status 'pending' or 'running', allowing
-- multiple completed/failed/cancelled jobs of the same type.

CREATE UNIQUE INDEX IF NOT EXISTS idx_pipeline_runs_unique_active_job
  ON pipeline_runs (job_type)
  WHERE status IN ('pending', 'running');

-- Comment for documentation
COMMENT ON INDEX idx_pipeline_runs_unique_active_job IS
  'Ensures only one pending or running job per job_type at any time (prevents race conditions)';

-- Also add an RPC function for atomic job creation that handles the race condition gracefully
CREATE OR REPLACE FUNCTION create_pipeline_run(
  p_job_type TEXT,
  p_triggered_by TEXT,
  p_target_scope TEXT DEFAULT 'pending',
  p_target_artist_ids UUID[] DEFAULT NULL,
  p_target_city TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_run_id UUID;
BEGIN
  -- Attempt to insert; the unique index will prevent duplicates
  INSERT INTO pipeline_runs (
    job_type,
    status,
    triggered_by,
    target_scope,
    target_artist_ids,
    target_city
  ) VALUES (
    p_job_type,
    'pending',
    p_triggered_by,
    p_target_scope,
    p_target_artist_ids,
    p_target_city
  )
  RETURNING id INTO v_run_id;

  RETURN v_run_id;
EXCEPTION
  WHEN unique_violation THEN
    -- A job of this type is already running
    RAISE EXCEPTION 'A % job is already pending or running', p_job_type
      USING ERRCODE = 'unique_violation';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_pipeline_run IS
  'Atomically creates a pipeline run, failing if one is already active for the job type';
