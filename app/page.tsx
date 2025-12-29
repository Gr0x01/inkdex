import UnifiedSearchBar from '@/components/home/UnifiedSearchBar'
import VisualTeaserStrip from '@/components/home/VisualTeaserStrip'
import FeaturedArtistsGrid from '@/components/home/FeaturedArtistsGrid'
import { getFeaturedImages, getFeaturedArtists } from '@/lib/supabase/queries'
import type { FeaturedImage, FeaturedArtist } from '@/lib/mock/featured-data'

export default async function Home() {
  // Fetch featured content (with fallback to empty arrays)
  let featuredImages: FeaturedImage[] = []
  let featuredArtists: FeaturedArtist[] = []

  try {
    featuredImages = await getFeaturedImages(30) as FeaturedImage[]
  } catch (error) {
    console.error('Failed to fetch featured images:', error)
  }

  try {
    featuredArtists = await getFeaturedArtists('Austin', 12) as FeaturedArtist[]
  } catch (error) {
    console.error('Failed to fetch featured artists:', error)
  }

  return (
    <main className="min-h-screen bg-light">
      {/* ═══════════════════════════════════════════════════════════════
          HERO SECTION - Mobile-First Editorial Layout
          ═══════════════════════════════════════════════════════════════ */}
      <section className="relative grain-overlay py-8 md:py-16 lg:py-20 overflow-hidden">
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            {/* Oversized Editorial Headline */}
            <div className="mb-6 md:mb-10 stagger-children">
              <h1 className="font-display leading-none mb-3 md:mb-4" style={{ fontSize: 'clamp(2.5rem, 12vw, 6rem)' }}>
                FIND YOUR
                <br />
                ARTIST
              </h1>
              <p className="font-mono text-tiny text-gray-600 tracking-wider">
                BY VIBE, NOT VOCABULARY
              </p>
            </div>

            {/* Subheading */}
            <p className="font-body text-base md:text-xl lg:text-2xl text-gray-700 mb-8 md:mb-12 px-4 leading-relaxed animate-fade-up" style={{ animationDelay: '200ms' }}>
              Upload an image or describe your style. Our AI matches you with artists in Austin whose work fits your aesthetic.
            </p>

            {/* Unified Search Bar - Editorial Card Style */}
            <div className="animate-fade-up" style={{ animationDelay: '400ms' }}>
              <UnifiedSearchBar />
            </div>

            {/* Stats Bar */}
            <div className="mt-8 md:mt-12 pt-6 md:pt-8 border-t border-gray-300 grid grid-cols-3 gap-4 md:gap-6 max-w-xl mx-auto animate-fade-up" style={{ animationDelay: '600ms' }}>
              <div>
                <div className="font-heading text-2xl md:text-3xl lg:text-4xl text-black-warm mb-1">188</div>
                <div className="font-mono text-tiny text-gray-600">ARTISTS</div>
              </div>
              <div>
                <div className="font-heading text-2xl md:text-3xl lg:text-4xl text-black-warm mb-1">1.2K</div>
                <div className="font-mono text-tiny text-gray-600">ARTWORKS</div>
              </div>
              <div>
                <div className="font-heading text-2xl md:text-3xl lg:text-4xl text-black-warm mb-1">ATX</div>
                <div className="font-mono text-tiny text-gray-600">AUSTIN</div>
              </div>
            </div>
          </div>
        </div>

        {/* Background Decorative Element - Subtle Gold Accent */}
        <div
          className="absolute top-0 right-0 w-[600px] h-[600px] opacity-5 pointer-events-none hidden md:block"
          style={{
            background: 'radial-gradient(circle, var(--gold-vibrant) 0%, transparent 70%)',
            transform: 'translate(30%, -30%)',
          }}
          aria-hidden="true"
        />
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          VISUAL GALLERY STRIP - Dark Section with Torn Edge
          ═══════════════════════════════════════════════════════════════ */}
      <section className="bg-dark torn-edge-top py-16 md:py-20 relative">
        <div className="container mx-auto relative z-10">
          {/* Section Label */}
          <div className="mb-12">
            <h2 className="font-mono text-tiny text-gray-400 tracking-widest text-center">
              AUSTIN ARTISTS
            </h2>
          </div>

          {/* Visual Strip */}
          <VisualTeaserStrip images={featuredImages} />
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          FEATURED ARTISTS GRID - Light Section with Torn Edge
          ═══════════════════════════════════════════════════════════════ */}
      <section className="bg-light torn-edge-top py-16 md:py-24">
        <div className="container mx-auto">
          <FeaturedArtistsGrid artists={featuredArtists} city="Austin" />
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          HOW IT WORKS - Gold Accent Section
          ═══════════════════════════════════════════════════════════════ */}
      <section className="bg-accent torn-edge-top py-16 md:py-24 relative grain-overlay">
        <div className="container mx-auto relative z-10">
          <div className="max-w-4xl mx-auto">
            {/* Section Header */}
            <h2 className="font-heading text-h1 text-center mb-16">
              How It Works
            </h2>

            {/* Steps Grid */}
            <div className="grid md:grid-cols-3 gap-12 md:gap-8">
              {/* Step 1 */}
              <div className="text-center stagger-children">
                <div className="font-display text-[6rem] leading-none text-gold-deep mb-6 opacity-40">
                  01
                </div>
                <h3 className="font-heading text-h3 mb-4">Upload or Describe</h3>
                <p className="font-body text-gray-700 leading-relaxed">
                  Share a reference image or describe your tattoo style in your own words
                </p>
              </div>

              {/* Step 2 */}
              <div className="text-center stagger-children" style={{ animationDelay: '100ms' }}>
                <div className="font-display text-[6rem] leading-none text-gold-deep mb-6 opacity-40">
                  02
                </div>
                <h3 className="font-heading text-h3 mb-4">AI Matches</h3>
                <p className="font-body text-gray-700 leading-relaxed">
                  Our AI analyzes visual style and finds artists whose work matches your aesthetic
                </p>
              </div>

              {/* Step 3 */}
              <div className="text-center stagger-children" style={{ animationDelay: '200ms' }}>
                <div className="font-display text-[6rem] leading-none text-gold-deep mb-6 opacity-40">
                  03
                </div>
                <h3 className="font-heading text-h3 mb-4">Connect & Book</h3>
                <p className="font-body text-gray-700 leading-relaxed">
                  Browse portfolios, visit their Instagram, and reach out to book your appointment
                </p>
              </div>
            </div>

            {/* CTA */}
            <div className="text-center mt-16">
              <a href="#search" className="btn btn-primary scale-hover">
                Start Searching
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          FOOTER CTA - Dark Section
          ═══════════════════════════════════════════════════════════════ */}
      <section className="bg-dark torn-edge-top py-20 md:py-32 text-center">
        <div className="container mx-auto">
          <div className="max-w-3xl mx-auto">
            <h2 className="font-display text-display text-white-pure mb-8 leading-none">
              YOUR NEXT
              <br />
              <span className="text-gradient-gold">TATTOO AWAITS</span>
            </h2>
            <p className="font-body text-xl text-gray-300 mb-12 leading-relaxed">
              Join hundreds of Austin locals who found their perfect artist through visual search
            </p>
            <a href="#search" className="btn btn-primary scale-hover gold-glow-hover">
              Find Your Artist
            </a>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-20 pt-12 border-t border-gray-800">
          <div className="font-mono text-tiny text-gray-500 space-y-2">
            <p>AUSTIN, TEXAS</p>
            <p className="text-gray-600">Powered by AI Visual Search</p>
          </div>
        </div>
      </section>
    </main>
  )
}
