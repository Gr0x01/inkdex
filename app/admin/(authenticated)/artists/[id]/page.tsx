/**
 * Admin Artist Detail Page
 *
 * Server component that fetches artist data and renders the detail view.
 */

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import ArtistDetailView from '@/components/admin/ArtistDetailView';

interface Props {
  params: Promise<{ id: string }>;
}

// Disable static generation for admin pages
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  // Validate UUID format using Zod for consistency with API routes
  const uuidResult = z.string().uuid().safeParse(id);
  if (!uuidResult.success) {
    return { title: 'Invalid Artist | Admin' };
  }

  const serviceClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  const { data: artist } = await serviceClient
    .from('artists')
    .select('name')
    .eq('id', id)
    .single();

  return {
    title: artist ? `${artist.name} | Admin` : 'Artist | Admin',
  };
}

export default async function AdminArtistDetailPage({ params }: Props) {
  const { id } = await params;

  // Validate UUID format using Zod for consistency with API routes
  const uuidResult = z.string().uuid().safeParse(id);
  if (!uuidResult.success) {
    notFound();
  }

  const serviceClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  // Fetch artist with all locations from artist_locations
  const { data: artist, error: artistError } = await serviceClient
    .from('artists')
    .select(`
      *,
      artist_locations!left (
        id,
        city,
        region,
        country_code,
        location_type,
        is_primary,
        display_order
      )
    `)
    .eq('id', id)
    .single();

  if (artistError || !artist) {
    notFound();
  }

  // Extract primary location from artist_locations (single source of truth)
  const primaryLocation = Array.isArray(artist.artist_locations)
    ? artist.artist_locations.find((loc: { is_primary: boolean }) => loc.is_primary) || artist.artist_locations[0]
    : null;

  // Add city/state to artist object for component compatibility
  const artistWithLocation = {
    ...artist,
    city: primaryLocation?.city || null,
    state: primaryLocation?.region || null,
  };

  // Transform all locations for the editor component
  interface ArtistLocation {
    id: string;
    city: string | null;
    region: string | null;
    country_code: string;
    location_type: string;
    is_primary: boolean;
    display_order: number | null;
  }
  const transformedLocations = Array.isArray(artist.artist_locations)
    ? (artist.artist_locations as ArtistLocation[]).map((loc, i) => ({
        id: loc.id,
        city: loc.city,
        region: loc.region,
        countryCode: loc.country_code,
        locationType: loc.location_type as 'city' | 'region' | 'country',
        isPrimary: loc.is_primary,
        displayOrder: loc.display_order ?? i,
      }))
    : [];

  // Fetch all portfolio images
  const { data: images, error: imagesError } = await serviceClient
    .from('portfolio_images')
    .select(
      'id, instagram_post_id, storage_thumb_320, storage_thumb_640, storage_thumb_1280, storage_original_path, is_pinned, hidden, embedding, likes_count, created_at'
    )
    .eq('artist_id', id)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false });

  if (imagesError) {
    console.error('[Admin Artist Page] Error fetching images:', imagesError);
  }

  // Fetch analytics summary (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const { data: analyticsData } = await serviceClient
    .from('artist_analytics')
    .select('profile_views, image_views, instagram_clicks, booking_link_clicks, search_appearances')
    .eq('artist_id', id)
    .gte('date', thirtyDaysAgo.toISOString().split('T')[0]);

  const analytics = {
    profileViews: 0,
    imageViews: 0,
    instagramClicks: 0,
    bookingClicks: 0,
    searchAppearances: 0,
  };

  if (analyticsData) {
    for (const row of analyticsData) {
      analytics.profileViews += row.profile_views || 0;
      analytics.imageViews += row.image_views || 0;
      analytics.instagramClicks += row.instagram_clicks || 0;
      analytics.bookingClicks += row.booking_link_clicks || 0;
      analytics.searchAppearances += row.search_appearances || 0;
    }
  }

  // Fetch style profile
  const { data: stylesData } = await serviceClient
    .from('artist_style_profiles')
    .select('style_name, percentage, image_count')
    .eq('artist_id', id)
    .order('percentage', { ascending: false })
    .limit(5);

  // Fetch pipeline state
  const { data: pipelineState } = await serviceClient
    .from('artist_pipeline_state')
    .select('pipeline_status, scraping_blacklisted, blacklist_reason, last_scraped_at')
    .eq('artist_id', id)
    .single();

  // Fetch scraping history
  const { data: scrapingHistory } = await serviceClient
    .from('pipeline_jobs')
    .select('id, status, error_message, created_at, completed_at, result_data')
    .eq('artist_id', id)
    .eq('job_type', 'scrape_single')
    .order('created_at', { ascending: false })
    .limit(10);

  // Transform images to include has_embedding flag
  const transformedImages = (images || []).map((img) => ({
    id: img.id,
    instagram_post_id: img.instagram_post_id,
    storage_thumb_320: img.storage_thumb_320,
    storage_thumb_640: img.storage_thumb_640,
    storage_thumb_1280: img.storage_thumb_1280,
    storage_original_path: img.storage_original_path,
    is_pinned: img.is_pinned,
    hidden: img.hidden,
    has_embedding: img.embedding !== null,
    likes_count: img.likes_count,
    created_at: img.created_at,
  }));

  return (
    <ArtistDetailView
      initialArtist={artistWithLocation}
      initialImages={transformedImages}
      initialImageCount={transformedImages.length}
      initialAnalytics={analytics}
      initialStyles={stylesData || []}
      initialPipelineState={pipelineState}
      initialScrapingHistory={scrapingHistory || []}
      initialLocations={transformedLocations}
    />
  );
}
