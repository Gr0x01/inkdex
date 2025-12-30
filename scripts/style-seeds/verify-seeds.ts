#!/usr/bin/env tsx
/**
 * Verify style seeds in database
 *
 * Usage: npx tsx scripts/style-seeds/verify-seeds.ts
 */

import { config } from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Load environment variables from .env.local
config({ path: path.join(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function main() {
  console.log('🔍 Verifying Style Seeds in Database');
  console.log('='.repeat(50));

  // Query all style seeds
  const { data, error } = await supabase
    .from('style_seeds')
    .select('style_name, display_name, seed_image_url, description, created_at')
    .order('style_name');

  if (error) {
    console.error('❌ Error querying database:', error.message);
    process.exit(1);
  }

  if (!data || data.length === 0) {
    console.log('⚠️  No style seeds found in database');
    return;
  }

  console.log(`✅ Found ${data.length} style seeds:\n`);

  for (const seed of data) {
    console.log(`📌 ${seed.display_name}`);
    console.log(`   Style: ${seed.style_name}`);
    console.log(`   Image: ${seed.seed_image_url.substring(0, 80)}...`);
    console.log(`   Description: ${seed.description.substring(0, 100)}...`);
    console.log(`   Created: ${new Date(seed.created_at).toLocaleString()}`);
    console.log();
  }

  console.log('='.repeat(50));
  console.log('✅ Verification complete!');
  console.log('\n📋 Next steps:');
  console.log('1. Create style landing pages (e.g., /austin/traditional-tattoo)');
  console.log('2. Test style-based search queries');
  console.log('3. Build style browse UI component');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
