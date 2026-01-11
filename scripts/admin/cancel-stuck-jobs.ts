#!/usr/bin/env npx tsx
/**
 * Cancel stuck pipeline jobs
 *
 * Usage: npx tsx scripts/admin/cancel-stuck-jobs.ts
 */

import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function cancelStuckJobs() {
  // Find stuck jobs: pending/running batch jobs older than 1 hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { data: stuckJobs, error: fetchError } = await supabase
    .from('pipeline_jobs')
    .select('id, job_type, status, created_at, started_at, last_heartbeat_at')
    .in('status', ['pending', 'running'])
    .neq('job_type', 'scrape_single')
    .lt('created_at', oneHourAgo);

  if (fetchError) {
    console.error('Error fetching stuck jobs:', fetchError);
    process.exit(1);
  }

  if (!stuckJobs || stuckJobs.length === 0) {
    console.log('No stuck jobs found');
    return;
  }

  console.log(`Found ${stuckJobs.length} stuck job(s):`);
  for (const job of stuckJobs) {
    console.log(`  - ${job.id}: ${job.job_type} (${job.status}) created ${job.created_at}`);
  }

  // Cancel them
  const { data: cancelled, error: updateError } = await supabase
    .from('pipeline_jobs')
    .update({
      status: 'cancelled',
      completed_at: new Date().toISOString(),
      error_message: 'Manually cancelled: stuck job detected',
    })
    .in('id', stuckJobs.map(j => j.id))
    .select('id, job_type');

  if (updateError) {
    console.error('Error cancelling jobs:', updateError);
    process.exit(1);
  }

  console.log(`\nCancelled ${cancelled?.length || 0} job(s)`);
}

cancelStuckJobs();
