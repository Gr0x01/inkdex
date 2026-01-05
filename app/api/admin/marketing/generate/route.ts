/**
 * Marketing Post Generation API
 *
 * POST /api/admin/marketing/generate - Generate post content for outreach records
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser, createAdminClient } from '@/lib/supabase/server';
import { z } from 'zod';
import OpenAI from 'openai';

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

// Generate caption using GPT-4.1
async function generateCaption(artist: ArtistData): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    // Fallback to simple template if no API key
    const location = artist.state ? `${artist.city}, ${artist.state}` : artist.city || '';
    return `Featured work from @${artist.instagram_handle}${location ? ` (${location})` : ''}.`;
  }

  const openai = new OpenAI({ apiKey });

  const location = artist.city && artist.state
    ? `${artist.city}, ${artist.state}`
    : artist.city || null;

  const styles = getTopStyles(artist.portfolio_images);

  console.log(`[Marketing Generate] Artist: @${artist.instagram_handle}`);
  console.log(`[Marketing Generate] Styles found: ${styles.length ? styles.join(', ') : 'NONE'}`);
  console.log(`[Marketing Generate] Bio: ${artist.bio?.slice(0, 100) || 'NONE'}`);

  const prompt = `Write a short Instagram caption (2-3 sentences max) for a tattoo art feature post, followed by relevant hashtags.

Artist context:
- Handle: @${artist.instagram_handle}
- Location: ${location || 'Unknown'}
- Styles: ${styles.join(', ') || 'various'}
- Bio excerpt: ${artist.bio?.slice(0, 200) || 'N/A'}

Requirements:
- Showcase their work as a curator would
- Include @${artist.instagram_handle} naturally to credit their work
- Don't mention joining Inkdex or any platform
- Keep caption concise (2-3 sentences)
- End with 5-8 relevant hashtags (tattoo-related, location, style)

Format:
[Caption text]

#hashtag1 #hashtag2 #hashtag3...`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4.1',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 150,
      temperature: 0.8,
    });

    return response.choices[0]?.message?.content?.trim() || `Featured work from @${artist.instagram_handle}.`;
  } catch (error) {
    console.error('[Marketing Generate] OpenAI error:', error);
    // Fallback on error
    return `Featured work from @${artist.instagram_handle}.`;
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
    const results: Array<{ id: string; success: boolean; error?: string }> = [];

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

      // Transform to ArtistData format expected by generateCaption
      const artist: ArtistData = {
        ...artistRaw,
        city: primaryLoc?.city || null,
        state: primaryLoc?.region || null,
      };

      const caption = await generateCaption(artist);
      const imageUrls = selectBestImages(artist, 4);

      if (imageUrls.length < 1) {
        results.push({ id: record.id, success: false, error: 'No images available' });
        continue;
      }

      // Update the record
      const { error: updateError } = await adminClient
        .from('marketing_outreach')
        .update({
          status: 'generated',
          post_text: caption,
          post_images: imageUrls,
          generated_at: new Date().toISOString(),
        })
        .eq('id', record.id);

      if (updateError) {
        results.push({ id: record.id, success: false, error: updateError.message });
      } else {
        results.push({ id: record.id, success: true });
      }
    }

    const successCount = results.filter((r) => r.success).length;

    return NextResponse.json({
      success: true,
      generated: successCount,
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
