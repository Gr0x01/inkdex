-- Migration: Update create_pipeline_run to use pipeline_jobs table
-- The pipeline_runs table was consolidated into pipeline_jobs

CREATE OR REPLACE FUNCTION "public"."create_pipeline_run"(
    "p_job_type" "text",
    "p_triggered_by" "text",
    "p_target_scope" "text" DEFAULT 'pending'::"text",
    "p_target_artist_ids" "uuid"[] DEFAULT NULL::"uuid"[],
    "p_target_city" "text" DEFAULT NULL::"text"
) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_run_id UUID;
BEGIN
  INSERT INTO pipeline_jobs (
    job_type, status, triggered_by, target_scope, target_artist_ids, target_city
  ) VALUES (
    p_job_type, 'pending', p_triggered_by, p_target_scope, p_target_artist_ids, p_target_city
  )
  RETURNING id INTO v_run_id;
  RETURN v_run_id;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'A % job is already pending or running', p_job_type
      USING ERRCODE = 'unique_violation';
END;
$$;

COMMENT ON FUNCTION "public"."create_pipeline_run"(
    "p_job_type" "text",
    "p_triggered_by" "text",
    "p_target_scope" "text",
    "p_target_artist_ids" "uuid"[],
    "p_target_city" "text"
) IS 'Atomically creates a pipeline job, failing if one is already active for the job type. Uses pipeline_jobs table.';
