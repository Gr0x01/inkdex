/**
 * Pinterest Pin Generator
 *
 * Generates pin content from portfolio images for Pinterest marketing.
 * Outputs CSV for bulk upload (Pinterest native or Tailwind/Later).
 *
 * Usage:
 *   npx tsx scripts/marketing/generate-pinterest-pins.ts --limit 100
 *   npx tsx scripts/marketing/generate-pinterest-pins.ts --style fine-line --limit 50
 *   npx tsx scripts/marketing/generate-pinterest-pins.ts --all-styles --limit 500
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
dotenv.config({ path: path.join(__dirname, '../../.env.local') });

import { createClient } from '@supabase/supabase-js';

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

// Pin description templates - rotate for variety
const DESCRIPTION_TEMPLATES = [
  `Love this {style} tattoo? Find artists who create similar work on Inkdex. Upload any reference image and discover your perfect artist match.`,
  `Looking for {style} tattoo inspiration? This {vibe} piece is by {artist} in {city}. Find more artists like this on Inkdex.`,
  `{style} tattoo goals! ✨ Want something similar? Inkdex helps you find artists by uploading any tattoo image you love.`,
  `This {vibe} {style} tattoo is everything! Find artists near you who can create your dream piece on Inkdex.`,
  `Saved this {style} tattoo? Now find the artist! Inkdex lets you search by image to discover tattoo artists who match your style.`,
];

// Title templates
const TITLE_TEMPLATES = [
  `{style} Tattoo Inspiration`,
  `{style} Tattoo Ideas`,
  `Beautiful {style} Tattoo`,
  `{style} Tattoo by {artist}`,
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

async function generatePins(options: {
  limit: number;
  style?: string;
  minFollowers?: number;
  colorOnly?: boolean;
}): Promise<PinData[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
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

      // Fetch images with artist info
      let query = supabase
        .from('portfolio_images')
        .select(`
          id,
          storage_thumb_640,
          is_color,
          artists!inner (
            id, slug, name, instagram_handle, follower_count
          )
        `)
        .in('id', imageIds)
        .eq('status', 'active')
        .not('storage_thumb_640', 'is', null)
        .gte('artists.follower_count', options.minFollowers || 1000)
        .limit(pinsPerStyle * 2);

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

      // Process images
      let count = 0;
      for (const img of imgData || []) {
        if (count >= pinsPerStyle) break;

        const artist = img.artists as any;
        if (!artist) continue;

        const location = locationMap.get(artist.id);
        const city = location?.city || 'Unknown';
        const artistName = artist.name || artist.instagram_handle;

        const imageUrl = `${supabaseUrl}/storage/v1/object/public/portfolio-images/${img.storage_thumb_640}`;

        const templateIndex = count % DESCRIPTION_TEMPLATES.length;
        const titleIndex = count % TITLE_TEMPLATES.length;

        const description = DESCRIPTION_TEMPLATES[templateIndex]
          .replace(/{style}/g, config.displayName)
          .replace(/{vibe}/g, config.vibe)
          .replace(/{artist}/g, artistName)
          .replace(/{city}/g, city);

        const title = TITLE_TEMPLATES[titleIndex]
          .replace(/{style}/g, config.displayName)
          .replace(/{artist}/g, artistName)
          .replace(/{city}/g, city);

        const hashtags = [
          'tattoo',
          'tattooinspo',
          'tattooideas',
          'inkdex',
          ...config.hashtags,
          city.toLowerCase().replace(/\s+/g, '') + 'tattoo',
        ].map(h => `#${h}`).join(' ');

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

      const templateIndex = count % DESCRIPTION_TEMPLATES.length;
      const titleIndex = count % TITLE_TEMPLATES.length;

      const description = DESCRIPTION_TEMPLATES[templateIndex]
        .replace(/{style}/g, config.displayName)
        .replace(/{vibe}/g, config.vibe)
        .replace(/{artist}/g, artistName)
        .replace(/{city}/g, city);

      const title = TITLE_TEMPLATES[titleIndex]
        .replace(/{style}/g, config.displayName)
        .replace(/{artist}/g, artistName)
        .replace(/{city}/g, city);

      const hashtags = [
        'tattoo',
        'tattooinspo',
        'tattooideas',
        'inkdex',
        ...config.hashtags,
        city.toLowerCase().replace(/\s+/g, '') + 'tattoo',
      ].map(h => `#${h}`).join(' ');

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
  // Pinterest bulk upload CSV format
  const headers = [
    'Image URL',
    'Title',
    'Description',
    'Link',
    'Board',
    'Publish Date', // Leave empty for immediate
  ];

  const rows = pins.map(pin => [
    pin.imageUrl,
    pin.title,
    `${pin.description}\n\n${pin.hashtags}`,
    pin.link,
    pin.board,
    '', // Publish date - empty for now
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
  const minFollowers = minFollowersArg ? parseInt(minFollowersArg.split('=')[1]) : 1000;

  const colorOnly = !args.includes('--include-bw');

  console.log('Pinterest Pin Generator');
  console.log('=======================');
  console.log(`Limit: ${limit}`);
  console.log(`Style: ${style || 'all feminine styles'}`);
  console.log(`Min followers: ${minFollowers}`);
  console.log(`Color only: ${colorOnly}`);

  const pins = await generatePins({
    limit,
    style,
    minFollowers,
    colorOnly,
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
