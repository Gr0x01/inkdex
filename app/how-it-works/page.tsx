import type { Metadata } from 'next'
import Link from 'next/link'
import FAQSection from '@/components/seo/FAQSection'
import TableOfContents from '@/components/guides/TableOfContents'
import StatsStrip from '@/components/seo/StatsStrip'
import CTASection from '@/components/seo/CTASection'
import { serializeJsonLd, sanitizeForJsonLd } from '@/lib/utils/seo'
import { howItWorksContent } from '@/lib/content/how-it-works'
import { getHomepageStats } from '@/lib/supabase/queries'
import ProArtistCardMock from '@/components/home/ProArtistCardMock'

export const metadata: Metadata = {
  title: `${howItWorksContent.title} | Inkdex`,
  description: howItWorksContent.metaDescription,
  openGraph: {
    title: howItWorksContent.title,
    description: howItWorksContent.metaDescription,
    type: 'article',
    siteName: 'Inkdex',
    publishedTime: howItWorksContent.publishedAt,
    modifiedTime: howItWorksContent.updatedAt,
  },
  twitter: {
    card: 'summary_large_image',
    title: howItWorksContent.title,
    description: howItWorksContent.metaDescription,
  },
  alternates: {
    canonical: 'https://inkdex.io/how-it-works',
  },
}

// ISR: Revalidate every hour
export const revalidate = 3600

export default async function HowItWorksPage() {
  const { hero, definition, sections, faqs } = howItWorksContent

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
    headline: sanitizeForJsonLd('How Inkdex Works: Visual Search for Tattoo Artists'),
    description: sanitizeForJsonLd(howItWorksContent.metaDescription),
    datePublished: howItWorksContent.publishedAt,
    dateModified: howItWorksContent.updatedAt,
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
      '@id': 'https://inkdex.io/how-it-works',
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
        name: 'How It Works',
        item: 'https://inkdex.io/how-it-works',
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
              <span className="text-text-secondary">How It Works</span>
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
              <a
                href="#visual-search"
                className="inline-flex items-center px-6 py-3 font-mono text-xs uppercase tracking-[0.15em] text-text-secondary border-2 border-border-subtle hover:border-ink-black hover:text-ink-black transition-all"
              >
                Learn More
              </a>
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

                  {/* Search results section - Card comparison */}
                  {section.id === 'search-results' && (
                    <div className="mt-8">
                      {/* Mock search grid - stacked on mobile, side-by-side on md+ */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
                        {/* Free card mock - full width on mobile, 1 col on md+ */}
                        <div className="md:col-span-1">
                          <p className="font-mono text-[10px] uppercase tracking-wider text-gray-400 mb-2 text-center">
                            Free
                          </p>
                          <div className="bg-paper border-2 border-ink/20 overflow-hidden h-[280px] flex flex-col">
                            <div className="flex-1 bg-gray-200 relative">
                              <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                                <svg
                                  className="w-12 h-12"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={1}
                                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                  />
                                </svg>
                              </div>
                            </div>
                            <div className="p-3 space-y-1">
                              <h3 className="font-heading text-sm font-bold text-ink tracking-tight">
                                @artist_handle
                              </h3>
                              <div className="flex items-center justify-between">
                                <p className="font-mono text-[10px] font-medium text-gray-500 uppercase tracking-[0.15em]">
                                  City, ST
                                </p>
                                <span className="font-mono text-xs font-semibold text-ink">85%</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Pro card mock - full width on mobile, 2 cols on md+ */}
                        <div className="md:col-span-2">
                          <p className="font-mono text-[10px] uppercase tracking-wider text-purple-600 mb-2 text-center">
                            Pro
                          </p>
                          <ProArtistCardMock />
                        </div>
                      </div>
                    </div>
                  )}
                </section>
              ))}

              {/* FAQ Section */}
              <section id="faq" className="mb-12 scroll-mt-24">
                <FAQSection faqs={faqs} title="Frequently Asked Questions" label="" />
              </section>

              {/* Bottom CTA */}
              <CTASection
                headline="Ready to find your artist?"
                description="Upload a reference image and see artists whose work matches your style. It's free and takes seconds."
                buttons={[
                  { label: 'Start Searching', href: '/search', variant: 'primary' },
                  { label: 'Browse by City', href: '/united-states', variant: 'secondary' },
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
