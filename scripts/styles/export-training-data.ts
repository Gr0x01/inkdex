#!/usr/bin/env npx tsx
/**
 * Export Training Data for Python Classifier
 *
 * Exports embeddings and labels to JSON for sklearn training.
 *
 * Usage:
 *   npx tsx scripts/styles/export-training-data.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function main() {
  console.log('Exporting training data...');
  console.log('');

  // Fetch all non-skipped labels (paginate to get all)
  let allLabels: { image_id: string; styles: string[] }[] = [];
  let offset = 0;
  const pageSize = 1000;

  while (true) {
    const { data: labels, error: labelError } = await supabase
      .from('style_training_labels')
      .select('image_id, styles')
      .eq('skipped', false)
      .range(offset, offset + pageSize - 1);

    if (labelError) {
      console.error('Error fetching labels:', labelError);
      process.exit(1);
    }

    if (!labels || labels.length === 0) break;
    allLabels.push(...labels);
    offset += pageSize;

    if (labels.length < pageSize) break;
  }

  const labels = allLabels;
  console.log(`Found ${labels.length} labeled images`);

  const imageIds = labels.map((l) => l.image_id);
  const labelMap = new Map(labels.map((l) => [l.image_id, l.styles]));

  // Fetch embeddings in batches
  const batchSize = 100;
  const embeddings: number[][] = [];
  const styleLabels: string[][] = [];

  for (let i = 0; i < imageIds.length; i += batchSize) {
    const batch = imageIds.slice(i, i + batchSize);
    const { data: images, error: imgError } = await supabase
      .from('portfolio_images')
      .select('id, embedding')
      .in('id', batch)
      .not('embedding', 'is', null);

    if (imgError) {
      console.error('Error fetching embeddings:', imgError);
      continue;
    }

    for (const img of images || []) {
      const styles = labelMap.get(img.id);
      if (styles && img.embedding) {
        // Embedding comes as string from Supabase, need to parse
        const emb = typeof img.embedding === 'string'
          ? JSON.parse(img.embedding)
          : img.embedding;
        embeddings.push(emb);
        styleLabels.push(styles);
      }
    }

    process.stdout.write(`\rLoaded ${embeddings.length} / ${imageIds.length}...`);
  }

  console.log(`\nTotal examples: ${embeddings.length}`);

  // Save to JSON
  const outputPath = path.join(__dirname, 'training-data.json');
  const data = {
    embeddings,
    labels: styleLabels,
  };

  fs.writeFileSync(outputPath, JSON.stringify(data));
  console.log(`Saved to ${outputPath}`);

  // File size
  const stats = fs.statSync(outputPath);
  console.log(`File size: ${(stats.size / 1024 / 1024).toFixed(1)} MB`);
}

main().catch(console.error);
