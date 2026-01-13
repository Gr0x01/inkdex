import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import {
  getCompetitorBySlug,
  getAllCompetitorSlugs,
} from '@/lib/content/alternatives'
import { getHomepageStats } from '@/lib/supabase/queries'
import TableOfContents from '@/components/guides/TableOfContents'
import FAQSection from '@/components/seo/FAQSection'
import { ComparisonTable, PainPointCard } from '@/components/alternatives'
import { InstagramButton } from '@/components/ui'
import { serializeJsonLd, sanitizeForJsonLd } from '@/lib/utils/seo'

// ISR: Revalidate every hour
export const revalidate = 3600

export async function generateStaticParams() {
  const slugs = getAllCompetitorSlugs()
  return slugs.map((competitor) => ({ competitor }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ competitor: string }>
}): Promise<Metadata> {
  const { competitor } = await params
  const content = getCompetitorBySlug(competitor)

  if (!content) {
    return { title: 'Comparison Not Found' }
  }

  return {
    title: `${content.title} | Inkdex`,
    description: content.metaDescription,
    keywords: content.keywords,
    openGraph: {
      title: content.title,
      description: content.metaDescription,
      type: 'article',
      siteName: 'Inkdex',
      publishedTime: content.publishedAt,
      modifiedTime: content.updatedAt,
    },
    twitter: {
      card: 'summary_large_image',
      title: content.title,
      description: content.metaDescription,
    },
    alternates: {
      canonical: `https://inkdex.io/alternatives/${competitor}`,
    },
  }
}

export default async function CompetitorPage({
  params,
}: {
  params: Promise<{ competitor: string }>
}) {
  const { competitor } = await params
  const content = getCompetitorBySlug(competitor)

  if (!content) {
    notFound()
  }

  // Fetch live stats
  const stats = await getHomepageStats().catch((error) => {
    console.error('Failed to fetch stats:', error)
    return {
      artistCount: 16000,
      imageCount: 99000,
      cityCount: 116,
      countryCount: 1,
    }
  })

  // Build table of contents
  const tocItems = [
    { id: 'introduction', label: 'Introduction' },
    { id: 'why-switch', label: 'Why Artists Are Switching' },
    { id: 'comparison', label: 'Feature Comparison' },
    { id: 'how-it-works', label: 'How It Works' },
    { id: 'faq', label: 'FAQ' },
  ]

  // Article schema
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: sanitizeForJsonLd(content.title),
    description: sanitizeForJsonLd(content.metaDescription),
    datePublished: content.publishedAt,
    dateModified: content.updatedAt,
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
      '@id': `https://inkdex.io/alternatives/${competitor}`,
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
        name: 'Alternatives',
        item: 'https://inkdex.io/alternatives',
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: `vs ${content.competitorName}`,
        item: `https://inkdex.io/alternatives/${competitor}`,
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
            <nav aria-label="Breadcrumb" className="mb-8 flex items-center gap-2 text-sm text-text-tertiary">
              <Link
                href="/"
                className="hover:text-text-primary transition-colors"
              >
                Inkdex
              </Link>
              <span>/</span>
              <Link
                href="/alternatives"
                className="hover:text-text-primary transition-colors"
              >
                Alternatives
              </Link>
              <span>/</span>
              <span className="text-text-secondary">{content.competitorName}</span>
            </nav>

            <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-text-primary mb-6 tracking-tight leading-tight">
              {content.hero.headline}
            </h1>

            <p className="font-body text-lg text-text-secondary max-w-2xl mb-8">
              {content.hero.subheadline}
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
                href="#comparison"
                className="inline-flex items-center px-6 py-3 font-mono text-xs uppercase tracking-[0.15em] text-text-secondary border-2 border-border-subtle hover:border-ink-black hover:text-ink-black transition-all"
              >
                See Comparison
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
              {/* Introduction */}
              <section id="introduction" className="mb-12 scroll-mt-24">
                <h2 className="font-display text-2xl md:text-3xl font-bold text-text-primary mb-6">
                  {content.introduction.heading}
                </h2>
                <div className="space-y-4">
                  {content.introduction.paragraphs.map((p, i) => (
                    <p
                      key={i}
                      className="font-body text-text-secondary leading-relaxed"
                    >
                      {p}
                    </p>
                  ))}
                </div>
              </section>

              {/* Why Artists Are Switching */}
              <section id="why-switch" className="mb-16 scroll-mt-24">
                <div className="mb-8">
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-tertiary">
                    Real Issues
                  </span>
                  <h2 className="font-display text-2xl md:text-3xl font-bold text-text-primary mt-2">
                    Why Artists Are Switching
                  </h2>
                </div>
                <div className="space-y-8 md:space-y-10">
                  {content.painPoints.map((point, i) => (
                    <PainPointCard
                      key={point.title}
                      index={i + 1}
                      {...point}
                    />
                  ))}
                </div>
              </section>

              {/* Feature Comparison */}
              <section id="comparison" className="mb-16 scroll-mt-24">
                <div className="mb-8">
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-tertiary">
                    Side by Side
                  </span>
                  <h2 className="font-display text-2xl md:text-3xl font-bold text-text-primary mt-2">
                    Feature Comparison
                  </h2>
                </div>
                <ComparisonTable
                  features={content.comparisonFeatures}
                  competitorName={content.competitorName}
                  className="mb-8"
                />
                <div className="flex flex-wrap justify-center gap-4">
                  <InstagramButton href="/add-artist">
                    Claim Your Profile →
                  </InstagramButton>
                  <Link
                    href="/"
                    className="inline-flex items-center gap-2 px-6 py-3 font-mono text-xs uppercase tracking-[0.15em] text-text-secondary border-2 border-border-subtle hover:border-ink-black hover:text-ink-black transition-all"
                  >
                    Search Artists
                    <span aria-hidden="true">&rarr;</span>
                  </Link>
                </div>
              </section>

              {/* How It Works */}
              <section id="how-it-works" className="mb-12 scroll-mt-24">
                <h2 className="font-display text-2xl md:text-3xl font-bold text-text-primary mb-6">
                  {content.howItWorks.heading}
                </h2>
                <ol className="space-y-6">
                  {content.howItWorks.steps.map((step) => (
                    <li key={step.number} className="flex gap-4">
                      <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-ink-black text-paper-white font-mono text-sm font-bold">
                        {step.number}
                      </span>
                      <div>
                        <h3 className="font-display text-lg font-semibold text-text-primary mb-1">
                          {step.title}
                        </h3>
                        <p className="font-body text-text-secondary">
                          {step.description}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>

              {/* FAQ Section */}
              <section id="faq" className="mb-12 scroll-mt-24">
                <FAQSection
                  faqs={content.faqs}
                  title="Frequently Asked Questions"
                  label=""
                />
              </section>

              {/* Bottom CTA */}
              <section className="mt-16 p-8 bg-bg-secondary border-2 border-border-subtle">
                <h2 className="font-display text-xl font-bold text-text-primary mb-3">
                  Ready to switch?
                </h2>
                <p className="font-body text-text-secondary mb-6">
                  Your portfolio might already be on Inkdex. Check if your
                  profile exists and claim it in under 2 minutes.
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
              </section>
            </article>
          </div>
        </div>
      </main>
    </>
  )
}
