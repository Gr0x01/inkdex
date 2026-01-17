import Link from 'next/link'
import ProArtistCardMock from './ProArtistCardMock'
import { PRICING } from '@/lib/pricing/config'

const PRO_BENEFITS = [
  {
    title: 'Priority search ranking',
    description: 'Appear higher when clients search your style',
  },
  {
    title: 'Auto Instagram sync',
    description: 'New posts go live on Inkdex automatically',
  },
  {
    title: '100 portfolio images',
    description: '5x more discoverable work than free',
  },
  {
    title: 'Multi-city presence',
    description: 'Guest spots? Show up in 20 locations',
  },
  {
    title: 'Auto style tagging',
    description: 'Appear in the right style searches',
  },
  {
    title: 'Analytics dashboard',
    description: 'See which work drives the most views',
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

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-12 items-center">
          {/* Left Column: Text Content */}
          <div className="max-w-xl lg:max-w-lg">
            {/* Section Label */}
            <p className="font-mono text-xs font-semibold text-purple-600 tracking-[0.3em] uppercase mb-4">
              Pro Features
            </p>

            {/* Headline */}
            <h2
              className="font-display leading-[1.1] tracking-tight mb-4"
              style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)' }}
            >
              More Visibility.
              <br />
              <span className="text-gray-400">More Bookings.</span>
            </h2>

            {/* Description */}
            <p className="font-body text-base text-gray-600 leading-relaxed mb-6">
              Pro artists rank higher when clients search. Your newest Instagram posts sync automatically. Less maintenance, more&nbsp;appointments.
            </p>

            {/* Benefits Grid - 1 column on mobile, 2 on tablet+ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 mb-6">
              {PRO_BENEFITS.map((benefit, index) => (
                <div key={index} className="flex items-start gap-2">
                  {/* Checkmark */}
                  <div className="shrink-0 w-4 h-4 rounded-full bg-purple-100 flex items-center justify-center mt-0.5">
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
                href="/pricing"
                className="btn bg-purple-600 text-white border-2 border-transparent hover:bg-purple-700 hover:scale-105"
              >
                Upgrade to Pro
              </Link>
              <div className="flex items-baseline gap-1">
                <span className="font-display text-2xl font-bold text-ink">${PRICING.monthly.amount}</span>
                <span className="font-mono text-sm text-gray-500">/{PRICING.monthly.interval}</span>
              </div>
            </div>
          </div>

          {/* Right Column: Visual - Desktop only */}
          <div className="relative lg:pl-8 hidden lg:block">
            <ProArtistCardMock />
          </div>
        </div>
      </div>

    </section>
  )
}
