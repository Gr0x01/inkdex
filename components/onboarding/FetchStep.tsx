/**
 * Onboarding Step 1: Fetch Instagram Images (Presentational)
 *
 * Displays different states during Instagram image fetching:
 * - connecting: Initial connection state
 * - fetching: Pulling posts from Instagram
 * - classifying: AI analyzing images for tattoo content
 * - complete: Successfully fetched, auto-redirecting
 * - error: Something went wrong
 *
 * Design: Paper-white editorial with ink-black accents
 */

export type LoadingState = 'connecting' | 'fetching' | 'classifying' | 'complete' | 'error';

export interface FetchStepProps {
  loadingState: LoadingState;
  progress?: { current: number; total: number };
  error?: string | null;
  onRetry?: () => void;
}

export function FetchStep({ loadingState, progress = { current: 0, total: 0 }, error, onRetry }: FetchStepProps) {
  const getLoadingMessage = () => {
    switch (loadingState) {
      case 'connecting':
        return 'Connecting to Instagram...';
      case 'fetching':
        return 'Pulling your recent posts...';
      case 'classifying':
        return `Analyzing ${progress.total} images...`;
      case 'complete':
        return `Found ${progress.total} images!`;
      case 'error':
        return 'Something went wrong';
      default:
        return 'Loading...';
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="border-2 border-[var(--ink-black)] bg-white p-8 md:p-12">

        {/* Heading */}
        <div className="text-center mb-8">
          <h1 className="font-heading text-2xl md:text-3xl text-[var(--ink-black)] mb-3">
            {loadingState === 'error' ? 'Oops!' : 'Setting Up Your Profile'}
          </h1>
          <p className="font-body text-base md:text-lg text-[var(--gray-600)]">
            {loadingState === 'error'
              ? 'We encountered an issue fetching your Instagram images'
              : "We're grabbing your Instagram images to build your portfolio"}
          </p>
        </div>

        {/* Loading/Error state */}
        <div className="space-y-6">
          {loadingState !== 'error' ? (
            <>
              {/* Loading spinner */}
              {loadingState !== 'complete' && (
                <div className="flex justify-center">
                  <div className="relative w-16 h-16">
                    <div className="absolute inset-0 border-4 border-[var(--gray-200)] rounded-full" />
                    <div className="absolute inset-0 border-4 border-[var(--ink-black)] border-t-transparent rounded-full animate-spin" />
                  </div>
                </div>
              )}

              {/* Status message */}
              <p className="text-center font-body text-lg text-[var(--ink-black)]">
                {getLoadingMessage()}
              </p>

              {/* Progress indicator (for classification) */}
              {loadingState === 'classifying' && progress.total > 0 && (
                <div className="max-w-md mx-auto">
                  <div className="h-2 bg-[var(--gray-200)] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[var(--ink-black)] transition-all duration-300"
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>
              )}

              {/* Success checkmark */}
              {loadingState === 'complete' && (
                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 bg-emerald-50 border-2 border-[var(--success)] rounded-full flex items-center justify-center">
                    <svg
                      className="w-8 h-8 text-[var(--success)]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <p className="font-mono text-xs tracking-wider uppercase text-[var(--gray-500)]">
                    Redirecting...
                  </p>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Error icon */}
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-red-50 border-2 border-[var(--error)] rounded-full flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-[var(--error)]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </div>
              </div>

              {/* Error message */}
              <div className="p-4 bg-red-50 border-2 border-[var(--error)]">
                <p className="text-[var(--error)] text-sm font-body text-center">{error}</p>
              </div>

              {/* Retry button */}
              <div className="flex justify-center">
                <button
                  onClick={onRetry}
                  className="btn btn-primary"
                >
                  Try Again
                </button>
              </div>
            </>
          )}
        </div>

        {/* Helper text */}
        {loadingState !== 'error' && loadingState !== 'complete' && (
          <p className="text-center font-mono text-[10px] tracking-wider uppercase text-[var(--gray-500)] mt-8">
            This usually takes 30-60 seconds
          </p>
        )}
      </div>
    </div>
  );
}
