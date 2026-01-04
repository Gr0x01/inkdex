import Link from 'next/link'
import ProArtistCardMock from './ProArtistCardMock'

const PRO_BENEFITS = [
  {
    title: 'Auto-sync Instagram',
    description: 'Your portfolio updates daily, automatically',
  },
  {
    title: 'Pin your best work',
    description: 'Feature your strongest pieces at the top',
  },
  {
    title: 'Unlimited portfolio',
    description: '100 images vs 20 on free tier',
  },
  {
    title: 'Multi-location support',
    description: 'Show up in searches across up to 20 cities',
  },
  {
    title: 'Search ranking boost',
    description: 'Appear higher in relevant searches',
  },
  {
    title: 'Analytics dashboard',
    description: 'Track views, searches, and engagement',
  },
]

export default function ProShowcase() {
  return (
    <section className="relative py-16 md:py-24 bg-paper overflow-hidden">
      {/* Background accent */}
      <div
        className="absolute top-0 right-0 w-1/2 h-full opacity-[0.03] pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 70% 30%, #9333ea 0%, transparent 50%)'
        }}
      />

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left Column: Text Content */}
          <div className="max-w-lg">
            {/* Section Label */}
            <p className="font-mono text-xs font-semibold text-purple-600 tracking-[0.3em] uppercase mb-4">
              For Artists
            </p>

            {/* Headline */}
            <h2
              className="font-display leading-[1.1] tracking-tight mb-6"
              style={{ fontSize: 'clamp(2rem, 4vw, 3rem)' }}
            >
              Claim Your Profile.
              <br />
              <span className="text-gray-400">Get Discovered.</span>
            </h2>

            {/* Description */}
            <p className="font-body text-base md:text-lg text-gray-600 leading-relaxed mb-8">
              Verify your Instagram account to unlock Pro features and take control of how you appear in searches. Stand out from thousands of artists.
            </p>

            {/* Benefits List */}
            <ul className="space-y-4 mb-8">
              {PRO_BENEFITS.map((benefit, index) => (
                <li key={index} className="flex items-start gap-3">
                  {/* Checkmark */}
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center mt-0.5">
                    <svg
                      className="w-3 h-3 text-purple-600"
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
                  <div>
                    <span className="font-mono text-sm font-semibold text-ink">
                      {benefit.title}
                    </span>
                    <span className="font-body text-sm text-gray-500 ml-1">
                      — {benefit.description}
                    </span>
                  </div>
                </li>
              ))}
            </ul>

            {/* Pricing */}
            <div className="flex items-baseline gap-2 mb-6">
              <span className="font-display text-3xl font-bold text-ink">$15</span>
              <span className="font-mono text-sm text-gray-500">/month</span>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/add-artist"
                className="btn text-white border-2 border-transparent hover:scale-105 hover:shadow-lg"
                style={{
                  background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)'
                }}
              >
                Claim via Instagram
              </Link>
              <Link
                href="/add-artist"
                className="btn bg-transparent text-ink hover:bg-ink hover:text-paper"
                style={{ boxShadow: 'inset 0 0 0 2px var(--ink-black)' }}
              >
                Create Free Account
              </Link>
            </div>
          </div>

          {/* Right Column: Visual */}
          <div className="relative lg:pl-8">
            <ProArtistCardMock />
          </div>
        </div>
      </div>
    </section>
  )
}
