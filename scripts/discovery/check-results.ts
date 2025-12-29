import * as dotenv from 'dotenv';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.join(__dirname, '../../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkResults() {
  const { data, error } = await supabase
    .from('artists')
    .select('id, name, instagram_handle, city, discovery_source')
    .eq('city', 'austin')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`\n✅ Found ${data.length} artists in Austin:\n`);
  console.log('Discovery Source Breakdown:');

  const sources: Record<string, number> = {};
  data.forEach(a => {
    sources[a.discovery_source] = (sources[a.discovery_source] || 0) + 1;
  });

  Object.entries(sources)
    .sort((a, b) => b[1] - a[1])
    .forEach(([source, count]) => {
      console.log(`  ${source}: ${count}`);
    });

  console.log(`\n\nSample Artists:`);
  data.slice(0, 10).forEach((a, i) => {
    console.log(`${i + 1}. ${a.name} (@${a.instagram_handle})`);
  });
}

checkResults();
