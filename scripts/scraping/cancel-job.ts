import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function cancelJob(jobId: string) {
  console.log(`Cancelling job ${jobId}...`);

  const { error } = await supabase
    .from('pipeline_jobs')
    .update({
      status: 'cancelled',
      completed_at: new Date().toISOString(),
      error_message: 'Manually cancelled - stuck with no progress',
    })
    .eq('id', jobId);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Job cancelled');
}

// Cancel the stuck scraping job
cancelJob('886642db-ad6c-4977-9b9a-02b4e8050418');
