import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkStatus() {
  // Get all pipeline states with counts
  const { data, error } = await supabase
    .from('artist_pipeline_state')
    .select('pipeline_status');

  if (error) {
    console.error('Error:', error);
    return;
  }

  const counts: Record<string, number> = {};
  data?.forEach((d) => {
    counts[d.pipeline_status] = (counts[d.pipeline_status] || 0) + 1;
  });

  console.log('Pipeline status counts:');
  Object.entries(counts).forEach(([status, count]) => {
    console.log(`  ${status}: ${count}`);
  });

  // Also count artists without pipeline state
  const { count: totalArtists } = await supabase
    .from('artists')
    .select('id', { count: 'exact', head: true });

  const { count: withState } = await supabase
    .from('artist_pipeline_state')
    .select('artist_id', { count: 'exact', head: true });

  console.log(`\nTotal artists: ${totalArtists}`);
  console.log(`With pipeline state: ${withState}`);
  console.log(`Without state: ${(totalArtists || 0) - (withState || 0)}`);
}

checkStatus();
