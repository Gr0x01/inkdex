/**
 * Add Phase 7 Profile Data to Test Users
 *
 * Updates existing test users with dummy data for Phase 7 profile editor fields:
 * - bio_override (custom bio for claimed artists)
 * - pricing_info (Pro only)
 * - availability_status (Pro only)
 *
 * Run: npx tsx scripts/seed/add-pro-user-profile-data.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables!');
  console.error('   Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * Update test users with Phase 7 profile data
 */
async function updateTestUsersProfileData() {
  console.log('\n🔄 Updating test users with Phase 7 profile data...\n');

  // 1. Update Alex Rivera (Free tier) - bio_override only
  const { error: alexError } = await supabase
    .from('artists')
    .update({
      bio_override:
        'Minimalist tattoo artist specializing in fine line work and delicate designs. Based in Los Angeles. DM on Instagram to discuss your next piece!',
    })
    .eq('instagram_handle', 'test_free_artist');

  if (alexError) {
    console.error('❌ Failed to update Alex Rivera:', alexError);
  } else {
    console.log('✅ Alex Rivera (Free): Added bio_override');
  }

  // 2. Update Morgan Black (Pro tier) - all fields
  const { error: morganError } = await supabase
    .from('artists')
    .update({
      bio_override:
        'Award-winning blackwork and geometric tattoo artist. 10+ years experience. Featured in Inked Magazine 2024. Currently accepting select projects for 2026.',
      pricing_info: 'Starting at $200/hour, $400 minimum. Custom quotes available.',
      availability_status: 'waitlist',
    })
    .eq('instagram_handle', 'test_pro_artist');

  if (morganError) {
    console.error('❌ Failed to update Morgan Black:', morganError);
  } else {
    console.log('✅ Morgan Black (Pro): Added bio_override, pricing_info, availability_status');
  }

  // 3. Jamie Chen (unclaimed) doesn't get profile data (not claimed)
  console.log('ℹ️  Jamie Chen (Unclaimed): No profile data (not a claimed artist)');

  console.log('\n✨ Test user profile data updated successfully!\n');
}

async function main() {
  try {
    await updateTestUsersProfileData();
  } catch (error) {
    console.error('\n❌ Unexpected error:', error);
    process.exit(1);
  }
}

main();
