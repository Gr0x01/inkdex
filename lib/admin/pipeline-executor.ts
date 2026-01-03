/**
 * Pipeline Job Executor
 *
 * Runs pipeline commands as background processes.
 * Updates pipeline_runs table with progress.
 */

import { spawn, ChildProcess } from 'child_process';
import { createAdminClient } from '@/lib/supabase/server';

// Maximum job runtime: 2 hours
const MAX_JOB_RUNTIME_MS = 2 * 60 * 60 * 1000;

// Whitelist of environment variables to pass to child processes
const ENV_WHITELIST = [
  'NODE_ENV',
  'PATH',
  'HOME',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'LOCAL_CLIP_URL',
  'CLIP_API_KEY',
  'APIFY_API_TOKEN',
  'OPENAI_API_KEY',
  'WINDOWS_GPU_URL',
  'WINDOWS_GPU_API_KEY',
];

function getFilteredEnv(): Record<string, string | undefined> {
  const filtered: Record<string, string | undefined> = {};
  for (const key of ENV_WHITELIST) {
    if (process.env[key]) {
      filtered[key] = process.env[key];
    }
  }

  // Python scripts expect SUPABASE_URL (not NEXT_PUBLIC_SUPABASE_URL)
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && !filtered.SUPABASE_URL) {
    filtered.SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  }

  return filtered;
}

export type JobType = 'scraping' | 'processing' | 'embeddings' | 'index_rebuild';
export type JobScope = 'pending' | 'failed' | 'all' | 'specific';

interface JobConfig {
  command: string;
  args: string[];
  cwd: string;
}

const JOB_CONFIGS: Record<JobType, JobConfig> = {
  scraping: {
    command: 'npm',
    args: ['run', 'scrape-instagram'],
    cwd: process.cwd(),
  },
  processing: {
    command: 'npm',
    args: ['run', 'process-images'],
    cwd: process.cwd(),
  },
  embeddings: {
    command: 'python3',
    args: ['scripts/embeddings/dual_gpu_embeddings.py'],
    cwd: process.cwd(),
  },
  index_rebuild: {
    command: 'npx',
    args: ['tsx', 'scripts/embeddings/create-vector-index.ts'],
    cwd: process.cwd(),
  },
};

export interface TriggerJobOptions {
  jobType: JobType;
  scope: JobScope;
  triggeredBy: string;
  artistIds?: string[];
  city?: string;
}

/**
 * Create a pipeline run record and start the job in background
 * Uses atomic RPC function to prevent race conditions
 */
export async function triggerPipelineJob(options: TriggerJobOptions): Promise<string> {
  const { jobType, scope, triggeredBy, artistIds, city } = options;
  const adminClient = createAdminClient();

  // Use atomic RPC function to create the run (prevents race conditions via unique index)
  const { data: runId, error } = await adminClient.rpc('create_pipeline_run', {
    p_job_type: jobType,
    p_triggered_by: triggeredBy,
    p_target_scope: scope,
    p_target_artist_ids: artistIds || null,
    p_target_city: city || null,
  });

  if (error) {
    // Handle unique_violation error from the RPC function
    if (error.code === '23505' || error.message?.includes('already pending or running')) {
      throw new Error(`A ${jobType} job is already running. Please wait for it to complete.`);
    }
    throw new Error(`Failed to create pipeline run: ${error.message}`);
  }

  if (!runId) {
    throw new Error('Failed to create pipeline run: no ID returned');
  }

  // Start the job in background (fire-and-forget)
  executeJob(runId, jobType).catch((err) => {
    console.error(`Pipeline job ${runId} failed:`, err);
  });

  return runId;
}

/**
 * Execute a pipeline job and update progress
 */
async function executeJob(runId: string, jobType: JobType): Promise<void> {
  const adminClient = createAdminClient();
  const config = JOB_CONFIGS[jobType];

  // Update status to running
  await adminClient
    .from('pipeline_runs')
    .update({
      status: 'running',
      started_at: new Date().toISOString(),
    })
    .eq('id', runId);

  return new Promise((resolve, reject) => {
    const env = getFilteredEnv() as NodeJS.ProcessEnv;
    // Pass the pipeline run ID to child process for progress tracking
    env.PIPELINE_RUN_ID = runId;

    const childProcess: ChildProcess = spawn(config.command, config.args, {
      cwd: config.cwd,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    // Store the PID for cancellation
    if (childProcess.pid) {
      void adminClient
        .from('pipeline_runs')
        .update({ process_pid: childProcess.pid })
        .eq('id', runId)
        .then(
          () => {
            console.log(`Pipeline run ${runId} started with PID ${childProcess.pid}`);
          },
          (err: unknown) => {
            console.error(`Failed to store PID for run ${runId}:`, err);
          }
        );
    }

    let stdout = '';
    let stderr = '';
    let timedOut = false;

    // Timeout mechanism - kill process if it runs too long
    const timeoutHandle = setTimeout(async () => {
      timedOut = true;
      childProcess.kill('SIGTERM');

      // Give it 10 seconds to gracefully shutdown, then force kill
      setTimeout(() => {
        if (!childProcess.killed) {
          childProcess.kill('SIGKILL');
        }
      }, 10000);
    }, MAX_JOB_RUNTIME_MS);

    childProcess.stdout?.on('data', (data) => {
      stdout += data.toString();
      // Could parse output here to update progress
    });

    childProcess.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    childProcess.on('close', async (code) => {
      clearTimeout(timeoutHandle);

      const isSuccess = code === 0 && !timedOut;
      const errorMessage = timedOut
        ? `Job timed out after ${MAX_JOB_RUNTIME_MS / 1000 / 60} minutes`
        : stderr.slice(-1000);

      await adminClient
        .from('pipeline_runs')
        .update({
          status: isSuccess ? 'completed' : 'failed',
          completed_at: new Date().toISOString(),
          error_message: isSuccess ? null : errorMessage,
          result_summary: {
            exitCode: code,
            timedOut,
            stdoutLength: stdout.length,
            stderrLength: stderr.length,
          },
        })
        .eq('id', runId);

      if (isSuccess) {
        resolve();
      } else {
        reject(new Error(timedOut ? 'Job timed out' : `Job exited with code ${code}`));
      }
    });

    childProcess.on('error', async (err) => {
      clearTimeout(timeoutHandle);

      await adminClient
        .from('pipeline_runs')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          error_message: err.message,
        })
        .eq('id', runId);

      reject(err);
    });
  });
}

/**
 * Check if there's already a running job of this type
 */
export async function hasRunningJob(jobType: JobType): Promise<boolean> {
  const adminClient = createAdminClient();

  const { count } = await adminClient
    .from('pipeline_runs')
    .select('id', { count: 'exact', head: true })
    .eq('job_type', jobType)
    .in('status', ['pending', 'running']);

  return (count || 0) > 0;
}

/**
 * Cancel a running or pending job
 */
export async function cancelJob(runId: string): Promise<void> {
  const adminClient = createAdminClient();

  await adminClient
    .from('pipeline_runs')
    .update({
      status: 'cancelled',
      completed_at: new Date().toISOString(),
    })
    .eq('id', runId)
    .in('status', ['pending', 'running']);
}
