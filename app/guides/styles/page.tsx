import type { Metadata } from 'next'
import Link from 'next/link'
import { getAllStyleGuides } from '@/lib/content/editorial/style-guides'
import { serializeJsonLd } from '@/lib/utils/seo'

export const metadata: Metadata = {
  title: 'Tattoo Style Guides | Inkdex',
  description:
    'Comprehensive guides to tattoo styles. Learn about Traditional, Japanese, Blackwork, Realism, and more. History, techniques, and what to expect.',
  openGraph: {
    title: 'Tattoo Style Guides | Inkdex',
    description:
      'Comprehensive guides to tattoo styles. Learn about Traditional, Japanese, Blackwork, Realism, and more.',
    type: 'website',
    siteName: 'Inkdex',
  },
  alternates: {
    canonical: 'https://inkdex.io/guides/styles',
  },
}

export default function StyleGuidesIndexPage() {
  const guides = getAllStyleGuides()

  // CollectionPage schema
  const collectionSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Tattoo Style Guides',
    description:
      'Comprehensive guides to tattoo styles including history, techniques, and what to expect.',
    url: 'https://inkdex.io/guides/styles',
    publisher: {
      '@type': 'Organization',
      name: 'Inkdex',
      url: 'https://inkdex.io',
    },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: guides.length,
      itemListElement: guides.map((guide, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: `https://inkdex.io/guides/styles/${guide.styleSlug}`,
        name: guide.title,
      })),
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
            <nav className="mb-8 flex items-center gap-2 text-sm text-text-tertiary">
              <Link
                href="/"
                className="hover:text-text-primary transition-colors"
              >
                Inkdex
              </Link>
              <span>/</span>
              <Link
                href="/guides"
                className="hover:text-text-primary transition-colors"
              >
                Guides
              </Link>
              <span>/</span>
              <span className="text-text-secondary">Styles</span>
            </nav>

            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-text-primary mb-6 tracking-tight">
              Tattoo Style Guides
            </h1>
            <p className="font-body text-lg md:text-xl text-text-secondary max-w-2xl leading-relaxed">
              Deep dives into tattoo styles. Learn the history, techniques, and
              what to expect from each style before you get inked.
            </p>
          </div>
        </header>

        {/* Guides Grid */}
        <section className="max-w-4xl mx-auto px-4 py-12 md:py-16">
          <div className="grid gap-6 md:grid-cols-2">
            {guides.map((guide) => (
              <Link
                key={guide.styleSlug}
                href={`/guides/styles/${guide.styleSlug}`}
                className="group block p-6 bg-bg-secondary border-2 border-border-subtle hover:border-ink-black hover:-translate-y-1 hover:shadow-md transition-all duration-200"
              >
                <h2 className="font-display text-2xl font-bold text-text-primary mb-2 group-hover:text-ink-black transition-colors">
                  {guide.displayName}
                </h2>
                <p className="font-body text-sm text-text-secondary line-clamp-2 mb-4">
                  {guide.metaDescription}
                </p>
                <div className="flex flex-wrap gap-2">
                  {guide.variations.slice(0, 3).map((v) => (
                    <span
                      key={v.slug}
                      className="font-mono text-xs uppercase tracking-wider text-text-tertiary"
                    >
                      {v.name}
                    </span>
                  ))}
                  {guide.variations.length > 3 && (
                    <span className="font-mono text-xs uppercase tracking-wider text-text-tertiary">
                      +{guide.variations.length - 3} more
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="border-t border-border-subtle bg-bg-secondary">
          <div className="max-w-4xl mx-auto px-4 py-12 text-center">
            <h2 className="font-display text-2xl font-bold text-text-primary mb-4">
              Know what style you want?
            </h2>
            <p className="font-body text-text-secondary mb-6">
              Search for artists specializing in your preferred style.
            </p>
            <Link
              href="/search"
              className="inline-flex items-center justify-center px-6 py-3 bg-ink-black text-paper-white font-mono text-xs uppercase tracking-[0.15em] border-2 border-ink-black hover:-translate-y-0.5 hover:shadow-md transition-all"
            >
              Search Artists by Style
            </Link>
          </div>
        </section>
      </main>
    </>
  )
}
