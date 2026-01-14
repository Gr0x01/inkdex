import Link from 'next/link'
import Image from 'next/image'

/**
 * Mock artist card component - reused for desktop and mobile peek
 */
function MockArtistCard({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-paper relative shadow-lg border border-gray-100 ${className}`}>
      {/* Subtle grain texture overlay */}
      <div className="grain-overlay absolute inset-0 pointer-events-none opacity-20" />

      <div className="relative px-6 pt-5 pb-6 space-y-3">
        {/* Profile Image - Portrait 3:4 */}
        <div className="relative w-full max-w-[200px] mx-auto">
          <div className="relative w-full aspect-3/4 border-2 border-ink overflow-hidden">
            <Image
              src="/images/example-artist.png"
              alt="Example artist profile"
              fill
              className="object-cover"
              sizes="200px"
            />
          </div>
          {/* Minimal corner accent */}
          <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-warm-gray" />
        </div>

        {/* Header: Name + Handle + Location */}
        <div className="space-y-0.5 text-center">
          <p className="font-body text-sm font-light text-gray-900 leading-tight">
            Your Name
          </p>
          <h4 className="font-heading text-xl font-black tracking-tight leading-none text-ink mb-2">
            @your_handle
          </h4>
          <p className="font-body text-base font-normal text-gray-600">
            Austin, TX
          </p>
        </div>

        {/* Stats */}
        <div className="pt-1">
          <div className="flex items-center justify-center gap-2.5 text-xs">
            <div>
              <span className="font-heading font-black text-ink">12.5K</span>
              <span className="font-mono font-normal text-gray-500 ml-1 text-xs uppercase tracking-wide">
                followers
              </span>
            </div>
            <span className="text-gray-300 font-light">•</span>
            <div>
              <span className="font-heading font-black text-ink">20</span>
              <span className="font-mono font-normal text-gray-500 ml-1 text-xs uppercase tracking-wide">
                pieces
              </span>
            </div>
          </div>
        </div>

        {/* CTAs - Instagram gradient style */}
        <div className="pt-2 space-y-1.5">
          <div
            className="relative overflow-hidden"
            style={{
              background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
              padding: '2px'
            }}
          >
            <div className="relative bg-linear-to-r from-[#f09433] via-[#dc2743] to-[#bc1888]">
              <div className="block w-full py-2.5 text-paper text-center font-mono text-xs tracking-widest uppercase font-semibold">
                Instagram →
              </div>
            </div>
          </div>
          <div className="block py-2.5 bg-transparent text-ink text-center font-mono text-xs font-semibold tracking-wider uppercase border-2 border-ink">
            Book
          </div>
        </div>
      </div>
    </div>
  )
}

const FREE_BENEFITS = [
  {
    title: 'Own your presence',
    description: 'Control how you appear in searches',
  },
  {
    title: 'Add a booking link',
    description: 'Point clients directly to your system',
  },
  {
    title: 'Showcase 20 images',
    description: 'Curate your best portfolio pieces',
  },
]

/**
 * Free tier claiming section - encourages artists to claim their profile
 * Positioned above ProShowcase to create a natural conversion funnel
 * Visual mirrors ArtistInfoColumn from artist portfolio pages
 */
export default function FreeClaimShowcase() {
  return (
    <section className="relative py-12 md:py-16 bg-paper overflow-hidden">
      {/* Background accent - orange glow behind artist card */}
      <div
        className="absolute top-0 left-0 w-1/2 h-full opacity-[0.08] pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 30% 50%, #f09433 0%, transparent 50%)'
        }}
      />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-6 lg:gap-12 items-center">
          {/* Left Column: ArtistInfoColumn-style Visual - Hidden on mobile */}
          <div className="relative order-2 lg:order-1 hidden lg:block">
            <div className="relative w-full max-w-sm mx-auto">
              <MockArtistCard />
            </div>
          </div>

          {/* Right Column: Text Content */}
          <div className="max-w-xl lg:max-w-lg order-1 lg:order-2 relative z-10">
            {/* Section Label */}
            <p className="font-mono text-xs font-semibold text-blue-600 tracking-[0.3em] uppercase mb-4">
              For Artists
            </p>

            {/* Headline */}
            <h2
              className="font-display leading-[1.1] tracking-tight mb-4"
              style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)' }}
            >
              You're Already on Inkdex.
              <br />
              <span className="text-gray-400">Claim Your Profile.</span>
            </h2>

            {/* Description */}
            <p className="font-body text-base text-gray-600 leading-relaxed mb-6">
              Clients are discovering you through our search—claim your free profile to control your&nbsp;presence
            </p>

            {/* Benefits List */}
            <ul className="space-y-3 mb-6">
              {FREE_BENEFITS.map((benefit, index) => (
                <li key={index} className="flex items-start gap-3">
                  {/* Checkmark */}
                  <div className="shrink-0 w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center mt-0.5">
                    <svg
                      className="w-3 h-3 text-blue-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-1">
                    <span className="font-mono text-sm font-semibold text-ink">
                      {benefit.title}
                    </span>
                    <span className="font-body text-sm text-gray-500">
                      <span className="hidden sm:inline">— </span>{benefit.description}
                    </span>
                  </div>
                </li>
              ))}
            </ul>

            {/* CTA Button */}
            <div>
              <Link
                href="/add-artist"
                className="btn text-white border-2 border-transparent hover:scale-105 hover:shadow-lg"
                style={{
                  background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)'
                }}
              >
                Claim Free Profile
              </Link>
            </div>
          </div>
        </div>
      </div>

    </section>
  )
}
