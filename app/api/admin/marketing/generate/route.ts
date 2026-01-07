/**
 * Marketing Post Generation API
 *
 * POST /api/admin/marketing/generate - Generate post content for outreach records
 *
 * Generates AI captions + hashtags and syncs to Airtable
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser, createAdminClient } from '@/lib/supabase/server';
import { z } from 'zod';
import OpenAI from 'openai';
import { findRecordByHandle, updateRecords, isAirtableConfigured } from '@/lib/airtable/client';

// POST body schema
const generateSchema = z.object({
  outreachIds: z.array(z.string().uuid()).min(1).max(20),
});

interface LocationData {
  city: string | null;
  region: string | null;
  is_primary: boolean;
}

interface ArtistDataRaw {
  id: string;
  name: string;
  instagram_handle: string;
  slug: string;
  bio: string | null;
  artist_locations: LocationData[] | null;
  portfolio_images: Array<{
    id: string;
    storage_thumb_1280: string | null;
    storage_thumb_640: string | null;
    likes_count: number | null;
    post_caption: string | null;
    image_style_tags?: Array<{
      style_name: string;
      confidence: number;
    }>;
  }>;
}

interface ArtistData {
  id: string;
  name: string;
  instagram_handle: string;
  city: string | null;
  state: string | null;
  slug: string;
  bio: string | null;
  portfolio_images: ArtistDataRaw['portfolio_images'];
}

interface GeneratedContent {
  caption: string;
  hashtags: string;
  combined: string;
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
async function generateContent(artist: ArtistData): Promise<GeneratedContent> {
  const apiKey = process.env.OPENAI_API_KEY;

  // Fallback if no API key
  if (!apiKey) {
    const location = artist.state ? `${artist.city}, ${artist.state}` : artist.city || '';
    const fallbackCaption = `Featured work from @${artist.instagram_handle}${location ? ` based in ${location}` : ''}. Check out their incredible tattoo artistry.`;
    const fallbackHashtags = '#tattoo #tattooartist #inked #tattoos #tattooideas';
    return {
      caption: fallbackCaption,
      hashtags: fallbackHashtags,
      combined: `${fallbackCaption}\n\n${fallbackHashtags}`,
    };
  }

  const openai = new OpenAI({ apiKey });

  const location = artist.city && artist.state
    ? `${artist.city}, ${artist.state}`
    : artist.city || null;

  const styles = getTopStyles(artist.portfolio_images);

  // Create city hashtag (lowercase, no spaces)
  const cityTag = artist.city
    ? `#${artist.city.toLowerCase().replace(/\s+/g, '')}tattoo`
    : '';

  console.log(`[Marketing Generate] Artist: @${artist.instagram_handle}`);
  console.log(`[Marketing Generate] Styles: ${styles.length ? styles.join(', ') : 'NONE'}`);
  console.log(`[Marketing Generate] Location: ${location || 'Unknown'}`);

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
   - 2-3 style-specific based on "${styles.join(', ') || 'tattoo'}": (e.g., blackwork → #blackworktattoo #blackwork, traditional → #traditionaltattoo #americantraditional)
   - 1-2 location tags: ${cityTag || '#tattooart'} or state-based
   - 2-3 niche/discovery: #tattooinspo #inkspiration #tattoolovers #tattoocommunity

Format your response EXACTLY like this (including the labels):
CAPTION: [Your caption here - no line breaks within caption]
HASHTAGS: #tag1 #tag2 #tag3 #tag4 #tag5 #tag6 #tag7 #tag8 #tag9 #tag10`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4.1',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 300,
      temperature: 0.8,
    });

    const content = response.choices[0]?.message?.content || '';

    // Parse structured response
    // Use [\s\S] instead of . with s flag for cross-line matching
    const captionMatch = content.match(/CAPTION:\s*([\s\S]+?)(?=HASHTAGS:|$)/);
    const hashtagsMatch = content.match(/HASHTAGS:\s*([\s\S]+)$/);

    const caption = captionMatch?.[1]?.trim() || `Featured work from @${artist.instagram_handle}. Their style is absolutely stunning.`;
    const hashtags = hashtagsMatch?.[1]?.trim() || '#tattoo #tattooartist #inked #tattoos #tattooideas';

    // Clean up hashtags - ensure they're space-separated and start with #
    const cleanHashtags = hashtags
      .split(/\s+/)
      .filter(t => t.startsWith('#'))
      .join(' ');

    return {
      caption,
      hashtags: cleanHashtags || '#tattoo #tattooartist #inked #tattoos',
      combined: `${caption}\n\n${cleanHashtags || hashtags}`,
    };
  } catch (error) {
    console.error('[Marketing Generate] OpenAI error:', error);
    // Fallback on error
    const fallbackCaption = `Featured work from @${artist.instagram_handle}. Check out their incredible tattoo artistry.`;
    const fallbackHashtags = '#tattoo #tattooartist #inked #tattoos #tattooideas';
    return {
      caption: fallbackCaption,
      hashtags: fallbackHashtags,
      combined: `${fallbackCaption}\n\n${fallbackHashtags}`,
    };
  }
}

function selectBestImages(artist: ArtistData, count: number = 4): string[] {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  const sortedImages = artist.portfolio_images
    .filter((img) => img.storage_thumb_1280 || img.storage_thumb_640)
    .sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0));

  const selected = sortedImages.slice(0, count);

  return selected
    .map((img) => {
      const path = img.storage_thumb_1280 || img.storage_thumb_640;
      return path ? `${supabaseUrl}/storage/v1/object/public/portfolio-images/${path}` : null;
    })
    .filter((url): url is string => url !== null);
}

// Sync generated content to Airtable
async function syncToAirtable(
  handle: string,
  caption: string,
  hashtags: string
): Promise<{ success: boolean; error?: string }> {
  if (!isAirtableConfigured()) {
    return { success: false, error: 'Airtable not configured' };
  }

  try {
    const existingRecord = await findRecordByHandle(handle);
    if (!existingRecord) {
      return { success: false, error: 'Record not found in Airtable' };
    }

    await updateRecords([
      {
        id: existingRecord.id,
        fields: {
          caption,
          hashtags,
        },
      },
    ]);

    return { success: true };
  } catch (error) {
    console.error(`[Marketing Generate] Airtable sync error for @${handle}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Airtable sync failed'
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify admin access (uses session, no network call)
    const user = await getAdminUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { outreachIds } = generateSchema.parse(body);

    const adminClient = createAdminClient();

    // Fetch outreach records with artist data - specify FK to avoid ambiguity
    // Join artist_locations for location data (single source of truth)
    const { data: outreachRecords, error: fetchError } = await adminClient
      .from('marketing_outreach')
      .select(`
        id,
        artist_id,
        status,
        artists!marketing_outreach_artist_id_fkey (
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
            id,
            storage_thumb_1280,
            storage_thumb_640,
            likes_count,
            post_caption,
            image_style_tags (
              style_name,
              confidence
            )
          )
        )
      `)
      .in('id', outreachIds)
      .in('status', ['pending', 'generated']);

    if (fetchError) {
      console.error('[Marketing Generate] Fetch error:', fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!outreachRecords || outreachRecords.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No pending outreach records found',
        generated: 0,
      });
    }

    // Generate posts for each record
    const results: Array<{
      id: string;
      success: boolean;
      error?: string;
      airtableSynced?: boolean;
    }> = [];

    for (const record of outreachRecords) {
      const artistRaw = record.artists as unknown as ArtistDataRaw;

      if (!artistRaw) {
        results.push({ id: record.id, success: false, error: 'Artist not found' });
        continue;
      }

      // Extract primary location from artist_locations
      const primaryLoc = Array.isArray(artistRaw.artist_locations)
        ? artistRaw.artist_locations.find(l => l.is_primary) || artistRaw.artist_locations[0]
        : null;

      // Transform to ArtistData format expected by generateContent
      const artist: ArtistData = {
        ...artistRaw,
        city: primaryLoc?.city || null,
        state: primaryLoc?.region || null,
      };

      const generated = await generateContent(artist);
      const imageUrls = selectBestImages(artist, 4);

      if (imageUrls.length < 1) {
        results.push({ id: record.id, success: false, error: 'No images available' });
        continue;
      }

      // Update the DB record
      const { error: updateError } = await adminClient
        .from('marketing_outreach')
        .update({
          status: 'generated',
          post_text: generated.combined,
          post_images: imageUrls,
          generated_at: new Date().toISOString(),
        })
        .eq('id', record.id);

      if (updateError) {
        results.push({ id: record.id, success: false, error: updateError.message });
        continue;
      }

      // Sync to Airtable
      const airtableResult = await syncToAirtable(
        artist.instagram_handle,
        generated.caption,
        generated.hashtags
      );

      results.push({
        id: record.id,
        success: true,
        airtableSynced: airtableResult.success,
      });

      if (!airtableResult.success) {
        console.warn(`[Marketing Generate] Airtable sync failed for @${artist.instagram_handle}: ${airtableResult.error}`);
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const airtableSyncedCount = results.filter((r) => r.airtableSynced).length;

    return NextResponse.json({
      success: true,
      generated: successCount,
      airtableSynced: airtableSyncedCount,
      failed: results.length - successCount,
      results,
    });
  } catch (error) {
    console.error('[Marketing Generate] Error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid parameters', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
