import { Metadata } from 'next';
import Link from 'next/link';
import { RecommendSection } from '@/components/artist/RecommendSection';

export const metadata: Metadata = {
  title: 'Add Your Studio | Inkdex',
  description:
    'Join Inkdex as a tattoo artist or recommend talented artists you know. Get discovered through visual search and connect with potential clients.',
  openGraph: {
    title: 'Add Your Studio | Inkdex',
    description:
      'Join Inkdex as a tattoo artist or recommend talented artists you know. Get discovered through visual search and connect with potential clients.',
    type: 'website',
  },
};

export default function AddArtistPage() {
  return (
    <main className="min-h-screen bg-ink">
      {/* Header */}
      <div className="border-b border-stone-800 bg-paper-dark">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="text-center space-y-4">
            <h1 className="font-display text-4xl md:text-5xl text-white tracking-tight">
              Join Inkdex
            </h1>
            <p className="font-body text-lg md:text-xl text-gray-400 max-w-2xl mx-auto">
              Get discovered through visual search. Connect with clients who love your style.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content - Two Column Layout */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Left Column: Self-Add (I'm an Artist) */}
          <div className="bg-paper-dark border border-gray-800 rounded-lg p-8">
            <div className="space-y-6">
              {/* Heading */}
              <div>
                <h2 className="font-display text-2xl md:text-3xl text-white mb-3">
                  I'm a Tattoo Artist
                </h2>
                <p className="font-body text-gray-400 text-sm md:text-base">
                  Claim your page and showcase your portfolio to clients searching for your style.
                </p>
              </div>

              {/* Benefits List */}
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <svg
                    className="w-5 h-5 text-ether flex-shrink-0 mt-0.5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="font-body text-gray-300 text-sm">
                    <strong className="text-white">Visual Search Discovery</strong> - Clients find you by uploading reference images
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <svg
                    className="w-5 h-5 text-ether flex-shrink-0 mt-0.5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="font-body text-gray-300 text-sm">
                    <strong className="text-white">Instagram Integration</strong> - Import your portfolio directly from Instagram
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <svg
                    className="w-5 h-5 text-ether flex-shrink-0 mt-0.5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="font-body text-gray-300 text-sm">
                    <strong className="text-white">Free Forever</strong> - Basic features are 100% free, upgrade for auto-sync and analytics
                  </span>
                </li>
              </ul>

              {/* OAuth Button */}
              <div className="pt-4">
                <a
                  href="/api/add-artist/self-add"
                  className="block w-full py-4 px-6 bg-gradient-to-r from-purple-600 to-pink-600
                           text-white font-body font-medium text-center rounded-lg
                           hover:from-purple-700 hover:to-pink-700
                           transition-all duration-200 transform hover:scale-[1.02]
                           focus:outline-none focus:ring-2 focus:ring-ether focus:ring-offset-2 focus:ring-offset-paper-dark"
                >
                  Connect with Instagram →
                </a>
                <p className="mt-3 text-xs text-gray-500 font-body text-center">
                  We'll verify your account and create your artist profile
                </p>
              </div>

              {/* Already Have Page Link */}
              <div className="pt-4 border-t border-gray-800">
                <p className="text-sm text-gray-400 font-body text-center">
                  Already see your profile on Inkdex?{' '}
                  <Link
                    href="/"
                    className="text-ether hover:text-ether-light underline transition-colors"
                  >
                    Search for yourself and claim it
                  </Link>
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Recommend Artist */}
          <div className="bg-paper-dark border border-gray-800 rounded-lg p-8">
            <RecommendSection />
          </div>
        </div>

        {/* How It Works Section */}
        <div className="mt-16 max-w-4xl mx-auto">
          <h2 className="font-display text-3xl text-white text-center mb-12">
            How Inkdex Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="text-center space-y-3">
              <div className="w-12 h-12 bg-ether/10 border border-ether/20 rounded-full flex items-center justify-center mx-auto">
                <span className="font-display text-xl text-ether">1</span>
              </div>
              <h3 className="font-display text-lg text-white">Visual Search</h3>
              <p className="font-body text-sm text-gray-400">
                Clients upload reference images or describe their vision in plain language
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center space-y-3">
              <div className="w-12 h-12 bg-ether/10 border border-ether/20 rounded-full flex items-center justify-center mx-auto">
                <span className="font-display text-xl text-ether">2</span>
              </div>
              <h3 className="font-display text-lg text-white">AI Matching</h3>
              <p className="font-body text-sm text-gray-400">
                Our CLIP-powered search finds artists whose portfolios match their style
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center space-y-3">
              <div className="w-12 h-12 bg-ether/10 border border-ether/20 rounded-full flex items-center justify-center mx-auto">
                <span className="font-display text-xl text-ether">3</span>
              </div>
              <h3 className="font-display text-lg text-white">Connect</h3>
              <p className="font-body text-sm text-gray-400">
                Clients reach out via your Instagram or booking link to schedule consultations
              </p>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-16 max-w-3xl mx-auto">
          <h2 className="font-display text-3xl text-white text-center mb-8">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            {/* FAQ 1 */}
            <div className="bg-paper-dark border border-gray-800 rounded-lg p-6">
              <h3 className="font-display text-lg text-white mb-2">
                How is this different from Instagram?
              </h3>
              <p className="font-body text-sm text-gray-400">
                Inkdex makes you discoverable through visual search. Clients who don't know your name can find you by uploading reference images. It's like Google Images for finding tattoo artists.
              </p>
            </div>

            {/* FAQ 2 */}
            <div className="bg-paper-dark border border-gray-800 rounded-lg p-6">
              <h3 className="font-display text-lg text-white mb-2">
                Is it really free?
              </h3>
              <p className="font-body text-gray-400 text-sm">
                Yes! Basic features (profile, manual portfolio import, verified badge) are 100% free forever. Upgrade to Pro ($15/month) for auto-sync, unlimited portfolio, and analytics.
              </p>
            </div>

            {/* FAQ 3 */}
            <div className="bg-paper-dark border border-gray-800 rounded-lg p-6">
              <h3 className="font-display text-lg text-white mb-2">
                What if my profile already exists?
              </h3>
              <p className="font-body text-gray-400 text-sm">
                If you find your profile already on Inkdex, you can claim it! Just click "Claim This Page" on your profile, verify with Instagram OAuth, and you'll get full control.
              </p>
            </div>

            {/* FAQ 4 */}
            <div className="bg-paper-dark border border-gray-800 rounded-lg p-6">
              <h3 className="font-display text-lg text-white mb-2">
                Do I need a Business Instagram account?
              </h3>
              <p className="font-body text-gray-400 text-sm">
                No! Any Instagram account works for joining Inkdex. Business/Creator accounts unlock advanced features, but personal accounts are fully supported.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
