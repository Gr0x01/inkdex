/**
 * Onboarding Step 4: Booking Link (Presentational)
 *
 * Optional step for artists to add a booking link.
 * Can be skipped to go directly to launch.
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
      <div className="bg-paper-dark border border-gray-800 rounded-lg p-8">
        <h1 className="font-display text-3xl text-white mb-4">Add Booking Link</h1>
        <p className="text-gray-400 mb-8">Help clients book appointments (optional)</p>

        <div className="space-y-6">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Booking URL</label>
            <input
              type="url"
              value={bookingLink}
              onChange={(e) => onBookingLinkChange(e.target.value)}
              className="w-full px-4 py-3 bg-ink border border-gray-800 rounded text-white focus:border-ether focus:outline-none"
              placeholder="https://instagram.com/yourhandle or https://your-website.com"
            />
            <p className="text-xs text-gray-600 mt-2">
              Instagram DM link, website, Calendly, or any other booking method
            </p>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-4">
            <button
              onClick={onSkip}
              disabled={loading}
              className="flex-1 py-3 border border-gray-700 text-gray-400 font-medium rounded-lg hover:border-gray-600 disabled:opacity-50 transition"
            >
              Skip for now
            </button>
            <button
              onClick={onContinue}
              disabled={loading}
              className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 transition"
            >
              {loading ? 'Saving...' : 'Continue →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
