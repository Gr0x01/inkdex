import Image from 'next/image'

// Common style tags that users don't understand
const STYLE_TAGS = [
  { name: 'Neo-Traditional', showOnMobile: true },
  { name: 'Blackwork', showOnMobile: true },
  { name: 'Fine Line', showOnMobile: true },
  { name: 'Ignorant', showOnMobile: true },
  { name: 'Trash Polka', showOnMobile: true },
  { name: 'Chicano', showOnMobile: true },
  { name: 'Irezumi', showOnMobile: false },
  { name: 'Dotwork', showOnMobile: false },
]

/**
 * Mock artist card matching the ArtistCard design
 * Static display for the promo section
 */
function MockSearchCard() {
  return (
    <div className="bg-paper border-2 border-ink/20 overflow-hidden">
      {/* Hero Image */}
      <div className="relative aspect-square overflow-hidden bg-gray-100">
        <Image
          src="/images/promo-artist.jpg"
          alt="Example tattoo portfolio"
          fill
          sizes="320px"
          className="object-cover"
        />
      </div>

      {/* Artist Info */}
      <div className="p-3 sm:p-4 space-y-1">
        <h3 className="font-heading text-base font-bold text-ink tracking-tight">
          @artist_handle
        </h3>
        <div className="flex items-center justify-between">
          <p className="font-mono text-xs font-medium text-gray-500 uppercase tracking-[0.15em]">
            Austin, TX
          </p>
          {/* Mobile-only match percentage */}
          <span className="font-mono text-xs font-semibold text-ink md:hidden">
            87%
          </span>
        </div>
      </div>
    </div>
  )
}

/**
 * Visual contrast section showing tags vs actual work
 * Positioned between Hero and StyleExplorer
 */
export default function VisualSearchPromo() {
  return (
    <section className="relative py-12 md:py-16 bg-paper overflow-hidden">
      <div className="container mx-auto px-4 md:px-8 relative z-10">
        <div className="max-w-4xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-8 md:mb-10">
            <p className="font-mono text-xs font-medium text-gray-400 tracking-[0.4em] uppercase mb-3">
              How We Search
            </p>
            <h2
              className="font-display leading-tight tracking-tight text-ink"
              style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)' }}
            >
              YOU KNOW IT WHEN YOU SEE IT.
              <br />
              <span className="text-gray-400">SO DO WE.</span>
            </h2>
          </div>

          {/* Visual Contrast Grid */}
          <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
            {/* Left: Tags (order-2 on mobile to appear below card) */}
            <div className="relative order-2 md:order-1">
              <div className="flex flex-wrap justify-center md:justify-start gap-2">
                {STYLE_TAGS.map((tag) => (
                  <span
                    key={tag.name}
                    className={`inline-block px-3 py-1.5 bg-gray-100 border border-gray-300 text-gray-500 font-mono text-xs tracking-wide ${
                      !tag.showOnMobile ? 'hidden md:inline-block' : ''
                    }`}
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
              <p className="font-body text-lg text-gray-500 mt-5 text-center md:text-left leading-relaxed max-w-sm">
                Traditional search relies on tags artists choose for themselves. Ours analyzes the actual artwork—so you find artists based on how their work looks, not what they call&nbsp;it.
              </p>
            </div>

            {/* Right: Artist search card with callouts (order-1 on mobile to appear above tags) */}
            <div className="relative flex justify-center order-1 md:order-2">
              <div className="relative w-[240px] md:w-[320px]">
                {/* Your Reference callout - floating top left */}
                <div className="absolute -left-16 -top-3 md:-left-20 z-10">
                  <div className="bg-white rounded-lg shadow-lg p-2 border border-gray-100">
                    <p className="font-mono text-[9px] text-gray-400 tracking-[0.2em] uppercase mb-1.5">
                      Your Reference
                    </p>
                    <div className="relative w-14 h-14 bg-gray-100 rounded overflow-hidden">
                      <Image
                        src="/images/promo-reference.jpg"
                        alt="Your reference image"
                        fill
                        sizes="56px"
                        className="object-cover"
                      />
                    </div>
                  </div>
                  {/* Arrow pointing to card */}
                  <div className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2">
                    <svg className="w-4 h-4 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M10 17l5-5-5-5v10z" />
                    </svg>
                  </div>
                </div>

                {/* Main card */}
                <MockSearchCard />

                {/* Match percentage callout - floating bottom right */}
                <div className="absolute -right-4 -bottom-3 md:-right-8 z-10">
                  <div className="bg-white rounded-lg shadow-lg px-3 py-2 border border-gray-100">
                    <p className="font-mono text-[9px] text-gray-400 tracking-[0.2em] uppercase">
                      Style Match
                    </p>
                    <p className="font-heading text-2xl font-bold text-ink leading-none">
                      87%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
