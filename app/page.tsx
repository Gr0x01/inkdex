import UnifiedSearchBar from '@/components/home/UnifiedSearchBar'
import StyleExplorer from '@/components/home/StyleExplorer'
import VisualSearchPromo from '@/components/home/VisualSearchPromo'
import FreeClaimShowcase from '@/components/home/FreeClaimShowcase'
import ProShowcase from '@/components/home/ProShowcase'
import { getStyleSeeds } from '@/lib/supabase/queries'
import { serializeJsonLd } from '@/lib/utils/seo'
import { ModalWarmup } from '@/components/warmup/ModalWarmup'

// ISR: Revalidate homepage every hour (featured artists are stable)
export const revalidate = 3600 // 1 hour

export default async function Home() {
  // Fetch style seeds for the Style Explorer
  let styleSeeds: Awaited<ReturnType<typeof getStyleSeeds>> = []

  try {
    styleSeeds = await getStyleSeeds()
  } catch (error) {
    console.error('Failed to fetch homepage data:', error)
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

      <main className="bg-ink overflow-x-hidden">
      {/* ═══════════════════════════════════════════════════════════════
          HERO SECTION - Editorial Magazine Masthead
          ═══════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-ink">
        {/* Subtle Video Background Layer */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-20"
          aria-hidden="true"
        >
          <source src="/videos/hero-tattoo.mp4" type="video/mp4" />
        </video>

        {/* Refined Vignette */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at center, transparent 0%, rgba(0, 0, 0, 0.4) 70%, rgba(26, 26, 26, 0.9) 100%)`
          }}
        />

        {/* Fine Grain Texture */}
        <div className="absolute inset-0 grain-overlay pointer-events-none opacity-30" />

        {/* Content Layer */}
        <div className="container mx-auto px-4 relative z-20 pt-8 pb-12 md:pt-20 md:pb-24">
          <div className="max-w-4xl mx-auto text-center">
            {/* Editorial Headline - Refined Scale */}
            <div className="mb-6 md:mb-10">
              <h1
                className="font-display leading-[0.95] mb-4 md:mb-5 tracking-tight text-balance"
                style={{
                  fontSize: 'clamp(2.5rem, 8vw, 5rem)',
                  color: '#FFFFFF',
                  textShadow: '0 4px 20px rgba(0, 0, 0, 0.7)'
                }}
              >
                INSTAGRAM HAS YOUR ARTIST.
                <br />
                <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                  WE HELP YOU FIND&nbsp;THEM.
                </span>
              </h1>

              {/* Refined Subheading */}
              <p
                className="font-body text-base md:text-lg leading-relaxed max-w-2xl mx-auto animate-fade-up"
                style={{
                  animationDelay: '100ms',
                  color: 'rgba(255, 255, 255, 0.75)',
                  textShadow: '0 2px 12px rgba(0, 0, 0, 0.8)'
                }}
              >
                Upload a reference image or describe what you're looking for. We'll scan tattoo portfolios to find artists whose work match your style.
              </p>
            </div>

            {/* Search Bar */}
            <div className="animate-fade-up" style={{ animationDelay: '200ms' }}>
              <UnifiedSearchBar />
            </div>

            {/* Trust Strip - Credibility Stats */}
            <div
              className="mt-6 md:mt-8 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 animate-fade-up"
              style={{ animationDelay: '300ms' }}
            >
              <span
                className="font-mono text-sm uppercase tracking-[0.15em]"
                style={{ color: 'rgba(255, 255, 255, 0.6)' }}
              >
                15,600+ Artists
              </span>
              <span className="text-white/20 hidden sm:inline">•</span>
              <span
                className="font-mono text-sm uppercase tracking-[0.15em]"
                style={{ color: 'rgba(255, 255, 255, 0.6)' }}
              >
                116 Cities
              </span>
              <span className="text-white/20 hidden sm:inline">•</span>
              <span
                className="font-mono text-sm uppercase tracking-[0.15em]"
                style={{ color: 'rgba(255, 255, 255, 0.6)' }}
              >
                All 50 States + DC
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Fade Transition */}
        <div
          className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
          style={{
            background: 'linear-gradient(to bottom, transparent 0%, rgba(26, 26, 26, 1) 100%)'
          }}
        />
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          VISUAL SEARCH PROMO - Tags vs Actual Work
          ═══════════════════════════════════════════════════════════════ */}
      <VisualSearchPromo />

      {/* ═══════════════════════════════════════════════════════════════
          STYLE EXPLORER - Quick Search by Style
          ═══════════════════════════════════════════════════════════════ */}
      <StyleExplorer styles={styleSeeds} />

      {/* ═══════════════════════════════════════════════════════════════
          FREE CLAIM - Artists Claim Their Profile
          ═══════════════════════════════════════════════════════════════ */}
      <FreeClaimShowcase />

      {/* ═══════════════════════════════════════════════════════════════
          PRO SHOWCASE - Paid Features & Upgrade
          Hidden until Stripe integration (NEXT_PUBLIC_SHOW_PRO_SECTION=true)
          ═══════════════════════════════════════════════════════════════ */}
      {process.env.NEXT_PUBLIC_SHOW_PRO_SECTION === 'true' && <ProShowcase />}

      {/* ═══════════════════════════════════════════════════════════════
          FOOTER CTA - Dramatic Editorial Statement
          ═══════════════════════════════════════════════════════════════ */}
      <section className="bg-ink relative py-16 md:py-32 overflow-hidden">
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
              className="font-display leading-[0.9] mb-4 md:mb-6"
              style={{
                fontSize: 'clamp(2.5rem, 10vw, 7rem)',
                color: '#FFFFFF'
              }}
            >
              STOP SCROLLING
              <br />
              <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>HASHTAGS.</span>
            </h2>

            {/* Refined Body Text */}
            <p className="font-body text-base md:text-xl mb-6 md:mb-8 leading-relaxed px-4" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              Search Instagram's tattoo artists the way you actually think; by style or by the Pinterest board you've been&nbsp;building.
            </p>

            {/* Primary CTA */}
            <a
              href="#search"
              className="inline-block bg-white text-ink font-mono text-xs md:text-sm tracking-[0.15em] uppercase px-8 py-4 md:px-10 md:py-5 rounded-md hover:bg-gray-100 transition-all duration-300 whitespace-nowrap hover:scale-105"
              style={{ fontWeight: 500 }}
            >
              Start Your Search
            </a>
          </div>
        </div>
      </section>
      </main>
    </>
  )
}
