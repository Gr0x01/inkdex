/**
 * Supabase Storage Bucket Setup
 * Creates and configures the portfolio-images bucket for storing tattoo portfolio images
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { join } from 'path';

// Load environment variables
dotenv.config({ path: join(__dirname, '../../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BUCKET_NAME = 'portfolio-images';

async function setupStorageBucket() {
  console.log('🪣 Supabase Storage Bucket Setup\n');

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Missing environment variables:');
    if (!SUPABASE_URL) console.error('   - NEXT_PUBLIC_SUPABASE_URL');
    if (!SUPABASE_SERVICE_KEY) console.error('   - SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    // Step 1: Check if bucket already exists
    console.log('📋 Step 1: Checking if bucket exists...');
    const { data: existingBuckets, error: listError } = await supabase
      .storage
      .listBuckets();

    if (listError) {
      console.error('   ❌ Failed to list buckets:', listError.message);
      process.exit(1);
    }

    const bucketExists = existingBuckets?.some(b => b.name === BUCKET_NAME);

    if (bucketExists) {
      console.log(`   ✅ Bucket "${BUCKET_NAME}" already exists`);
    } else {
      // Step 2: Create bucket
      console.log(`📦 Step 2: Creating bucket "${BUCKET_NAME}"...`);
      const { data: bucket, error: createError } = await supabase
        .storage
        .createBucket(BUCKET_NAME, {
          public: true,  // Public read access
          fileSizeLimit: 10485760,  // 10MB max file size
          allowedMimeTypes: [
            'image/jpeg',
            'image/png',
            'image/webp',
            'image/jpg'
          ]
        });

      if (createError) {
        console.error('   ❌ Failed to create bucket:', createError.message);
        process.exit(1);
      }

      console.log(`   ✅ Bucket created successfully`);
    }

    // Step 3: Test upload/download
    console.log('\n🧪 Step 3: Testing bucket...');

    // Create a test image buffer (1x1 pixel white PNG)
    const testImageBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
      'base64'
    );

    const testPath = `test/test-${Date.now()}.png`;

    // Upload test image
    const { error: uploadError } = await supabase
      .storage
      .from(BUCKET_NAME)
      .upload(testPath, testImageBuffer, {
        contentType: 'image/png',
        upsert: false
      });

    if (uploadError) {
      console.error('   ❌ Test upload failed:', uploadError.message);
      process.exit(1);
    }

    console.log(`   ✅ Test upload successful`);

    // Get public URL
    const { data: publicUrlData } = supabase
      .storage
      .from(BUCKET_NAME)
      .getPublicUrl(testPath);

    if (!publicUrlData.publicUrl) {
      console.error('   ❌ Failed to get public URL');
      process.exit(1);
    }

    console.log(`   ✅ Public URL: ${publicUrlData.publicUrl}`);

    // Clean up test file
    const { error: deleteError } = await supabase
      .storage
      .from(BUCKET_NAME)
      .remove([testPath]);

    if (deleteError) {
      console.warn('   ⚠️  Warning: Failed to delete test file:', deleteError.message);
    } else {
      console.log(`   ✅ Test file cleaned up`);
    }

    // Step 4: Display bucket configuration
    console.log('\n📊 Bucket Configuration:');
    console.log(`   Name: ${BUCKET_NAME}`);
    console.log(`   Access: Public (read-only)`);
    console.log(`   Base URL: ${SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}`);
    console.log(`   Max File Size: 10MB`);
    console.log(`   Allowed Types: JPEG, PNG, WebP`);

    console.log('\n📁 Folder Structure (will be created during scraping):');
    console.log(`   ${BUCKET_NAME}/`);
    console.log(`   ├── original/{artist_id}/{post_id}.jpg`);
    console.log(`   └── thumbs/`);
    console.log(`       ├── 320/{artist_id}/{post_id}.webp`);
    console.log(`       ├── 640/{artist_id}/{post_id}.webp`);
    console.log(`       └── 1280/{artist_id}/{post_id}.webp`);

    console.log('\n✅ Storage bucket setup complete!');
    console.log('\n📋 Next steps:');
    console.log('   1. Install Python & Instaloader: pip install instaloader');
    console.log('   2. Run Instagram scraper: npm run scrape-instagram');

  } catch (error: any) {
    console.error('\n❌ Setup failed:', error.message);
    process.exit(1);
  }
}

setupStorageBucket();
