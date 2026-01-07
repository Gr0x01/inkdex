/**
 * Airtable Webhook - Generate Caption for Single Artist
 *
 * POST /api/webhooks/airtable/generate
 *
 * Called by Airtable button field to generate AI caption + hashtags for a single artist.
 * Updates the Airtable record directly with the generated content.
 *
 * Expected body (from Airtable):
 * {
 *   "record_id": "recXXXXX",
 *   "instagram_handle": "artist_handle"
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { updateRecords, isAirtableConfigured } from '@/lib/airtable/client';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface ArtistData {
  id: string;
  name: string;
  instagram_handle: string;
  slug: string;
  bio: string | null;
  artist_locations: Array<{
    city: string | null;
    region: string | null;
    is_primary: boolean;
  }> | null;
  portfolio_images: Array<{
    image_style_tags: Array<{
      style_name: string;
      confidence: number;
    }> | null;
  }>;
}

// Extract top styles from image style tags
function getTopStyles(images: ArtistData['portfolio_images']): string[] {
  const styleCounts = new Map<string, number>();

  for (const img of images) {
    for (const tag of img.image_style_tags || []) {
      if (tag.confidence >= 0.3) {
        styleCounts.set(tag.style_name, (styleCounts.get(tag.style_name) || 0) + 1);
      }
    }
  }

  return [...styleCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([style]) => style);
}

// Generate caption and hashtags using GPT-4.1
async function generateContent(
  artist: ArtistData,
  city: string | null,
  state: string | null
): Promise<{ caption: string; hashtags: string }> {
  const apiKey = process.env.OPENAI_API_KEY;

  // Fallback if no API key
  if (!apiKey) {
    const location = state ? `${city}, ${state}` : city || '';
    return {
      caption: `Featured work from @${artist.instagram_handle}${location ? ` based in ${location}` : ''}. Check out their incredible tattoo artistry.`,
      hashtags: '#tattoo #tattooartist #inked #tattoos #tattooideas',
    };
  }

  const openai = new OpenAI({ apiKey });
  const location = city && state ? `${city}, ${state}` : city || null;
  const styles = getTopStyles(artist.portfolio_images);

  // Create city hashtag
  const cityTag = city ? `#${city.toLowerCase().replace(/\s+/g, '')}tattoo` : '';

  const prompt = `Generate Instagram content for a tattoo art feature post.

Artist context:
- Handle: @${artist.instagram_handle}
- Location: ${location || 'Unknown'}
- Styles: ${styles.join(', ') || 'various tattoo styles'}
- Bio excerpt: ${artist.bio?.slice(0, 200) || 'N/A'}

Generate TWO things:

1. CAPTION: Write 2-3 casual, engaging sentences showcasing their work as a curator discovering talent.
   - Credit @${artist.instagram_handle} naturally in the text
   - Reference their location if known
   - Don't mention Inkdex or any platform
   - Casual tone like you're sharing a cool find with friends

2. HASHTAGS: Generate 10-12 hashtags with this strategic mix:
   - 3-4 high-volume: #tattoo #tattooartist #inked #tattoos #tattooideas
   - 2-3 style-specific based on "${styles.join(', ') || 'tattoo'}": (e.g., blackwork → #blackworktattoo #blackwork)
   - 1-2 location tags: ${cityTag || '#tattooart'} or state-based
   - 2-3 niche/discovery: #tattooinspo #inkspiration #tattoolovers #tattoocommunity

Format your response EXACTLY like this:
CAPTION: [Your caption here]
HASHTAGS: #tag1 #tag2 #tag3 #tag4 #tag5 #tag6 #tag7 #tag8 #tag9 #tag10`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4.1',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 300,
      temperature: 0.8,
    });

    const content = response.choices[0]?.message?.content || '';

    const captionMatch = content.match(/CAPTION:\s*([\s\S]+?)(?=HASHTAGS:|$)/);
    const hashtagsMatch = content.match(/HASHTAGS:\s*([\s\S]+)$/);

    const caption = captionMatch?.[1]?.trim() || `Featured work from @${artist.instagram_handle}. Their style is absolutely stunning.`;
    const hashtags = hashtagsMatch?.[1]?.trim() || '#tattoo #tattooartist #inked #tattoos #tattooideas';

    const cleanHashtags = hashtags
      .split(/\s+/)
      .filter((t) => t.startsWith('#'))
      .join(' ');

    return {
      caption,
      hashtags: cleanHashtags || '#tattoo #tattooartist #inked #tattoos',
    };
  } catch (error) {
    console.error('[Airtable Webhook] OpenAI error:', error);
    return {
      caption: `Featured work from @${artist.instagram_handle}. Check out their incredible tattoo artistry.`,
      hashtags: '#tattoo #tattooartist #inked #tattoos #tattooideas',
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify Airtable is configured
    if (!isAirtableConfigured()) {
      return NextResponse.json(
        { error: 'Airtable not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { record_id, instagram_handle } = body;

    if (!record_id || !instagram_handle) {
      return NextResponse.json(
        { error: 'Missing record_id or instagram_handle' },
        { status: 400 }
      );
    }

    console.log(`[Airtable Webhook] Generating caption for @${instagram_handle} (${record_id})`);

    // Fetch artist data from DB
    const { data: artist, error: fetchError } = await supabase
      .from('artists')
      .select(`
        id,
        name,
        instagram_handle,
        slug,
        bio,
        artist_locations!left (
          city,
          region,
          is_primary
        ),
        portfolio_images (
          image_style_tags (
            style_name,
            confidence
          )
        )
      `)
      .ilike('instagram_handle', instagram_handle)
      .is('deleted_at', null)
      .single();

    if (fetchError || !artist) {
      console.error('[Airtable Webhook] Artist not found:', fetchError);
      return NextResponse.json(
        { error: `Artist @${instagram_handle} not found` },
        { status: 404 }
      );
    }

    // Get primary location
    const locations = artist.artist_locations as ArtistData['artist_locations'];
    const primaryLoc = locations?.find((l) => l.is_primary) || locations?.[0];

    // Generate content
    const { caption, hashtags } = await generateContent(
      artist as unknown as ArtistData,
      primaryLoc?.city || null,
      primaryLoc?.region || null
    );

    // Update Airtable record
    await updateRecords([
      {
        id: record_id,
        fields: {
          caption,
          hashtags,
        },
      },
    ]);

    console.log(`[Airtable Webhook] Generated caption for @${instagram_handle}`);

    return NextResponse.json({
      success: true,
      instagram_handle,
      caption,
      hashtags,
    });
  } catch (error) {
    console.error('[Airtable Webhook] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
