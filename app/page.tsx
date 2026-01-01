import UnifiedSearchBar from '@/components/home/UnifiedSearchBar'
import FeaturedArtistsByState from '@/components/home/FeaturedArtistsByState'
import { getFeaturedArtistsByStates } from '@/lib/supabase/queries'
import { STATES } from '@/lib/constants/cities'
import { serializeJsonLd } from '@/lib/utils/seo'
import { ModalWarmup } from '@/components/warmup/ModalWarmup'

// ISR: Revalidate homepage every hour (featured artists are stable)
export const revalidate = 3600 // 1 hour

export default async function Home() {
  // Fetch featured artists grouped by state (with fallback to empty object)
  let featuredArtistsByState: Record<string, any[]> = {}

  try {
    // Fetch 4 randomized featured artists per state (100k+ followers)
    featuredArtistsByState = await getFeaturedArtistsByStates(4)
  } catch (error) {
    console.error('Failed to fetch featured artists:', error)
  }

  // Organization schema for homepage
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Inkdex',
    description: 'Visual search platform for discovering tattoo artists. Find artists by uploading images or describing your style in natural language.',
    url: '/',
    logo: '/og-default.jpg', // TODO: Create actual logo file
    sameAs: [
      // TODO: Add social media profiles when available
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'Customer Service',
      availableLanguage: 'English',
    },
  }

  return (
    <>
      {/* Organization Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(organizationSchema) }}
      />

      {/* Pre-warm Modal container for fast first search */}
      <ModalWarmup />

      <main className="min-h-screen bg-ink overflow-x-hidden">
      {/* ═══════════════════════════════════════════════════════════════
          HERO SECTION - Dark Editorial with Video
          ═══════════════════════════════════════════════════════════════ */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        {/* Video Background Layer */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-30"
          aria-hidden="true"
        >
          <source src="/videos/hero-tattoo.mp4" type="video/mp4" />
        </video>

        {/* Dramatic Vignette - Pure Black Edges */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `
              radial-gradient(ellipse at center, rgba(0, 0, 0, 0.3) 0%, rgba(0, 0, 0, 0.6) 50%, rgba(0, 0, 0, 0.95) 100%)
            `
          }}
        />

        {/* Fine Grain Texture */}
        <div className="absolute inset-0 grain-overlay pointer-events-none opacity-40" />

        {/* Content Layer */}
        <div className="container mx-auto px-4 relative z-20 py-32 md:py-40">
          <div className="max-w-5xl mx-auto">
            {/* Editorial Headline - Massive Scale */}
            <div className="mb-12 md:mb-16 stagger-children">
              <h1
                className="font-display leading-[0.85] mb-6 md:mb-8 tracking-tight"
                style={{
                  fontSize: 'clamp(3.5rem, 14vw, 9rem)',
                  color: '#FFFFFF',
                  textShadow: '0 6px 30px rgba(0, 0, 0, 0.9), 0 3px 15px rgba(0, 0, 0, 0.95)'
                }}
              >
                FIND YOUR
                <br />
                ARTIST
              </h1>

              {/* Subheading - Refined Serif */}
              <p
                className="font-body-medium text-xl md:text-3xl leading-relaxed max-w-3xl animate-fade-up"
                style={{
                  animationDelay: '200ms',
                  color: 'rgba(255, 255, 255, 0.90)',
                  textShadow: '0 2px 20px rgba(0, 0, 0, 0.9)'
                }}
              >
                Upload an image or describe your style—we'll match you with artists whose work fits your aesthetic.
              </p>
            </div>

            {/* Search Bar - Glass Morphism Card */}
            <div className="animate-fade-up" style={{ animationDelay: '400ms' }}>
              <UnifiedSearchBar />
            </div>
          </div>
        </div>

        {/* Bottom Fade to Black */}
        <div
          className="absolute bottom-0 left-0 right-0 h-40 pointer-events-none"
          style={{
            background: 'linear-gradient(to bottom, transparent 0%, rgba(26, 26, 26, 1) 100%)'
          }}
        />
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          FEATURED ARTISTS BY STATE - Editorial Horizontal Sections
          ═══════════════════════════════════════════════════════════════ */}
      <section
        className="relative py-16 md:py-20 bg-paper"
      >
        {/* Subtle Top Border */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>

        <div className="container mx-auto px-4 space-y-12 md:space-y-16">
          {STATES.map((state) => (
            <FeaturedArtistsByState
              key={state.code}
              state={state}
              artists={featuredArtistsByState[state.code] || []}
            />
          ))}
        </div>

        {/* Subtle Bottom Border */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          FOOTER CTA - Dramatic Editorial Statement
          ═══════════════════════════════════════════════════════════════ */}
      <section className="bg-ink relative py-32 md:py-40 overflow-hidden">
        {/* Background Accent - Subtle Glow */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] pointer-events-none opacity-5"
          style={{
            background: 'radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%)'
          }}
        />

        <div className="container mx-auto relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            {/* Massive Display Typography */}
            <h2
              className="font-display leading-[0.9] mb-12"
              style={{
                fontSize: 'clamp(2.5rem, 10vw, 7rem)',
                color: '#FFFFFF'
              }}
            >
              YOUR NEXT
              <br />
              <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>TATTOO AWAITS</span>
            </h2>

            {/* Refined Body Text */}
            <p className="font-body text-xl md:text-2xl mb-16 leading-relaxed px-4" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              Join hundreds discovering their perfect artist through visual search
            </p>

            {/* Primary CTA */}
            <a href="#search" className="btn btn-primary scale-hover text-base px-12 py-5">
              Start Your Search
            </a>
          </div>
        </div>

        {/* Minimal Footer Info */}
        <div className="mt-32 pt-12 border-t border-gray-900">
          <div className="container mx-auto">
            <p className="font-mono text-tiny text-center tracking-[0.25em] uppercase" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>
              Visual Search Platform
            </p>
          </div>
        </div>
      </section>
      </main>
    </>
  )
}
