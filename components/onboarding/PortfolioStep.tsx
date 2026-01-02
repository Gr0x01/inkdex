/**
 * Onboarding Step 3: Portfolio Selection (Presentational)
 *
 * Displays fetched Instagram images for artist to select up to 20
 * images for their portfolio.
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
  onStartOver,
}: PortfolioStepProps) {
  const classifiedImages = images.filter(img => img.classified);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="font-display text-3xl text-white">Select Your Portfolio</h1>
          <p className="text-gray-400 mt-2">Pick up to {maxImages} of your best images</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-display text-ether">{selected.size}/{maxImages}</p>
          <p className="text-sm text-gray-500">selected</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
        {classifiedImages.map((img) => (
          <div
            key={img.instagram_post_id}
            onClick={() => onToggleImage(img.instagram_post_id)}
            className={`relative aspect-square cursor-pointer rounded-lg overflow-hidden border-2 transition ${
              selected.has(img.instagram_post_id)
                ? 'border-ether'
                : 'border-transparent hover:border-gray-700'
            }`}
          >
            <Image src={img.url} alt="" fill className="object-cover" />
            {selected.has(img.instagram_post_id) && (
              <div className="absolute inset-0 bg-ether/20 flex items-center justify-center">
                <div className="w-8 h-8 bg-ether rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-ink" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {error && <p className="text-red-400 text-center mb-4">{error}</p>}

      <button
        onClick={onContinue}
        disabled={loading || selected.size === 0}
        className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 transition"
      >
        {loading ? 'Saving...' : 'Continue →'}
      </button>
    </div>
  );
}

/**
 * Loading state for fetching images
 */
export function PortfolioStepLoading() {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-ether border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading your images...</p>
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
    <div className="max-w-6xl mx-auto">
      <div className="bg-red-900/20 border border-red-800 rounded-lg p-6 text-center">
        <p className="text-red-400 mb-4">{error}</p>
        <button
          onClick={onStartOver}
          className="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition"
        >
          Start Over
        </button>
      </div>
    </div>
  );
}
