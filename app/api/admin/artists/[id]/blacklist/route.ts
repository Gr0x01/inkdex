import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { isAdminEmail } from '@/lib/admin/whitelist';
import { logAdminAction, getClientInfo } from '@/lib/admin/audit-log';
import { z } from 'zod';

const blacklistSchema = z.object({
  blacklist: z.boolean(),
  reason: z.string().min(1).max(500).optional(),
});

const uuidSchema = z.string().uuid();

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: artistId } = await params;

  // Validate UUID format
  const uuidResult = uuidSchema.safeParse(artistId);
  if (!uuidResult.success) {
    return NextResponse.json({ error: 'Invalid artist ID format' }, { status: 400 });
  }

  // Verify admin access
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminClient = createAdminClient();

  try {
    const body = await request.json();
    const { blacklist, reason } = blacklistSchema.parse(body);

    // Verify artist exists
    const { data: artist, error: artistError } = await adminClient
      .from('artists')
      .select('id, name, instagram_handle')
      .eq('id', artistId)
      .single();

    if (artistError || !artist) {
      return NextResponse.json({ error: 'Artist not found' }, { status: 404 });
    }

    if (blacklist) {
      // Blacklist the artist
      // 1. Update artist_pipeline_state
      const { error: updateError } = await adminClient
        .from('artist_pipeline_state')
        .upsert(
          {
            artist_id: artistId,
            scraping_blacklisted: true,
            blacklist_reason: reason || 'Manually blacklisted by admin',
            pipeline_status: 'rejected',
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'artist_id' }
        );

      if (updateError) throw updateError;

      // 2. Delete all portfolio images for this artist
      const { error: deleteImagesError, count: deletedCount } = await adminClient
        .from('portfolio_images')
        .delete()
        .eq('artist_id', artistId);

      if (deleteImagesError) {
        console.error('Failed to delete portfolio images:', deleteImagesError);
        // Continue anyway - blacklist is more important
      }

      // 3. Audit log
      const clientInfo = getClientInfo(request);
      await logAdminAction({
        adminEmail: user.email || 'unknown',
        action: 'artist.blacklist',
        resourceType: 'artist',
        resourceId: artistId,
        oldValue: { blacklisted: false },
        newValue: { blacklisted: true, reason, imagesDeleted: deletedCount || 0 },
        ...clientInfo,
      });

      return NextResponse.json({
        success: true,
        message: `Blacklisted @${artist.instagram_handle}. Deleted ${deletedCount || 0} images.`,
        deletedImages: deletedCount || 0,
      });
    } else {
      // Un-blacklist the artist
      const { error: updateError } = await adminClient
        .from('artist_pipeline_state')
        .upsert(
          {
            artist_id: artistId,
            scraping_blacklisted: false,
            blacklist_reason: null,
            pipeline_status: 'pending', // Ready for next scrape
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'artist_id' }
        );

      if (updateError) throw updateError;

      // Audit log
      const clientInfo = getClientInfo(request);
      await logAdminAction({
        adminEmail: user.email || 'unknown',
        action: 'artist.unblacklist',
        resourceType: 'artist',
        resourceId: artistId,
        oldValue: { blacklisted: true },
        newValue: { blacklisted: false },
        ...clientInfo,
      });

      return NextResponse.json({
        success: true,
        message: `Un-blacklisted @${artist.instagram_handle}. Ready for scraping.`,
      });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message || 'Invalid request' },
        { status: 400 }
      );
    }

    console.error('Blacklist API error:', error);
    return NextResponse.json(
      { error: 'Failed to update blacklist status' },
      { status: 500 }
    );
  }
}
