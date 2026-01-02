/**
 * Onboarding Step 4: Booking Link (Presentational)
 *
 * Optional step for artists to add a booking link.
 * Can be skipped to go directly to launch.
 *
 * Design: Paper-white editorial with ink-black accents
 */

export interface BookingStepProps {
  bookingLink: string;
  loading?: boolean;
  error?: string;
  onBookingLinkChange: (link: string) => void;
  onContinue: () => void;
  onSkip: () => void;
}

export function BookingStep({
  bookingLink,
  loading = false,
  error,
  onBookingLinkChange,
  onContinue,
  onSkip,
}: BookingStepProps) {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="border-2 border-[var(--ink-black)] bg-white p-8">

        <h1 className="font-heading text-2xl md:text-3xl text-[var(--ink-black)] mb-3">
          Add Booking Link
        </h1>
        <p className="font-body text-[var(--gray-600)] mb-8">
          Help clients book appointments
          <span className="font-body italic text-[var(--gray-500)] ml-2">(optional)</span>
        </p>

        <div className="space-y-6">
          <div>
            <label className="block font-mono text-[11px] font-medium tracking-[0.15em] uppercase text-[var(--gray-700)] mb-2">
              Booking URL
            </label>
            <input
              type="url"
              value={bookingLink}
              onChange={(e) => onBookingLinkChange(e.target.value)}
              className="input"
              placeholder="https://instagram.com/yourhandle or https://your-website.com"
            />
            <p className="mt-2 font-body text-sm text-[var(--gray-500)] italic">
              Instagram DM link, website, Calendly, or any other booking method
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border-2 border-[var(--error)]">
              <p className="text-[var(--error)] text-sm font-body">{error}</p>
            </div>
          )}

          <div className="flex gap-4">
            <button
              onClick={onSkip}
              disabled={loading}
              className="btn btn-ghost flex-1 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Skip for now
            </button>
            <button
              onClick={onContinue}
              disabled={loading}
              className="btn btn-primary flex-1 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Continue'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
