import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { isAdminEmail } from '@/lib/admin/whitelist';
import { logAdminAction, getClientInfo } from '@/lib/admin/audit-log';
import { z } from 'zod';

const bulkBlacklistSchema = z.object({
  artistIds: z.array(z.string().uuid()).min(1).max(100),
  reason: z.string().min(1).max(500),
});

export async function POST(request: Request) {
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
    const { artistIds, reason } = bulkBlacklistSchema.parse(body);

    // Batch update artist_pipeline_state for all artists
    const updates = artistIds.map((artistId) => ({
      artist_id: artistId,
      scraping_blacklisted: true,
      blacklist_reason: reason,
      pipeline_status: 'rejected' as const,
      updated_at: new Date().toISOString(),
    }));

    const { error: updateError } = await adminClient
      .from('artist_pipeline_state')
      .upsert(updates, { onConflict: 'artist_id' });

    if (updateError) throw updateError;

    // Delete all portfolio images for these artists
    const { error: deleteImagesError, count: deletedCount } = await adminClient
      .from('portfolio_images')
      .delete()
      .in('artist_id', artistIds);

    if (deleteImagesError) {
      console.error('Failed to delete portfolio images:', deleteImagesError);
      // Continue anyway - blacklist is more important
    }

    // Audit log
    const clientInfo = getClientInfo(request);
    await logAdminAction({
      adminEmail: user.email || 'unknown',
      action: 'artist.bulk_blacklist',
      resourceType: 'artist',
      newValue: {
        artistCount: artistIds.length,
        reason,
        imagesDeleted: deletedCount || 0,
      },
      ...clientInfo,
    });

    return NextResponse.json({
      success: true,
      message: `Blacklisted ${artistIds.length} artist(s). Deleted ${deletedCount || 0} images.`,
      blacklistedCount: artistIds.length,
      deletedImages: deletedCount || 0,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message || 'Invalid request' },
        { status: 400 }
      );
    }

    console.error('Bulk blacklist API error:', error);
    return NextResponse.json(
      { error: 'Failed to blacklist artists' },
      { status: 500 }
    );
  }
}
