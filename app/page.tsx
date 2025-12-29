import SearchTabs from '@/components/search/SearchTabs'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-hero relative noise-overlay">
      {/* Hero Section */}
      <div className="container mx-auto px-4 md:px-8 py-12 md:py-24 relative z-10">
        <div className="max-w-5xl mx-auto">
          {/* Hero Content - Staggered Animation */}
          <div className="text-center mb-16 md:mb-20 stagger-fade-up">
            {/* Main Headline */}
            <h1 className="font-display text-4xl md:text-6xl lg:text-display font-[900] text-text-primary mb-6 leading-tight">
              Find Your Tattoo Artist
              <br />
              <span className="text-gradient-accent glow-accent">by Vibe</span>
            </h1>

            {/* Subtitle */}
            <p className="font-body text-base md:text-lg text-text-secondary mb-6 max-w-2xl mx-auto leading-relaxed">
              Upload an image or describe what you&apos;re looking for.
              <br className="hidden md:block" />
              We&apos;ll find artists whose style matches your vision.
            </p>

            {/* Trust Signal */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-surface-mid/50 border border-border-subtle rounded-full backdrop-blur-sm">
              <svg
                className="w-4 h-4 text-status-success"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="font-body text-tiny text-text-secondary uppercase tracking-wide">
                <strong className="text-text-primary font-medium">204 Artists</strong> in Austin, TX
              </span>
            </div>
          </div>

          {/* Search Interface */}
          <div className="max-w-3xl mx-auto mb-20 md:mb-32">
            <SearchTabs />
          </div>

          {/* How It Works Section */}
          <div className="max-w-4xl mx-auto">
            <h2 className="font-display text-h2 font-[800] text-text-primary text-center mb-12 md:mb-16">
              How It Works
            </h2>

            {/* Steps Grid */}
            <div className="grid md:grid-cols-3 gap-8 md:gap-12">
              {/* Step 1 */}
              <div className="text-center group">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-accent text-text-primary font-display text-xl font-[800] mb-6 shadow-glow-accent group-hover:shadow-glow-accent-strong transition-all duration-medium">
                  1
                </div>
                <h3 className="font-display text-h3 font-[700] text-text-primary mb-3">
                  Share Your Vision
                </h3>
                <p className="font-body text-small text-text-secondary leading-relaxed">
                  Upload a reference image or describe the vibe you&apos;re looking for in your own words
                </p>
              </div>

              {/* Step 2 */}
              <div className="text-center group">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-accent text-text-primary font-display text-xl font-[800] mb-6 shadow-glow-accent group-hover:shadow-glow-accent-strong transition-all duration-medium">
                  2
                </div>
                <h3 className="font-display text-h3 font-[700] text-text-primary mb-3">
                  AI Matches Artists
                </h3>
                <p className="font-body text-small text-text-secondary leading-relaxed">
                  Our AI analyzes thousands of portfolio images to find artists whose style matches your aesthetic
                </p>
              </div>

              {/* Step 3 */}
              <div className="text-center group">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-accent text-text-primary font-display text-xl font-[800] mb-6 shadow-glow-accent group-hover:shadow-glow-accent-strong transition-all duration-medium">
                  3
                </div>
                <h3 className="font-display text-h3 font-[700] text-text-primary mb-3">
                  Browse & Connect
                </h3>
                <p className="font-body text-small text-text-secondary leading-relaxed">
                  Explore matched artists&apos; portfolios and reach out directly via Instagram to book your session
                </p>
              </div>
            </div>
          </div>

          {/* Value Proposition Card */}
          <div className="max-w-2xl mx-auto mt-16 md:mt-24">
            <div className="relative overflow-hidden rounded-xl bg-surface-low border border-border-subtle p-8 md:p-10 shadow-lg">
              {/* Decorative gradient */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-accent opacity-10 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2" />

              <div className="relative z-10">
                <h3 className="font-display text-h2 font-[700] text-text-primary mb-4 text-center">
                  No tattoo terminology required
                </h3>
                <p className="font-body text-body text-text-secondary text-center leading-relaxed">
                  Don&apos;t know the difference between &ldquo;traditional&rdquo; and &ldquo;neo-traditional&rdquo;?
                  That&apos;s okay. Just show us what you like, and we&apos;ll find artists who can bring your vision to life.
                </p>
              </div>
            </div>
          </div>

          {/* Footer Spacer */}
          <div className="h-16 md:h-24" />
        </div>
      </div>

      {/* Background Decorative Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        {/* Top gradient orb */}
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-accent-primary opacity-5 rounded-full blur-3xl" />
        {/* Bottom gradient orb */}
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-accent-secondary opacity-5 rounded-full blur-3xl" />
      </div>
    </main>
  )
}
