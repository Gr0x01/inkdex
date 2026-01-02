/**
 * Dashboard Profile Editor
 *
 * Server component that fetches artist profile data and renders ProfileEditor
 * Allows editing: name, location, bio, booking link
 * Pro-only: pricing_info, availability_status
 * Includes delete page functionality with multi-step confirmation
 */

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ProfileEditor from '@/components/dashboard/ProfileEditor';

export default async function ProfilePage() {
  const supabase = await createClient();

  // 1. Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // 2. Get claimed artist with all profile fields
  const { data: artist, error: artistError } = await supabase
    .from('artists')
    .select(
      `
      id,
      name,
      city,
      state,
      instagram_handle,
      bio_override,
      booking_url,
      pricing_info,
      availability_status,
      is_pro,
      slug
    `
    )
    .eq('claimed_by_user_id', user.id)
    .eq('verification_status', 'claimed')
    .single();

  if (artistError || !artist) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-neutral-900 to-black text-white">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="flex flex-col items-center justify-center space-y-6">
            <h1 className="text-2xl font-bold text-red-400">No Claimed Artist Found</h1>
            <p className="text-neutral-400">
              You need to claim an artist profile before editing your profile.
            </p>
            <a
              href="/dashboard"
              className="rounded-lg bg-white px-6 py-3 text-sm font-semibold text-black transition-colors hover:bg-neutral-200"
            >
              Back to Dashboard
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ProfileEditor
      artistId={artist.id}
      artistSlug={artist.slug}
      initialData={{
        name: artist.name,
        city: artist.city,
        state: artist.state,
        instagramHandle: artist.instagram_handle,
        bioOverride: artist.bio_override || '',
        bookingLink: artist.booking_url || '',
        pricingInfo: artist.pricing_info || '',
        availabilityStatus: artist.availability_status || null,
      }}
      isPro={artist.is_pro}
    />
  );
}
