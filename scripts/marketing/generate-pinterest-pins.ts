/**
 * Pinterest Pin Generator
 *
 * Generates pin content from portfolio images for Pinterest marketing.
 * Outputs CSV for bulk upload (Pinterest native or Tailwind/Later).
 * Prioritizes high-engagement content (likes + follower count).
 *
 * Usage:
 *   npx tsx scripts/marketing/generate-pinterest-pins.ts --limit=100
 *   npx tsx scripts/marketing/generate-pinterest-pins.ts --style=fine-line --limit=50
 *   npx tsx scripts/marketing/generate-pinterest-pins.ts --min-followers=10000 --min-likes=500
 *   npx tsx scripts/marketing/generate-pinterest-pins.ts --include-bw  # Include black & white
 *   npx tsx scripts/marketing/generate-pinterest-pins.ts --ai-captions  # GPT-4o-mini generated titles/descriptions
 *
 * Defaults: min-followers=2000, min-likes=50, color-only (except fine-line)
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
dotenv.config({ path: path.join(__dirname, '../../.env.local') });

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// Target styles - feminine/colorful focus (from actual database styles)
const PINTEREST_STYLES = [
  'fine-line',
  'watercolor',
  'new-school',
  'neo-traditional',
  'ornamental',
] as const;

// Style display names and descriptions for pins
const STYLE_CONFIG: Record<string, { displayName: string; hashtags: string[]; vibe: string; board: string; allowBW?: boolean }> = {
  'fine-line': {
    displayName: 'Fine Line',
    hashtags: ['finelinetattoo', 'delicatetattoo', 'minimalisttattoo', 'daintytattoo', 'smalltattoo'],
    vibe: 'delicate and elegant',
    board: 'Fine Line Tattoos',
    allowBW: true, // Fine-line is often black and white
  },
  'watercolor': {
    displayName: 'Watercolor',
    hashtags: ['watercolortattoo', 'colorfultattoo', 'artistictattoo', 'painterlytattoo', 'abstracttattoo'],
    vibe: 'artistic and flowing',
    board: 'Watercolor Tattoos',
  },
  'new-school': {
    displayName: 'New School',
    hashtags: ['newschooltattoo', 'colorfultattoo', 'cartoontattoo', 'boldtattoo', 'funtattoo'],
    vibe: 'bold and colorful',
    board: 'New School Tattoos',
  },
  'neo-traditional': {
    displayName: 'Neo-Traditional',
    hashtags: ['neotraditionaltattoo', 'colorfultattoo', 'illustrativetattoo', 'boldlines', 'floraltattoo'],
    vibe: 'vibrant and illustrative',
    board: 'Neo-Traditional Tattoos',
  },
  'ornamental': {
    displayName: 'Ornamental',
    hashtags: ['ornamentaltattoo', 'mandalatattoo', 'geometrictattoo', 'decorativetattoo', 'detailedtattoo'],
    vibe: 'intricate and decorative',
    board: 'Ornamental Tattoos',
  },
};

// Pin description templates - rotate for variety (no city dependency)
const DESCRIPTION_TEMPLATES = [
  `Love this {style} tattoo? Find artists who create similar work on Inkdex. Upload any reference image and discover your perfect artist match.`,
  `{style} tattoo goals! ✨ Want something similar? Inkdex helps you find artists by uploading any tattoo image you love.`,
  `This {vibe} {style} tattoo is everything! Find artists who can create your dream piece on Inkdex.`,
  `Saved this {style} tattoo? Now find the artist! Inkdex lets you search by image to discover tattoo artists who match your style.`,
  `Looking for {style} tattoo inspiration? Inkdex helps you find artists who create similar work.`,
];

// Description templates that include city (only used when city is known)
const DESCRIPTION_TEMPLATES_WITH_CITY = [
  `Looking for {style} tattoo inspiration? This {vibe} piece is by {artist} in {city}. Find more artists like this on Inkdex.`,
  `{style} tattoo by {artist} in {city}. Find artists who create similar work on Inkdex.`,
];

// Title templates (no city dependency)
const TITLE_TEMPLATES = [
  `{style} Tattoo Inspiration`,
  `{style} Tattoo Ideas`,
  `Beautiful {style} Tattoo`,
  `{style} Tattoo by {artist}`,
];

// Title templates with city (only used when city is known)
const TITLE_TEMPLATES_WITH_CITY = [
  `{style} Tattoo in {city}`,
];

interface PinData {
  imageUrl: string;
  title: string;
  description: string;
  link: string;
  board: string;
  hashtags: string;
  artistHandle: string;
  artistSlug: string;
  city: string;
  style: string;
}

/**
 * Generate AI-powered title and description for a pin using GPT-5-nano vision (Responses API)
 */
async function generateAICaption(
  openai: OpenAI,
  imageUrl: string,
  style: string,
  styleConfig: { displayName: string; vibe: string },
): Promise<{ title: string; description: string }> {
  try {
    // GPT-5 uses the Responses API with different syntax
    const response = await (openai as any).responses.create({
      model: 'gpt-5-nano',
      input: [
        {
          role: 'developer',
          content: `You write short, engaging Pinterest pin titles and descriptions for tattoo inspiration content.
Style: casual, inspiring, relatable. Like a friend sharing cool tattoo finds.
Never use "stunning", "breathtaking", or overly salesy language.
Always mention Inkdex naturally as the place to find similar artists.`,
        },
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: `Write a Pinterest title (max 8 words) and description (2 sentences max) for this ${styleConfig.displayName} tattoo.
The vibe is ${styleConfig.vibe}.

Return JSON only: {"title": "...", "description": "..."}`,
            },
            {
              type: 'input_image',
              image_url: imageUrl,
            },
          ],
        },
      ],
    });

    const content = response.output_text || '';
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        title: parsed.title || `${styleConfig.displayName} Tattoo Inspiration`,
        description: parsed.description || `Love this ${styleConfig.vibe} piece? Find artists who create similar work on Inkdex.`,
      };
    }
  } catch (error) {
    console.warn(`AI caption failed for image, using template: ${error}`);
  }

  // Fallback to template
  return {
    title: `${styleConfig.displayName} Tattoo Inspiration`,
    description: `Love this ${styleConfig.vibe} piece? Find artists who create similar work on Inkdex.`,
  };
}

async function generatePins(options: {
  limit: number;
  style?: string;
  minFollowers?: number;
  minLikes?: number;
  colorOnly?: boolean;
  useAI?: boolean;
}): Promise<PinData[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  }

  // Initialize OpenAI if using AI captions
  let openai: OpenAI | null = null;
  if (options.useAI) {
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      throw new Error('Missing OPENAI_API_KEY for AI captions');
    }
    openai = new OpenAI({ apiKey: openaiKey });
    console.log('AI captions enabled (gpt-5-nano)');
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const pins: PinData[] = [];

  const stylesToProcess = options.style
    ? [options.style]
    : [...PINTEREST_STYLES];

  const pinsPerStyle = Math.ceil(options.limit / stylesToProcess.length);

  for (const style of stylesToProcess) {
    const config = STYLE_CONFIG[style];
    if (!config) {
      console.warn(`Unknown style: ${style}, skipping`);
      continue;
    }

    console.log(`\nFetching ${style} images...`);

    // Use raw SQL for complex join - Supabase client struggles with nested filters
    const { data: images, error } = await supabase.rpc('get_pinterest_pin_images', {
      p_style: style,
      p_min_confidence: 0.6,
      p_color_only: options.colorOnly !== false,
      p_min_followers: options.minFollowers || 1000,
      p_limit: pinsPerStyle * 2,
    });

    // Fallback to simpler query if RPC doesn't exist
    if (error?.message?.includes('Could not find the function') || error?.code === '42883') {
      console.log('RPC not found, using direct query...');

      // Simpler approach: get style-tagged images, then fetch artist info
      const { data: taggedImages, error: tagError } = await supabase
        .from('image_style_tags')
        .select('image_id, confidence')
        .eq('style_name', style)
        .gte('confidence', 0.6)
        .limit(pinsPerStyle * 3);

      if (tagError || !taggedImages?.length) {
        console.log(`No tagged images for ${style}`);
        continue;
      }

      const imageIds = taggedImages.map(t => t.image_id);

      // Fetch images with artist info, prioritized by engagement
      let query = supabase
        .from('portfolio_images')
        .select(`
          id,
          storage_thumb_640,
          is_color,
          likes_count,
          artists!inner (
            id, slug, name, instagram_handle, follower_count
          )
        `)
        .in('id', imageIds)
        .eq('status', 'active')
        .not('storage_thumb_640', 'is', null)
        .gte('artists.follower_count', options.minFollowers || 2000)
        .order('likes_count', { ascending: false, nullsFirst: false })
        .limit(pinsPerStyle * 2);

      // Apply minimum likes filter
      if (options.minLikes) {
        query = query.gte('likes_count', options.minLikes);
      }

      // Apply color filter unless style allows B&W
      if (options.colorOnly !== false && !config.allowBW) {
        query = query.eq('is_color', true);
      }

      const { data: imgData, error: imgError } = await query;

      if (imgError) {
        console.error(`Error fetching images for ${style}:`, imgError.message);
        continue;
      }

      // Get locations for these artists
      const artistIds = [...new Set((imgData || []).map((i: any) => i.artists?.id).filter(Boolean))];

      // Get locations - try primary first, then any location
      const { data: locations } = await supabase
        .from('artist_locations')
        .select('artist_id, city, state, country_code, is_primary')
        .in('artist_id', artistIds)
        .order('is_primary', { ascending: false });

      const locationMap = new Map((locations || []).map(l => [l.artist_id, l]));

      // Process images - prepare data first
      const imagesToProcess = (imgData || [])
        .filter((img: any) => img.artists)
        .slice(0, pinsPerStyle)
        .map((img: any) => {
          const artist = img.artists as any;
          const location = locationMap.get(artist.id);
          return {
            img,
            artist,
            city: location?.city || 'Unknown',
            artistName: artist.name || artist.instagram_handle,
            imageUrl: `${supabaseUrl}/storage/v1/object/public/portfolio-images/${img.storage_thumb_640}`,
          };
        });

      // Generate AI captions in parallel if enabled
      let aiCaptions: Map<string, { title: string; description: string }> = new Map();
      if (openai && imagesToProcess.length > 0) {
        console.log(`  Generating ${imagesToProcess.length} AI captions in parallel...`);
        const captionPromises = imagesToProcess.map(async ({ imageUrl }) => {
          const caption = await generateAICaption(openai!, imageUrl, style, config);
          return { imageUrl, caption };
        });
        const results = await Promise.all(captionPromises);
        results.forEach(({ imageUrl, caption }) => aiCaptions.set(imageUrl, caption));
      }

      // Build pins
      let count = 0;
      for (const { img, artist, city, artistName, imageUrl } of imagesToProcess) {
        const hasCity = city && city !== 'Unknown';

        // Generate title and description
        let description: string;
        let title: string;

        if (openai && aiCaptions.has(imageUrl)) {
          // Use AI-generated captions
          const aiCaption = aiCaptions.get(imageUrl)!;
          title = aiCaption.title;
          description = aiCaption.description;
        } else if (hasCity && count % 3 === 0) {
          // Use city template occasionally when city is known
          const cityTemplateIndex = count % DESCRIPTION_TEMPLATES_WITH_CITY.length;
          description = DESCRIPTION_TEMPLATES_WITH_CITY[cityTemplateIndex]
            .replace(/{style}/g, config.displayName)
            .replace(/{vibe}/g, config.vibe)
            .replace(/{artist}/g, artistName)
            .replace(/{city}/g, city);

          title = TITLE_TEMPLATES_WITH_CITY[0]
            .replace(/{style}/g, config.displayName)
            .replace(/{city}/g, city);
        } else {
          // Use generic templates
          const templateIndex = count % DESCRIPTION_TEMPLATES.length;
          const titleIndex = count % TITLE_TEMPLATES.length;

          description = DESCRIPTION_TEMPLATES[templateIndex]
            .replace(/{style}/g, config.displayName)
            .replace(/{vibe}/g, config.vibe)
            .replace(/{artist}/g, artistName);

          title = TITLE_TEMPLATES[titleIndex]
            .replace(/{style}/g, config.displayName)
            .replace(/{artist}/g, artistName);
        }

        // Build hashtags - only include city hashtag if we have a real city
        const baseHashtags = [
          'tattoo',
          'tattooinspo',
          'tattooideas',
          'inkdex',
          ...config.hashtags,
        ];
        if (hasCity) {
          baseHashtags.push(city.toLowerCase().replace(/\s+/g, '') + 'tattoo');
        }
        const hashtags = baseHashtags.map(h => `#${h}`).join(' ');

        pins.push({
          imageUrl,
          title,
          description,
          link: `https://inkdex.io/artist/${artist.slug}`,
          board: config.board,
          hashtags,
          artistHandle: artist.instagram_handle,
          artistSlug: artist.slug,
          city,
          style,
        });

        count++;
      }

      console.log(`Generated ${count} pins for ${style}`);
      continue;
    }

    if (error) {
      console.error(`Error fetching ${style}:`, error.message);
      continue;
    }

    if (!images || images.length === 0) {
      console.log(`No images found for ${style}`);
      continue;
    }

    console.log(`Found ${images.length} ${style} images`);

    // Process RPC results
    let count = 0;
    for (const img of images) {
      if (count >= pinsPerStyle) break;

      const city = img.city || 'Unknown';
      const artistName = img.artist_name || img.instagram_handle;

      const imageUrl = `${supabaseUrl}/storage/v1/object/public/portfolio-images/${img.storage_thumb_640}`;

      const hasCity = city && city !== 'Unknown';

      // Generate title and description
      let description: string;
      let title: string;

      if (openai) {
        // Use AI-generated captions
        const aiCaption = await generateAICaption(openai, imageUrl, style, config);
        title = aiCaption.title;
        description = aiCaption.description;
      } else if (hasCity && count % 3 === 0) {
        // Use city template occasionally when city is known
        const cityTemplateIndex = count % DESCRIPTION_TEMPLATES_WITH_CITY.length;
        description = DESCRIPTION_TEMPLATES_WITH_CITY[cityTemplateIndex]
          .replace(/{style}/g, config.displayName)
          .replace(/{vibe}/g, config.vibe)
          .replace(/{artist}/g, artistName)
          .replace(/{city}/g, city);

        title = TITLE_TEMPLATES_WITH_CITY[0]
          .replace(/{style}/g, config.displayName)
          .replace(/{city}/g, city);
      } else {
        // Use generic templates
        const templateIndex = count % DESCRIPTION_TEMPLATES.length;
        const titleIndex = count % TITLE_TEMPLATES.length;

        description = DESCRIPTION_TEMPLATES[templateIndex]
          .replace(/{style}/g, config.displayName)
          .replace(/{vibe}/g, config.vibe)
          .replace(/{artist}/g, artistName);

        title = TITLE_TEMPLATES[titleIndex]
          .replace(/{style}/g, config.displayName)
          .replace(/{artist}/g, artistName);
      }

      // Build hashtags - only include city hashtag if we have a real city
      const baseHashtags = [
        'tattoo',
        'tattooinspo',
        'tattooideas',
        'inkdex',
        ...config.hashtags,
      ];
      if (hasCity) {
        baseHashtags.push(city.toLowerCase().replace(/\s+/g, '') + 'tattoo');
      }
      const hashtags = baseHashtags.map(h => `#${h}`).join(' ');

      pins.push({
        imageUrl,
        title,
        description,
        link: `https://inkdex.io/artist/${img.artist_slug}`,
        board: config.board,
        hashtags,
        artistHandle: img.instagram_handle,
        artistSlug: img.artist_slug,
        city,
        style,
      });

      count++;
    }

    console.log(`Generated ${count} pins for ${style}`);
  }

  return pins;
}

function exportToCSV(pins: PinData[], outputPath: string): void {
  // Pinterest bulk upload CSV format (official column names)
  const headers = [
    'Title',
    'Media URL',
    'Pinterest board',
    'Description',
    'Link',
    'Publish date',
    'Keywords',
  ];

  const rows = pins.map(pin => [
    pin.title,
    pin.imageUrl,
    pin.board,
    pin.description,
    pin.link,
    '', // Publish date - empty for immediate
    pin.hashtags.replace(/#/g, ''), // Keywords without # symbols
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')),
  ].join('\n');

  fs.writeFileSync(outputPath, csvContent);
  console.log(`\nExported ${pins.length} pins to ${outputPath}`);
}

function exportToJSON(pins: PinData[], outputPath: string): void {
  fs.writeFileSync(outputPath, JSON.stringify(pins, null, 2));
  console.log(`Exported ${pins.length} pins to ${outputPath}`);
}

async function main() {
  const args = process.argv.slice(2);

  const limitArg = args.find(a => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : 100;

  const styleArg = args.find(a => a.startsWith('--style='));
  const style = styleArg ? styleArg.split('=')[1] : undefined;

  const minFollowersArg = args.find(a => a.startsWith('--min-followers='));
  const minFollowers = minFollowersArg ? parseInt(minFollowersArg.split('=')[1]) : 2000;

  const minLikesArg = args.find(a => a.startsWith('--min-likes='));
  const minLikes = minLikesArg ? parseInt(minLikesArg.split('=')[1]) : 50;

  const colorOnly = !args.includes('--include-bw');
  const useAI = args.includes('--ai-captions');

  console.log('Pinterest Pin Generator');
  console.log('=======================');
  console.log(`Limit: ${limit}`);
  console.log(`Style: ${style || 'all feminine styles'}`);
  console.log(`Min followers: ${minFollowers}`);
  console.log(`Min likes: ${minLikes}`);
  console.log(`Color only: ${colorOnly}`);
  console.log(`AI captions: ${useAI}`);

  const pins = await generatePins({
    limit,
    style,
    minFollowers,
    minLikes,
    colorOnly,
    useAI,
  });

  if (pins.length === 0) {
    console.log('\nNo pins generated. Check your filters.');
    return;
  }

  // Create output directory
  const outputDir = path.join(process.cwd(), 'output', 'pinterest');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().split('T')[0];
  const csvPath = path.join(outputDir, `pins-${timestamp}.csv`);
  const jsonPath = path.join(outputDir, `pins-${timestamp}.json`);

  exportToCSV(pins, csvPath);
  exportToJSON(pins, jsonPath);

  // Summary by board
  console.log('\n📌 Pins by Board:');
  const byBoard = pins.reduce((acc, pin) => {
    acc[pin.board] = (acc[pin.board] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  for (const [board, count] of Object.entries(byBoard)) {
    console.log(`  ${board}: ${count}`);
  }

  console.log('\n✅ Done! Next steps:');
  console.log('1. Create these boards on Pinterest if they don\'t exist');
  console.log('2. Use Tailwind or Pinterest bulk upload to import the CSV');
  console.log('3. Or use the JSON with Pinterest API for full automation');
}

main().catch(console.error);
