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

  const profileUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/${state.toLowerCase()}/${city.toLowerCase().replace(/\s+/g, '-')}/artists/${artistSlug}`
    : '';

  return (
    <div className="min-h-screen bg-[var(--paper-white)] relative">
      {/* Grain texture overlay */}
      <div className="grain-overlay absolute inset-0 pointer-events-none" />

      <div className="relative max-w-6xl mx-auto px-6 lg:px-8 py-8 lg:py-12">
        {/* Header - Matches PortfolioManager pattern */}
        <header className="mb-8 pb-6 border-b border-[var(--gray-300)]">
          {/* Top row: Breadcrumb + Pro Badge */}
          <div className="flex items-center justify-between mb-4">
            <a
              href="/dashboard"
              className="group inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-[var(--gray-700)] hover:text-[var(--ink-black)] transition-colors"
            >
              <span className="inline-block transition-transform group-hover:-translate-x-0.5">←</span>
              <span>Dashboard</span>
            </a>

            {isPro && <ProBadge variant="badge" size="sm" />}
          </div>

          {/* Bottom row: Title + Handle */}
          <div className="flex items-end justify-between gap-6">
            <div>
              <h1 className="font-heading text-3xl mb-1.5">Edit Profile</h1>
              <p className="font-mono text-xs uppercase tracking-wider text-[var(--gray-500)]">
                @{initialData.instagramHandle}
              </p>
            </div>
          </div>
        </header>

        {/* Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">

          {/* Form Column */}
          <div className="lg:col-span-7 space-y-8">

            {/* Basic Information Card */}
            <section className="border-2 border-[var(--ink-black)] bg-white p-6 lg:p-8 relative">
              {/* Corner accent */}
              <div className="absolute -top-1 -right-1 w-6 h-6 border-t-2 border-r-2 border-[var(--warm-gray)]" />

              <h2 className="font-heading text-xl lg:text-2xl text-[var(--ink-black)] mb-6">
                Basic Information
              </h2>

              <div className="space-y-5">
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

                {/* City & State Row */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-mono text-[11px] font-medium tracking-[0.15em] uppercase text-[var(--gray-700)] mb-2">
                      City <span className="text-[var(--error)]">*</span>
                    </label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => handleStringChange(setCity)(e.target.value)}
                      className="input"
                      placeholder="Austin"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-mono text-[11px] font-medium tracking-[0.15em] uppercase text-[var(--gray-700)] mb-2">
                      State <span className="text-[var(--error)]">*</span>
                    </label>
                    <input
                      type="text"
                      value={state}
                      onChange={(e) => handleStringChange(setState)(e.target.value.toUpperCase())}
                      className="input font-mono uppercase"
                      placeholder="TX"
                      pattern="[A-Z]{2}"
                      maxLength={2}
                      required
                    />
                  </div>
                </div>

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

            {/* Pro Features Card */}
            {isPro && (
              <section className="border-2 border-[var(--ink-black)] bg-white p-6 lg:p-8 relative">
                {/* Gold accent for Pro */}
                <div className="absolute -top-1 -right-1 w-6 h-6 border-t-2 border-r-2 border-amber-500" />

                <div className="flex items-center gap-3 mb-6">
                  <h2 className="font-heading text-xl lg:text-2xl text-[var(--ink-black)]">
                    Pro Features
                  </h2>
                  <ProBadge variant="badge" size="sm" />
                </div>

                <div className="space-y-5">
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
                    <select
                      value={availabilityStatus || ''}
                      onChange={(e) =>
                        handleAvailabilityChange(
                          e.target.value ? (e.target.value as AvailabilityStatus) : null
                        )
                      }
                      className="input cursor-pointer"
                    >
                      <option value="">Not specified</option>
                      <option value="available">Available for bookings</option>
                      <option value="booking_soon">Opening soon</option>
                      <option value="waitlist">Waitlist only</option>
                    </select>
                  </div>
                </div>
              </section>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleSave}
                disabled={isSaving || !hasUnsavedChanges}
                className="btn btn-primary flex-1 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isSaving ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Saving...
                  </span>
                ) : (
                  'Save Changes'
                )}
              </button>
              <button
                onClick={handleCancel}
                disabled={isSaving || !hasUnsavedChanges}
                className="btn btn-secondary disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Discard
              </button>
            </div>

            {/* Status Messages */}
            {saveError && (
              <div className="border-2 border-[var(--error)] bg-red-50 p-4 animate-fade-up">
                <p className="font-body text-[var(--error)]">{saveError}</p>
              </div>
            )}
            {saveSuccess && (
              <div className="border-2 border-[var(--success)] bg-emerald-50 p-4 animate-fade-up">
                <p className="font-body text-emerald-700">Profile updated successfully</p>
              </div>
            )}

            {/* Danger Zone */}
            <section className="border-2 border-red-200 bg-red-50/50 p-6 lg:p-8 mt-12">
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

          {/* Preview Column */}
          <aside className="lg:col-span-5">
            <div className="lg:sticky lg:top-8 space-y-6">
              {/* Preview Card */}
              <div className="border-2 border-[var(--ink-black)] bg-white relative">
                {/* Corner accent */}
                <div className="absolute -top-1 -left-1 w-6 h-6 border-t-2 border-l-2 border-[var(--warm-gray)]" />

                {/* Header */}
                <div className="border-b border-[var(--gray-300)] px-6 py-4">
                  <p className="font-mono text-[11px] font-medium tracking-[0.2em] uppercase text-[var(--gray-500)]">
                    Live Preview
                  </p>
                </div>

                {/* Preview Content */}
                <div className="p-6 space-y-5">
                  {/* Name Preview */}
                  <div>
                    <p className="font-mono text-[10px] tracking-[0.15em] uppercase text-[var(--gray-500)] mb-1">
                      Display Name
                    </p>
                    <p className="font-heading text-2xl text-[var(--ink-black)]">
                      {name || <span className="text-[var(--gray-400)] italic">Not set</span>}
                    </p>
                  </div>

                  {/* Location Preview */}
                  <div>
                    <p className="font-mono text-[10px] tracking-[0.15em] uppercase text-[var(--gray-500)] mb-1">
                      Location
                    </p>
                    <p className="font-body text-lg text-[var(--ink-black)]">
                      {city || <span className="text-[var(--gray-400)]">City</span>}
                      {', '}
                      {state || <span className="text-[var(--gray-400)]">ST</span>}
                    </p>
                  </div>

                  {/* Bio Preview */}
                  {bioOverride && (
                    <div>
                      <p className="font-mono text-[10px] tracking-[0.15em] uppercase text-[var(--gray-500)] mb-1">
                        Bio
                      </p>
                      <p className="font-body text-base text-[var(--gray-700)] italic leading-relaxed whitespace-pre-wrap">
                        &ldquo;{bioOverride.replace(/\n{3,}/g, '\n\n')}&rdquo;
                      </p>
                    </div>
                  )}

                  {/* Booking Link Preview */}
                  {bookingLink && (
                    <div>
                      <p className="font-mono text-[10px] tracking-[0.15em] uppercase text-[var(--gray-500)] mb-1">
                        Booking
                      </p>
                      <a
                        href={bookingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-body text-base text-[var(--ink-black)] underline underline-offset-4 hover:no-underline break-all"
                      >
                        {bookingLink}
                      </a>
                    </div>
                  )}

                  {/* Pro Fields Preview */}
                  {isPro && pricingInfo && (
                    <div>
                      <p className="font-mono text-[10px] tracking-[0.15em] uppercase text-[var(--gray-500)] mb-1">
                        Pricing
                      </p>
                      <p className="font-body text-base text-[var(--ink-black)]">
                        {pricingInfo}
                      </p>
                    </div>
                  )}

                  {isPro && availabilityStatus && (
                    <div>
                      <p className="font-mono text-[10px] tracking-[0.15em] uppercase text-[var(--gray-500)] mb-1">
                        Availability
                      </p>
                      <p className="font-body text-base text-[var(--ink-black)]">
                        {availabilityStatus === 'available' && (
                          <span className="inline-flex items-center gap-2">
                            <span className="w-2 h-2 bg-emerald-500 rounded-full" />
                            Available for bookings
                          </span>
                        )}
                        {availabilityStatus === 'booking_soon' && (
                          <span className="inline-flex items-center gap-2">
                            <span className="w-2 h-2 bg-amber-500 rounded-full" />
                            Opening soon
                          </span>
                        )}
                        {availabilityStatus === 'waitlist' && (
                          <span className="inline-flex items-center gap-2">
                            <span className="w-2 h-2 bg-[var(--gray-500)] rounded-full" />
                            Waitlist only
                          </span>
                        )}
                      </p>
                    </div>
                  )}
                </div>

                {/* Profile URL Footer */}
                <div className="border-t border-[var(--gray-300)] px-6 py-4">
                  <p className="font-mono text-[10px] tracking-[0.15em] uppercase text-[var(--gray-500)] mb-2">
                    Public Profile URL
                  </p>
                  <a
                    href={profileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-xs text-[var(--ink-black)] hover:underline break-all"
                  >
                    {profileUrl || 'URL will appear here'}
                  </a>
                </div>
              </div>

              {/* Helpful Tips */}
              <div className="bg-[var(--gray-100)] p-5 space-y-3">
                <p className="font-mono text-[11px] font-medium tracking-[0.15em] uppercase text-[var(--gray-700)]">
                  Tips
                </p>
                <ul className="font-body text-sm text-[var(--gray-700)] space-y-2 list-none">
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--warm-gray)] mt-0.5">•</span>
                    <span>A compelling bio helps clients understand your style</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--warm-gray)] mt-0.5">•</span>
                    <span>Adding a booking link increases consultation requests</span>
                  </li>
                  {!isPro && (
                    <li className="flex items-start gap-2">
                      <span className="text-amber-500 mt-0.5">★</span>
                      <span>Upgrade to Pro to display pricing and availability</span>
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </aside>
        </div>
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
