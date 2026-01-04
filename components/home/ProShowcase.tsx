import Link from 'next/link'
import ProArtistCardMock from './ProArtistCardMock'

const PRO_BENEFITS = [
  {
    title: 'Auto-sync Instagram',
    description: 'Portfolio updates daily, automatically',
  },
  {
    title: 'Auto style tagging',
    description: 'Get categorized in the right searches',
  },
  {
    title: 'Maxed portfolio',
    description: '100 images vs 20 on free',
  },
  {
    title: 'Priority search placement',
    description: 'Appear higher in results',
  },
  {
    title: 'Multi-location support',
    description: 'Show up in up to 20 cities',
  },
  {
    title: 'Analytics dashboard',
    description: 'Track views and engagement',
  },
]

export default function ProShowcase() {
  return (
    <section className="relative py-12 md:py-16 bg-paper overflow-hidden">
      {/* Background accent */}
      <div
        className="absolute top-0 right-0 w-1/2 h-full opacity-[0.05] pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 70% 30%, #9333ea 0%, transparent 50%)'
        }}
      />

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-12 items-center">
          {/* Left Column: Text Content */}
          <div className="max-w-lg">
            {/* Section Label */}
            <p className="font-mono text-xs font-semibold text-purple-600 tracking-[0.3em] uppercase mb-4">
              Pro Features
            </p>

            {/* Headline */}
            <h2
              className="font-display leading-[1.1] tracking-tight mb-4"
              style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)' }}
            >
              Turn Your Profile Into
              <br />
              <span className="text-gray-400">a Client Magnet.</span>
            </h2>

            {/* Description */}
            <p className="font-body text-base text-gray-600 leading-relaxed mb-6">
              Unlock tools that save time and help you book more appointments
            </p>

            {/* Benefits Grid - 2 columns */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 mb-6">
              {PRO_BENEFITS.map((benefit, index) => (
                <div key={index} className="flex items-start gap-2">
                  {/* Checkmark */}
                  <div className="flex-shrink-0 w-4 h-4 rounded-full bg-purple-100 flex items-center justify-center mt-0.5">
                    <svg
                      className="w-2.5 h-2.5 text-purple-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <div>
                    <span className="font-mono text-xs font-semibold text-ink block leading-tight">
                      {benefit.title}
                    </span>
                    <span className="font-body text-xs text-gray-500 leading-tight">
                      {benefit.description}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* CTA Buttons + Pricing */}
            <div className="flex flex-wrap items-center gap-4">
              <Link
                href="/add-artist"
                className="btn bg-purple-600 text-white border-2 border-transparent hover:bg-purple-700 hover:scale-105"
              >
                Upgrade to Pro
              </Link>
              <div className="flex items-baseline gap-1">
                <span className="font-display text-2xl font-bold text-ink">$15</span>
                <span className="font-mono text-sm text-gray-500">/month</span>
              </div>
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
