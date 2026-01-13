import type { Metadata } from 'next'
import Link from 'next/link'
import { getAllCompetitors } from '@/lib/content/alternatives'
import { CompetitorCard } from '@/components/alternatives'
import { serializeJsonLd, sanitizeForJsonLd } from '@/lib/utils/seo'

export const metadata: Metadata = {
  title: 'Tattoo Platform Alternatives | Inkdex',
  description:
    'Compare Inkdex to Tattoodo, Instagram, and booking apps. Discover why independent tattoo artists are switching to visual search discovery.',
  openGraph: {
    title: 'Tattoo Platform Alternatives',
    description:
      'Compare Inkdex to Tattoodo, Instagram, and booking apps. Discover why independent tattoo artists are switching to visual search discovery.',
    type: 'website',
    siteName: 'Inkdex',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tattoo Platform Alternatives | Inkdex',
    description:
      'Compare Inkdex to Tattoodo, Instagram, and booking apps. Discover why independent tattoo artists are switching.',
  },
  alternates: {
    canonical: 'https://inkdex.io/alternatives',
  },
}

export default function AlternativesPage() {
  const competitors = getAllCompetitors()

  // Breadcrumb schema
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Inkdex',
        item: 'https://inkdex.io',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Alternatives',
        item: 'https://inkdex.io/alternatives',
      },
    ],
  }

  // CollectionPage schema
  const collectionSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: sanitizeForJsonLd('Tattoo Platform Alternatives'),
    description: sanitizeForJsonLd(
      'Compare Inkdex to Tattoodo, Instagram, and booking apps for tattoo artist discovery.'
    ),
    url: 'https://inkdex.io/alternatives',
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
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(collectionSchema) }}
      />

      <main className="min-h-screen bg-bg-primary">
        {/* Hero */}
        <header className="border-b border-border-subtle">
          <div className="max-w-4xl mx-auto px-4 py-12 md:py-20">
            {/* Breadcrumb */}
            <nav aria-label="Breadcrumb" className="mb-8 flex items-center gap-2 text-sm text-text-tertiary">
              <Link
                href="/"
                className="hover:text-text-primary transition-colors"
              >
                Inkdex
              </Link>
              <span>/</span>
              <span className="text-text-secondary">Alternatives</span>
            </nav>

            <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-text-primary mb-6 tracking-tight leading-tight">
              Looking for a Better Way to Get Discovered?
            </h1>
            <p className="font-body text-lg text-text-secondary max-w-2xl">
              Compare Inkdex to other platforms and see why independent tattoo
              artists are switching to visual search discovery.
            </p>
          </div>
        </header>

        {/* Competitor Grid */}
        <section className="max-w-4xl mx-auto px-4 py-12">
          <h2 className="sr-only">Platform Comparisons</h2>
          <div className="grid gap-6">
            {competitors.map((competitor) => (
              <CompetitorCard key={competitor.slug} {...competitor} />
            ))}
          </div>

          {/* Coming soon placeholder for future comparisons */}
          {competitors.length === 1 && (
            <div className="mt-6 p-6 border-2 border-dashed border-border-subtle text-center">
              <p className="font-mono text-xs uppercase tracking-wider text-text-tertiary mb-2">
                Coming Soon
              </p>
              <p className="font-body text-sm text-text-secondary">
                Instagram algorithm alternatives and booking app comparisons
              </p>
            </div>
          )}
        </section>

        {/* Bottom CTA */}
        <section className="max-w-4xl mx-auto px-4 pb-16">
          <div className="p-8 bg-bg-secondary border-2 border-border-subtle">
            <h2 className="font-display text-xl font-bold text-text-primary mb-3">
              Ready to get discovered?
            </h2>
            <p className="font-body text-text-secondary mb-6">
              Your portfolio might already be on Inkdex. Check if your profile
              exists and claim it for free.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/add-artist"
                className="inline-flex items-center gap-2 px-6 py-3 bg-ink-black text-paper-white font-mono text-xs uppercase tracking-[0.15em] border-2 border-ink-black hover:-translate-y-0.5 hover:shadow-md transition-all"
              >
                Claim Your Free Profile
                <span aria-hidden="true">&rarr;</span>
              </Link>
              <Link
                href="/for-artists"
                className="inline-flex items-center px-6 py-3 font-mono text-xs uppercase tracking-[0.15em] text-text-secondary border-2 border-border-subtle hover:border-ink-black hover:text-ink-black transition-all"
              >
                Learn More
              </Link>
            </div>
          </div>
        </section>
      </main>
    </>
  )
}
