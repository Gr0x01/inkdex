/**
 * Onboarding Step 5: Complete (Presentational)
 *
 * Final step showing different states:
 * - Finalizing: Creating artist profile and uploading images
 * - Success: Profile is live with links to view/dashboard
 * - Error: Something went wrong during finalization
 *
 * Design: Paper-white editorial with ink-black accents
 */

export interface CompleteStepProps {
  status: 'finalizing' | 'success' | 'error';
  artistSlug?: string;
  error?: string;
  onViewProfile?: () => void;
  onGoToDashboard?: () => void;
}

export function CompleteStep({
  status,
  error,
  onViewProfile,
  onGoToDashboard,
}: CompleteStepProps) {
  if (status === 'finalizing') {
    return (
      <div className="max-w-2xl mx-auto text-center">
        <div className="border-2 border-[var(--ink-black)] bg-white p-12">
          <div className="w-16 h-16 border-4 border-[var(--ink-black)] border-t-transparent rounded-full animate-spin mx-auto mb-6" />
          <h1 className="font-heading text-2xl text-[var(--ink-black)] mb-2">Finalizing...</h1>
          <p className="font-body text-[var(--gray-600)]">Setting up your profile</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="max-w-2xl mx-auto text-center">
        <div className="border-2 border-[var(--error)] bg-red-50 p-12">
          <div className="w-16 h-16 bg-red-100 border-2 border-[var(--error)] rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-[var(--error)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="font-heading text-2xl text-[var(--error)] mb-2">Something Went Wrong</h1>
          <p className="font-body text-[var(--error)] mb-6">{error}</p>
          <button
            onClick={onGoToDashboard}
            className="btn btn-primary"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Success state
  return (
    <div className="max-w-2xl mx-auto text-center">
      <div className="border-2 border-[var(--ink-black)] bg-white p-12">
        {/* Success checkmark */}
        <div className="w-20 h-20 bg-emerald-50 border-4 border-[var(--success)] rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-12 h-12 text-[var(--success)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="font-display text-3xl md:text-4xl text-[var(--ink-black)] mb-4">
          You&apos;re Live on Inkdex!
        </h1>
        <p className="font-body text-lg text-[var(--gray-600)] mb-8 max-w-md mx-auto">
          Your profile is now visible to thousands of people looking for tattoo artists
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={onViewProfile}
            className="btn btn-primary"
          >
            View Profile
          </button>
          <button
            onClick={onGoToDashboard}
            className="btn btn-secondary"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
