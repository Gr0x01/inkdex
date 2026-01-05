import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { getStyleGuide, getAllStyleGuides } from '@/lib/content/editorial/style-guides'
import TableOfContents from '@/components/guides/TableOfContents'
import { serializeJsonLd, sanitizeForJsonLd } from '@/lib/utils/seo'

// Static generation for all style guides
export async function generateStaticParams() {
  const guides = getAllStyleGuides()
  return guides.map((guide) => ({
    style: guide.styleSlug,
  }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ style: string }>
}): Promise<Metadata> {
  const { style: styleSlug } = await params
  const guide = getStyleGuide(styleSlug)

  if (!guide) {
    return { title: 'Style Guide Not Found' }
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
      canonical: `https://inkdex.io/guides/styles/${styleSlug}`,
    },
  }
}

export default async function StyleGuidePage({
  params,
}: {
  params: Promise<{ style: string }>
}) {
  const { style: styleSlug } = await params
  const guide = getStyleGuide(styleSlug)

  if (!guide) {
    notFound()
  }

  // Build table of contents
  const tocItems = [
    { id: 'introduction', label: 'Introduction' },
    { id: 'history', label: 'History' },
    { id: 'characteristics', label: 'Characteristics' },
    { id: 'variations', label: 'Variations' },
    ...guide.variations.map((v) => ({
      id: v.slug,
      label: v.name,
      indent: true,
    })),
    { id: 'expectations', label: 'What to Expect' },
    { id: 'finding-artist', label: 'Finding an Artist' },
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
      '@id': `https://inkdex.io/guides/styles/${styleSlug}`,
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
        name: 'Styles',
        item: 'https://inkdex.io/guides/styles',
      },
      {
        '@type': 'ListItem',
        position: 4,
        name: guide.displayName,
        item: `https://inkdex.io/guides/styles/${styleSlug}`,
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
              <Link
                href="/guides/styles"
                className="hover:text-text-primary transition-colors"
              >
                Styles
              </Link>
              <span>/</span>
              <span className="text-text-secondary">{guide.displayName}</span>
            </nav>

            <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-text-primary mb-6 tracking-tight leading-tight">
              {guide.title}
            </h1>

            <p className="font-body text-lg text-text-secondary max-w-2xl mb-8">
              {guide.metaDescription}
            </p>

            {/* Quick links to browse artists */}
            <div className="flex flex-wrap gap-4">
              <Link
                href={`/search?style=${styleSlug}`}
                className="inline-flex items-center gap-2 px-6 py-3 bg-ink-black text-paper-white font-mono text-xs uppercase tracking-[0.15em] border-2 border-ink-black hover:-translate-y-0.5 hover:shadow-md transition-all"
              >
                Find {guide.displayName} Artists
                <span aria-hidden="true">&rarr;</span>
              </Link>
              {guide.relatedStyles?.slice(0, 3).map((style) => (
                <Link
                  key={style}
                  href={`/guides/styles/${style}`}
                  className="inline-flex items-center px-4 py-3 font-mono text-xs uppercase tracking-[0.15em] text-text-secondary border-2 border-border-subtle hover:border-ink-black hover:text-ink-black transition-all"
                >
                  {style.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                </Link>
              ))}
            </div>
          </div>
        </header>

        {/* Content with TOC */}
        <div className="max-w-5xl mx-auto px-4 py-12 md:py-16">
          <div className="lg:grid lg:grid-cols-[200px_1fr] lg:gap-12">
            {/* Sticky TOC (desktop only) - LEFT SIDE */}
            <aside className="hidden lg:block">
              <TableOfContents items={tocItems} />
            </aside>

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

              {/* History */}
              <section id="history" className="mb-12 scroll-mt-24">
                {guide.history.heading && (
                  <h2 className="font-display text-2xl md:text-3xl font-bold text-text-primary mb-6">
                    {guide.history.heading}
                  </h2>
                )}
                <div className="space-y-4">
                  {guide.history.paragraphs.map((p, i) => (
                    <p
                      key={i}
                      className="font-body text-text-secondary leading-relaxed"
                    >
                      {p}
                    </p>
                  ))}
                </div>
              </section>

              {/* Characteristics */}
              <section id="characteristics" className="mb-12 scroll-mt-24">
                {guide.characteristics.heading && (
                  <h2 className="font-display text-2xl md:text-3xl font-bold text-text-primary mb-6">
                    {guide.characteristics.heading}
                  </h2>
                )}
                <div className="space-y-4">
                  {guide.characteristics.paragraphs.map((p, i) => (
                    <p
                      key={i}
                      className="font-body text-text-secondary leading-relaxed"
                    >
                      {p}
                    </p>
                  ))}
                </div>
              </section>

              {/* Variations */}
              <section id="variations" className="mb-12 scroll-mt-24">
                <h2 className="font-display text-2xl md:text-3xl font-bold text-text-primary mb-8">
                  Style Variations
                </h2>
                <div className="space-y-10">
                  {guide.variations.map((variation) => (
                    <div
                      key={variation.slug}
                      id={variation.slug}
                      className="scroll-mt-24 pb-8 border-b border-border-subtle last:border-0 last:pb-0"
                    >
                      <h3 className="font-display text-xl font-semibold text-text-primary mb-4">
                        {variation.name}
                      </h3>
                      <div className="space-y-3 mb-4">
                        {variation.description.map((paragraph, index) => (
                          <p
                            key={index}
                            className="font-body text-text-secondary leading-relaxed"
                          >
                            {paragraph}
                          </p>
                        ))}
                      </div>
                      {variation.characteristics.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {variation.characteristics.map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center px-3 py-1 font-mono text-xs uppercase tracking-wider text-text-tertiary border border-border-subtle"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>

              {/* Expectations */}
              <section id="expectations" className="mb-12 scroll-mt-24">
                {guide.expectations.heading && (
                  <h2 className="font-display text-2xl md:text-3xl font-bold text-text-primary mb-6">
                    {guide.expectations.heading}
                  </h2>
                )}
                <div className="space-y-4">
                  {guide.expectations.paragraphs.map((p, i) => (
                    <p
                      key={i}
                      className="font-body text-text-secondary leading-relaxed"
                    >
                      {p}
                    </p>
                  ))}
                </div>
              </section>

              {/* Finding an Artist */}
              <section id="finding-artist" className="mb-12 scroll-mt-24">
                {guide.findingArtist.heading && (
                  <h2 className="font-display text-2xl md:text-3xl font-bold text-text-primary mb-6">
                    {guide.findingArtist.heading}
                  </h2>
                )}
                <div className="space-y-4">
                  {guide.findingArtist.paragraphs.map((p, i) => (
                    <p
                      key={i}
                      className="font-body text-text-secondary leading-relaxed"
                    >
                      {p}
                    </p>
                  ))}
                </div>
              </section>

              {/* CTA */}
              <section className="mt-16 p-8 bg-bg-secondary border-2 border-border-subtle">
                <h2 className="font-display text-xl font-bold text-text-primary mb-3">
                  Ready to find your {guide.displayName} artist?
                </h2>
                <p className="font-body text-text-secondary mb-6">
                  Browse portfolios from artists specializing in {guide.displayName} tattoos.
                  Search by location and connect via Instagram.
                </p>
                <Link
                  href={`/search?style=${styleSlug}`}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-ink-black text-paper-white font-mono text-xs uppercase tracking-[0.15em] border-2 border-ink-black hover:-translate-y-0.5 hover:shadow-md transition-all"
                >
                  Find {guide.displayName} Artists
                  <span aria-hidden="true">&rarr;</span>
                </Link>
              </section>
            </article>
          </div>
        </div>
      </main>
    </>
  )
}
