#!/usr/bin/env npx tsx
/**
 * Batch Style Labeling with GPT-4.1-mini
 *
 * Uses GPT-4.1-mini vision to classify tattoo images into style categories.
 * Much faster than manual labeling (~$2-5 for 10k images).
 *
 * Usage:
 *   npx tsx scripts/styles/batch-label-gpt.ts
 *   npx tsx scripts/styles/batch-label-gpt.ts --limit 100
 *   npx tsx scripts/styles/batch-label-gpt.ts --dry-run
 *   npx tsx scripts/styles/batch-label-gpt.ts --concurrency 50
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

if (!OPENAI_API_KEY) {
  console.error('Missing OPENAI_API_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// All styles we want to classify
const ALL_STYLES = [
  'traditional',
  'neo-traditional',
  'realism',
  'black-and-gray',
  'blackwork',
  'new-school',
  'watercolor',
  'ornamental',
  'fine-line',
  'tribal',
  'biomechanical',
  'trash-polka',
  'sketch',
  'geometric',
  'dotwork',
  'surrealism',
  'lettering',
  'anime',
  'japanese',
] as const;

const SYSTEM_PROMPT = `You are a tattoo style classifier. Given an image of a tattoo, identify which styles apply.

Available styles:
- traditional: Bold lines, bright colors, classic American designs (roses, anchors, eagles, pin-ups)
- neo-traditional: Evolution of traditional with more detail, shading, and color variety
- realism: Photo-realistic imagery, portraits, detailed scenes
- black-and-gray: Grayscale work using black ink in varying shades
- blackwork: Pure black ink designs, heavy coverage, bold patterns
- new-school: Cartoonish, exaggerated, vibrant colors, playful subjects
- watercolor: Mimics watercolor painting with splashes, drips, soft color bleeds
- ornamental: Decorative patterns, mandala-like, jewelry/lace inspired
- fine-line: Delicate thin lines, minimal shading, single-needle style
- tribal: Bold black patterns inspired by Polynesian, Maori traditions
- biomechanical: Fusion of organic and mechanical, machinery beneath skin
- trash-polka: Chaotic collage mixing realism with abstract, red and black
- sketch: Intentionally unfinished, visible sketch lines, raw aesthetic
- geometric: Mathematical shapes, patterns, sacred geometry
- dotwork: Images created entirely from dots, often geometric/mandala
- surrealism: Dreamlike, impossible imagery, distorted reality, multiple eyes
- lettering: Typography-focused, scripts, text-based designs
- anime: Japanese animation style, manga characters
- japanese: Traditional irezumi - koi, dragons, cherry blossoms, waves, oni

Rules:
1. Select 1-3 styles that BEST describe the tattoo
2. Only select styles you're confident about
3. Return ONLY a JSON array of style names, nothing else
4. Return [] ONLY if the image clearly shows NO tattoo (e.g., just a face, product photo, or drawing on paper)

Example outputs:
["traditional", "black-and-gray"]
["fine-line", "ornamental"]
["realism", "black-and-gray", "surrealism"]
[]`;

interface ParsedArgs {
  limit: number | null;
  dryRun: boolean;
  concurrency: number;
  offset: number;
}

function parseArgs(): ParsedArgs {
  const args = process.argv.slice(2);
  let limit: number | null = null;
  let dryRun = false;
  let concurrency = 30; // Default concurrency
  let offset = 0;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--limit' && args[i + 1]) {
      limit = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--dry-run') {
      dryRun = true;
    } else if (args[i] === '--concurrency' && args[i + 1]) {
      concurrency = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--offset' && args[i + 1]) {
      offset = parseInt(args[i + 1], 10);
      i++;
    }
  }

  return { limit, dryRun, concurrency, offset };
}

async function classifyImage(imageUrl: string): Promise<string[]> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: imageUrl,
                detail: 'low', // Use low detail to reduce cost
              },
            },
          ],
        },
      ],
      max_tokens: 100,
      temperature: 0.1, // Low temperature for consistent classification
    });

    const content = response.choices[0]?.message?.content?.trim() || '[]';

    // Parse JSON array from response
    try {
      const styles = JSON.parse(content);
      if (!Array.isArray(styles)) return [];

      // Validate styles are in our list
      return styles.filter((s: string) => ALL_STYLES.includes(s as any));
    } catch {
      // Try to extract array from response if not pure JSON
      const match = content.match(/\[.*?\]/s);
      if (match) {
        const styles = JSON.parse(match[0]);
        return styles.filter((s: string) => ALL_STYLES.includes(s as any));
      }
      return [];
    }
  } catch (error: any) {
    if (error?.status === 429) {
      // Rate limited, wait and retry
      await new Promise(resolve => setTimeout(resolve, 5000));
      return classifyImage(imageUrl);
    }
    console.error(`  Error classifying image: ${error.message}`);
    return [];
  }
}

async function main() {
  const { limit, dryRun, concurrency, offset } = parseArgs();

  console.log('GPT-4.1-mini Style Labeling');
  console.log('===========================');
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log(`Concurrency: ${concurrency}`);
  if (limit) console.log(`Limit: ${limit}`);
  if (offset) console.log(`Offset: ${offset}`);
  console.log('');

  // Get already-labeled image IDs
  const { data: existingLabels } = await supabase
    .from('style_training_labels')
    .select('image_id');

  const labeledIds = new Set((existingLabels || []).map(l => l.image_id));
  console.log(`Already labeled: ${labeledIds.size} images`);

  // Fetch images to label - we need to fetch more than limit since some are already labeled
  // Fetch in batches until we have enough unlabeled images
  const targetCount = (limit || 10000) + offset;
  let allUnlabeledImages: { id: string; storage_thumb_640: string }[] = [];
  let fetchOffset = 0;
  const batchSize = 5000;

  while (allUnlabeledImages.length < targetCount) {
    const { data: images, error } = await supabase
      .from('portfolio_images')
      .select('id, storage_thumb_640')
      .eq('status', 'active')
      .not('storage_thumb_640', 'is', null)
      .order('created_at', { ascending: false })
      .range(fetchOffset, fetchOffset + batchSize - 1);

    if (error) {
      console.error('Error fetching images:', error);
      process.exit(1);
    }

    if (!images || images.length === 0) break;

    const unlabeled = images.filter(img => !labeledIds.has(img.id));
    allUnlabeledImages.push(...unlabeled);
    fetchOffset += batchSize;

    // If we got less than batch size, we've reached the end
    if (images.length < batchSize) break;
  }

  // Apply offset and limit
  const unlabeledImages = allUnlabeledImages.slice(offset);

  const toProcess = limit ? unlabeledImages.slice(0, limit) : unlabeledImages;
  console.log(`Images to process: ${toProcess.length}`);
  console.log('');

  if (toProcess.length === 0) {
    console.log('No images to process!');
    return;
  }

  // Process in batches with concurrency
  let processed = 0;
  let labeled = 0;
  let skipped = 0;
  let errors = 0;
  const startTime = Date.now();
  const styleCount: Record<string, number> = {};

  // Process with concurrency limit
  const processBatch = async (batch: typeof toProcess) => {
    const results = await Promise.all(
      batch.map(async (img) => {
        // Handle both full URLs and relative paths
        const imageUrl = img.storage_thumb_640.startsWith('http')
          ? img.storage_thumb_640
          : `${SUPABASE_URL}/storage/v1/object/public/portfolio-images/${img.storage_thumb_640}`;

        if (dryRun) {
          return { imageId: img.id, styles: ['dry-run'], skipped: false };
        }

        const styles = await classifyImage(imageUrl);

        if (styles.length === 0) {
          // Save skipped to database so we don't re-process
          await supabase
            .from('style_training_labels')
            .upsert({
              image_id: img.id,
              labeled_by: 'gpt-4.1-mini',
              styles: [],
              skipped: true,
            }, { onConflict: 'image_id' });
          return { imageId: img.id, styles: [], skipped: true };
        }

        // Save to database
        const { error: insertError } = await supabase
          .from('style_training_labels')
          .upsert({
            image_id: img.id,
            labeled_by: 'gpt-4.1-mini',
            styles,
            skipped: false,
          }, { onConflict: 'image_id' });

        if (insertError) {
          console.error(`  Error saving label for ${img.id}: ${insertError.message}`);
          return { imageId: img.id, styles: [], error: true };
        }

        return { imageId: img.id, styles, skipped: false };
      })
    );

    return results;
  };

  // Process in chunks of concurrency size
  for (let i = 0; i < toProcess.length; i += concurrency) {
    const batch = toProcess.slice(i, i + concurrency);
    const results = await processBatch(batch);

    for (const result of results) {
      processed++;
      if ('error' in result && result.error) {
        errors++;
      } else if (result.skipped) {
        skipped++;
      } else {
        labeled++;
        for (const style of result.styles) {
          styleCount[style] = (styleCount[style] || 0) + 1;
        }
      }
    }

    const elapsed = (Date.now() - startTime) / 1000;
    const rate = processed / elapsed;
    const eta = (toProcess.length - processed) / rate;

    process.stdout.write(
      `\rProcessed ${processed}/${toProcess.length} ` +
      `(${labeled} labeled, ${skipped} skipped, ${errors} errors) ` +
      `[${rate.toFixed(1)}/s, ETA: ${Math.round(eta)}s]`
    );
  }

  console.log('\n');

  // Summary
  console.log('=== SUMMARY ===');
  console.log(`Total processed: ${processed}`);
  console.log(`Labeled: ${labeled}`);
  console.log(`Skipped (no styles detected): ${skipped}`);
  console.log(`Errors: ${errors}`);
  console.log('');
  console.log('Style distribution:');
  const sortedStyles = Object.entries(styleCount).sort((a, b) => b[1] - a[1]);
  for (const [style, count] of sortedStyles) {
    console.log(`  ${style}: ${count}`);
  }

  // Cost estimate
  const estimatedCost = (processed * 0.00015).toFixed(2); // ~$0.15 per 1k images
  console.log('');
  console.log(`Estimated cost: ~$${estimatedCost}`);
}

main().catch(console.error);
