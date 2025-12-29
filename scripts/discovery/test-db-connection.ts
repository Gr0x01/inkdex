/**
 * Quick test to verify Supabase connection and artists table setup
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.join(__dirname, '../../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function testConnection() {
  console.log('🔍 Testing Supabase Connection\n');

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Missing environment variables:');
    if (!SUPABASE_URL) console.error('   - NEXT_PUBLIC_SUPABASE_URL');
    if (!SUPABASE_SERVICE_KEY) console.error('   - SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  console.log(`URL: ${SUPABASE_URL}`);
  console.log(`Service Key: ${SUPABASE_SERVICE_KEY.substring(0, 20)}...\n`);

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Test 1: Check artists table exists
  console.log('📋 Test 1: Check artists table...');
  const { data: artists, error: artistsError } = await supabase
    .from('artists')
    .select('id, name, instagram_handle')
    .limit(5);

  if (artistsError) {
    console.error(`   ❌ Error: ${artistsError.message}`);
    return;
  }

  console.log(`   ✅ Artists table exists`);
  console.log(`   Found ${artists?.length || 0} existing artists`);

  if (artists && artists.length > 0) {
    console.log('\n   Recent artists:');
    artists.forEach((a, i) => {
      console.log(`   ${i + 1}. ${a.name} (@${a.instagram_handle})`);
    });
  }

  // Test 2: Insert test artist
  console.log('\n📝 Test 2: Insert test artist...');
  const testArtist = {
    name: 'Test Artist',
    slug: `test-artist-${Date.now()}`,
    instagram_handle: `test_${Date.now()}`,
    instagram_url: `https://instagram.com/test_${Date.now()}`,
    city: 'austin',
    discovery_source: 'test',
    verification_status: 'unclaimed',
  };

  const { data: inserted, error: insertError } = await supabase
    .from('artists')
    .insert(testArtist)
    .select()
    .single();

  if (insertError) {
    console.error(`   ❌ Insert failed: ${insertError.message}`);
    return;
  }

  console.log(`   ✅ Insert successful`);
  console.log(`   ID: ${inserted.id}`);

  // Test 3: Delete test artist
  console.log('\n🗑️  Test 3: Delete test artist...');
  const { error: deleteError } = await supabase
    .from('artists')
    .delete()
    .eq('id', inserted.id);

  if (deleteError) {
    console.error(`   ❌ Delete failed: ${deleteError.message}`);
    return;
  }

  console.log(`   ✅ Delete successful`);

  console.log('\n✅ All tests passed! Database is ready.\n');
}

testConnection().catch(console.error);
