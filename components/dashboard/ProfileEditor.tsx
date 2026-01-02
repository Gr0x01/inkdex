'use client';

/**
 * Profile Editor Component
 *
 * Allows artists to edit their profile information with live preview
 * Features:
 * - Basic fields: name, location, bio, booking link
 * - Pro-only fields: pricing info, availability status
 * - Delete page functionality with multi-step confirmation
 * - Form validation and error handling
 * - Optimistic UI updates
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProBadge } from '@/components/badges/ProBadge';

interface ProfileEditorProps {
  artistId: string;
  artistSlug: string;
  initialData: {
    name: string;
    city: string;
    state: string;
    instagramHandle: string;
    bioOverride: string;
    bookingLink: string;
    pricingInfo: string;
    availabilityStatus: string | null;
  };
  isPro: boolean;
}

type AvailabilityStatus = 'available' | 'booking_soon' | 'waitlist' | null;

export default function ProfileEditor({
  artistId,
  artistSlug,
  initialData,
  isPro,
}: ProfileEditorProps) {
  const router = useRouter();

  // Form state
  const [name, setName] = useState(initialData.name);
  const [city, setCity] = useState(initialData.city);
  const [state, setState] = useState(initialData.state);
  const [bioOverride, setBioOverride] = useState(initialData.bioOverride);
  const [bookingLink, setBookingLink] = useState(initialData.bookingLink);
  const [pricingInfo, setPricingInfo] = useState(initialData.pricingInfo);
  const [availabilityStatus, setAvailabilityStatus] = useState<AvailabilityStatus>(
    (initialData.availabilityStatus as AvailabilityStatus) || null
  );

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

  // Track changes
  const handleChange = (setter: (value: any) => void) => (value: any) => {
    setter(value);
    setHasUnsavedChanges(true);
    setSaveSuccess(false);
  };

  // Handle save
  const handleSave = async () => {
    // Prevent concurrent saves
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
          city: city.trim(),
          state: state.trim(),
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

      // Refresh the page data
      router.refresh();

      // Clear success message after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('[ProfileEditor] Save error:', error);
      setSaveError(error instanceof Error ? error.message : 'Failed to save changes');
    } finally {
      setIsSaving(false);
      // Debounce to prevent rapid clicking
      setTimeout(() => setSaveInProgress(false), 1000);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    // Reset all fields to initial values
    setName(initialData.name);
    setCity(initialData.city);
    setState(initialData.state);
    setBioOverride(initialData.bioOverride);
    setBookingLink(initialData.bookingLink);
    setPricingInfo(initialData.pricingInfo);
    setAvailabilityStatus((initialData.availabilityStatus as AvailabilityStatus) || null);
    setHasUnsavedChanges(false);
    setSaveSuccess(false);
    setSaveError(null);
  };

  // Delete flow: Step 1 - Warning
  const handleDeleteClick = () => {
    setShowDeleteWarning(true);
    setDeleteError(null);
  };

  // Delete flow: Step 2 - Confirm
  const handleDeleteProceed = () => {
    setShowDeleteWarning(false);
    setShowDeleteConfirm(true);
  };

  // Delete flow: Step 3 - Execute
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

      // Redirect to homepage after successful deletion
      window.location.href = '/';
    } catch (error) {
      console.error('[ProfileEditor] Delete error:', error);
      setDeleteError(error instanceof Error ? error.message : 'Failed to delete profile');
      setIsDeleting(false);
    }
  };

  const profileUrl = `${window.location.origin}/${state.toLowerCase()}/${city.toLowerCase()}/artists/${artistSlug}`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-900 to-black text-white">
      <div className="mx-auto max-w-6xl px-6 py-12">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold">Edit Profile</h1>
            <p className="mt-2 text-neutral-400">@{initialData.instagramHandle}</p>
          </div>
          <a
            href="/dashboard"
            className="rounded-lg bg-neutral-800 px-4 py-2 text-sm transition-colors hover:bg-neutral-700"
          >
            ← Back to Dashboard
          </a>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Form Column */}
          <div className="space-y-6">
            <div className="rounded-lg bg-neutral-900 p-6">
              <h2 className="mb-4 text-xl font-semibold">Basic Information</h2>

              {/* Name */}
              <div className="mb-4">
                <label className="mb-2 block text-sm font-medium text-neutral-400">
                  Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => handleChange(setName)(e.target.value)}
                  className="w-full rounded-lg bg-neutral-800 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-white"
                  placeholder="Your full name"
                  required
                />
              </div>

              {/* City */}
              <div className="mb-4">
                <label className="mb-2 block text-sm font-medium text-neutral-400">
                  City <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => handleChange(setCity)(e.target.value)}
                  className="w-full rounded-lg bg-neutral-800 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-white"
                  placeholder="Austin"
                  required
                />
              </div>

              {/* State */}
              <div className="mb-4">
                <label className="mb-2 block text-sm font-medium text-neutral-400">
                  State <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => handleChange(setState)(e.target.value.toUpperCase())}
                  className="w-full rounded-lg bg-neutral-800 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-white"
                  placeholder="TX"
                  pattern="[A-Z]{2}"
                  maxLength={2}
                  required
                />
                <p className="mt-1 text-xs text-neutral-500">Two-letter state code (e.g., TX, CA, NY)</p>
              </div>

              {/* Bio Override */}
              <div className="mb-4">
                <label className="mb-2 block text-sm font-medium text-neutral-400">
                  Custom Bio
                  <span className="ml-2 text-xs text-neutral-500">(Optional)</span>
                </label>
                <textarea
                  value={bioOverride}
                  onChange={(e) => handleChange(setBioOverride)(e.target.value)}
                  className="w-full rounded-lg bg-neutral-800 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-white"
                  rows={4}
                  placeholder="Tell potential clients about your style and approach..."
                  maxLength={500}
                />
                <p className="mt-1 text-xs text-neutral-500">{bioOverride.length}/500 characters</p>
              </div>

              {/* Booking Link */}
              <div className="mb-4">
                <label className="mb-2 block text-sm font-medium text-neutral-400">
                  Booking Link
                  <span className="ml-2 text-xs text-neutral-500">(Optional)</span>
                </label>
                <input
                  type="url"
                  value={bookingLink}
                  onChange={(e) => handleChange(setBookingLink)(e.target.value)}
                  className="w-full rounded-lg bg-neutral-800 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-white"
                  placeholder="https://..."
                />
                <p className="mt-1 text-xs text-neutral-500">
                  Where clients can book appointments (website, Instagram DMs, email, etc.)
                </p>
              </div>
            </div>

            {/* Pro-Only Fields */}
            {isPro && (
              <div className="rounded-lg bg-neutral-900 p-6">
                <div className="mb-4 flex items-center gap-2">
                  <h2 className="text-xl font-semibold">Pro Features</h2>
                  <ProBadge variant="inline" size="sm" />
                </div>

                {/* Pricing Info */}
                <div className="mb-4">
                  <label className="mb-2 block text-sm font-medium text-neutral-400">
                    Pricing Information
                    <span className="ml-2 text-xs text-neutral-500">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={pricingInfo}
                    onChange={(e) => handleChange(setPricingInfo)(e.target.value)}
                    className="w-full rounded-lg bg-neutral-800 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-white"
                    placeholder="e.g., $150/hr, $200 minimum"
                    maxLength={100}
                  />
                </div>

                {/* Availability Status */}
                <div className="mb-4">
                  <label className="mb-2 block text-sm font-medium text-neutral-400">
                    Availability Status
                    <span className="ml-2 text-xs text-neutral-500">(Optional)</span>
                  </label>
                  <select
                    value={availabilityStatus || ''}
                    onChange={(e) =>
                      handleChange(setAvailabilityStatus)(
                        e.target.value ? (e.target.value as AvailabilityStatus) : null
                      )
                    }
                    className="w-full rounded-lg bg-neutral-800 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-white"
                  >
                    <option value="">Not specified</option>
                    <option value="available">Available for bookings</option>
                    <option value="booking_soon">Opening soon</option>
                    <option value="waitlist">Waitlist only</option>
                  </select>
                </div>
              </div>
            )}

            {/* Save/Cancel Buttons */}
            <div className="flex gap-4">
              <button
                onClick={handleSave}
                disabled={isSaving || !hasUnsavedChanges}
                className="flex-1 rounded-lg bg-white px-6 py-3 font-semibold text-black transition-colors hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                onClick={handleCancel}
                disabled={isSaving || !hasUnsavedChanges}
                className="rounded-lg bg-neutral-800 px-6 py-3 transition-colors hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
            </div>

            {/* Status Messages */}
            {saveError && (
              <div className="rounded-lg bg-red-900/20 border border-red-500/50 p-4 text-red-400">
                {saveError}
              </div>
            )}
            {saveSuccess && (
              <div className="rounded-lg bg-green-900/20 border border-green-500/50 p-4 text-green-400">
                Profile updated successfully!
              </div>
            )}

            {/* Delete Page Button */}
            <div className="rounded-lg border border-red-500/30 bg-red-900/10 p-6">
              <h3 className="mb-2 text-lg font-semibold text-red-400">Danger Zone</h3>
              <p className="mb-4 text-sm text-neutral-400">
                Permanently delete your artist profile. This action cannot be undone.
              </p>
              <button
                onClick={handleDeleteClick}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700"
              >
                Delete Profile
              </button>
            </div>
          </div>

          {/* Preview Column */}
          <div>
            <div className="sticky top-8 rounded-lg bg-neutral-900 p-6">
              <h2 className="mb-4 text-xl font-semibold">Preview</h2>

              <div className="space-y-4 text-sm">
                <div>
                  <p className="text-neutral-500">Name</p>
                  <p className="text-lg font-semibold">{name || '(Not set)'}</p>
                </div>

                <div>
                  <p className="text-neutral-500">Location</p>
                  <p>
                    {city || '(City)'}, {state || '(State)'}
                  </p>
                </div>

                {bioOverride && (
                  <div>
                    <p className="text-neutral-500">Bio</p>
                    <p className="text-neutral-300 whitespace-pre-wrap">
                      {bioOverride.replace(/\n{3,}/g, '\n\n')}
                    </p>
                  </div>
                )}

                {bookingLink && (
                  <div>
                    <p className="text-neutral-500">Booking</p>
                    <a
                      href={bookingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:underline break-all"
                    >
                      {bookingLink}
                    </a>
                  </div>
                )}

                {isPro && pricingInfo && (
                  <div>
                    <p className="text-neutral-500">Pricing</p>
                    <p className="text-neutral-300">{pricingInfo}</p>
                  </div>
                )}

                {isPro && availabilityStatus && (
                  <div>
                    <p className="text-neutral-500">Availability</p>
                    <p className="text-neutral-300">
                      {availabilityStatus === 'available' && '✓ Available for bookings'}
                      {availabilityStatus === 'booking_soon' && '🕐 Opening soon'}
                      {availabilityStatus === 'waitlist' && '📝 Waitlist only'}
                    </p>
                  </div>
                )}

                <div className="pt-4 border-t border-neutral-800">
                  <p className="text-neutral-500">Public Profile</p>
                  <a
                    href={profileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-400 hover:underline break-all"
                  >
                    {profileUrl}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Warning Modal */}
      {showDeleteWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md rounded-lg bg-neutral-900 p-6">
            <h3 className="mb-4 text-2xl font-bold text-red-400">⚠️ Warning</h3>
            <p className="mb-6 text-neutral-300">
              Deleting your profile is <strong>permanent and cannot be undone</strong>. All of your:
            </p>
            <ul className="mb-6 list-inside list-disc space-y-1 text-neutral-400">
              <li>Portfolio images</li>
              <li>Profile information</li>
              <li>Analytics data</li>
              <li>Subscription (if applicable)</li>
            </ul>
            <p className="mb-6 text-neutral-300">will be permanently deleted.</p>

            <div className="flex gap-4">
              <button
                onClick={handleDeleteProceed}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-red-700"
              >
                I Understand, Continue
              </button>
              <button
                onClick={() => setShowDeleteWarning(false)}
                className="rounded-lg bg-neutral-800 px-4 py-2 transition-colors hover:bg-neutral-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md rounded-lg bg-neutral-900 p-6">
            <h3 className="mb-4 text-2xl font-bold text-red-400">Final Confirmation</h3>
            <p className="mb-4 text-neutral-300">
              Type <span className="font-mono font-bold text-white">DELETE</span> to confirm permanent deletion:
            </p>

            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              className="mb-4 w-full rounded-lg bg-neutral-800 px-4 py-2 font-mono text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="Type DELETE"
              autoFocus
            />

            {deleteError && (
              <div className="mb-4 rounded-lg bg-red-900/20 border border-red-500/50 p-3 text-sm text-red-400">
                {deleteError}
              </div>
            )}

            <div className="flex gap-4">
              <button
                onClick={handleDeleteExecute}
                disabled={isDeleting || deleteConfirmText !== 'DELETE'}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
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
                className="rounded-lg bg-neutral-800 px-4 py-2 transition-colors hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50"
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
