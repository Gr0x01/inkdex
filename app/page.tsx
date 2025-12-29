import SearchTabs from '@/components/search/SearchTabs'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-4xl mx-auto text-center mb-12">
          {/* Heading */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
            Find Your Tattoo Artist
            <br />
            <span className="text-blue-600">by Vibe</span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg md:text-xl text-gray-600 mb-4 max-w-2xl mx-auto">
            Upload an image or describe what you&apos;re looking for.
            <br />
            We&apos;ll find artists whose style matches your vision.
          </p>

          {/* Trust Signal */}
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <svg
              className="w-5 h-5 text-green-600"
              fill="currentColor"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <span>
              <strong className="text-gray-700">204 artists</strong> in Austin, TX
            </span>
          </div>
        </div>

        {/* Search Interface */}
        <div className="max-w-3xl mx-auto">
          <SearchTabs />
        </div>

        {/* How It Works */}
        <div className="max-w-4xl mx-auto mt-20">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-12">
            How It Works
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 text-blue-600 font-bold text-lg mb-4">
                1
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Share Your Vision
              </h3>
              <p className="text-gray-600 text-sm">
                Upload a reference image or describe the vibe you&apos;re looking for
                in your own words
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 text-blue-600 font-bold text-lg mb-4">
                2
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                AI Matches Artists
              </h3>
              <p className="text-gray-600 text-sm">
                Our AI analyzes thousands of portfolio images to find artists
                whose style matches your aesthetic
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 text-blue-600 font-bold text-lg mb-4">
                3
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Browse & Connect
              </h3>
              <p className="text-gray-600 text-sm">
                Explore matched artists&apos; portfolios and reach out directly via
                Instagram to book your session
              </p>
            </div>
          </div>
        </div>

        {/* Why Use This */}
        <div className="max-w-2xl mx-auto mt-16 p-8 bg-blue-50 rounded-2xl">
          <h3 className="text-xl font-semibold text-gray-900 mb-4 text-center">
            No tattoo terminology required
          </h3>
          <p className="text-gray-700 text-center">
            Don&apos;t know the difference between &ldquo;traditional&rdquo; and &ldquo;neo-traditional&rdquo;?
            That&apos;s okay. Just show us what you like, and we&apos;ll find artists who
            can bring your vision to life.
          </p>
        </div>
      </div>
    </main>
  )
}
