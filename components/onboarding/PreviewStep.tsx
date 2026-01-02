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
 *
 * Design: Paper-white editorial with ink-black accents
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
      <h1 className="font-heading text-2xl md:text-3xl text-[var(--ink-black)] mb-8">
        Preview Your Profile
      </h1>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Edit Form Card */}
        <div className="border-2 border-[var(--ink-black)] bg-white p-6 lg:p-8">

          <h2 className="font-heading text-xl text-[var(--ink-black)] mb-6">Edit Details</h2>

          <div className="space-y-5">
            {/* Name Field */}
            <div>
              <label className="block font-mono text-[11px] font-medium tracking-[0.15em] uppercase text-[var(--gray-700)] mb-2">
                Name <span className="text-[var(--error)]">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
                className="input"
                placeholder="Your display name"
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
                  onChange={(e) => onCityChange(e.target.value)}
                  className="input"
                  placeholder="Austin"
                />
              </div>
              <div>
                <label className="block font-mono text-[11px] font-medium tracking-[0.15em] uppercase text-[var(--gray-700)] mb-2">
                  State <span className="text-[var(--error)]">*</span>
                </label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => onStateChange(e.target.value.toUpperCase())}
                  className="input font-mono uppercase"
                  placeholder="TX"
                  maxLength={2}
                />
              </div>
            </div>

            {/* Bio Field */}
            <div>
              <label className="block font-mono text-[11px] font-medium tracking-[0.15em] uppercase text-[var(--gray-700)] mb-2">
                Bio
                <span className="ml-2 font-normal text-[var(--gray-500)] normal-case tracking-normal">(Optional)</span>
              </label>
              <textarea
                value={bio}
                onChange={(e) => onBioChange(e.target.value)}
                rows={4}
                maxLength={500}
                className="input min-h-[120px] resize-y"
                placeholder="Tell potential clients about your style, approach, and what makes your work unique..."
              />
              <p className="mt-2 font-mono text-[10px] text-[var(--gray-500)] tracking-wide">
                {bio.length}/500 characters
              </p>
            </div>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border-2 border-[var(--error)]">
              <p className="text-[var(--error)] text-sm font-body">{error}</p>
            </div>
          )}

          <button
            onClick={onContinue}
            disabled={loading}
            className="btn btn-primary w-full mt-6 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : 'Continue'}
          </button>
        </div>

        {/* Live Preview Card */}
        <div className="border-2 border-[var(--ink-black)] bg-white">

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
            {bio && (
              <div>
                <p className="font-mono text-[10px] tracking-[0.15em] uppercase text-[var(--gray-500)] mb-1">
                  Bio
                </p>
                <p className="font-body text-base text-[var(--gray-700)] italic leading-relaxed">
                  &ldquo;{bio}&rdquo;
                </p>
              </div>
            )}
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
          <div className="w-16 h-16 border-4 border-[var(--ink-black)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="font-body text-[var(--gray-600)]">Loading your profile...</p>
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
      <div className="bg-red-50 border-2 border-[var(--error)] p-6 text-center">
        <p className="text-[var(--error)] font-body mb-4">{error}</p>
        <p className="font-mono text-xs tracking-wider uppercase text-[var(--gray-500)]">Redirecting...</p>
      </div>
    </div>
  );
}
