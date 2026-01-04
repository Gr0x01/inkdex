import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  // Total artists
  const { count: totalArtists } = await supabase
    .from('artists')
    .select('*', { count: 'exact', head: true });

  // Artists needing scraping
  const { count: needScraping } = await supabase
    .from('artists')
    .select('*', { count: 'exact', head: true })
    .is('instagram_scraped_at', null);

  // Total images
  const { count: totalImages } = await supabase
    .from('images')
    .select('*', { count: 'exact', head: true });

  // Count by city for Batch 3
  const { data: batch3Cities } = await supabase
    .from('artists')
    .select('city')
    .in('city', [
      'St. Louis', 'Cleveland', 'Milwaukee', 'Memphis', 'Louisville',
      'Cincinnati', 'Des Moines', 'Little Rock', 'Rochester', 'Tallahassee',
      'Athens', 'Fresno', 'Chattanooga', 'Knoxville', 'Greenville',
      'Omaha', 'Wichita', 'Eugene', 'Gainesville', 'Cambridge',
      'Jacksonville', 'Spokane', 'Tacoma', 'Long Beach', 'Denver'
    ]);

  console.log('\n📊 PLATFORM TOTALS:');
  console.log(`Total Artists: ${totalArtists}`);
  console.log(`Need Scraping: ${needScraping}`);
  console.log(`Total Images: ${totalImages}`);
  console.log(`\nBatch 3 Artists: ${batch3Cities?.length || 0}`);
}

main();
