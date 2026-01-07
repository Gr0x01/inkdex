import type { Metadata } from 'next'
import Link from 'next/link'
import FAQSection from '@/components/seo/FAQSection'
import TableOfContents from '@/components/guides/TableOfContents'
import { serializeJsonLd, sanitizeForJsonLd } from '@/lib/utils/seo'
import { forArtistsContent } from '@/lib/content/for-artists'
import { PRICING, FREE_FEATURES, PRO_FEATURES } from '@/lib/pricing/config'
import ProArtistCardMock from '@/components/home/ProArtistCardMock'
import { getHomepageStats } from '@/lib/supabase/queries'

export const metadata: Metadata = {
  title: `${forArtistsContent.title} | Inkdex`,
  description: forArtistsContent.metaDescription,
  openGraph: {
    title: forArtistsContent.title,
    description: forArtistsContent.metaDescription,
    type: 'article',
    siteName: 'Inkdex',
    publishedTime: forArtistsContent.publishedAt,
    modifiedTime: forArtistsContent.updatedAt,
  },
  twitter: {
    card: 'summary_large_image',
    title: forArtistsContent.title,
    description: forArtistsContent.metaDescription,
  },
  alternates: {
    canonical: 'https://inkdex.io/for-artists',
  },
}

// ISR: Revalidate every hour (same as homepage)
export const revalidate = 3600

export default async function ForArtistsPage() {
  const { hero, sections, faqs } = forArtistsContent

  // Fetch live stats (same as homepage)
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
    headline: sanitizeForJsonLd('Inkdex for Tattoo Artists: Get Discovered by Visual Search'),
    description: sanitizeForJsonLd(forArtistsContent.metaDescription),
    datePublished: forArtistsContent.publishedAt,
    dateModified: forArtistsContent.updatedAt,
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
      '@id': 'https://inkdex.io/for-artists',
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
        name: 'For Artists',
        item: 'https://inkdex.io/for-artists',
      },
    ],
  }

  // Product schema for Pro tier
  const productSchema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: 'Inkdex Pro',
    description:
      'Professional tattoo artist profile with auto-sync from Instagram, priority search placement, analytics dashboard, and up to 100 portfolio images.',
    brand: {
      '@type': 'Organization',
      name: 'Inkdex',
    },
    offers: {
      '@type': 'Offer',
      price: PRICING.monthly.amount.toFixed(2),
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      priceValidUntil: '2027-12-31',
    },
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(productSchema) }}
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
              <span className="text-text-secondary">For Artists</span>
            </nav>

            <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-text-primary mb-6 tracking-tight leading-tight">
              {hero.headline}
            </h1>

            <p className="font-body text-lg text-text-secondary max-w-2xl mb-8">
              {hero.subheadline}
            </p>

            {/* Stats strip */}
            <div className="flex flex-wrap gap-6 mb-8 text-sm font-mono uppercase tracking-wider text-text-tertiary">
              <span>{stats.artistCount.toLocaleString()}+ Artists</span>
              <span className="hidden sm:inline">•</span>
              <span>{stats.cityCount} Cities</span>
              <span className="hidden sm:inline">•</span>
              <span>{stats.imageCount.toLocaleString()}+ Portfolio Images</span>
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap gap-4">
              <Link
                href="/add-artist"
                className="inline-flex items-center gap-2 px-6 py-3 bg-ink-black text-paper-white font-mono text-xs uppercase tracking-[0.15em] border-2 border-ink-black hover:-translate-y-0.5 hover:shadow-md transition-all"
              >
                Claim Your Free Profile
                <span aria-hidden="true">&rarr;</span>
              </Link>
              <a
                href="#why-inkdex"
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

                  {/* Search section - Card comparison */}
                  {section.id === 'search' && (
                    <div className="mt-8">
                      {/* Mock search grid - 3 columns: Free (1) + Pro (2) */}
                      <div className="grid grid-cols-3 gap-4 max-w-3xl mx-auto">
                        {/* Free card mock - 1 column, vertical layout */}
                        <div className="col-span-1">
                          <p className="font-mono text-[10px] uppercase tracking-wider text-gray-400 mb-2 text-center">Free</p>
                          <div className="bg-paper border-2 border-ink/20 overflow-hidden h-[280px] flex flex-col">
                            <div className="flex-1 bg-gray-200 relative">
                              <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                              </div>
                            </div>
                            <div className="p-3 space-y-1">
                              <h3 className="font-heading text-sm font-bold text-ink tracking-tight">@your_handle</h3>
                              <div className="flex items-center justify-between">
                                <p className="font-mono text-[10px] font-medium text-gray-500 uppercase tracking-[0.15em]">Your City</p>
                                <span className="font-mono text-xs font-semibold text-ink">85%</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Pro card mock - 2 columns, horizontal layout */}
                        <div className="col-span-2">
                          <p className="font-mono text-[10px] uppercase tracking-wider text-purple-600 mb-2 text-center">Pro</p>
                          <ProArtistCardMock />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Feature lists for Free vs Pro section */}
                  {section.id === 'free-vs-pro' && (
                    <div className="mt-8 grid md:grid-cols-2 gap-6">
                      {/* Free tier */}
                      <div className="p-6 border-2 border-gray-200 bg-white">
                        <h3 className="font-display text-lg font-semibold text-text-primary mb-4">
                          Free
                        </h3>
                        <div className="mb-4">
                          <span className="font-display text-3xl font-bold text-text-primary">$0</span>
                          <span className="font-mono text-sm text-gray-500 ml-1">/forever</span>
                        </div>
                        <ul className="space-y-3">
                          {FREE_FEATURES.map((feature) => (
                            <li
                              key={feature}
                              className="flex items-start gap-2 text-sm text-text-secondary"
                            >
                              <span className="text-gray-400 mt-0.5">✓</span>
                              {feature}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Pro tier */}
                      <div className="p-6 border-2 border-purple-500 bg-white relative">
                        {/* Popular badge */}
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-600 text-white font-mono text-[10px] uppercase tracking-wider">
                            Most Popular
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mb-2 pt-2">
                          <h3 className="font-display text-lg font-semibold text-text-primary">
                            Pro
                          </h3>
                        </div>
                        <div className="mb-4">
                          <span className="font-display text-3xl font-bold text-text-primary">${PRICING.monthly.amount}</span>
                          <span className="font-mono text-sm text-gray-500 ml-1">/month</span>
                        </div>
                        <ul className="space-y-3">
                          {PRO_FEATURES.map((feature) => (
                            <li
                              key={feature}
                              className="flex items-start gap-2 text-sm text-text-secondary"
                            >
                              <span className="text-purple-600 mt-0.5">✓</span>
                              {feature}
                            </li>
                          ))}
                        </ul>
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
              <section className="mt-16 p-8 bg-bg-secondary border-2 border-border-subtle">
                <h2 className="font-display text-xl font-bold text-text-primary mb-3">
                  Ready to get discovered?
                </h2>
                <p className="font-body text-text-secondary mb-6">
                  Claim your free profile in 2 minutes. Import your portfolio from Instagram and
                  start appearing in visual search results.
                </p>
                <div className="flex flex-wrap gap-4">
                  <Link
                    href="/add-artist"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-ink-black text-paper-white font-mono text-xs uppercase tracking-[0.15em] border-2 border-ink-black hover:-translate-y-0.5 hover:shadow-md transition-all"
                  >
                    Claim Your Profile
                    <span aria-hidden="true">&rarr;</span>
                  </Link>
                  <Link
                    href="/pricing"
                    className="inline-flex items-center px-6 py-3 font-mono text-xs uppercase tracking-[0.15em] text-text-secondary border-2 border-border-subtle hover:border-ink-black hover:text-ink-black transition-all"
                  >
                    View Pricing
                  </Link>
                </div>
              </section>
            </article>
          </div>
        </div>
      </main>
    </>
  )
}
