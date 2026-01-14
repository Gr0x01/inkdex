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
import { useNavbarVisibility } from '@/components/layout/NavbarContext';
import { ProBadge } from '@/components/badges/ProBadge';
import Select from '@/components/ui/Select';
import LocationManager, { Location } from './LocationManager';

interface ProfileEditorProps {
  artistId: string;
  initialData: {
    name: string;
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
  const { isNavbarHidden, isCompact } = useNavbarVisibility();

  // Form state
  const [name, setName] = useState(initialData.name);
  const [locations, setLocations] = useState<Location[]>(initialData.locations);
  const [bioOverride, setBioOverride] = useState(initialData.bioOverride);
  const [bookingLink, setBookingLink] = useState(initialData.bookingLink);
  const [pricingInfo, setPricingInfo] = useState(initialData.pricingInfo);
  const [availabilityStatus, setAvailabilityStatus] = useState<AvailabilityStatus>(
    (initialData.availabilityStatus as AvailabilityStatus) || null
  );

  // Location error state
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationsChanged, setLocationsChanged] = useState(false);

  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [saveInProgress, setSaveInProgress] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Track changes - generic function for type-safe handling
  function handleStringChange(setter: React.Dispatch<React.SetStateAction<string>>) {
    return (value: string) => {
      setter(value);
      setHasUnsavedChanges(true);
    };
  }

  function handleAvailabilityChange(value: AvailabilityStatus) {
    setAvailabilityStatus(value);
    setHasUnsavedChanges(true);
  }

  // Handle save
  const handleSave = async () => {
    if (saveInProgress) return;

    setSaveInProgress(true);
    setIsSaving(true);
    setSaveError(null);

    try {
      const response = await fetch('/api/dashboard/profile/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          artistId,
          name: name.trim(),
          // Only send locations if they changed
          ...(locationsChanged && { locations }),
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

      setHasUnsavedChanges(false);
      setLocationsChanged(false);
      router.refresh();
    } catch (error) {
      console.error('[ProfileEditor] Save error:', error);
      setSaveError(error instanceof Error ? error.message : 'Failed to save changes');
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveInProgress(false), 1000);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    setName(initialData.name);
    setLocations(initialData.locations);
    setBioOverride(initialData.bioOverride);
    setBookingLink(initialData.bookingLink);
    setPricingInfo(initialData.pricingInfo);
    setAvailabilityStatus((initialData.availabilityStatus as AvailabilityStatus) || null);
    setHasUnsavedChanges(false);
    setLocationsChanged(false);
    setSaveError(null);
  };

  // Handle location changes (now part of main save flow)
  const handleLocationChange = (newLocations: Location[]) => {
    setLocations(newLocations);
    setHasUnsavedChanges(true);
    setLocationsChanged(true);
    setLocationError(null);
  };

  // Save bar content (reused in both positions)
  const saveBarContent = (
    <div className="flex items-center justify-end gap-3 md:justify-center">
      <button
        type="button"
        onClick={handleCancel}
        disabled={isSaving}
        className="btn btn-secondary text-xs px-4 py-2 disabled:opacity-50"
      >
        Discard
      </button>
      <button
        type="button"
        onClick={handleSave}
        disabled={isSaving || !name.trim()}
        className="btn btn-primary text-xs px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSaving ? (
          <>
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Saving...
          </>
        ) : (
          'Save Changes'
        )}
      </button>
    </div>
  );

  return (
    <div className="max-w-7xl">{/* Content wrapper */}

        {/* Save Bar - Desktop/Tablet: fixed at top below toolbar */}
        {hasUnsavedChanges && (
          <>
            <div
              className={`hidden md:block fixed left-0 right-0 z-30 px-4 sm:px-6 py-3 bg-white border-b-2 border-(--ink-black) animate-fade-up transition-[top] duration-300 ${
                isNavbarHidden
                  ? 'top-[46px]'
                  : isCompact
                    ? 'top-[calc(var(--navbar-height-compact)+46px)]'
                    : 'top-[calc(var(--navbar-height-desktop)+46px)]'
              }`}
            >
              {saveBarContent}
            </div>
            {/* Spacer to push content below fixed save bar */}
            <div className="hidden md:block h-[58px]" />
          </>
        )}

        {/* Status Messages */}
        {saveError && (
          <div className="mb-6 border-2 border-(--error) bg-red-50 p-4 animate-fade-up">
            <p className="font-body text-(--error)">{saveError}</p>
          </div>
        )}

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">

          {/* Left Column - Basic Information */}
          <div className="lg:col-span-7 space-y-6">
            {/* Basic Information Card */}
            <section className="border-2 border-(--ink-black) bg-white p-5 lg:p-6">

              <h2 className="font-heading text-xl lg:text-2xl text-(--ink-black) mb-4">
                Basic Information
              </h2>

              <div className="space-y-4">
                {/* Name Field */}
                <div>
                  <label className="block font-mono text-[11px] font-medium tracking-[0.15em] uppercase text-(--gray-700) mb-2">
                    Name <span className="text-(--error)">*</span>
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
                  onChange={handleLocationChange}
                  error={locationError || undefined}
                />

                {/* Bio Field */}
                <div>
                  <label className="block font-mono text-[11px] font-medium tracking-[0.15em] uppercase text-(--gray-700) mb-2">
                    Custom Bio
                    <span className="ml-2 font-normal text-(--gray-500) normal-case tracking-normal">(Optional)</span>
                  </label>
                  <textarea
                    value={bioOverride}
                    onChange={(e) => handleStringChange(setBioOverride)(e.target.value)}
                    className="input min-h-[120px] resize-y"
                    rows={4}
                    placeholder="Tell potential clients about your style, approach, and what makes your work unique..."
                    maxLength={500}
                  />
                  <p className="mt-2 font-mono text-[10px] text-(--gray-500) tracking-wide">
                    {bioOverride.length}/500 characters
                  </p>
                </div>

                {/* Booking Link Field */}
                <div>
                  <label className="block font-mono text-[11px] font-medium tracking-[0.15em] uppercase text-(--gray-700) mb-2">
                    Booking Link
                    <span className="ml-2 font-normal text-(--gray-500) normal-case tracking-normal">(Optional)</span>
                  </label>
                  <input
                    type="url"
                    value={bookingLink}
                    onChange={(e) => handleStringChange(setBookingLink)(e.target.value)}
                    className="input"
                    placeholder="https://calendly.com/yourname"
                  />
                  <p className="mt-2 font-body text-sm text-(--gray-500) italic">
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
                <section className="border-2 border-(--ink-black) bg-white p-5 lg:p-6">

                  <div className="flex items-center gap-3 mb-4">
                    <h2 className="font-heading text-xl lg:text-2xl text-(--ink-black)">
                      Pro Features
                    </h2>
                    <ProBadge variant="badge" size="sm" />
                  </div>

                  <div className="space-y-4">
                    {/* Pricing Info */}
                    <div>
                      <label className="block font-mono text-[11px] font-medium tracking-[0.15em] uppercase text-(--gray-700) mb-2">
                        Pricing Information
                        <span className="ml-2 font-normal text-(--gray-500) normal-case tracking-normal">(Optional)</span>
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
                      <label className="block font-mono text-[11px] font-medium tracking-[0.15em] uppercase text-(--gray-700) mb-2">
                        Availability Status
                        <span className="ml-2 font-normal text-(--gray-500) normal-case tracking-normal">(Optional)</span>
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

        {/* Save Bar - Mobile: fixed at bottom */}
        {hasUnsavedChanges && (
          <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 px-4 py-3 bg-white border-t-2 border-(--ink-black) shadow-lg animate-fade-up">
            {saveBarContent}
          </div>
        )}
    </div>
  );
}
