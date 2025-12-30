import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const { data: artists, error: artistError } = await supabase
  .from('artists')
  .select('id, slug, name, city')
  .limit(5);

console.log('=== ARTISTS CHECK ===');
console.log('Count:', artists?.length || 0);
console.log('Error:', artistError?.message || 'none');

if (artists?.length) {
  console.log('\nFirst artist:', JSON.stringify(artists[0], null, 2));
  
  const { data: images, error: imgError } = await supabase
    .from('portfolio_images')
    .select('id, instagram_url, status')
    .eq('artist_id', artists[0].id)
    .limit(3);
  
  console.log('\n=== PORTFOLIO IMAGES ===');
  console.log('Count:', images?.length || 0);
  console.log('Error:', imgError?.message || 'none');
  if (images?.length) {
    console.log('Sample:', JSON.stringify(images[0], null, 2));
  }
}
