import type { Metadata } from 'next'
import Link from 'next/link'
import FAQSection from '@/components/seo/FAQSection'
import TableOfContents from '@/components/guides/TableOfContents'
import CTASection from '@/components/seo/CTASection'
import { serializeJsonLd, sanitizeForJsonLd } from '@/lib/utils/seo'
import { firstTattooContent } from '@/lib/content/first-tattoo'

export const metadata: Metadata = {
  title: `${firstTattooContent.title} | Inkdex`,
  description: firstTattooContent.metaDescription,
  openGraph: {
    title: firstTattooContent.title,
    description: firstTattooContent.metaDescription,
    type: 'article',
    siteName: 'Inkdex',
    publishedTime: firstTattooContent.publishedAt,
    modifiedTime: firstTattooContent.updatedAt,
  },
  twitter: {
    card: 'summary_large_image',
    title: firstTattooContent.title,
    description: firstTattooContent.metaDescription,
  },
  alternates: {
    canonical: 'https://inkdex.io/first-tattoo',
  },
}

export default function FirstTattooPage() {
  const { hero, definition, sections, faqs } = firstTattooContent

  // Build table of contents
  const tocItems = [
    ...sections.map((s) => ({ id: s.id, label: s.heading })),
    { id: 'faq', label: 'FAQ' },
  ]

  // Article schema
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: sanitizeForJsonLd('Getting Your First Tattoo: Complete Guide'),
    description: sanitizeForJsonLd(firstTattooContent.metaDescription),
    datePublished: firstTattooContent.publishedAt,
    dateModified: firstTattooContent.updatedAt,
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
      '@id': 'https://inkdex.io/first-tattoo',
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
        name: 'First Tattoo',
        item: 'https://inkdex.io/first-tattoo',
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
              <span className="text-text-secondary">First Tattoo</span>
            </nav>

            <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-text-primary mb-6 tracking-tight leading-tight">
              {hero.headline}
            </h1>

            <p className="font-body text-lg text-text-secondary max-w-2xl mb-8">
              {hero.subheadline}
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap gap-4">
              <Link
                href="/search"
                className="inline-flex items-center gap-2 px-6 py-3 bg-ink-black text-paper-white font-mono text-xs uppercase tracking-[0.15em] border-2 border-ink-black hover:-translate-y-0.5 hover:shadow-md transition-all"
              >
                Find an Artist
                <span aria-hidden="true">&rarr;</span>
              </Link>
              <Link
                href="/styles"
                className="inline-flex items-center px-6 py-3 font-mono text-xs uppercase tracking-[0.15em] text-text-secondary border-2 border-border-subtle hover:border-ink-black hover:text-ink-black transition-all"
              >
                Explore Styles
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
                headline="Ready to find your first artist?"
                description="Upload a reference image and Inkdex will find artists whose work matches your style. Visual search makes it easy—no tattoo knowledge required."
                buttons={[
                  { label: 'Start Searching', href: '/search', variant: 'primary' },
                  { label: 'Browse Styles', href: '/styles', variant: 'secondary' },
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
