/**
 * Onboarding Step 5: Complete (Presentational)
 *
 * Final step showing different states:
 * - Finalizing: Creating artist profile and uploading images
 * - Success: Profile is live with links to view/dashboard
 * - Error: Something went wrong during finalization
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
  artistSlug,
  error,
  onViewProfile,
  onGoToDashboard,
}: CompleteStepProps) {
  if (status === 'finalizing') {
    return (
      <div className="max-w-2xl mx-auto text-center">
        <div className="bg-paper-dark border border-gray-800 rounded-lg p-12">
          <div className="w-16 h-16 border-4 border-ether border-t-transparent rounded-full animate-spin mx-auto mb-6" />
          <h1 className="font-display text-2xl text-white mb-2">Finalizing...</h1>
          <p className="text-gray-400">Setting up your profile</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="max-w-2xl mx-auto text-center">
        <div className="bg-paper-dark border border-gray-800 rounded-lg p-12">
          <div className="w-16 h-16 bg-red-500/20 border-2 border-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="font-display text-2xl text-white mb-2">Something Went Wrong</h1>
          <p className="text-red-400 mb-6">{error}</p>
          <button
            onClick={onGoToDashboard}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium rounded-lg hover:from-purple-700 hover:to-pink-700 transition"
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
      <div className="bg-paper-dark border border-gray-800 rounded-lg p-12">
        <div className="w-20 h-20 bg-green-500/20 border-4 border-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="font-display text-4xl text-white mb-4">You&apos;re Live on Inkdex!</h1>
        <p className="text-gray-400 text-lg mb-8">
          Your profile is now visible to thousands of people looking for tattoo artists
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={onViewProfile}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium rounded-lg hover:from-purple-700 hover:to-pink-700 transition"
          >
            View Profile
          </button>
          <button
            onClick={onGoToDashboard}
            className="px-6 py-3 border border-gray-700 text-gray-300 font-medium rounded-lg hover:border-gray-600 transition"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
