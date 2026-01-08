import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import FAQSection from '@/components/seo/FAQSection'
import TableOfContents from '@/components/guides/TableOfContents'
import CTASection from '@/components/seo/CTASection'
import { serializeJsonLd, sanitizeForJsonLd } from '@/lib/utils/seo'
import { slugToName } from '@/lib/utils/location'
import { getCityBySlug, getCityContent, TOP_CITIES } from '@/lib/content/city-artist-pages'
import { PRICING, FREE_FEATURES, PRO_FEATURES } from '@/lib/pricing/config'
import ProArtistCardMock from '@/components/home/ProArtistCardMock'

// Validation patterns
const COUNTRY_CODE_REGEX = /^[a-z]{2}$/
const REGION_REGEX = /^[a-z0-9-]+$/
const CITY_SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

// Generate static params for top 20 cities
export async function generateStaticParams() {
  return TOP_CITIES.map((city) => ({
    country: city.countryCode.toLowerCase(),
    region: city.regionCode.toLowerCase(),
    city: city.citySlug,
  }))
}

// ISR with 24-hour revalidation
export const revalidate = 86400

export async function generateMetadata({
  params,
}: {
  params: Promise<{ country: string; region: string; city: string }>
}): Promise<Metadata> {
  const { country: countrySlug, region: regionSlug, city: citySlug } = await params

  if (
    !COUNTRY_CODE_REGEX.test(countrySlug) ||
    !REGION_REGEX.test(regionSlug) ||
    !CITY_SLUG_REGEX.test(citySlug)
  ) {
    return { title: 'City Not Found' }
  }

  const cityData = getCityBySlug(citySlug)
  if (!cityData) {
    return { title: 'City Not Found' }
  }

  const content = getCityContent(cityData)

  return {
    title: `${content.title} | Inkdex`,
    description: content.metaDescription,
    openGraph: {
      title: content.title,
      description: content.metaDescription,
      type: 'article',
      siteName: 'Inkdex',
    },
    twitter: {
      card: 'summary_large_image',
      title: content.title,
      description: content.metaDescription,
    },
    alternates: {
      canonical: `https://inkdex.io/${countrySlug}/${regionSlug}/${citySlug}/for-artists`,
    },
  }
}

export default async function CityForArtistsPage({
  params,
}: {
  params: Promise<{ country: string; region: string; city: string }>
}) {
  const { country: countrySlug, region: regionSlug, city: citySlug } = await params

  // Validate params format
  if (
    !COUNTRY_CODE_REGEX.test(countrySlug) ||
    !REGION_REGEX.test(regionSlug) ||
    !CITY_SLUG_REGEX.test(citySlug)
  ) {
    notFound()
  }

  const cityData = getCityBySlug(citySlug)
  if (!cityData) {
    notFound()
  }

  const content = getCityContent(cityData)
  const { hero, definition, sections, faqs } = content

  // Build table of contents
  const tocItems = [
    ...sections.map((s) => ({ id: s.id, label: s.heading })),
    { id: 'faq', label: 'FAQ' },
  ]

  // Article schema
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: sanitizeForJsonLd(
      `Inkdex for Tattoo Artists in ${cityData.cityName}, ${cityData.regionCode}`
    ),
    description: sanitizeForJsonLd(content.metaDescription),
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
      '@id': `https://inkdex.io/${countrySlug}/${regionSlug}/${citySlug}/for-artists`,
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
        name: cityData.cityName,
        item: `https://inkdex.io/${countrySlug}/${regionSlug}/${citySlug}`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: 'For Artists',
        item: `https://inkdex.io/${countrySlug}/${regionSlug}/${citySlug}/for-artists`,
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
              <Link
                href={`/${countrySlug}/${regionSlug}/${citySlug}`}
                className="hover:text-text-primary transition-colors"
              >
                {cityData.cityName}
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

            {/* CTAs */}
            <div className="flex flex-wrap gap-4">
              <Link
                href="/add-artist"
                className="inline-flex items-center gap-2 px-6 py-3 bg-ink-black text-paper-white font-mono text-xs uppercase tracking-[0.15em] border-2 border-ink-black hover:-translate-y-0.5 hover:shadow-md transition-all"
              >
                Claim Your Free Profile
                <span aria-hidden="true">&rarr;</span>
              </Link>
              <Link
                href={`/${countrySlug}/${regionSlug}/${citySlug}`}
                className="inline-flex items-center px-6 py-3 font-mono text-xs uppercase tracking-[0.15em] text-text-secondary border-2 border-border-subtle hover:border-ink-black hover:text-ink-black transition-all"
              >
                Browse {cityData.cityName} Artists
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

                  {/* Search section - Card comparison */}
                  {section.id === 'search' && (
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
                                @your_handle
                              </h3>
                              <div className="flex items-center justify-between">
                                <p className="font-mono text-[10px] font-medium text-gray-500 uppercase tracking-[0.15em]">
                                  {cityData.cityName}, {cityData.regionCode}
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

                  {/* Feature lists for Free vs Pro section */}
                  {section.id === 'free-vs-pro' && (
                    <div className="mt-8 grid md:grid-cols-2 gap-6">
                      {/* Free tier */}
                      <div className="p-6 border-2 border-gray-200 bg-white">
                        <h3 className="font-display text-lg font-semibold text-text-primary mb-4">
                          Free
                        </h3>
                        <div className="mb-4">
                          <span className="font-display text-3xl font-bold text-text-primary">
                            $0
                          </span>
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
                          <span className="font-display text-3xl font-bold text-text-primary">
                            ${PRICING.monthly.amount}
                          </span>
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
              <CTASection
                headline={`Ready to get discovered in ${cityData.cityName}?`}
                description={`Claim your free profile in 2 minutes. Import your portfolio from Instagram and start appearing in ${cityData.cityName} search results.`}
                buttons={[
                  { label: 'Claim Your Profile', href: '/add-artist', variant: 'primary' },
                  { label: 'View Pricing', href: '/pricing', variant: 'secondary' },
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
