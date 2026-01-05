'use client';

/**
 * Profile Editor Component - Editorial Design
 *
 * Allows artists to edit their profile information with live preview
 * Features:
 * - Basic fields: name, location, bio, booking link
 * - Pro-only fields: pricing info, availability status
 * - Form validation and error handling
 * - Optimistic UI updates
 *
 * Design: Paper & Ink editorial aesthetic with grain textures
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProBadge } from '@/components/badges/ProBadge';
import Select from '@/components/ui/Select';
import LocationManager, { Location } from './LocationManager';

interface ProfileEditorProps {
  artistId: string;
  initialData: {
    name: string;
    city: string;
    state: string;
    instagramHandle: string;
    bioOverride: string;
    bookingLink: string;
    pricingInfo: string;
    availabilityStatus: string | null;
    locations: Location[];
  };
  isPro: boolean;
}

type AvailabilityStatus = 'available' | 'booking_soon' | 'waitlist' | null;

export default function ProfileEditor({
  artistId,
  initialData,
  isPro,
}: ProfileEditorProps) {
  const router = useRouter();

  // Form state
  const [name, setName] = useState(initialData.name);
  const [locations, setLocations] = useState<Location[]>(initialData.locations);
  const [bioOverride, setBioOverride] = useState(initialData.bioOverride);
  const [bookingLink, setBookingLink] = useState(initialData.bookingLink);
  const [pricingInfo, setPricingInfo] = useState(initialData.pricingInfo);
  const [availabilityStatus, setAvailabilityStatus] = useState<AvailabilityStatus>(
    (initialData.availabilityStatus as AvailabilityStatus) || null
  );

  // Location save state (separate from main form)
  const [locationSaving, setLocationSaving] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // UI state
  const [_isSaving, setIsSaving] = useState(false);
  const [saveInProgress, setSaveInProgress] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [_saveSuccess, setSaveSuccess] = useState(false);
  const [_hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Track changes - generic function for type-safe handling
  function handleStringChange(setter: React.Dispatch<React.SetStateAction<string>>) {
    return (value: string) => {
      setter(value);
      setHasUnsavedChanges(true);
      setSaveSuccess(false);
    };
  }

  function handleAvailabilityChange(value: AvailabilityStatus) {
    setAvailabilityStatus(value);
    setHasUnsavedChanges(true);
    setSaveSuccess(false);
  }

  // Handle save
  const _handleSave = async () => {
    if (saveInProgress) return;

    setSaveInProgress(true);
    setIsSaving(true);
    setSaveError(null);

    try {
      // Extract primary location for backward compatibility
      const primaryLocation = locations.find((l) => l.isPrimary) || locations[0];
      const city = primaryLocation?.city || '';
      const state = primaryLocation?.region || '';

      const response = await fetch('/api/dashboard/profile/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          artistId,
          name: name.trim(),
          city: city,
          state: state,
          locations: locations,
          bioOverride: bioOverride.trim() || null,
          bookingLink: bookingLink.trim() || null,
          pricingInfo: isPro ? pricingInfo.trim() || null : null,
          availabilityStatus: isPro ? availabilityStatus : null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update profile');
      }

      setSaveSuccess(true);
      setHasUnsavedChanges(false);
      router.refresh();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('[ProfileEditor] Save error:', error);
      setSaveError(error instanceof Error ? error.message : 'Failed to save changes');
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveInProgress(false), 1000);
    }
  };

  // Handle cancel
  const _handleCancel = () => {
    setName(initialData.name);
    setLocations(initialData.locations);
    setBioOverride(initialData.bioOverride);
    setBookingLink(initialData.bookingLink);
    setPricingInfo(initialData.pricingInfo);
    setAvailabilityStatus((initialData.availabilityStatus as AvailabilityStatus) || null);
    setHasUnsavedChanges(false);
    setSaveSuccess(false);
    setSaveError(null);
  };

  // Handle location save (separate from main form)
  const handleLocationSave = async (newLocations: Location[]) => {
    setLocationSaving(true);
    setLocationError(null);

    try {
      // Extract primary location for backward compatibility
      const primaryLocation = newLocations.find((l) => l.isPrimary) || newLocations[0];
      const city = primaryLocation?.city || '';
      const state = primaryLocation?.region || '';

      const response = await fetch('/api/dashboard/profile/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          artistId,
          // Only send location-related fields
          city: city,
          state: state,
          locations: newLocations,
          // Preserve other fields
          name: name.trim(),
          bioOverride: bioOverride.trim() || null,
          bookingLink: bookingLink.trim() || null,
          pricingInfo: isPro ? pricingInfo.trim() || null : null,
          availabilityStatus: isPro ? availabilityStatus : null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update locations');
      }

      setLocations(newLocations);
      router.refresh();
    } catch (error) {
      setLocationError(error instanceof Error ? error.message : 'Failed to save locations');
    } finally {
      setLocationSaving(false);
    }
  };

  return (
    <div className="max-w-7xl">{/* Content wrapper */}

        {/* Status Messages */}
        {saveError && (
          <div className="mb-6 border-2 border-[var(--error)] bg-red-50 p-4 animate-fade-up">
            <p className="font-body text-[var(--error)]">{saveError}</p>
          </div>
        )}

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">

          {/* Left Column - Basic Information */}
          <div className="lg:col-span-7 space-y-6">
            {/* Basic Information Card */}
            <section className="border-2 border-[var(--ink-black)] bg-white p-5 lg:p-6">

              <h2 className="font-heading text-xl lg:text-2xl text-[var(--ink-black)] mb-4">
                Basic Information
              </h2>

              <div className="space-y-4">
                {/* Name Field */}
                <div>
                  <label className="block font-mono text-[11px] font-medium tracking-[0.15em] uppercase text-[var(--gray-700)] mb-2">
                    Name <span className="text-[var(--error)]">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => handleStringChange(setName)(e.target.value)}
                    className="input"
                    placeholder="Your display name"
                    required
                  />
                </div>

                {/* Location Manager */}
                <LocationManager
                  artistId={artistId}
                  isPro={isPro}
                  locations={locations}
                  onSave={handleLocationSave}
                  isSaving={locationSaving}
                  error={locationError || undefined}
                />

                {/* Bio Field */}
                <div>
                  <label className="block font-mono text-[11px] font-medium tracking-[0.15em] uppercase text-[var(--gray-700)] mb-2">
                    Custom Bio
                    <span className="ml-2 font-normal text-[var(--gray-500)] normal-case tracking-normal">(Optional)</span>
                  </label>
                  <textarea
                    value={bioOverride}
                    onChange={(e) => handleStringChange(setBioOverride)(e.target.value)}
                    className="input min-h-[120px] resize-y"
                    rows={4}
                    placeholder="Tell potential clients about your style, approach, and what makes your work unique..."
                    maxLength={500}
                  />
                  <p className="mt-2 font-mono text-[10px] text-[var(--gray-500)] tracking-wide">
                    {bioOverride.length}/500 characters
                  </p>
                </div>

                {/* Booking Link Field */}
                <div>
                  <label className="block font-mono text-[11px] font-medium tracking-[0.15em] uppercase text-[var(--gray-700)] mb-2">
                    Booking Link
                    <span className="ml-2 font-normal text-[var(--gray-500)] normal-case tracking-normal">(Optional)</span>
                  </label>
                  <input
                    type="url"
                    value={bookingLink}
                    onChange={(e) => handleStringChange(setBookingLink)(e.target.value)}
                    className="input"
                    placeholder="https://calendly.com/yourname"
                  />
                  <p className="mt-2 font-body text-sm text-[var(--gray-500)] italic">
                    Where clients can book consultations or appointments
                  </p>
                </div>
              </div>
            </section>
          </div>

          {/* Right Column - Pro Features & Tips - sticky below navbar + toolbar */}
          <aside className="lg:col-span-5">
            <div className="lg:sticky lg:top-[calc(var(--navbar-height-desktop)+56px)] space-y-6">
              {/* Pro Features Card */}
              {isPro && (
                <section className="border-2 border-[var(--ink-black)] bg-white p-5 lg:p-6">

                  <div className="flex items-center gap-3 mb-4">
                    <h2 className="font-heading text-xl lg:text-2xl text-[var(--ink-black)]">
                      Pro Features
                    </h2>
                    <ProBadge variant="badge" size="sm" />
                  </div>

                  <div className="space-y-4">
                    {/* Pricing Info */}
                    <div>
                      <label className="block font-mono text-[11px] font-medium tracking-[0.15em] uppercase text-[var(--gray-700)] mb-2">
                        Pricing Information
                        <span className="ml-2 font-normal text-[var(--gray-500)] normal-case tracking-normal">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        value={pricingInfo}
                        onChange={(e) => handleStringChange(setPricingInfo)(e.target.value)}
                        className="input"
                        placeholder="e.g., $150/hr, $200 minimum"
                        maxLength={100}
                      />
                    </div>

                    {/* Availability Status */}
                    <div>
                      <label className="block font-mono text-[11px] font-medium tracking-[0.15em] uppercase text-[var(--gray-700)] mb-2">
                        Availability Status
                        <span className="ml-2 font-normal text-[var(--gray-500)] normal-case tracking-normal">(Optional)</span>
                      </label>
                      <Select
                        value={availabilityStatus}
                        onChange={(val) => handleAvailabilityChange(val as AvailabilityStatus)}
                        placeholder="Not specified"
                        options={[
                          { value: '', label: 'Not specified' },
                          { value: 'available', label: 'Available for bookings' },
                          { value: 'booking_soon', label: 'Opening soon' },
                          { value: 'waitlist', label: 'Waitlist only' },
                        ]}
                      />
                    </div>
                  </div>
                </section>
              )}

            </div>
          </aside>
        </div>
    </div>
  );
}
