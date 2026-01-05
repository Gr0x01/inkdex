/**
 * Quick script to add 80 images to Morgan Black (Pro user)
 */
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function addProUser() {
  console.log('🌱 Creating Morgan Black (Pro user) with 80 images...\n');

  // Step 1: Create Auth user
  console.log('🔐 Creating Supabase Auth user...');
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  let authUser = existingUsers?.users?.find((u: any) => u.email === 'pro@test.inkdex.io');

  if (!authUser) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: 'pro@test.inkdex.io',
      email_confirm: true,
      user_metadata: {
        instagram_username: 'test_pro_artist',
        instagram_id: 'test_pro_ig_id',
        test_user: true,
      },
    });
    if (error) throw new Error(`Auth user creation failed: ${error.message}`);
    authUser = data.user;
    console.log(`   ✅ Created auth user: ${authUser.id}`);
  } else {
    console.log(`   ✅ Auth user exists: ${authUser.id}`);
  }

  // Step 2: Create user record
  console.log('👤 Creating user record...');
  const { data: existingUserRecord } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single();

  if (!existingUserRecord) {
    const { error } = await supabase.from('users').insert({
      id: authUser.id,
      email: 'pro@test.inkdex.io',
      account_type: 'artist_pro',
      instagram_username: 'test_pro_artist',
    });
    if (error) throw new Error(`User record creation failed: ${error.message}`);
    console.log('   ✅ Created user record');
  } else {
    console.log('   ✅ User record exists');
  }

  // Step 3: Find multiple source artists (each has ~12 images max)
  console.log('🔍 Finding source artists across all cities...');
  const { data: sourceArtists, error: sourceError } = await supabase
    .from('artists')
    .select('id, name, city')
    .eq('verification_status', 'unclaimed')
    .gte('follower_count', 5000)
    .limit(20);

  if (sourceError || !sourceArtists || sourceArtists.length === 0) {
    throw new Error('No source artists found');
  }

  console.log(`   ✅ Found ${sourceArtists.length} source artists`)

  // Step 4: Create artist profile
  console.log('🎨 Creating artist profile...');
  const artistId = randomUUID();
  const { error: artistError } = await supabase.from('artists').insert({
    id: artistId,
    name: 'Morgan Black',
    slug: 'morgan-black',
    instagram_handle: 'test_pro_artist',
    instagram_id: 'test_pro_ig_id',
    bio: 'Award-winning blackwork & geometric. Book via website.',
    booking_url: 'https://www.test-pro-artist.com',
    claimed_by_user_id: authUser.id,
    verification_status: 'claimed',
    is_pro: true,
    is_featured: true,
    follower_count: 10000,
  });

  if (artistError) throw new Error(`Artist creation failed: ${artistError.message}`);
  console.log(`   ✅ Created artist: ${artistId}`);

  // Insert location into artist_locations
  const { error: locError } = await supabase.from('artist_locations').insert({
    artist_id: artistId,
    city: 'New York',
    region: 'NY',
    country_code: 'US',
    location_type: 'city',
    is_primary: true,
    display_order: 0,
  });
  if (locError) console.warn(`   ⚠️ Location insert warning: ${locError.message}`);

  // Step 5: Clone images from multiple artists to reach 80 total
  console.log('📸 Cloning images from multiple artists to reach 80 total...');
  const allClonedImages: any[] = [];
  const targetCount = 80;

  for (const sourceArtist of sourceArtists) {
    if (allClonedImages.length >= targetCount) break;

    const remaining = targetCount - allClonedImages.length;
    const { data: sourceImages, error: fetchError } = await supabase
      .from('portfolio_images')
      .select('*')
      .eq('artist_id', sourceArtist.id)
      .eq('status', 'active')
      .not('embedding', 'is', null)
      .limit(remaining);

    if (fetchError || !sourceImages || sourceImages.length === 0) {
      continue; // Skip this artist, try next one
    }

    const clonedFromThisArtist = sourceImages.map((img) => ({
      id: randomUUID(),
      artist_id: artistId,
      instagram_post_id: `test_${img.instagram_post_id}`,
      instagram_url: img.instagram_url,
      storage_original_path: img.storage_original_path,
      storage_thumb_320: img.storage_thumb_320,
      storage_thumb_640: img.storage_thumb_640,
      storage_thumb_1280: img.storage_thumb_1280,
      embedding: img.embedding,
      post_caption: img.post_caption,
      post_timestamp: img.post_timestamp,
      likes_count: img.likes_count,
      manually_added: true,
      import_source: 'oauth_onboarding',
      is_pinned: false,
      pinned_position: null,
      hidden: false,
      auto_synced: false,
      status: 'active',
    }));

    allClonedImages.push(...clonedFromThisArtist);
    console.log(`   📸 Cloned ${sourceImages.length} from ${sourceArtist.city} (${allClonedImages.length}/${targetCount})`);
  }

  if (allClonedImages.length === 0) {
    throw new Error('Failed to clone any images');
  }

  // Insert all cloned images in one batch
  const { error: insertError } = await supabase
    .from('portfolio_images')
    .insert(allClonedImages);

  if (insertError) throw new Error(`Image cloning failed: ${insertError.message}`);
  console.log(`   ✅ Total cloned: ${allClonedImages.length} images`);

  // Step 6: Create Pro subscription
  console.log('💳 Creating Pro subscription...');
  const { error: subError } = await supabase.from('artist_subscriptions').insert({
    user_id: authUser.id,
    artist_id: artistId,
    subscription_type: 'pro',
    status: 'active',
    current_period_start: new Date().toISOString(),
    current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    stripe_subscription_id: `test_sub_${randomUUID()}`,
    stripe_customer_id: `test_cus_${randomUUID()}`,
  });

  if (subError) throw new Error(`Subscription creation failed: ${subError.message}`);
  console.log('   ✅ Created Pro subscription');

  console.log('\n✅ Morgan Black created successfully!\n');
  console.log('═'.repeat(80));
  console.log('📊 Summary:\n');
  console.log(`   Artist ID:       ${artistId}`);
  console.log(`   User ID:         ${authUser.id}`);
  console.log(`   Email:           pro@test.inkdex.io`);
  console.log(`   Instagram:       @test_pro_artist`);
  console.log(`   City:            New York, NY`);
  console.log(`   Portfolio:       ${allClonedImages.length} images (all oauth_onboarding)`);
  console.log(`   Subscription:    Pro ($15/mo)`);
  console.log(`   Profile URL:     http://localhost:3000/new-york/new-york/artists/morgan-black`);
  console.log('');
  console.log('═'.repeat(80));
}

addProUser()
  .then(() => {
    console.log('✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Failed:', error);
    process.exit(1);
  });
