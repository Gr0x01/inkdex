import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Log In | Inkdex',
  description: 'Sign in to Inkdex to manage your artist profile, portfolio, and connect with potential clients.',
}

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-paper">
      {/* Header */}
      <section className="relative">
        <div className="container mx-auto px-4 pt-8 md:pt-12 pb-6 md:pb-8">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="font-display text-ink tracking-tight leading-tight mb-3" style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)' }}>
              LOG IN
            </h1>
            <p className="font-body text-gray-600 text-base md:text-lg leading-relaxed">
              Connect your Instagram to manage your artist profile and portfolio.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="relative pt-0 pb-12 md:pb-16">
        <div className="container mx-auto px-4">
          <div className="max-w-md mx-auto">
            {/* Login Card */}
            <div className="border-2 border-ink/10 bg-paper p-4 md:p-6">
              {/* Instagram OAuth Button - matches add-artist page */}
              <div
                className="group relative transition-all duration-200 overflow-hidden"
                style={{
                  background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
                  padding: '2px'
                }}
              >
                <div className="relative bg-gradient-to-r from-[#f09433] via-[#dc2743] to-[#bc1888] group-hover:bg-none group-hover:bg-paper transition-all duration-200">
                  {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- API route requires full page redirect for OAuth */}
                  <a
                    href="/api/auth/instagram?redirect=/dashboard"
                    className="block w-full py-3 px-5 text-white text-center
                             font-mono text-xs tracking-[0.15em] uppercase font-semibold
                             focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
                  >
                    <span className="group-hover:bg-gradient-to-r group-hover:from-[#f09433] group-hover:via-[#dc2743] group-hover:to-[#bc1888] group-hover:bg-clip-text group-hover:text-transparent transition-all duration-200">
                      Connect with Instagram →
                    </span>
                  </a>
                </div>
              </div>

              {/* Requirements */}
              <div className="mt-4 pt-4 border-t border-ink/10">
                <p className="font-mono text-xs text-gray-400 tracking-widest uppercase mb-3">
                  Requirements
                </p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <div className="w-1 h-1 bg-ink mt-[0.5em] flex-shrink-0"></div>
                    <p className="font-body text-gray-600 text-sm leading-relaxed">
                      For <strong className="text-ink">tattoo artists</strong> only
                    </p>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1 h-1 bg-ink mt-[0.5em] flex-shrink-0"></div>
                    <p className="font-body text-gray-600 text-sm leading-relaxed">
                      Instagram <strong className="text-ink">Business</strong> or <strong className="text-ink">Creator</strong> account
                    </p>
                  </li>
                </ul>
              </div>

              {/* Help link */}
              <div className="mt-4 pt-4 border-t border-ink/10">
                <p className="font-body text-sm text-gray-500 text-center leading-relaxed">
                  Need help?{' '}
                  <a
                    href="https://help.instagram.com/502981923235522"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-ink underline hover:text-gray-700 transition-colors underline-offset-2"
                  >
                    Learn how to convert your account
                  </a>
                </p>
              </div>
            </div>

            {/* Back link */}
            <div className="mt-6 text-center">
              <Link
                href="/"
                className="font-body text-sm text-gray-500 hover:text-ink transition-colors"
              >
                ← Back to home
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
