import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function main() {
  const handle = process.argv[2] || 'lilsilhouett';

  const { data: artist } = await supabase
    .from('artists')
    .select('id, name, instagram_handle')
    .eq('instagram_handle', handle)
    .single();

  if (!artist) {
    console.log('Artist not found:', handle);
    return;
  }

  console.log('Artist:', artist.name, '(@' + artist.instagram_handle + ')');
  console.log('ID:', artist.id);

  // Get style profiles
  const { data: profiles } = await supabase
    .from('artist_style_profiles')
    .select('style_name, percentage, taxonomy, image_count')
    .eq('artist_id', artist.id)
    .order('percentage', { ascending: false });

  console.log('\nStyle profiles:');
  for (const p of profiles || []) {
    const pct = p.percentage || 0;
    const display = pct >= 25 ? '[DISPLAY]' : '';
    console.log(`  ${p.style_name}: ${pct.toFixed(1)}% (${p.image_count} images) ${display}`);
  }

  // Get image tags
  const { data: images } = await supabase
    .from('portfolio_images')
    .select('id')
    .eq('artist_id', artist.id)
    .eq('status', 'active')
    .limit(5);

  if (images && images.length > 0) {
    console.log('\nSample image tags:');
    for (const img of images) {
      const { data: tags } = await supabase
        .from('image_style_tags')
        .select('style_name, confidence')
        .eq('image_id', img.id)
        .order('confidence', { ascending: false });

      const tagStr = (tags || []).map(t => {
        const conf = (t.confidence || 0) * 100;
        return `${t.style_name}(${conf.toFixed(0)}%)`;
      }).join(', ');
      console.log(`  ${img.id.slice(0,8)}: ${tagStr || '(no tags)'}`);
    }
  }
}

main();
