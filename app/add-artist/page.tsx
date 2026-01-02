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
    <main className="min-h-screen bg-paper">
      {/* ═══════════════════════════════════════════════════════════════
          COMPACT HEADER
          ═══════════════════════════════════════════════════════════════ */}
      <section className="relative">
        <div className="container mx-auto px-4 pt-8 md:pt-12 pb-6 md:pb-8">
          <div className="max-w-4xl mx-auto text-center">
            {/* Compact Headline */}
            <h1 className="font-display text-ink tracking-tight leading-tight mb-3" style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)' }}>
              ADD ARTIST
            </h1>
            {/* Simple Subheading */}
            <p className="font-body text-gray-600 text-base md:text-lg leading-relaxed">
              Join as an artist or recommend someone whose work deserves to be seen.
            </p>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          MAIN CONTENT - App-First Two-Column Layout
          ═══════════════════════════════════════════════════════════════ */}
      <section className="relative pt-0 pb-12 md:pb-16">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            {/* Two Column Grid - Compact App Style */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
              {/* Left Column: Self-Add (I'm an Artist) */}
              <div className="border-2 border-ink/10 bg-paper p-6">
                <div className="space-y-4">
                  {/* Heading */}
                  <div>
                    <h2 className="font-heading text-2xl md:text-3xl text-ink mb-2 leading-tight">
                      I'm a Tattoo Artist
                    </h2>
                    <p className="font-body text-gray-600 text-base leading-relaxed">
                      Claim your page and get discovered through visual search.
                    </p>
                  </div>

                  {/* Benefits List - Compact */}
                  <ul className="space-y-2.5 pt-1">
                    <li className="flex items-start gap-2.5">
                      <div className="w-1 h-1 bg-ink mt-[0.5em] flex-shrink-0"></div>
                      <div className="font-body text-gray-700 text-base leading-snug">
                        <strong className="text-ink">Visual search discovery</strong> — Clients find you by uploading reference images
                      </div>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <div className="w-1 h-1 bg-ink mt-[0.5em] flex-shrink-0"></div>
                      <div className="font-body text-gray-700 text-base leading-snug">
                        <strong className="text-ink">Instagram integration</strong> — Curate your portfolio from your posts
                      </div>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <div className="w-1 h-1 bg-ink mt-[0.5em] flex-shrink-0"></div>
                      <div className="font-body text-gray-700 text-base leading-snug">
                        <strong className="text-ink">Free forever</strong> — Basic features are 100% free, upgrade for pro tools
                      </div>
                    </li>
                  </ul>

                  {/* OAuth Button - Compact */}
                  <div className="pt-4">
                    <div
                      className="group relative transition-all duration-200 overflow-hidden"
                      style={{
                        background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
                        padding: '2px'
                      }}
                    >
                      <div className="relative bg-gradient-to-r from-[#f09433] via-[#dc2743] to-[#bc1888] group-hover:bg-none group-hover:bg-paper transition-all duration-200">
                        <a
                          href="/api/add-artist/self-add"
                          className="block w-full py-3 px-5 text-white text-center
                                   font-mono text-[10px] tracking-[0.15em] uppercase font-medium
                                   focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
                        >
                          <span className="group-hover:bg-gradient-to-r group-hover:from-[#f09433] group-hover:via-[#dc2743] group-hover:to-[#bc1888] group-hover:bg-clip-text group-hover:text-transparent transition-all duration-200">
                            Connect with Instagram →
                          </span>
                        </a>
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-gray-500 font-body text-center">
                      We'll verify your account and create your profile
                    </p>
                  </div>

                  {/* Already Have Page Link */}
                  <div className="pt-2 border-t border-ink/10">
                    <p className="text-sm text-gray-600 font-body text-center leading-relaxed">
                      Already on Inkdex?{' '}
                      <Link
                        href="/"
                        className="text-ink underline hover:text-gray-700 transition-colors underline-offset-2"
                      >
                        Search and claim your page
                      </Link>
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Column: Recommend Artist */}
              <div className="border-2 border-ink/10 bg-paper p-6">
                <RecommendSection />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          HOW IT WORKS - Compact Three-Column
          ═══════════════════════════════════════════════════════════════ */}
      <section className="relative py-12 md:py-16 border-t-2 border-ink/10 bg-gray-100">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            {/* Section Title */}
            <div className="text-center mb-10 md:mb-12">
              <h2 className="font-display text-ink text-3xl md:text-4xl tracking-tight leading-tight">
                HOW IT WORKS
              </h2>
            </div>

            {/* 3-Step Flow */}
            <div className="grid md:grid-cols-3 gap-8">
              {/* Step 1 */}
              <div className="text-center space-y-2">
                <div className="font-display text-5xl text-ink/10 leading-none mb-3">
                  01
                </div>
                <h3 className="font-heading text-lg md:text-xl text-ink leading-tight">
                  Visual Search
                </h3>
                <p className="font-body text-base text-gray-600 leading-relaxed">
                  Clients upload reference images or describe their vision in plain language
                </p>
              </div>

              {/* Step 2 */}
              <div className="text-center space-y-2">
                <div className="font-display text-5xl text-ink/10 leading-none mb-3">
                  02
                </div>
                <h3 className="font-heading text-lg md:text-xl text-ink leading-tight">
                  AI Matching
                </h3>
                <p className="font-body text-base text-gray-600 leading-relaxed">
                  Our CLIP-powered search finds artists whose portfolios match their style
                </p>
              </div>

              {/* Step 3 */}
              <div className="text-center space-y-2">
                <div className="font-display text-5xl text-ink/10 leading-none mb-3">
                  03
                </div>
                <h3 className="font-heading text-lg md:text-xl text-ink leading-tight">
                  Connect
                </h3>
                <p className="font-body text-base text-gray-600 leading-relaxed">
                  Clients reach out via your Instagram or booking link to schedule consultations
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          FAQ SECTION - Compact
          ═══════════════════════════════════════════════════════════════ */}
      <section className="relative py-12 md:py-16 bg-paper">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            {/* Section Title */}
            <div className="text-center mb-8">
              <h2 className="font-display text-ink text-3xl md:text-4xl tracking-tight">
                FREQUENTLY ASKED
              </h2>
            </div>

            {/* FAQ Items */}
            <div className="space-y-5">
              {/* FAQ 1 */}
              <div className="border-l-2 border-ink/20 pl-5 py-3">
                <h3 className="font-heading text-base md:text-lg text-ink mb-1.5">
                  How is this different from Instagram?
                </h3>
                <p className="font-body text-base text-gray-600 leading-relaxed">
                  Inkdex makes you discoverable through visual search. Clients who don't know your name can find you by uploading reference images. It's like Google Images for finding tattoo artists.
                </p>
              </div>

              {/* FAQ 2 */}
              <div className="border-l-2 border-ink/20 pl-5 py-3">
                <h3 className="font-heading text-base md:text-lg text-ink mb-1.5">
                  Is it really free?
                </h3>
                <p className="font-body text-base text-gray-600 leading-relaxed">
                  Yes! Basic features (profile, manual portfolio import, verified badge) are 100% free forever. Upgrade to Pro ($15/month) for auto-sync, unlimited portfolio, and analytics.
                </p>
              </div>

              {/* FAQ 3 */}
              <div className="border-l-2 border-ink/20 pl-5 py-3">
                <h3 className="font-heading text-base md:text-lg text-ink mb-1.5">
                  What if my profile already exists?
                </h3>
                <p className="font-body text-base text-gray-600 leading-relaxed">
                  If you find your profile already on Inkdex, you can claim it! Just click "Claim This Page" on your profile, verify with Instagram OAuth, and you'll get full control.
                </p>
              </div>

              {/* FAQ 4 */}
              <div className="border-l-2 border-ink/20 pl-5 py-3">
                <h3 className="font-heading text-base md:text-lg text-ink mb-1.5">
                  Do I need a Business Instagram account?
                </h3>
                <p className="font-body text-base text-gray-600 leading-relaxed">
                  No! Any Instagram account works for joining Inkdex. Business/Creator accounts unlock advanced features, but personal accounts are fully supported.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
