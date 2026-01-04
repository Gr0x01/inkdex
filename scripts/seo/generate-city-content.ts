/**
 * Generate SEO Editorial Content for Cities using GPT-4.1
 *
 * Generates rich, SEO-optimized content for city pages including:
 * - Hero paragraphs (local tattoo scene overview)
 * - Scene description (geography, neighborhoods, culture)
 * - Community insights (artist community, pricing, booking)
 * - Popular styles (style trends specific to the city)
 * - SEO keywords
 */

import OpenAI from 'openai';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs/promises';
import { CITIES } from '../../lib/constants/cities';

dotenv.config({ path: path.join(__dirname, '../../.env.local') });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Cities that already have content (skip these)
const EXISTING_CITIES = new Set([
  'austin', 'atlanta', 'los-angeles', 'new-york',
  'chicago', 'portland', 'seattle', 'miami', 'richmond'
]);

// Prioritize major metros and high-opportunity cities
const PRIORITY_CITIES = [
  // Tier 1: Major metros (Batch 4)
  'boston', 'washington', 'dallas', 'houston', 'fort-worth',

  // Tier 2: Top opportunity cities (Batch 1 + Batch 2 + Batch 3)
  'philadelphia', 'san-francisco', 'phoenix', 'las-vegas', 'san-diego',
  'nashville', 'denver', 'detroit', 'new-orleans', 'kansas-city',
  'st-louis', 'cleveland', 'milwaukee', 'memphis', 'louisville',

  // Tier 3: Strong second-tier (remaining high scorers)
  'cincinnati', 'minneapolis', 'pittsburgh', 'baltimore', 'reno',
  'tulsa', 'birmingham', 'salt-lake-city', 'richmond', 'charleston',
  'savannah', 'asheville', 'providence', 'cambridge', 'baton-rouge',

  // Tier 4: College towns and cultural hubs
  'boulder', 'bend', 'burlington', 'charlottesville', 'new-haven',
  'ann-arbor', 'madison', 'athens', 'chapel-hill', 'iowa-city',
];

interface CityEditorialContent {
  citySlug: string;
  stateSlug: string;
  hero: {
    paragraphs: string[];
  };
  scene: {
    heading: string;
    paragraphs: string[];
  };
  community: {
    heading: string;
    paragraphs: string[];
  };
  styles: {
    heading: string;
    paragraphs: string[];
  };
  keywords: string[];
  popularStyles: string[];
}

const SYSTEM_PROMPT = `You are an expert tattoo industry writer creating SEO-optimized editorial content for city tattoo scene pages. Your writing should be:

1. **Authentic & Knowledgeable**: Sound like you actually know the city's tattoo scene
2. **SEO-Optimized**: Naturally incorporate location keywords and tattoo styles
3. **Engaging**: Tell stories about the local scene, not generic descriptions
4. **Specific**: Reference actual neighborhoods, cultural movements, local characteristics
5. **Balanced**: Cover diversity of styles, price ranges, and artist types

TONE: Professional but conversational. Informative without being dry. Avoid clichés like "vibrant scene" or "thriving community" unless genuinely descriptive.

STRUCTURE:
- Hero (2 paragraphs, 100-150 words each): Hook readers with what makes this city's tattoo scene unique
- Scene (2 paragraphs, 100-150 words each): Geography, neighborhoods, shop culture
- Community (2 paragraphs, 100-150 words each): Artist community dynamics, pricing, booking windows
- Styles (1 paragraph, 100-150 words): Dominant styles and why they thrive here

Write in present tense. Be specific about neighborhoods when possible. Connect tattoo culture to broader city culture (music, art, demographics, economy).`;

async function generateCityContent(
  cityName: string,
  citySlug: string,
  state: string,
  stateSlug: string
): Promise<CityEditorialContent> {
  console.log(`\n🎨 Generating content for ${cityName}, ${state}...`);

  const prompt = `Generate SEO editorial content for ${cityName}, ${state}'s tattoo scene.

CITY CONTEXT:
- City: ${cityName}, ${state}
- Consider: population size, cultural identity, economy, demographics, regional characteristics
- Research: local neighborhoods, cultural movements, tattoo history if notable

OUTPUT FORMAT (JSON):
{
  "hero": {
    "paragraphs": ["paragraph 1 (100-150 words)", "paragraph 2 (100-150 words)"]
  },
  "scene": {
    "heading": "Creative heading like 'Dallas Tattoo Districts' or 'The Boston Ink Scene'",
    "paragraphs": ["paragraph 1", "paragraph 2"]
  },
  "community": {
    "heading": "Creative heading about artist community",
    "paragraphs": ["paragraph 1", "paragraph 2"]
  },
  "styles": {
    "heading": "Creative heading about popular styles",
    "paragraphs": ["paragraph 1 (100-150 words)"]
  },
  "keywords": ["5 specific SEO keywords including city name + tattoo/artist/style"],
  "popularStyles": ["3-5 tattoo styles that would be popular here, from: traditional, neo-traditional, realism, blackwork, illustrative, geometric, fine-line, japanese, tribal, watercolor, minimalist"]
}

Make it specific to ${cityName}. Reference actual neighborhoods if you know them. Connect to local culture (e.g., music scene in Nashville, tech scene in Boston, military in Virginia Beach, etc.)`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-2024-04-09', // GPT-4.1
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ],
      temperature: 0.8,
      response_format: { type: 'json_object' },
    });

    const content = JSON.parse(response.choices[0].message.content || '{}');

    // Validate required fields
    if (!content.hero?.paragraphs || !content.scene?.paragraphs ||
        !content.community?.paragraphs || !content.styles?.paragraphs) {
      console.error(`   ❌ Invalid response structure for ${cityName}`);
      console.error(`   Response:`, JSON.stringify(content, null, 2));
      throw new Error(`Invalid GPT response structure for ${cityName}`);
    }

    console.log(`   ✅ Generated ${content.hero.paragraphs[0].split(' ').length + content.hero.paragraphs[1].split(' ').length} words for hero`);

    return {
      citySlug,
      stateSlug,
      hero: content.hero,
      scene: content.scene,
      community: content.community,
      styles: content.styles,
      keywords: content.keywords || [],
      popularStyles: content.popularStyles || [],
    };
  } catch (error: any) {
    console.error(`   ❌ Error generating content: ${error.message}`);
    throw error;
  }
}

function formatAsTypeScript(contents: CityEditorialContent[]): string {
  const formatted = contents.map(content => {
    const hero = content.hero.paragraphs.map(p => `        "${p.replace(/"/g, '\\"')}"`).join(',\n');
    const scene = content.scene.paragraphs.map(p => `        "${p.replace(/"/g, '\\"')}"`).join(',\n');
    const community = content.community.paragraphs.map(p => `        "${p.replace(/"/g, '\\"')}"`).join(',\n');
    const styles = content.styles.paragraphs.map(p => `        "${p.replace(/"/g, '\\"')}"`).join(',\n');
    const keywords = content.keywords.map(k => `      '${k}'`).join(',\n');
    const popularStyles = content.popularStyles.map(s => `'${s}'`).join(', ');

    return `  {
    citySlug: '${content.citySlug}',
    stateSlug: '${content.stateSlug}',
    hero: {
      paragraphs: [
${hero}
      ],
    },
    scene: {
      heading: '${content.scene.heading.replace(/'/g, "\\'")}',
      paragraphs: [
${scene}
      ],
    },
    community: {
      heading: '${content.community.heading.replace(/'/g, "\\'")}',
      paragraphs: [
${community}
      ],
    },
    styles: {
      heading: '${content.styles.heading.replace(/'/g, "\\'")}',
      paragraphs: [
${styles}
      ],
    },
    keywords: [
${keywords}
    ],
    popularStyles: [${popularStyles}],
  }`;
  });

  return formatted.join(',\n');
}

async function main() {
  console.log('🚀 City SEO Content Generator (GPT-4.1)\n');
  console.log('=' .repeat(60));

  // Get ALL cities that need content (all except the original 8)
  const citiesToGenerate = CITIES
    .filter(city => !EXISTING_CITIES.has(city.slug))
    .map(city => ({
      name: city.name,
      slug: city.slug,
      state: city.state,
      stateSlug: city.state.toLowerCase().replace(/ /g, '-'),
    }));

  console.log(`\nGenerating content for ${citiesToGenerate.length} cities...\n`);

  const generatedContents: CityEditorialContent[] = [];

  // Generate in batches of 50 (Tier 5 OpenAI = 10,000 RPM)
  const BATCH_SIZE = 50;
  for (let i = 0; i < citiesToGenerate.length; i += BATCH_SIZE) {
    const batch = citiesToGenerate.slice(i, i + BATCH_SIZE);

    console.log(`\n📦 Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(citiesToGenerate.length / BATCH_SIZE)}`);

    const batchResults = await Promise.allSettled(
      batch.map(city =>
        generateCityContent(city.name, city.slug, city.state, city.stateSlug)
      )
    );

    // Only push successful results
    batchResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        generatedContents.push(result.value);
      } else {
        console.error(`   ❌ Failed to generate content for ${batch[index].name}: ${result.reason.message}`);
      }
    });

    // Rate limit: wait 1 second between batches
    if (i + BATCH_SIZE < citiesToGenerate.length) {
      console.log('\n   ⏳ Waiting 1 second...');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Format as TypeScript
  console.log('\n\n📝 Formatting as TypeScript...');
  const tsContent = formatAsTypeScript(generatedContents);

  // Read existing file
  const citiesFilePath = path.join(__dirname, '../../lib/content/editorial/cities.ts');
  const existingContent = await fs.readFile(citiesFilePath, 'utf-8');

  // Find the closing bracket of CITY_EDITORIAL_CONTENT array (before the functions)
  const arrayCloseRegex = /(\]\s*\n)(\n\/\*\*)/;

  if (!arrayCloseRegex.test(existingContent)) {
    throw new Error('Could not find array closing bracket before function exports');
  }

  // Append new content (insert before the array closing bracket)
  const newContent = existingContent.replace(
    arrayCloseRegex,
    `,\n${tsContent}\n$1$2`
  );

  // Write back
  await fs.writeFile(citiesFilePath, newContent, 'utf-8');

  console.log('\n✅ Content generation complete!');
  console.log(`   Successfully generated: ${generatedContents.length}/${citiesToGenerate.length} cities`);
  console.log(`   Added to lib/content/editorial/cities.ts`);
  if (generatedContents.length < citiesToGenerate.length) {
    console.log(`   ⚠️  Failed: ${citiesToGenerate.length - generatedContents.length} cities (see errors above)`);
  }
  console.log(`\nEstimated cost: ~$${(generatedContents.length * 0.02).toFixed(2)} (GPT-4.1 @ ~$0.02/city)`);
}

main().catch(console.error);
