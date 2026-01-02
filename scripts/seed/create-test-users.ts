/**
 * Test User Seeding Script
 *
 * Creates 3 test users with cloned portfolio images:
 * 1. Unclaimed Artist (Jamie Chen) - Austin, TX - 12 images
 * 2. Free Tier Artist (Alex Rivera) - Los Angeles, CA - 18 images
 * 3. Pro Tier Artist (Morgan Black) - New York, NY - 20 images
 *
 * Usage:
 *   npx tsx scripts/seed/create-test-users.ts
 *
 * Features:
 * - Idempotent (checks for existing test users)
 * - Clones portfolio images from real artists (reuses storage paths)
 * - Creates Supabase Auth users for Free and Pro tiers
 * - Creates subscription for Pro tier
 * - Marks all test data with import_source = 'test_seed'
 */

import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

// Initialize Supabase client with service role
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

interface TestUserConfig {
  name: string;
  instagram_handle: string;
  instagram_username: string;
  instagram_id: string;
  email: string;
  city: string;
  state: string;
  stateSlug: string;
  citySlug: string;
  bio: string;
  booking_url?: string;
  verification_status: 'unclaimed' | 'claimed';
  is_pro: boolean;
  is_featured: boolean;
  account_type: 'fan' | 'artist_free' | 'artist_pro';
  imageCount: number;
}

const TEST_USER_CONFIGS: TestUserConfig[] = [
  {
    name: 'Jamie Chen',
    instagram_handle: 'test_unclaimed_artist',
    instagram_username: 'test_unclaimed_artist',
    instagram_id: 'test_unclaimed_ig_id',
    email: 'unclaimed@test.inkdex.io',
    city: 'Austin',
    state: 'Texas',
    stateSlug: 'texas',
    citySlug: 'austin',
    bio: 'Traditional & Japanese tattoos. Walk-ins welcome.',
    verification_status: 'unclaimed',
    is_pro: false,
    is_featured: false,
    account_type: 'fan',
    imageCount: 12,
  },
  {
    name: 'Alex Rivera',
    instagram_handle: 'test_free_artist',
    instagram_username: 'test_free_artist',
    instagram_id: 'test_free_ig_id',
    email: 'free@test.inkdex.io',
    city: 'Los Angeles',
    state: 'California',
    stateSlug: 'california',
    citySlug: 'los-angeles',
    bio: 'Fine line & minimalist tattoos. DM for bookings.',
    booking_url: 'https://instagram.com/test_free_artist',
    verification_status: 'claimed',
    is_pro: false,
    is_featured: false,
    account_type: 'artist_free',
    imageCount: 18,
  },
  {
    name: 'Morgan Black',
    instagram_handle: 'test_pro_artist',
    instagram_username: 'test_pro_artist',
    instagram_id: 'test_pro_ig_id',
    email: 'pro@test.inkdex.io',
    city: 'New York',
    state: 'New York',
    stateSlug: 'new-york',
    citySlug: 'new-york',
    bio: 'Award-winning blackwork & geometric. Book via website.',
    booking_url: 'https://www.test-pro-artist.com',
    verification_status: 'claimed',
    is_pro: true,
    is_featured: true,
    account_type: 'artist_pro',
    imageCount: 20,
  },
];

/**
 * Check if test users already exist
 */
async function checkExistingTestUsers() {
  const { data, error } = await supabase
    .from('artists')
    .select('id, name, instagram_handle')
    .or(`instagram_handle.eq.test_unclaimed_artist,instagram_handle.eq.test_free_artist,instagram_handle.eq.test_pro_artist`);

  if (error) {
    console.error('Error checking existing test users:', error);
    return [];
  }

  return data || [];
}

/**
 * Find source artist with enough images for cloning
 */
async function findSourceArtist(city: string, minImages: number) {
  const { data, error } = await supabase
    .from('artists')
    .select(`
      id,
      name,
      city,
      portfolio_images (count)
    `)
    .eq('city', city)
    .eq('verification_status', 'unclaimed')
    .gte('follower_count', 5000) // Prefer popular artists
    .limit(10);

  if (error || !data || data.length === 0) {
    throw new Error(`No source artists found in ${city}`);
  }

  // Find artist with at least minImages
  for (const artist of data) {
    const { count } = await supabase
      .from('portfolio_images')
      .select('id', { count: 'exact', head: true })
      .eq('artist_id', artist.id);

    if (count && count >= minImages) {
      return artist.id;
    }
  }

  // Fallback: return first artist if none meet threshold
  return data[0].id;
}

/**
 * Create Supabase Auth user (for Free and Pro tiers only)
 * Idempotent: checks for existing user first
 */
async function createAuthUser(email: string, instagram_username: string, instagram_id: string) {
  // Check if auth user already exists
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const existingUser = existingUsers?.users.find((u) => u.email === email);

  if (existingUser) {
    console.log(`   ℹ️  Auth user already exists (${existingUser.id}), reusing...`);
    return existingUser;
  }

  // Create new auth user
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: {
      instagram_username,
      instagram_id,
      test_user: true,
    },
  });

  if (error) {
    throw new Error(`Failed to create auth user: ${error.message}`);
  }

  return data.user;
}

/**
 * Create artist profile
 */
async function createArtist(config: TestUserConfig, userId?: string) {
  const artistId = randomUUID();
  const slug = config.name.toLowerCase().replace(/\s+/g, '-');

  const { data, error } = await supabase
    .from('artists')
    .insert({
      id: artistId,
      name: config.name,
      slug,
      city: config.city,
      state: config.state,
      instagram_handle: config.instagram_handle,
      instagram_id: config.instagram_id,
      bio: config.bio,
      booking_url: config.booking_url || null,
      claimed_by_user_id: userId || null,
      verification_status: config.verification_status,
      is_pro: config.is_pro,
      is_featured: config.is_featured,
      follower_count: 5000, // Dummy value
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create artist: ${error.message}`);
  }

  return data;
}

/**
 * Create user in users table (for Free and Pro tiers)
 * Idempotent: checks for existing user record first
 */
async function createUserRecord(authUserId: string, accountType: string, instagram_username: string) {
  // Check if user record already exists
  const { data: existingUser } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUserId)
    .single();

  if (existingUser) {
    console.log(`   ℹ️  User record already exists, reusing...`);
    return existingUser;
  }

  // Create new user record
  const { data, error } = await supabase
    .from('users')
    .insert({
      id: authUserId,
      email: `${accountType}@test.inkdex.io`,
      account_type: accountType,
      instagram_username,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create user record: ${error.message}`);
  }

  return data;
}

/**
 * Clone portfolio images from source artist
 */
async function clonePortfolioImages(
  targetArtistId: string,
  sourceArtistId: string,
  count: number
) {
  // Fetch source images
  const { data: sourceImages, error: fetchError } = await supabase
    .from('portfolio_images')
    .select('*')
    .eq('artist_id', sourceArtistId)
    .eq('status', 'active')
    .not('embedding', 'is', null) // Only images with embeddings
    .limit(count);

  if (fetchError || !sourceImages || sourceImages.length === 0) {
    throw new Error(`Failed to fetch source images: ${fetchError?.message || 'No images found'}`);
  }

  console.log(`   📸 Cloning ${sourceImages.length} images from source artist...`);

  // Clone images with new IDs but same storage paths and embeddings
  const clonedImages = sourceImages.map((img) => ({
    id: randomUUID(),
    artist_id: targetArtistId,
    instagram_post_id: `test_${img.instagram_post_id}`,
    instagram_url: img.instagram_url,
    storage_original_path: img.storage_original_path,
    storage_thumb_320: img.storage_thumb_320,
    storage_thumb_640: img.storage_thumb_640,
    storage_thumb_1280: img.storage_thumb_1280,
    embedding: img.embedding, // Reuse existing embedding
    post_caption: img.post_caption,
    post_timestamp: img.post_timestamp,
    likes_count: img.likes_count,
    manually_added: true,
    import_source: 'manual_import', // Mark as test data
    status: 'active',
  }));

  const { error: insertError } = await supabase
    .from('portfolio_images')
    .insert(clonedImages);

  if (insertError) {
    throw new Error(`Failed to clone images: ${insertError.message}`);
  }

  return clonedImages.length;
}

/**
 * Create Pro subscription
 * Idempotent: checks for existing subscription first
 */
async function createSubscription(artistId: string, userId: string) {
  // Check if subscription already exists
  const { data: existingSub } = await supabase
    .from('artist_subscriptions')
    .select('*')
    .eq('artist_id', artistId)
    .eq('user_id', userId)
    .single();

  if (existingSub) {
    console.log(`   ℹ️  Subscription already exists, reusing...`);
    return;
  }

  // Create new subscription
  const { error } = await supabase
    .from('artist_subscriptions')
    .insert({
      user_id: userId,
      artist_id: artistId,
      subscription_type: 'pro',
      status: 'active',
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      stripe_subscription_id: `test_sub_${randomUUID()}`,
      stripe_customer_id: `test_cus_${randomUUID()}`,
    });

  if (error) {
    throw new Error(`Failed to create subscription: ${error.message}`);
  }
}

/**
 * Main seeding function
 */
async function seedTestUsers() {
  console.log('🌱 Starting test user seeding...\n');

  // Check if test users already exist
  const existing = await checkExistingTestUsers();
  if (existing.length > 0) {
    console.log('⚠️  Test users already exist:');
    existing.forEach((user) => {
      console.log(`   - ${user.name} (@${user.instagram_handle})`);
    });
    console.log('\n💡 To re-seed, first delete existing test users from database.');
    console.log('   DELETE FROM artists WHERE instagram_handle LIKE \'test_%\';');
    process.exit(0);
  }

  const results: any[] = [];

  for (const config of TEST_USER_CONFIGS) {
    console.log(`\n📝 Creating ${config.name} (${config.verification_status})...`);

    try {
      // Step 1: Create Supabase Auth user (for Free and Pro only)
      let authUser = null;
      let userRecord = null;

      if (config.verification_status === 'claimed') {
        console.log('   🔐 Creating Supabase Auth user...');
        authUser = await createAuthUser(config.email, config.instagram_username, config.instagram_id);

        console.log('   👤 Creating user record...');
        userRecord = await createUserRecord(authUser.id, config.account_type, config.instagram_username);
      }

      // Step 2: Find source artist for image cloning
      console.log(`   🔍 Finding source artist in ${config.city}...`);
      const sourceArtistId = await findSourceArtist(config.city, config.imageCount);

      // Step 3: Create artist profile
      console.log('   🎨 Creating artist profile...');
      const artist = await createArtist(config, authUser?.id);

      // Step 4: Clone portfolio images
      const clonedCount = await clonePortfolioImages(artist.id, sourceArtistId, config.imageCount);

      // Step 5: Create subscription (Pro tier only)
      if (config.is_pro && authUser) {
        console.log('   💳 Creating Pro subscription...');
        await createSubscription(artist.id, authUser.id);
      }

      console.log(`   ✅ ${config.name} created successfully!`);

      results.push({
        config,
        artist,
        authUser,
        userRecord,
        clonedCount,
      });
    } catch (error) {
      console.error(`   ❌ Failed to create ${config.name}:`, error);
      throw error;
    }
  }

  // Print summary
  console.log('\n\n✅ Test user seeding complete!\n');
  console.log('═'.repeat(80));
  console.log('📊 Summary:\n');

  results.forEach((result, index) => {
    const { config, artist, authUser, clonedCount } = result;
    const num = index + 1;

    console.log(`${num}. ${config.name} (${config.verification_status.toUpperCase()})`);
    console.log(`   Artist ID:       ${artist.id}`);
    if (authUser) {
      console.log(`   User ID:         ${authUser.id}`);
      console.log(`   Email:           ${config.email}`);
    }
    console.log(`   Instagram:       @${config.instagram_handle}`);
    console.log(`   City:            ${config.city}, ${config.state}`);
    console.log(`   Portfolio:       ${clonedCount} images (cloned)`);
    console.log(`   Profile URL:     http://localhost:3000/${config.stateSlug}/${config.citySlug}/artists/${artist.slug}`);
    if (config.is_pro) {
      console.log(`   Subscription:    Pro ($15/mo)`);
    }
    console.log('');
  });

  console.log('═'.repeat(80));
  console.log('\n🚀 Next steps:');
  console.log('   1. Visit http://localhost:3000/dev/login to test user login');
  console.log('   2. Update lib/dev/test-users.ts with the generated UUIDs above');
  console.log('   3. Test onboarding flow with each user tier\n');
}

// Run the seeding script
seedTestUsers()
  .then(() => {
    console.log('✨ Seeding completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  });
