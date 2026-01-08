import type { Metadata } from 'next'
import Link from 'next/link'
import FAQSection from '@/components/seo/FAQSection'
import TableOfContents from '@/components/guides/TableOfContents'
import StatsStrip from '@/components/seo/StatsStrip'
import CTASection from '@/components/seo/CTASection'
import { serializeJsonLd, sanitizeForJsonLd } from '@/lib/utils/seo'
import { howToFindContent } from '@/lib/content/how-to-find-artist'
import { getHomepageStats } from '@/lib/supabase/queries'

export const metadata: Metadata = {
  title: `${howToFindContent.title} | Inkdex`,
  description: howToFindContent.metaDescription,
  openGraph: {
    title: howToFindContent.title,
    description: howToFindContent.metaDescription,
    type: 'article',
    siteName: 'Inkdex',
    publishedTime: howToFindContent.publishedAt,
    modifiedTime: howToFindContent.updatedAt,
  },
  twitter: {
    card: 'summary_large_image',
    title: howToFindContent.title,
    description: howToFindContent.metaDescription,
  },
  alternates: {
    canonical: 'https://inkdex.io/how-to-find-tattoo-artist',
  },
}

// ISR: Revalidate every hour
export const revalidate = 3600

export default async function HowToFindArtistPage() {
  const { hero, definition, sections, faqs } = howToFindContent

  // Fetch live stats
  const stats = await getHomepageStats().catch((error) => {
    console.error('Failed to fetch stats:', error)
    return { artistCount: 16000, imageCount: 99000, cityCount: 116, countryCount: 1 }
  })

  // Build table of contents
  const tocItems = [
    ...sections.map((s) => ({ id: s.id, label: s.heading })),
    { id: 'faq', label: 'FAQ' },
  ]

  // Article schema
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: sanitizeForJsonLd('How to Find a Tattoo Artist: Complete Guide'),
    description: sanitizeForJsonLd(howToFindContent.metaDescription),
    datePublished: howToFindContent.publishedAt,
    dateModified: howToFindContent.updatedAt,
    author: {
      '@type': 'Organization',
      name: 'Inkdex',
      url: 'https://inkdex.io',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Inkdex',
      url: 'https://inkdex.io',
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': 'https://inkdex.io/how-to-find-tattoo-artist',
    },
  }

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
        name: 'How to Find a Tattoo Artist',
        item: 'https://inkdex.io/how-to-find-tattoo-artist',
      },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(articleSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbSchema) }}
      />

      <main className="min-h-screen bg-bg-primary">
        {/* Hero */}
        <header className="border-b border-border-subtle">
          <div className="max-w-5xl mx-auto px-4 py-12 md:py-20">
            {/* Breadcrumb */}
            <nav className="mb-8 flex items-center gap-2 text-sm text-text-tertiary">
              <Link href="/" className="hover:text-text-primary transition-colors">
                Inkdex
              </Link>
              <span>/</span>
              <span className="text-text-secondary">How to Find a Tattoo Artist</span>
            </nav>

            <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-text-primary mb-6 tracking-tight leading-tight">
              {hero.headline}
            </h1>

            <p className="font-body text-lg text-text-secondary max-w-2xl mb-8">
              {hero.subheadline}
            </p>

            {/* Stats strip */}
            <StatsStrip
              artistCount={stats.artistCount}
              cityCount={stats.cityCount}
              imageCount={stats.imageCount}
              className="mb-8"
            />

            {/* CTAs */}
            <div className="flex flex-wrap gap-4">
              <Link
                href="/search"
                className="inline-flex items-center gap-2 px-6 py-3 bg-ink-black text-paper-white font-mono text-xs uppercase tracking-[0.15em] border-2 border-ink-black hover:-translate-y-0.5 hover:shadow-md transition-all"
              >
                Try Visual Search
                <span aria-hidden="true">&rarr;</span>
              </Link>
              <Link
                href="/styles"
                className="inline-flex items-center px-6 py-3 font-mono text-xs uppercase tracking-[0.15em] text-text-secondary border-2 border-border-subtle hover:border-ink-black hover:text-ink-black transition-all"
              >
                Browse Styles
              </Link>
            </div>
          </div>
        </header>

        {/* Content with TOC */}
        <div className="max-w-5xl mx-auto px-4 py-12 md:py-16">
          <div className="lg:grid lg:grid-cols-[200px_1fr] lg:gap-12">
            {/* Sticky TOC (desktop only) */}
            <aside className="hidden lg:block">
              <TableOfContents items={tocItems} />
            </aside>

            {/* Main Content */}
            <article className="prose-inkdex">
              {/* AI Definition */}
              <p
                className="font-body text-text-secondary leading-relaxed [&_strong]:text-text-primary [&_strong]:font-semibold mb-12"
                dangerouslySetInnerHTML={{ __html: definition }}
              />

              {/* Guide sections */}
              {sections.map((section) => (
                <section key={section.id} id={section.id} className="mb-12 scroll-mt-24">
                  <h2 className="font-display text-2xl md:text-3xl font-bold text-text-primary mb-6">
                    {section.heading}
                  </h2>
                  <div className="space-y-4">
                    {section.paragraphs.map((p, i) => (
                      <p
                        key={i}
                        className="font-body text-text-secondary leading-relaxed [&_strong]:text-text-primary [&_strong]:font-semibold"
                        dangerouslySetInnerHTML={{ __html: p }}
                      />
                    ))}
                  </div>
                </section>
              ))}

              {/* FAQ Section */}
              <section id="faq" className="mb-12 scroll-mt-24">
                <FAQSection faqs={faqs} title="Frequently Asked Questions" label="" />
              </section>

              {/* Bottom CTA */}
              <CTASection
                headline="Ready to find your artist?"
                description="Upload a reference image and Inkdex shows you artists whose portfolios match. Visual search works even if you don't know style terminology."
                buttons={[
                  { label: 'Start Searching', href: '/search', variant: 'primary' },
                  { label: 'First Tattoo Guide', href: '/first-tattoo', variant: 'secondary' },
                ]}
                className="mt-16"
              />
            </article>
          </div>
        </div>
      </main>
    </>
  )
}
