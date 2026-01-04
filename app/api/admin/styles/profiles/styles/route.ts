/**
 * Get available styles from artist_style_profiles
 */

import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/admin/whitelist';
import { checkRateLimit } from '@/lib/redis/rate-limiter';

const STYLE_DISPLAY_NAMES: Record<string, string> = {
  'traditional': 'Traditional',
  'neo-traditional': 'Neo-Traditional',
  'fine-line': 'Fine Line',
  'blackwork': 'Blackwork',
  'geometric': 'Geometric',
  'realism': 'Realism',
  'japanese': 'Japanese',
  'watercolor': 'Watercolor',
  'dotwork': 'Dotwork',
  'tribal': 'Tribal',
  'illustrative': 'Illustrative',
  'surrealism': 'Surrealism',
  'minimalist': 'Minimalist',
  'lettering': 'Lettering',
  'new-school': 'New School',
  'trash-polka': 'Trash Polka',
  'chicano': 'Chicano',
  'biomechanical': 'Biomechanical',
  'ornamental': 'Ornamental',
  'sketch': 'Sketch',
};

export async function GET() {
  try {
    // Verify admin
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !isAdminEmail(user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting
    const rateLimitResult = await checkRateLimit(
      `admin:styles:list:${user.id}`,
      60,
      60000
    );

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    const adminClient = createAdminClient();

    // Get distinct styles from profiles
    const { data, error } = await adminClient
      .from('artist_style_profiles')
      .select('style_name')
      .limit(1000);

    if (error) {
      throw new Error(error.message);
    }

    // Get unique styles
    const uniqueStyles = [...new Set(data?.map(d => d.style_name) || [])];

    const styles = uniqueStyles
      .map(name => ({
        style_name: name,
        display_name: STYLE_DISPLAY_NAMES[name] || name,
      }))
      .sort((a, b) => a.display_name.localeCompare(b.display_name));

    return NextResponse.json({ styles });
  } catch (error) {
    console.error('[Admin Styles] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
