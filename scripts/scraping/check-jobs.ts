import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkJobs() {
  // Get running/pending scraping jobs
  const { data, error } = await supabase
    .from('pipeline_jobs')
    .select('*')
    .in('status', ['running', 'pending'])
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Active jobs:');
  for (const job of data || []) {
    const heartbeat = job.last_heartbeat_at ? new Date(job.last_heartbeat_at) : null;
    const minutesAgo = heartbeat ? Math.round((Date.now() - heartbeat.getTime()) / 60000) : 'N/A';

    console.log(`\nJob: ${job.id}`);
    console.log(`  Type: ${job.job_type}`);
    console.log(`  Status: ${job.status}`);
    console.log(`  Progress: ${job.processed_items}/${job.total_items}`);
    console.log(`  Failed: ${job.failed_items}`);
    console.log(`  Last heartbeat: ${minutesAgo} minutes ago`);
    console.log(`  Started: ${job.started_at}`);
  }
}

checkJobs();
