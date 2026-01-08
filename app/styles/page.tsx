import type { Metadata } from 'next'
import Link from 'next/link'
import FAQSection from '@/components/seo/FAQSection'
import CTASection from '@/components/seo/CTASection'
import { serializeJsonLd, sanitizeForJsonLd } from '@/lib/utils/seo'
import { stylesHubContent } from '@/lib/content/styles-hub'
import { hasStyleGuide } from '@/lib/content/editorial/style-guides'

export const metadata: Metadata = {
  title: `${stylesHubContent.title} | Inkdex`,
  description: stylesHubContent.metaDescription,
  openGraph: {
    title: stylesHubContent.title,
    description: stylesHubContent.metaDescription,
    type: 'article',
    siteName: 'Inkdex',
    publishedTime: stylesHubContent.publishedAt,
    modifiedTime: stylesHubContent.updatedAt,
  },
  twitter: {
    card: 'summary_large_image',
    title: stylesHubContent.title,
    description: stylesHubContent.metaDescription,
  },
  alternates: {
    canonical: 'https://inkdex.io/styles',
  },
}

export default function StylesHubPage() {
  const { hero, definition, styles, faqs } = stylesHubContent

  // Article schema
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: sanitizeForJsonLd('Tattoo Styles Guide: Major Styles Explained'),
    description: sanitizeForJsonLd(stylesHubContent.metaDescription),
    datePublished: stylesHubContent.publishedAt,
    dateModified: stylesHubContent.updatedAt,
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
      '@id': 'https://inkdex.io/styles',
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
        name: 'Styles',
        item: 'https://inkdex.io/styles',
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
              <span className="text-text-secondary">Styles</span>
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
                Search by Style
                <span aria-hidden="true">&rarr;</span>
              </Link>
              <Link
                href="/guides/styles"
                className="inline-flex items-center px-6 py-3 font-mono text-xs uppercase tracking-[0.15em] text-text-secondary border-2 border-border-subtle hover:border-ink-black hover:text-ink-black transition-all"
              >
                Style Guides
              </Link>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="max-w-5xl mx-auto px-4 py-12 md:py-16">
          {/* AI Definition */}
          <p
            className="font-body text-text-secondary leading-relaxed [&_strong]:text-text-primary [&_strong]:font-semibold mb-12 max-w-3xl"
            dangerouslySetInnerHTML={{ __html: definition }}
          />

          {/* Styles Grid */}
          <div className="grid md:grid-cols-2 gap-6 mb-16">
            {styles.map((style) => {
              const hasGuide = hasStyleGuide(style.slug)
              return (
                <article
                  key={style.slug}
                  className="p-6 border-2 border-border-subtle bg-white hover:border-ink-black transition-colors group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h2 className="font-display text-xl font-bold text-text-primary">
                      {style.name}
                    </h2>
                    {hasGuide && (
                      <Link
                        href={`/guides/styles/${style.slug}`}
                        className="font-mono text-[10px] uppercase tracking-wider text-text-tertiary hover:text-ink-black transition-colors"
                      >
                        Full Guide →
                      </Link>
                    )}
                  </div>

                  <p className="font-body text-sm text-text-secondary leading-relaxed mb-4">
                    {style.description}
                  </p>

                  {/* Characteristics */}
                  <div className="flex flex-wrap gap-2">
                    {style.characteristics.map((char) => (
                      <span
                        key={char}
                        className="px-2 py-1 bg-bg-secondary text-text-tertiary font-mono text-[10px] uppercase tracking-wider"
                      >
                        {char}
                      </span>
                    ))}
                  </div>

                  {/* Browse artists link */}
                  <Link
                    href={`/search?style=${style.slug}`}
                    className="mt-4 inline-flex items-center gap-1 font-mono text-xs uppercase tracking-wider text-text-tertiary hover:text-ink-black transition-colors"
                  >
                    Browse {style.name} Artists
                    <span aria-hidden="true">→</span>
                  </Link>
                </article>
              )
            })}
          </div>

          {/* FAQ Section */}
          <section id="faq" className="mb-12">
            <FAQSection faqs={faqs} title="Frequently Asked Questions" label="" />
          </section>

          {/* Bottom CTA */}
          <CTASection
            headline="Not sure which style fits you?"
            description="Upload a reference image and Inkdex will find artists whose work matches—no style knowledge required."
            buttons={[
              { label: 'Try Visual Search', href: '/search', variant: 'primary' },
              { label: 'Browse All Artists', href: '/united-states', variant: 'secondary' },
            ]}
            className="mt-16"
          />
        </div>
      </main>
    </>
  )
}
