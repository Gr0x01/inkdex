'use client';

/**
 * Profile Editor Component - Editorial Design
 *
 * Allows artists to edit their profile information with live preview
 * Features:
 * - Basic fields: name, location, bio, booking link
 * - Pro-only fields: pricing info, availability status
 * - Delete page functionality with multi-step confirmation
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
  const [isSaving, setIsSaving] = useState(false);
  const [saveInProgress, setSaveInProgress] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Delete modal state
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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
  const handleSave = async () => {
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
  const handleCancel = () => {
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

  // Delete flow handlers
  const handleDeleteClick = () => {
    setShowDeleteWarning(true);
    setDeleteError(null);
  };

  const handleDeleteProceed = () => {
    setShowDeleteWarning(false);
    setShowDeleteConfirm(true);
  };

  const handleDeleteExecute = async () => {
    if (deleteConfirmText !== 'DELETE') {
      setDeleteError('Please type DELETE to confirm');
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);

    try {
      const response = await fetch('/api/dashboard/profile/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artistId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete profile');
      }

      window.location.href = '/';
    } catch (error) {
      console.error('[ProfileEditor] Delete error:', error);
      setDeleteError(error instanceof Error ? error.message : 'Failed to delete profile');
      setIsDeleting(false);
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

            {/* Danger Zone */}
            <section className="border-2 border-red-200 bg-red-50/50 p-5 lg:p-6 mt-4">
              <h3 className="font-heading text-lg text-[var(--error)] mb-2">
                Danger Zone
              </h3>
              <p className="font-body text-sm text-[var(--gray-700)] mb-4">
                Permanently delete your artist profile. This action cannot be undone and will remove all your portfolio images and analytics data.
              </p>
              <button
                onClick={handleDeleteClick}
                className="font-mono text-xs tracking-[0.1em] uppercase px-4 py-2 bg-[var(--error)] text-white hover:bg-red-700 transition-colors"
              >
                Delete Profile
              </button>
            </section>
          </div>

          {/* Right Column - Pro Features & Tips */}
          <aside className="lg:col-span-5">
            <div className="lg:sticky lg:top-[96px] space-y-6">
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

      {/* Delete Warning Modal */}
      {showDeleteWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--ink-black)]/80 p-4 animate-fade-in">
          <div className="w-full max-w-md bg-white border-2 border-[var(--ink-black)] p-8 animate-scale-in">
            <h3 className="font-heading text-2xl text-[var(--error)] mb-4">
              Warning
            </h3>
            <p className="font-body text-[var(--ink-black)] mb-4">
              Deleting your profile is <strong>permanent and cannot be undone</strong>. All of your:
            </p>
            <ul className="font-body text-[var(--gray-700)] mb-6 space-y-1 ml-4">
              <li className="flex items-center gap-2">
                <span className="w-1 h-1 bg-[var(--gray-500)] rounded-full" />
                Portfolio images
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1 h-1 bg-[var(--gray-500)] rounded-full" />
                Profile information
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1 h-1 bg-[var(--gray-500)] rounded-full" />
                Analytics data
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1 h-1 bg-[var(--gray-500)] rounded-full" />
                Subscription (if applicable)
              </li>
            </ul>
            <p className="font-body text-[var(--ink-black)] mb-6">
              will be permanently deleted.
            </p>

            <div className="flex gap-3">
              <button
                onClick={handleDeleteProceed}
                className="flex-1 font-mono text-xs tracking-[0.1em] uppercase px-4 py-3 bg-[var(--error)] text-white hover:bg-red-700 transition-colors"
              >
                I Understand
              </button>
              <button
                onClick={() => setShowDeleteWarning(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--ink-black)]/80 p-4 animate-fade-in">
          <div className="w-full max-w-md bg-white border-2 border-[var(--ink-black)] p-8 animate-scale-in">
            <h3 className="font-heading text-2xl text-[var(--error)] mb-4">
              Final Confirmation
            </h3>
            <p className="font-body text-[var(--ink-black)] mb-4">
              Type <span className="font-mono font-bold bg-[var(--gray-100)] px-2 py-0.5">DELETE</span> to confirm permanent deletion:
            </p>

            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              className="w-full px-4 py-3 border-2 border-[var(--gray-300)] font-mono text-lg tracking-wider focus:outline-none focus:border-[var(--error)] mb-4"
              placeholder="Type DELETE"
              autoFocus
            />

            {deleteError && (
              <div className="border-2 border-[var(--error)] bg-red-50 p-3 mb-4">
                <p className="font-body text-sm text-[var(--error)]">{deleteError}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleDeleteExecute}
                disabled={isDeleting || deleteConfirmText !== 'DELETE'}
                className="flex-1 font-mono text-xs tracking-[0.1em] uppercase px-4 py-3 bg-[var(--error)] text-white hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isDeleting ? 'Deleting...' : 'Delete Forever'}
              </button>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteConfirmText('');
                  setDeleteError(null);
                }}
                disabled={isDeleting}
                className="btn btn-secondary disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
