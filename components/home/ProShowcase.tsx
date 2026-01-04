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
      {/* Subtle top border */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent" />

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
              <span className="font-display text-3xl font-bold text-ink">$14.99</span>
              <span className="font-mono text-sm text-gray-500">/month</span>
            </div>

            {/* CTA Button */}
            <Link
              href="/add-artist"
              className="inline-flex items-center gap-2 bg-purple-600 text-white font-mono text-sm font-semibold uppercase tracking-[0.15em] px-6 py-3.5 hover:bg-purple-700 transition-colors duration-200"
            >
              <svg
                className="w-5 h-5"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073z" />
                <path d="M12 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8z" />
                <circle cx="18.406" cy="5.594" r="1.44" />
              </svg>
              Claim via Instagram
            </Link>
          </div>

          {/* Right Column: Visual */}
          <div className="relative lg:pl-8">
            <ProArtistCardMock />
          </div>
        </div>
      </div>

      {/* Subtle bottom border */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
    </section>
  )
}
