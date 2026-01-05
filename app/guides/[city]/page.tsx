import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { getCityGuide, getAllCityGuides } from '@/lib/content/editorial/guides'
import { getCityFAQs } from '@/lib/content/editorial/city-faqs'
import FAQSection from '@/components/seo/FAQSection'
import TableOfContents from '@/components/guides/TableOfContents'
import NeighborhoodSection from '@/components/guides/NeighborhoodSection'
import { serializeJsonLd, sanitizeForJsonLd } from '@/lib/utils/seo'
import { STATES } from '@/lib/constants/cities'

// Static generation for all guides
export async function generateStaticParams() {
  const guides = getAllCityGuides()
  return guides.map((guide) => ({
    city: guide.citySlug,
  }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string }>
}): Promise<Metadata> {
  const { city: citySlug } = await params
  const guide = getCityGuide(citySlug)

  if (!guide) {
    return { title: 'Guide Not Found' }
  }

  return {
    title: `${guide.title} | Inkdex`,
    description: guide.metaDescription,
    openGraph: {
      title: guide.title,
      description: guide.metaDescription,
      type: 'article',
      siteName: 'Inkdex',
      publishedTime: guide.publishedAt,
      modifiedTime: guide.updatedAt,
      authors: ['Inkdex Editorial'],
    },
    twitter: {
      card: 'summary_large_image',
      title: guide.title,
      description: guide.metaDescription,
    },
    alternates: {
      canonical: `https://inkdex.io/guides/${citySlug}`,
    },
  }
}

export default async function CityGuidePage({
  params,
}: {
  params: Promise<{ city: string }>
}) {
  const { city: citySlug } = await params
  const guide = getCityGuide(citySlug)

  if (!guide) {
    notFound()
  }

  // Get state info for browse page link
  const state = STATES.find(
    (s) => s.slug === guide.stateSlug || s.code.toLowerCase() === guide.stateSlug
  )
  const stateSlug = state?.slug || guide.stateSlug
  const stateName = state?.name || guide.stateSlug

  // Get FAQs if available
  const faqs = getCityFAQs(citySlug) || []

  // Build table of contents
  const tocItems = [
    { id: 'introduction', label: 'Introduction' },
    { id: 'neighborhoods', label: 'Neighborhoods' },
    ...guide.neighborhoods.map((n) => ({
      id: n.slug,
      label: n.name,
      indent: true,
    })),
    { id: 'local-culture', label: 'Local Culture' },
    { id: 'styles', label: 'Popular Styles' },
    { id: 'practical', label: 'Booking & Pricing' },
    ...(faqs.length > 0 ? [{ id: 'faq', label: 'FAQ' }] : []),
  ]

  // Article schema
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: sanitizeForJsonLd(guide.title),
    description: sanitizeForJsonLd(guide.metaDescription),
    datePublished: guide.publishedAt,
    dateModified: guide.updatedAt,
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
      '@id': `https://inkdex.io/guides/${citySlug}`,
    },
    about: {
      '@type': 'City',
      name: citySlug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      containedInPlace: {
        '@type': 'State',
        name: stateName,
      },
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
        name: 'Guides',
        item: 'https://inkdex.io/guides',
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: guide.title,
        item: `https://inkdex.io/guides/${citySlug}`,
      },
    ],
  }

  const cityName = citySlug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')

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
          <div className="max-w-4xl mx-auto px-4 py-12 md:py-20">
            {/* Breadcrumb */}
            <nav className="mb-8 flex items-center gap-2 text-sm text-text-tertiary">
              <Link href="/" className="hover:text-text-primary transition-colors">
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
              <span className="text-text-secondary">{cityName}</span>
            </nav>

            <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-text-primary mb-6 tracking-tight leading-tight">
              {guide.title}
            </h1>

            <p className="font-body text-lg text-text-secondary max-w-2xl mb-8">
              {guide.metaDescription}
            </p>

            {/* Quick links */}
            <div className="flex flex-wrap gap-3">
              <Link
                href={`/us/${stateSlug}/${citySlug}`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-ink-black text-paper-white text-sm font-medium rounded-lg hover:bg-gray-900 transition-colors"
              >
                Browse {cityName} Artists
                <span aria-hidden="true">&rarr;</span>
              </Link>
              {guide.relatedStyles?.slice(0, 3).map((style) => (
                <Link
                  key={style}
                  href={`/us/${stateSlug}/${citySlug}/${style}`}
                  className="inline-flex items-center px-4 py-2 bg-bg-secondary text-text-secondary text-sm rounded-lg hover:bg-gray-300 transition-colors border border-border-subtle"
                >
                  {style.charAt(0).toUpperCase() + style.slice(1)}
                </Link>
              ))}
            </div>
          </div>
        </header>

        {/* Content with TOC */}
        <div className="max-w-4xl mx-auto px-4 py-12 md:py-16">
          <div className="lg:grid lg:grid-cols-[1fr_220px] lg:gap-12">
            {/* Main Content */}
            <article className="prose-inkdex">
              {/* Introduction */}
              <section id="introduction" className="mb-12 scroll-mt-24">
                {guide.introduction.heading && (
                  <h2 className="font-display text-2xl md:text-3xl font-bold text-text-primary mb-6">
                    {guide.introduction.heading}
                  </h2>
                )}
                <div className="space-y-4">
                  {guide.introduction.paragraphs.map((p, i) => (
                    <p
                      key={i}
                      className="font-body text-text-secondary leading-relaxed"
                    >
                      {p}
                    </p>
                  ))}
                </div>
              </section>

              {/* Neighborhoods */}
              <section id="neighborhoods" className="mb-12 scroll-mt-24">
                <h2 className="font-display text-2xl md:text-3xl font-bold text-text-primary mb-8">
                  Neighborhoods
                </h2>
                <div className="space-y-10">
                  {guide.neighborhoods.map((neighborhood) => (
                    <NeighborhoodSection
                      key={neighborhood.slug}
                      neighborhood={neighborhood}
                    />
                  ))}
                </div>
              </section>

              {/* Local Culture */}
              <section id="local-culture" className="mb-12 scroll-mt-24">
                {guide.localCulture.heading && (
                  <h2 className="font-display text-2xl md:text-3xl font-bold text-text-primary mb-6">
                    {guide.localCulture.heading}
                  </h2>
                )}
                <div className="space-y-4">
                  {guide.localCulture.paragraphs.map((p, i) => (
                    <p
                      key={i}
                      className="font-body text-text-secondary leading-relaxed"
                    >
                      {p}
                    </p>
                  ))}
                </div>
              </section>

              {/* Style Guide */}
              <section id="styles" className="mb-12 scroll-mt-24">
                {guide.styleGuide.heading && (
                  <h2 className="font-display text-2xl md:text-3xl font-bold text-text-primary mb-6">
                    {guide.styleGuide.heading}
                  </h2>
                )}
                <div className="space-y-4">
                  {guide.styleGuide.paragraphs.map((p, i) => (
                    <p
                      key={i}
                      className="font-body text-text-secondary leading-relaxed"
                    >
                      {p}
                    </p>
                  ))}
                </div>
              </section>

              {/* Practical Advice */}
              <section id="practical" className="mb-12 scroll-mt-24">
                {guide.practicalAdvice.heading && (
                  <h2 className="font-display text-2xl md:text-3xl font-bold text-text-primary mb-6">
                    {guide.practicalAdvice.heading}
                  </h2>
                )}
                <div className="space-y-4">
                  {guide.practicalAdvice.paragraphs.map((p, i) => (
                    <p
                      key={i}
                      className="font-body text-text-secondary leading-relaxed"
                    >
                      {p}
                    </p>
                  ))}
                </div>
              </section>

              {/* FAQ */}
              {faqs.length > 0 && (
                <section id="faq" className="mb-12 scroll-mt-24">
                  <FAQSection
                    faqs={faqs}
                    title={`Common Questions About ${cityName} Tattoos`}
                  />
                </section>
              )}

              {/* CTA */}
              <section className="mt-16 p-8 bg-bg-secondary rounded-xl border border-border-subtle">
                <h2 className="font-display text-xl font-bold text-text-primary mb-3">
                  Ready to find your artist?
                </h2>
                <p className="font-body text-text-secondary mb-6">
                  Browse portfolios from {cityName}&apos;s best tattoo artists.
                  Search by style, view their work, and connect via Instagram.
                </p>
                <Link
                  href={`/us/${stateSlug}/${citySlug}`}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-ink-black text-paper-white font-medium rounded-lg hover:bg-gray-900 transition-colors"
                >
                  Browse {cityName} Artists
                  <span aria-hidden="true">&rarr;</span>
                </Link>
              </section>
            </article>

            {/* Sticky TOC (desktop only) */}
            <aside className="hidden lg:block">
              <TableOfContents items={tocItems} />
            </aside>
          </div>
        </div>
      </main>
    </>
  )
}
