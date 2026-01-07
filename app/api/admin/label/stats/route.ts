import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/admin/whitelist';

/**
 * GET /api/admin/label/stats - Get labeling progress statistics
 */
export async function GET() {
  const supabase = await createClient();

  // Check admin auth
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get total images with embeddings
    const { count: totalImages } = await supabase
      .from('portfolio_images')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')
      .not('embedding', 'is', null);

    // Get labeled count
    const { count: labeledCount } = await supabase
      .from('style_training_labels')
      .select('*', { count: 'exact', head: true })
      .eq('skipped', false);

    // Get skipped count
    const { count: skippedCount } = await supabase
      .from('style_training_labels')
      .select('*', { count: 'exact', head: true })
      .eq('skipped', true);

    // Get style distribution from labels
    const { data: labels } = await supabase
      .from('style_training_labels')
      .select('styles')
      .eq('skipped', false);

    const styleDistribution: Record<string, number> = {};
    for (const label of labels || []) {
      for (const style of label.styles || []) {
        styleDistribution[style] = (styleDistribution[style] || 0) + 1;
      }
    }

    // Sort by count
    const sortedStyles = Object.entries(styleDistribution)
      .sort((a, b) => b[1] - a[1])
      .map(([style, count]) => ({ style, count }));

    // Get labels per user
    const { data: userStats } = await supabase
      .from('style_training_labels')
      .select('labeled_by')
      .eq('skipped', false);

    const labelerCounts: Record<string, number> = {};
    for (const label of userStats || []) {
      labelerCounts[label.labeled_by] = (labelerCounts[label.labeled_by] || 0) + 1;
    }

    return NextResponse.json({
      totalImages: totalImages || 0,
      labeledCount: labeledCount || 0,
      skippedCount: skippedCount || 0,
      remaining: (totalImages || 0) - (labeledCount || 0) - (skippedCount || 0),
      styleDistribution: sortedStyles,
      labelerCounts,
      targetPerStyle: 500,  // Target labels per style for ML training
    });
  } catch (error) {
    console.error('Error in stats API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
