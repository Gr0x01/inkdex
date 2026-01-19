import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Get 3 Months Pro Free | Inkdex',
  description: 'Mention Inkdex, get 3 months of Pro free. Auto-sync portfolio, analytics, priority placement.',
  openGraph: {
    title: 'Get 3 Months Pro Free | Inkdex',
    description: 'Mention Inkdex, get 3 months of Pro free. Auto-sync portfolio, analytics, priority placement.',
    type: 'website',
    siteName: 'Inkdex',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Get 3 Months Pro Free | Inkdex',
    description: 'Mention Inkdex, get 3 months of Pro free. Auto-sync portfolio, analytics, priority placement.',
  },
  alternates: {
    canonical: 'https://inkdex.io/for-artists/ambassadors',
  },
}

export default function AmbassadorsPage() {
  return (
    <main className="min-h-screen bg-paper">
      {/* Hero - Punchy, minimal */}
      <header className="border-b-2 border-ink">
        <div className="max-w-5xl mx-auto px-4 py-16 md:py-24">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-gray-500 mb-4">
            For Artists
          </p>
          <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-black text-ink mb-6 tracking-tight leading-[0.9]">
            Mention us.<br />
            <span className="text-gray-400">Get Pro free.</span>
          </h1>
          <p className="font-body text-xl text-gray-600 max-w-xl">
            3 months of Pro for a single post. No follower minimum.
          </p>
        </div>
      </header>

      {/* The Deal - Visual cards */}
      <section className="border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-16 md:py-20">
          <div className="grid md:grid-cols-2 gap-0">
            {/* You Give */}
            <div className="p-8 md:p-12 border-2 border-ink bg-white">
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-gray-400 mb-6">
                You Give
              </p>
              <p className="font-display text-3xl md:text-4xl font-black text-ink leading-tight mb-4">
                One mention
              </p>
              <p className="font-body text-gray-600">
                Story, Reel, or feed post. Tag @inkdexio however feels natural.
              </p>
            </div>

            {/* You Get */}
            <div className="p-8 md:p-12 border-2 border-ink bg-ink text-paper -mt-[2px] md:mt-0 md:-ml-[2px]">
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-gray-400 mb-6">
                You Get
              </p>
              <p className="font-display text-3xl md:text-4xl font-black leading-tight mb-4">
                3 months Pro
              </p>
              <p className="font-body text-gray-300">
                $45 value. Renew up to 4× per year.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* What's in Pro - 2 column grid */}
      <section className="border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-16 md:py-20">
          <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-gray-500 mb-10">
            What You Get
          </h2>

          <div className="grid md:grid-cols-2 gap-x-16 gap-y-8">
            {/* Portfolio */}
            <div className="space-y-4">
              <h3 className="font-display text-xl font-bold text-ink">Portfolio</h3>
              <ul className="space-y-2">
                <li className="flex items-start gap-3">
                  <span className="text-ink font-bold">✓</span>
                  <span className="font-body text-gray-700">100 images <span className="text-gray-400">(vs 20 free)</span></span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-ink font-bold">✓</span>
                  <span className="font-body text-gray-700">Auto-sync from Instagram</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-ink font-bold">✓</span>
                  <span className="font-body text-gray-700">Pin 6 images to top</span>
                </li>
              </ul>
            </div>

            {/* Discovery */}
            <div className="space-y-4">
              <h3 className="font-display text-xl font-bold text-ink">Discovery</h3>
              <ul className="space-y-2">
                <li className="flex items-start gap-3">
                  <span className="text-ink font-bold">✓</span>
                  <span className="font-body text-gray-700">Priority search placement</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-ink font-bold">✓</span>
                  <span className="font-body text-gray-700">Auto style tagging</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-ink font-bold">✓</span>
                  <span className="font-body text-gray-700">Up to 20 locations</span>
                </li>
              </ul>
            </div>

            {/* Profile */}
            <div className="space-y-4">
              <h3 className="font-display text-xl font-bold text-ink">Profile</h3>
              <ul className="space-y-2">
                <li className="flex items-start gap-3">
                  <span className="text-ink font-bold">✓</span>
                  <span className="font-body text-gray-700">Pro badge</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-ink font-bold">✓</span>
                  <span className="font-body text-gray-700">Analytics dashboard</span>
                </li>
              </ul>
            </div>

            {/* No commitment */}
            <div className="space-y-4">
              <h3 className="font-display text-xl font-bold text-ink">No Strings</h3>
              <ul className="space-y-2">
                <li className="flex items-start gap-3">
                  <span className="text-ink font-bold">✓</span>
                  <span className="font-body text-gray-700">No credit card required</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-ink font-bold">✓</span>
                  <span className="font-body text-gray-700">Expires automatically</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works - Horizontal steps */}
      <section className="border-b border-gray-200 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 py-16 md:py-20">
          <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-gray-500 mb-10">
            How It Works
          </h2>

          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="w-10 h-10 border-2 border-ink flex items-center justify-center font-mono text-sm font-bold mb-4">
                1
              </div>
              <p className="font-display text-lg font-bold text-ink mb-2">Claim profile</p>
              <p className="font-body text-sm text-gray-600">
                <Link href="/add-artist" className="underline hover:no-underline">Connect Instagram</Link>
              </p>
            </div>

            <div>
              <div className="w-10 h-10 border-2 border-ink flex items-center justify-center font-mono text-sm font-bold mb-4">
                2
              </div>
              <p className="font-display text-lg font-bold text-ink mb-2">Follow us</p>
              <p className="font-body text-sm text-gray-600">
                <a href="https://instagram.com/inkdexio" target="_blank" rel="noopener noreferrer" className="underline hover:no-underline">@inkdexio</a>
              </p>
            </div>

            <div>
              <div className="w-10 h-10 border-2 border-ink flex items-center justify-center font-mono text-sm font-bold mb-4">
                3
              </div>
              <p className="font-display text-lg font-bold text-ink mb-2">Post mention</p>
              <p className="font-body text-sm text-gray-600">
                Tag us in any format
              </p>
            </div>

            <div>
              <div className="w-10 h-10 border-2 border-ink bg-ink text-paper flex items-center justify-center font-mono text-sm font-bold mb-4">
                4
              </div>
              <p className="font-display text-lg font-bold text-ink mb-2">DM the link</p>
              <p className="font-body text-sm text-gray-600">
                We upgrade you in 24h
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Post Examples - Card style */}
      <section className="border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-16 md:py-20">
          <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-gray-500 mb-10">
            Example Posts
          </h2>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="p-6 border border-gray-200 bg-white">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 mb-4" />
              <p className="font-body text-gray-700 text-sm leading-relaxed">
                &quot;Just claimed my profile on @inkdexio—it auto-syncs my portfolio from Instagram. Pretty cool for getting discovered.&quot;
              </p>
            </div>

            <div className="p-6 border border-gray-200 bg-white">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-red-500 mb-4" />
              <p className="font-body text-gray-700 text-sm leading-relaxed">
                &quot;Testing out @inkdexio for booking visibility. If you&apos;re looking for me, I&apos;m on there.&quot;
              </p>
            </div>

            <div className="p-6 border border-gray-200 bg-white">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-teal-500 mb-4" />
              <p className="font-body text-gray-700 text-sm leading-relaxed">
                &quot;New platform for finding tattoo artists by style. Search for fineline, blackwork, whatever. I&apos;m on it → @inkdexio&quot;
              </p>
            </div>
          </div>

          <p className="font-body text-sm text-gray-500 mt-6">
            No script required. Say it however feels natural.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-ink text-paper">
        <div className="max-w-5xl mx-auto px-4 py-16 md:py-20">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
            <div>
              <h2 className="font-display text-2xl md:text-3xl font-black mb-2">
                Ready?
              </h2>
              <p className="font-body text-gray-400">
                Claim your profile. Mention us. Get 3 months Pro.
              </p>
            </div>

            <div className="flex flex-wrap gap-4">
              <Link
                href="/add-artist"
                className="inline-flex items-center gap-2 px-6 py-3 bg-paper text-ink font-mono text-xs uppercase tracking-[0.15em] border-2 border-paper hover:bg-transparent hover:text-paper transition-all"
              >
                Claim Profile
                <span aria-hidden="true">→</span>
              </Link>
              <a
                href="https://instagram.com/inkdexio"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-6 py-3 font-mono text-xs uppercase tracking-[0.15em] text-gray-400 border-2 border-gray-600 hover:border-paper hover:text-paper transition-all"
              >
                @inkdexio
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ - Compact */}
      <section>
        <div className="max-w-5xl mx-auto px-4 py-16 md:py-20">
          <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-gray-500 mb-10">
            Questions
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <p className="font-display text-lg font-bold text-ink mb-2">
                Follower minimum?
              </p>
              <p className="font-body text-sm text-gray-600">
                None. Active tattoo account = you qualify.
              </p>
            </div>

            <div>
              <p className="font-display text-lg font-bold text-ink mb-2">
                Can I renew?
              </p>
              <p className="font-body text-sm text-gray-600">
                Yes. 1 post = 3 months. Up to 4× per year.
              </p>
            </div>

            <div>
              <p className="font-display text-lg font-bold text-ink mb-2">
                What if I don&apos;t like it?
              </p>
              <p className="font-body text-sm text-gray-600">
                It expires. No card, no commitment.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
