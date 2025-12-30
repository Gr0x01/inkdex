import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkCityNames() {
  const { data, error } = await supabase
    .from('artists')
    .select('city')
    .limit(5);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('City names in database:', data?.map(d => d.city));
}

checkCityNames();
