import type { Metadata } from 'next'
import Link from 'next/link'
import { getAllTopicalGuides } from '@/lib/content/editorial/topical-guides'
import { TOPICAL_CATEGORIES } from '@/lib/content/editorial/topical-guides-types'
import { serializeJsonLd } from '@/lib/utils/seo'

export const metadata: Metadata = {
  title: 'Tattoo Guides & Tips | Inkdex',
  description:
    'Everything you need to know about getting a tattoo. From first-timer guides to aftercare tips, placement advice, and how to choose the right artist.',
  openGraph: {
    title: 'Tattoo Guides & Tips | Inkdex',
    description:
      'Everything you need to know about getting a tattoo. First-timer guides, aftercare, placement, and more.',
    type: 'website',
    siteName: 'Inkdex',
  },
  alternates: {
    canonical: 'https://inkdex.io/guides/learn',
  },
}

export default function TopicalGuidesIndexPage() {
  const guides = getAllTopicalGuides()

  // Group guides by category
  const guidesByCategory = TOPICAL_CATEGORIES.map((category) => ({
    ...category,
    guides: guides.filter((g) => g.category === category.slug),
  })).filter((cat) => cat.guides.length > 0)

  // CollectionPage schema
  const collectionSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Tattoo Guides & Tips',
    description:
      'Comprehensive guides for getting a tattoo, from first-timers to aftercare and choosing the right artist.',
    url: 'https://inkdex.io/guides/learn',
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
        url: `https://inkdex.io/guides/learn/${guide.topicSlug}`,
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
              <span className="text-text-secondary">Learn</span>
            </nav>

            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-text-primary mb-6 tracking-tight">
              Tattoo Guides & Tips
            </h1>
            <p className="font-body text-lg md:text-xl text-text-secondary max-w-2xl leading-relaxed">
              Everything you need to know about getting a tattoo. From first-timer
              essentials to aftercare tips and choosing the perfect artist.
            </p>
          </div>
        </header>

        {/* Guides by Category */}
        <section className="max-w-4xl mx-auto px-4 py-12 md:py-16">
          <div className="space-y-16">
            {guidesByCategory.map((category) => (
              <div key={category.slug}>
                <div className="mb-6">
                  <h2 className="font-display text-2xl md:text-3xl font-bold text-text-primary mb-2">
                    {category.name}
                  </h2>
                  <p className="font-body text-text-tertiary">
                    {category.description}
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {category.guides.map((guide) => (
                    <Link
                      key={guide.topicSlug}
                      href={`/guides/learn/${guide.topicSlug}`}
                      className="group block p-6 bg-bg-secondary border-2 border-border-subtle hover:border-ink-black hover:-translate-y-1 hover:shadow-md transition-all duration-200"
                    >
                      <h3 className="font-display text-xl font-bold text-text-primary mb-2 group-hover:text-ink-black transition-colors">
                        {guide.title}
                      </h3>
                      <p className="font-body text-sm text-text-secondary line-clamp-2">
                        {guide.metaDescription}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="border-t border-border-subtle bg-bg-secondary">
          <div className="max-w-4xl mx-auto px-4 py-12 text-center">
            <h2 className="font-display text-2xl font-bold text-text-primary mb-4">
              Ready to find your artist?
            </h2>
            <p className="font-body text-text-secondary mb-6">
              Browse portfolios and connect with talented tattoo artists.
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
