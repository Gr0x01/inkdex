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
          HERO SECTION - Dark Cinematic Video Background
          ═══════════════════════════════════════════════════════════════ */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden py-20 md:py-24">
        {/* Video Background Layer - Full Opacity */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
          aria-hidden="true"
        >
          <source src="/videos/hero-tattoo.mp4" type="video/mp4" />
        </video>

        {/* Dark Gradient Vignette Overlay - Creates Depth & Ensures Readability */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `
              radial-gradient(ellipse at center, rgba(15, 15, 15, 0.5) 0%, rgba(15, 15, 15, 0.7) 40%, rgba(15, 15, 15, 0.9) 100%),
              linear-gradient(to bottom, rgba(15, 15, 15, 0.4) 0%, rgba(15, 15, 15, 0.7) 100%)
            `
          }}
        />

        {/* Grain Texture for Editorial Feel */}
        <div className="absolute inset-0 grain-overlay pointer-events-none" />

        {/* Content Layer */}
        <div className="container mx-auto px-4 relative z-20">
          <div className="max-w-4xl mx-auto text-center">
            {/* Oversized Editorial Headline - Bright White */}
            <div className="mb-6 md:mb-8 stagger-children">
              <h1
                className="font-display leading-none mb-3 md:mb-4 drop-shadow-2xl"
                style={{
                  fontSize: 'clamp(2.5rem, 12vw, 7rem)',
                  color: '#FFFFFF',
                  textShadow: '0 4px 20px rgba(0, 0, 0, 0.8), 0 2px 10px rgba(0, 0, 0, 0.9)'
                }}
              >
                FIND YOUR
                <br />
                ARTIST
              </h1>
              <p className="font-mono text-tiny md:text-small tracking-[0.2em] uppercase drop-shadow-lg" style={{ color: '#FFFFFF', textShadow: '0 2px 8px rgba(0, 0, 0, 0.8)' }}>
                BY VIBE, NOT VOCABULARY
              </p>
            </div>

            {/* Subheading - Bright White */}
            <p className="font-body text-base md:text-xl lg:text-2xl mb-8 md:mb-10 px-4 leading-relaxed animate-fade-up drop-shadow-lg" style={{ animationDelay: '200ms', color: '#FFFFFF', textShadow: '0 2px 12px rgba(0, 0, 0, 0.9)' }}>
              Upload an image or describe your style. We'll match you with artists whose work fits your aesthetic.
            </p>

            {/* Unified Search Bar - White Card Floats on Dark */}
            <div className="animate-fade-up" style={{ animationDelay: '400ms' }}>
              <UnifiedSearchBar />
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          VISUAL GALLERY STRIP - Light Section (Inverted Rhythm)
          ═══════════════════════════════════════════════════════════════ */}
      <section className="bg-light py-16 md:py-20 relative">
        <div className="container mx-auto relative z-10">
          {/* Section Label */}
          <div className="mb-12">
            <h2 className="font-mono text-tiny text-gray-600 tracking-widest text-center">
              FEATURED ARTISTS
            </h2>
          </div>

          {/* Visual Strip */}
          <VisualTeaserStrip images={featuredImages} />
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          FEATURED ARTISTS GRID - Dark Section with Torn Edge
          ═══════════════════════════════════════════════════════════════ */}
      <section className="bg-dark torn-edge-top py-16 md:py-24">
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
                <h3 className="font-heading text-h3 mb-4">Visual Matching</h3>
                <p className="font-body text-gray-700 leading-relaxed">
                  We analyze visual style and find artists whose work matches your aesthetic
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
              Join hundreds who found their perfect artist through visual search
            </p>
            <a href="#search" className="btn btn-primary scale-hover gold-glow-hover">
              Find Your Artist
            </a>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-20 pt-12 border-t border-gray-800">
          <div className="font-mono text-tiny text-gray-500">
            <p className="text-gray-600">Visual Search Platform</p>
          </div>
        </div>
      </section>
    </main>
  )
}
