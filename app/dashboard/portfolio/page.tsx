/* eslint-disable @typescript-eslint/no-explicit-any -- Supabase response types vary */
/**
 * Dashboard Portfolio Management
 *
 * Server component that fetches portfolio data and renders PortfolioManager
 * Redirects to login if not authenticated, shows error if no claimed artist
 */

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import PortfolioManager from '@/components/dashboard/PortfolioManager';

export default async function PortfolioPage() {
  const supabase = await createClient();

  // 1. Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // 2. Get claimed artist
  const { data: artist, error: artistError } = await supabase
    .from('artists')
    .select('id, instagram_handle, is_pro')
    .eq('claimed_by_user_id', user.id)
    .eq('verification_status', 'claimed')
    .single();

  if (artistError || !artist) {
    return (
      <div className="min-h-screen bg-linear-to-b from-neutral-900 to-black text-white">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="flex flex-col items-center justify-center space-y-6">
            <h1 className="text-2xl font-bold text-red-400">No Claimed Artist Found</h1>
            <p className="text-neutral-400">
              You need to claim an artist profile before managing a portfolio.
            </p>
            <Link
              href="/dashboard"
              className="rounded-lg bg-white px-6 py-3 text-sm font-semibold text-black transition-colors hover:bg-neutral-200"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 3. Fetch portfolio using get_artist_portfolio() RPC
  const { data: portfolioImages, error: portfolioError } = await supabase.rpc(
    'get_artist_portfolio',
    {
      p_artist_id: artist.id,
    }
  );

  if (portfolioError) {
    console.error('[Portfolio] Failed to fetch portfolio:', portfolioError);
  }

  const images = portfolioImages || [];
  const visibleCount = images.filter((img: any) => !img.hidden).length;
  const isAtLimit = visibleCount >= 20;

  return (
    <PortfolioManager
      artistId={artist.id}
      artistHandle={artist.instagram_handle}
      isPro={artist.is_pro}
      initialImages={images}
      visibleCount={visibleCount}
      isAtLimit={isAtLimit}
    />
  );
}
