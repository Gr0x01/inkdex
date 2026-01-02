/**
 * Onboarding Step 2: Preview Profile (Presentational)
 *
 * Allows artist to edit their profile details:
 * - Name (required)
 * - City (required)
 * - State (required)
 * - Bio (optional, max 500 chars)
 *
 * Shows a live preview of how their profile will look.
 */

export interface PreviewStepProps {
  name: string;
  city: string;
  state: string;
  bio: string;
  loading?: boolean;
  error?: string;
  onNameChange: (name: string) => void;
  onCityChange: (city: string) => void;
  onStateChange: (state: string) => void;
  onBioChange: (bio: string) => void;
  onContinue: () => void;
}

export function PreviewStep({
  name,
  city,
  state,
  bio,
  loading = false,
  error,
  onNameChange,
  onCityChange,
  onStateChange,
  onBioChange,
  onContinue,
}: PreviewStepProps) {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="font-display text-3xl text-white mb-8">Preview Your Profile</h1>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Edit Form */}
        <div className="bg-paper-dark border border-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-display text-white mb-4">Edit Details</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
                className="w-full px-4 py-2 bg-ink border border-gray-800 rounded text-white focus:border-ether focus:outline-none"
                placeholder="Your name"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">City *</label>
              <input
                type="text"
                value={city}
                onChange={(e) => onCityChange(e.target.value)}
                className="w-full px-4 py-2 bg-ink border border-gray-800 rounded text-white focus:border-ether focus:outline-none"
                placeholder="Los Angeles"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">State *</label>
              <input
                type="text"
                value={state}
                onChange={(e) => onStateChange(e.target.value)}
                className="w-full px-4 py-2 bg-ink border border-gray-800 rounded text-white focus:border-ether focus:outline-none"
                placeholder="California"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Bio (optional)</label>
              <textarea
                value={bio}
                onChange={(e) => onBioChange(e.target.value)}
                rows={4}
                maxLength={500}
                className="w-full px-4 py-2 bg-ink border border-gray-800 rounded text-white focus:border-ether focus:outline-none resize-none"
                placeholder="Tell people about your style..."
              />
              <p className="text-xs text-gray-600 mt-1">{bio.length}/500</p>
            </div>
          </div>

          {error && <p className="text-red-400 text-sm mt-4">{error}</p>}

          <button
            onClick={onContinue}
            disabled={loading}
            className="w-full mt-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 transition"
          >
            {loading ? 'Saving...' : 'Continue →'}
          </button>
        </div>

        {/* Live Preview */}
        <div className="bg-paper-dark border border-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-display text-white mb-4">Preview</h2>
          <div className="text-white">
            <h3 className="text-2xl font-display mb-2">{name || 'Your Name'}</h3>
            <p className="text-gray-400 mb-4">{city && state ? `${city}, ${state}` : 'City, State'}</p>
            <p className="text-gray-300">{bio || 'Your bio will appear here...'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Loading state for initial data fetch
 */
export function PreviewStepLoading() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-ether border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading your profile...</p>
        </div>
      </div>
    </div>
  );
}

/**
 * Error state for session issues
 */
export interface PreviewStepErrorProps {
  error: string;
}

export function PreviewStepError({ error }: PreviewStepErrorProps) {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-red-900/20 border border-red-800 rounded-lg p-6 text-center">
        <p className="text-red-400 mb-4">{error}</p>
        <p className="text-gray-500 text-sm">Redirecting...</p>
      </div>
    </div>
  );
}
