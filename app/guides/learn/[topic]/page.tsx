import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { getTopicalGuide, getAllTopicalGuides } from '@/lib/content/editorial/topical-guides'
import { TOPICAL_CATEGORIES } from '@/lib/content/editorial/topical-guides-types'
import TableOfContents from '@/components/guides/TableOfContents'
import FAQSection from '@/components/seo/FAQSection'
import { serializeJsonLd, sanitizeForJsonLd } from '@/lib/utils/seo'

// Static generation for all topical guides
export async function generateStaticParams() {
  const guides = getAllTopicalGuides()
  return guides.map((guide) => ({
    topic: guide.topicSlug,
  }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ topic: string }>
}): Promise<Metadata> {
  const { topic: topicSlug } = await params
  const guide = getTopicalGuide(topicSlug)

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
      canonical: `https://inkdex.io/guides/learn/${topicSlug}`,
    },
  }
}

export default async function TopicalGuidePage({
  params,
}: {
  params: Promise<{ topic: string }>
}) {
  const { topic: topicSlug } = await params
  const guide = getTopicalGuide(topicSlug)

  if (!guide) {
    notFound()
  }

  const category = TOPICAL_CATEGORIES.find((c) => c.slug === guide.category)

  // Build table of contents
  const tocItems = [
    { id: 'introduction', label: 'Introduction' },
    ...guide.sections.map((s, i) => ({
      id: `section-${i}`,
      label: s.heading || `Section ${i + 1}`,
    })),
    ...(guide.steps?.length ? [{ id: 'steps', label: 'Step-by-Step' }] : []),
    ...(guide.keyTakeaways?.length ? [{ id: 'takeaways', label: 'Key Takeaways' }] : []),
    ...(guide.faqs?.length ? [{ id: 'faq', label: 'FAQ' }] : []),
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
      '@id': `https://inkdex.io/guides/learn/${topicSlug}`,
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
        name: 'Learn',
        item: 'https://inkdex.io/guides/learn',
      },
      {
        '@type': 'ListItem',
        position: 4,
        name: guide.title,
        item: `https://inkdex.io/guides/learn/${topicSlug}`,
      },
    ],
  }

  // FAQ schema if FAQs exist
  const faqSchema = guide.faqs?.length
    ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: guide.faqs.map((faq) => ({
          '@type': 'Question',
          name: sanitizeForJsonLd(faq.question),
          acceptedAnswer: {
            '@type': 'Answer',
            text: sanitizeForJsonLd(faq.answer),
          },
        })),
      }
    : null

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
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(faqSchema) }}
        />
      )}

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
                href="/guides/learn"
                className="hover:text-text-primary transition-colors"
              >
                Learn
              </Link>
              <span>/</span>
              <span className="text-text-secondary">{guide.title.split(':')[0]}</span>
            </nav>

            {category && (
              <span className="inline-block mb-4 font-mono text-xs uppercase tracking-[0.15em] text-text-tertiary">
                {category.name}
              </span>
            )}

            <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-text-primary mb-6 tracking-tight leading-tight">
              {guide.title}
            </h1>

            <p className="font-body text-lg text-text-secondary max-w-2xl mb-8">
              {guide.metaDescription}
            </p>

            {/* Related topics */}
            {guide.relatedTopics && guide.relatedTopics.length > 0 && (
              <div className="flex flex-wrap gap-4">
                {guide.relatedTopics.slice(0, 3).map((topic) => (
                  <Link
                    key={topic}
                    href={`/guides/learn/${topic}`}
                    className="inline-flex items-center px-4 py-3 font-mono text-xs uppercase tracking-[0.15em] text-text-secondary border-2 border-border-subtle hover:border-ink-black hover:text-ink-black transition-all"
                  >
                    {topic.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                  </Link>
                ))}
              </div>
            )}
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

              {/* Main Content Sections */}
              {guide.sections.map((section, index) => (
                <section
                  key={index}
                  id={`section-${index}`}
                  className="mb-12 scroll-mt-24"
                >
                  {section.heading && (
                    <h2 className="font-display text-2xl md:text-3xl font-bold text-text-primary mb-6">
                      {section.heading}
                    </h2>
                  )}
                  <div className="space-y-4">
                    {section.paragraphs.map((p, i) => (
                      <p
                        key={i}
                        className="font-body text-text-secondary leading-relaxed"
                      >
                        {p}
                      </p>
                    ))}
                  </div>
                </section>
              ))}

              {/* Step-by-Step Guide */}
              {guide.steps && guide.steps.length > 0 && (
                <section id="steps" className="mb-12 scroll-mt-24">
                  <h2 className="font-display text-2xl md:text-3xl font-bold text-text-primary mb-8">
                    Step-by-Step Guide
                  </h2>
                  <div className="space-y-8">
                    {guide.steps.map((step) => (
                      <div
                        key={step.number}
                        className="relative pl-12 pb-8 border-l-2 border-border-subtle last:pb-0"
                      >
                        <span className="absolute left-0 -translate-x-1/2 w-8 h-8 bg-ink-black text-paper-white font-mono text-sm flex items-center justify-center">
                          {step.number}
                        </span>
                        <h3 className="font-display text-xl font-semibold text-text-primary mb-3">
                          {step.title}
                        </h3>
                        <div className="space-y-3">
                          {step.description.map((d, i) => (
                            <p
                              key={i}
                              className="font-body text-text-secondary leading-relaxed"
                            >
                              {d}
                            </p>
                          ))}
                        </div>
                        {step.tips && step.tips.length > 0 && (
                          <div className="mt-4 p-4 bg-bg-secondary border-l-4 border-ink-black">
                            <p className="font-mono text-xs uppercase tracking-wider text-text-tertiary mb-2">
                              Tips
                            </p>
                            <ul className="space-y-1">
                              {step.tips.map((tip, i) => (
                                <li
                                  key={i}
                                  className="font-body text-sm text-text-secondary"
                                >
                                  {tip}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Key Takeaways */}
              {guide.keyTakeaways && guide.keyTakeaways.length > 0 && (
                <section id="takeaways" className="mb-12 scroll-mt-24">
                  <h2 className="font-display text-2xl md:text-3xl font-bold text-text-primary mb-6">
                    Key Takeaways
                  </h2>
                  <ul className="space-y-3">
                    {guide.keyTakeaways.map((takeaway, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-3 font-body text-text-secondary"
                      >
                        <span className="flex-shrink-0 w-1.5 h-1.5 mt-2 bg-ink-black" />
                        {takeaway}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* FAQ */}
              {guide.faqs && guide.faqs.length > 0 && (
                <section id="faq" className="mb-12 scroll-mt-24">
                  <FAQSection
                    faqs={guide.faqs}
                    title="Frequently Asked Questions"
                  />
                </section>
              )}

              {/* CTA */}
              <section className="mt-16 p-8 bg-bg-secondary border-2 border-border-subtle">
                <h2 className="font-display text-xl font-bold text-text-primary mb-3">
                  Ready to find your artist?
                </h2>
                <p className="font-body text-text-secondary mb-6">
                  Browse portfolios from talented tattoo artists.
                  Search by style, location, and connect via Instagram.
                </p>
                <Link
                  href="/search"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-ink-black text-paper-white font-mono text-xs uppercase tracking-[0.15em] border-2 border-ink-black hover:-translate-y-0.5 hover:shadow-md transition-all"
                >
                  Search Artists
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
