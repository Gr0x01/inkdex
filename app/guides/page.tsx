import type { Metadata } from 'next'
import Link from 'next/link'
import { getAllCityGuides } from '@/lib/content/editorial/guides'
import { getAllStyleGuides } from '@/lib/content/editorial/style-guides'
import { getAllTopicalGuides } from '@/lib/content/editorial/topical-guides'
import { STATES } from '@/lib/constants/cities'
import { TOPICAL_CATEGORIES } from '@/lib/content/editorial/topical-guides-types'
import { serializeJsonLd } from '@/lib/utils/seo'

export const metadata: Metadata = {
  title: 'Tattoo Guides | Inkdex',
  description:
    'Comprehensive tattoo guides covering city scenes, style deep-dives, and everything you need to know about getting inked. Expert advice from Inkdex.',
  openGraph: {
    title: 'Tattoo Guides | Inkdex',
    description:
      'Comprehensive tattoo guides covering city scenes, style deep-dives, and everything you need to know about getting inked.',
    type: 'website',
    siteName: 'Inkdex',
  },
  alternates: {
    canonical: 'https://inkdex.io/guides',
  },
}

export default function GuidesIndexPage() {
  const cityGuides = getAllCityGuides()
  const styleGuides = getAllStyleGuides()
  const topicalGuides = getAllTopicalGuides()

  // Get featured city guides (first 6)
  const featuredCityGuides = cityGuides.slice(0, 6)

  // Group remaining city guides by state for the full list
  const guidesByState = cityGuides.reduce(
    (acc, guide) => {
      const state = STATES.find(
        (s) => s.slug === guide.stateSlug || s.code.toLowerCase() === guide.stateSlug
      )
      const stateName = state?.name || guide.stateSlug
      if (!acc[stateName]) {
        acc[stateName] = []
      }
      acc[stateName].push(guide)
      return acc
    },
    {} as Record<string, typeof cityGuides>
  )

  // Sort states alphabetically
  const sortedStates = Object.keys(guidesByState).sort()

  // Get featured topical guides (one from each category)
  const featuredTopicalGuides = TOPICAL_CATEGORIES.map((cat) =>
    topicalGuides.find((g) => g.category === cat.slug)
  ).filter(Boolean).slice(0, 4)

  // CollectionPage schema
  const collectionSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Tattoo Guides',
    description:
      'Comprehensive tattoo guides covering city scenes, style deep-dives, and everything you need to know about getting inked.',
    url: 'https://inkdex.io/guides',
    publisher: {
      '@type': 'Organization',
      name: 'Inkdex',
      url: 'https://inkdex.io',
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(collectionSchema) }}
      />

      <main className="min-h-screen bg-bg-primary">
        {/* Hero Section */}
        <header className="border-b border-border-subtle">
          <div className="max-w-4xl mx-auto px-4 py-16 md:py-24">
            <nav className="mb-8">
              <Link
                href="/"
                className="text-sm text-text-tertiary hover:text-text-primary transition-colors"
              >
                &larr; Back to Inkdex
              </Link>
            </nav>

            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-text-primary mb-6 tracking-tight">
              Tattoo Guides
            </h1>
            <p className="font-body text-lg md:text-xl text-text-secondary max-w-2xl leading-relaxed">
              Everything you need to know about tattoos. City scene guides, style
              deep-dives, and expert advice for getting inked.
            </p>
          </div>
        </header>

        {/* Guide Categories */}
        <section className="max-w-4xl mx-auto px-4 py-12 md:py-16">
          <div className="grid gap-6 md:grid-cols-3 mb-16">
            <Link
              href="/guides/learn"
              className="group block p-6 bg-bg-secondary border-2 border-border-subtle hover:border-ink-black hover:-translate-y-1 hover:shadow-md transition-all duration-200"
            >
              <h2 className="font-display text-xl font-bold text-text-primary mb-2 group-hover:text-ink-black transition-colors">
                Getting Started
              </h2>
              <p className="font-body text-sm text-text-secondary mb-4">
                First-timer guides, aftercare tips, and everything you need to know.
              </p>
              <span className="font-mono text-xs uppercase tracking-wider text-text-tertiary">
                {topicalGuides.length} guides
              </span>
            </Link>

            <Link
              href="/guides/styles"
              className="group block p-6 bg-bg-secondary border-2 border-border-subtle hover:border-ink-black hover:-translate-y-1 hover:shadow-md transition-all duration-200"
            >
              <h2 className="font-display text-xl font-bold text-text-primary mb-2 group-hover:text-ink-black transition-colors">
                Style Guides
              </h2>
              <p className="font-body text-sm text-text-secondary mb-4">
                Deep dives into tattoo styles: history, techniques, and variations.
              </p>
              <span className="font-mono text-xs uppercase tracking-wider text-text-tertiary">
                {styleGuides.length} styles
              </span>
            </Link>

            <Link
              href="#cities"
              className="group block p-6 bg-bg-secondary border-2 border-border-subtle hover:border-ink-black hover:-translate-y-1 hover:shadow-md transition-all duration-200"
            >
              <h2 className="font-display text-xl font-bold text-text-primary mb-2 group-hover:text-ink-black transition-colors">
                City Guides
              </h2>
              <p className="font-body text-sm text-text-secondary mb-4">
                Explore tattoo culture in cities across America.
              </p>
              <span className="font-mono text-xs uppercase tracking-wider text-text-tertiary">
                {cityGuides.length} cities
              </span>
            </Link>
          </div>

          {/* Featured Topical Guides */}
          <div className="mb-16">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-2xl font-bold text-text-primary">
                Essential Guides
              </h2>
              <Link
                href="/guides/learn"
                className="font-mono text-xs uppercase tracking-wider text-text-tertiary hover:text-ink-black transition-colors"
              >
                View all &rarr;
              </Link>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {featuredTopicalGuides.map((guide) => guide && (
                <Link
                  key={guide.topicSlug}
                  href={`/guides/learn/${guide.topicSlug}`}
                  className="group block p-5 border-2 border-border-subtle hover:border-ink-black hover:-translate-y-0.5 transition-all duration-200"
                >
                  <h3 className="font-display text-lg font-semibold text-text-primary mb-1 group-hover:text-ink-black transition-colors">
                    {guide.title}
                  </h3>
                  <p className="font-body text-sm text-text-secondary line-clamp-1">
                    {guide.metaDescription}
                  </p>
                </Link>
              ))}
            </div>
          </div>

          {/* Style Guides Preview */}
          <div className="mb-16">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-2xl font-bold text-text-primary">
                Tattoo Styles
              </h2>
              <Link
                href="/guides/styles"
                className="font-mono text-xs uppercase tracking-wider text-text-tertiary hover:text-ink-black transition-colors"
              >
                View all &rarr;
              </Link>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {styleGuides.slice(0, 6).map((guide) => (
                <Link
                  key={guide.styleSlug}
                  href={`/guides/styles/${guide.styleSlug}`}
                  className="group block p-5 border-2 border-border-subtle hover:border-ink-black hover:-translate-y-0.5 transition-all duration-200"
                >
                  <h3 className="font-display text-lg font-semibold text-text-primary mb-1 group-hover:text-ink-black transition-colors">
                    {guide.displayName}
                  </h3>
                  <div className="flex flex-wrap gap-1">
                    {guide.variations.slice(0, 2).map((v) => (
                      <span
                        key={v.slug}
                        className="font-mono text-xs text-text-tertiary"
                      >
                        {v.name}
                      </span>
                    ))}
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* City Guides */}
          <div id="cities" className="scroll-mt-24">
            <h2 className="font-display text-2xl font-bold text-text-primary mb-6">
              City Guides
            </h2>

            {cityGuides.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-text-secondary text-lg">
                  Guides coming soon. Check back for in-depth city coverage.
                </p>
              </div>
            ) : (
              <div className="space-y-12">
                {sortedStates.map((stateName) => (
                  <div key={stateName}>
                    <h3 className="font-display text-lg font-semibold text-text-primary mb-4 pb-2 border-b border-border-subtle">
                      {stateName}
                    </h3>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {guidesByState[stateName].map((guide) => (
                        <Link
                          key={guide.citySlug}
                          href={`/guides/${guide.citySlug}`}
                          className="group block p-4 border-2 border-border-subtle hover:border-ink-black hover:-translate-y-0.5 transition-all duration-200"
                        >
                          <h4 className="font-display text-base font-semibold text-text-primary group-hover:text-ink-black transition-colors">
                            {guide.title.replace(': A Complete Guide', '')}
                          </h4>
                          <span className="font-mono text-xs text-text-tertiary">
                            {guide.neighborhoods.length} neighborhoods
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* CTA Section */}
        <section className="border-t border-border-subtle bg-bg-secondary">
          <div className="max-w-4xl mx-auto px-4 py-12 text-center">
            <h2 className="font-display text-2xl font-bold text-text-primary mb-4">
              Ready to find your artist?
            </h2>
            <p className="font-body text-text-secondary mb-6">
              Search by style, location, or browse portfolios to find your perfect match.
            </p>
            <Link
              href="/search"
              className="inline-flex items-center justify-center px-6 py-3 bg-ink-black text-paper-white font-mono text-xs uppercase tracking-[0.15em] border-2 border-ink-black hover:-translate-y-0.5 hover:shadow-md transition-all"
            >
              Search Artists
            </Link>
          </div>
        </section>
      </main>
    </>
  )
}
