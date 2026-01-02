/**
 * Onboarding Step 3: Portfolio Selection (Presentational)
 *
 * Displays fetched Instagram images for artist to select up to 20
 * images for their portfolio.
 *
 * Design: Paper-white editorial with ink-black accents
 */

import Image from 'next/image';

export interface PortfolioImage {
  instagram_post_id: string;
  url: string;
  classified: boolean;
}

export interface PortfolioStepProps {
  images: PortfolioImage[];
  selected: Set<string>;
  loading?: boolean;
  error?: string;
  maxImages?: number;
  onToggleImage: (id: string) => void;
  onContinue: () => void;
  onStartOver?: () => void;
}

export function PortfolioStep({
  images,
  selected,
  loading = false,
  error,
  maxImages = 20,
  onToggleImage,
  onContinue,
}: PortfolioStepProps) {
  const classifiedImages = images.filter(img => img.classified);

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header with counter */}
      <div className="flex justify-between items-center mb-8 pb-6 border-b border-[var(--gray-300)]">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl text-[var(--ink-black)]">
            Select Your Portfolio
          </h1>
          <p className="text-[var(--gray-600)] mt-2 font-body">
            Pick up to {maxImages} of your best images
          </p>
        </div>
        <div className="text-right bg-[var(--gray-100)] rounded-lg border border-[var(--gray-300)] px-5 py-3">
          <p className="font-display text-3xl text-[var(--ink-black)]">{selected.size}/{maxImages}</p>
          <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--gray-500)]">selected</p>
        </div>
      </div>

      {/* Image Grid */}
      <div className="grid grid-cols-3 md:grid-cols-4 gap-4 mb-8">
        {classifiedImages.map((img) => (
          <div
            key={img.instagram_post_id}
            onClick={() => onToggleImage(img.instagram_post_id)}
            className={`relative aspect-square cursor-pointer rounded-lg overflow-hidden border-2 transition-all duration-200 ${
              selected.has(img.instagram_post_id)
                ? 'border-[var(--ink-black)] shadow-md'
                : 'border-[var(--gray-300)] hover:border-[var(--gray-500)]'
            }`}
          >
            <Image src={img.url} alt="" fill className="object-cover" />
            {selected.has(img.instagram_post_id) && (
              <div className="absolute inset-0 bg-[var(--ink-black)]/20 flex items-center justify-center">
                <div className="w-10 h-10 bg-[var(--ink-black)] rounded-full flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 text-[var(--paper-white)]" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border-2 border-[var(--error)]">
          <p className="text-[var(--error)] text-sm font-body text-center">{error}</p>
        </div>
      )}

      <button
        onClick={onContinue}
        disabled={loading || selected.size === 0}
        className="btn btn-primary w-full disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {loading ? 'Saving...' : 'Continue'}
      </button>
    </div>
  );
}

/**
 * Loading state for fetching images
 */
export function PortfolioStepLoading() {
  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[var(--ink-black)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="font-body text-[var(--gray-600)]">Loading your images...</p>
        </div>
      </div>
    </div>
  );
}

/**
 * Error state for session issues
 */
export interface PortfolioStepErrorProps {
  error: string;
  onStartOver?: () => void;
}

export function PortfolioStepError({ error, onStartOver }: PortfolioStepErrorProps) {
  return (
    <div className="max-w-5xl mx-auto">
      <div className="bg-red-50 border-2 border-[var(--error)] p-6 text-center">
        <p className="text-[var(--error)] font-body mb-4">{error}</p>
        <button
          onClick={onStartOver}
          className="btn btn-secondary"
        >
          Start Over
        </button>
      </div>
    </div>
  );
}
