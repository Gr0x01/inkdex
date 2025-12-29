/**
 * Test GPT-5-nano classification on existing Supabase images
 * Run: npx tsx scripts/scraping/test-classification.ts
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

const TEST_DIR = '/tmp/test-classification';
const SAMPLE_SIZE = 20; // Test on 20 images

async function downloadImage(url: string, filepath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(filepath, () => {});
      reject(err);
    });
  });
}

async function classifyImage(imagePath: string): Promise<{ isTattoo: boolean; raw: string }> {
  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = imageBuffer.toString('base64');

  const response = await openai.chat.completions.create({
    model: 'gpt-5-nano',
    messages: [{
      role: 'user',
      content: [
        {
          type: 'text',
          text: 'Is this a photo of a tattoo (ink on someone\'s body)? Answer only \'yes\' or \'no\'.'
        },
        {
          type: 'image_url',
          image_url: {
            url: `data:image/jpeg;base64,${base64Image}`,
            detail: 'low'
          }
        }
      ]
    }],
    max_completion_tokens: 500  // Large budget for reasoning + output
  });

  const raw = response.choices[0]?.message?.content?.trim().toLowerCase() || 'error';
  const isTattoo = raw === 'yes';

  return { isTattoo, raw };
}

async function main() {
  console.log('🧪 Testing GPT-5-nano Classification\n');

  // Create test directory
  if (!fs.existsSync(TEST_DIR)) {
    fs.mkdirSync(TEST_DIR, { recursive: true });
  }

  // Fetch random sample of images
  console.log(`📥 Fetching ${SAMPLE_SIZE} random images from Supabase...\n`);

  const { data: images, error } = await supabase
    .from('portfolio_images')
    .select('id, artist_id, instagram_post_id, storage_original_path')
    .limit(SAMPLE_SIZE);

  if (error || !images) {
    console.error('❌ Failed to fetch images:', error);
    process.exit(1);
  }

  console.log(`Found ${images.length} images. Testing classification...\n`);

  let tattooCount = 0;
  let nonTattooCount = 0;
  const results: any[] = [];

  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    const filename = `${img.instagram_post_id}.jpg`;
    const filepath = path.join(TEST_DIR, filename);

    // Construct public URL from storage path
    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/portfolio-images/${img.storage_original_path}`;

    try {
      // Download image
      await downloadImage(publicUrl, filepath);

      // Classify with GPT-5-nano
      const { isTattoo, raw } = await classifyImage(filepath);

      if (isTattoo) {
        tattooCount++;
        console.log(`${i + 1}. ${filename} → ✅ TATTOO (${raw})`);
      } else {
        nonTattooCount++;
        console.log(`${i + 1}. ${filename} → ⏭️  NOT TATTOO (${raw})`);
      }

      results.push({
        filename,
        url: publicUrl,
        classification: isTattoo ? 'TATTOO' : 'NOT TATTOO',
        raw
      });

      // Clean up
      fs.unlinkSync(filepath);
    } catch (err) {
      console.error(`   ⚠️  Error processing ${filename}:`, err);
    }
  }

  // Output summary
  console.log(`\n📊 Results:`);
  console.log(`✅ Tattoos: ${tattooCount} (${Math.round(tattooCount/images.length*100)}%)`);
  console.log(`⏭️  Not tattoos: ${nonTattooCount} (${Math.round(nonTattooCount/images.length*100)}%)`);
  console.log(`\n⚠️  Manual review required:`);
  console.log(`Check if these classifications match reality by reviewing images at URLs above`);

  // Save results to file
  const resultsPath = path.join(TEST_DIR, 'results.json');
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  console.log(`\n💾 Results saved to: ${resultsPath}`);
}

main().catch(console.error);
