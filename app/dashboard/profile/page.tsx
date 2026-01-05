/* eslint-disable @typescript-eslint/no-explicit-any -- Supabase response types vary */
/**
 * Dashboard Profile Editor
 *
 * Server component that fetches artist profile data and renders ProfileEditor
 * Allows editing: name, location, bio, booking link
 * Pro-only: pricing_info, availability_status
 */

import { redirect } from 'next/navigation';
import Link from 'next/link';
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
      instagram_handle,
      bio_override,
      booking_url,
      pricing_info,
      availability_status,
      is_pro
    `
    )
    .eq('claimed_by_user_id', user.id)
    .eq('verification_status', 'claimed')
    .single();

  // 3. Get artist locations
  let locations: any[] = [];
  if (artist) {
    const { data: locationData } = await supabase
      .from('artist_locations')
      .select('id, city, region, country_code, location_type, is_primary, display_order')
      .eq('artist_id', artist.id)
      .order('is_primary', { ascending: false })
      .order('display_order', { ascending: true });

    locations = (locationData || []).map((loc) => ({
      id: loc.id,
      city: loc.city,
      region: loc.region,
      countryCode: loc.country_code,
      locationType: loc.location_type,
      isPrimary: loc.is_primary,
      displayOrder: loc.display_order,
    }));
  }

  if (artistError || !artist) {
    return (
      <div className="min-h-screen bg-[var(--paper-white)] relative">
        {/* Grain texture overlay */}
        <div className="grain-overlay absolute inset-0 pointer-events-none" />

        <div className="relative max-w-2xl mx-auto px-6 py-16 lg:py-24">
          <div className="text-center space-y-6">
            {/* Section Label */}
            <p className="font-mono text-[11px] font-medium tracking-[0.2em] uppercase text-[var(--gray-500)]">
              Profile Error
            </p>

            {/* Error Title */}
            <h1 className="font-display text-3xl sm:text-4xl text-[var(--error)]">
              No Claimed Profile Found
            </h1>

            {/* Error Message */}
            <p className="font-body text-lg text-[var(--gray-700)] max-w-md mx-auto">
              You need to claim an artist profile before you can edit your profile settings.
            </p>

            {/* Decorative line */}
            <div className="w-16 h-px bg-[var(--gray-300)] mx-auto" />

            {/* Action Button */}
            <Link
              href="/dashboard"
              className="btn btn-primary inline-block"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ProfileEditor
      artistId={artist.id}
      initialData={{
        name: artist.name,
        instagramHandle: artist.instagram_handle,
        bioOverride: artist.bio_override || '',
        bookingLink: artist.booking_url || '',
        pricingInfo: artist.pricing_info || '',
        availabilityStatus: artist.availability_status || null,
        locations: locations,
      }}
      isPro={artist.is_pro}
    />
  );
}
