import type { Metadata } from 'next'
import Link from 'next/link'
import { getAllCityGuides } from '@/lib/content/editorial/guides'
import { STATES } from '@/lib/constants/cities'
import { serializeJsonLd } from '@/lib/utils/seo'

export const metadata: Metadata = {
  title: 'City Tattoo Guides | Inkdex',
  description:
    'In-depth guides to tattoo culture in cities across America. Discover the best neighborhoods, local styles, and what makes each scene unique.',
  openGraph: {
    title: 'City Tattoo Guides | Inkdex',
    description:
      'In-depth guides to tattoo culture in cities across America. Discover the best neighborhoods, local styles, and what makes each scene unique.',
    type: 'website',
    siteName: 'Inkdex',
  },
  alternates: {
    canonical: 'https://inkdex.io/guides',
  },
}

export default function GuidesIndexPage() {
  const guides = getAllCityGuides()

  // Group guides by state
  const guidesByState = guides.reduce(
    (acc, guide) => {
      const state = STATES.find(
        (s) => s.slug === guide.stateSlug || s.code.toLowerCase() === guide.stateSlug
      )
      const stateName = state?.name || guide.stateSlug
      if (!acc[stateName]) {
        acc[stateName] = []
      }
      acc[stateName].push(guide)
      return acc
    },
    {} as Record<string, typeof guides>
  )

  // Sort states alphabetically
  const sortedStates = Object.keys(guidesByState).sort()

  // CollectionPage schema
  const collectionSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'City Tattoo Guides',
    description:
      'In-depth guides to tattoo culture in cities across America.',
    url: 'https://inkdex.io/guides',
    publisher: {
      '@type': 'Organization',
      name: 'Inkdex',
      url: 'https://inkdex.io',
    },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: guides.length,
      itemListElement: guides.map((guide, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: `https://inkdex.io/guides/${guide.citySlug}`,
        name: guide.title,
      })),
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(collectionSchema) }}
      />

      <main className="min-h-screen bg-bg-primary">
        {/* Hero Section */}
        <header className="border-b border-border-subtle">
          <div className="max-w-4xl mx-auto px-4 py-16 md:py-24">
            <nav className="mb-8">
              <Link
                href="/"
                className="text-sm text-text-tertiary hover:text-text-primary transition-colors"
              >
                &larr; Back to Inkdex
              </Link>
            </nav>

            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-text-primary mb-6 tracking-tight">
              City Tattoo Guides
            </h1>
            <p className="font-body text-lg md:text-xl text-text-secondary max-w-2xl leading-relaxed">
              Deep dives into America&apos;s tattoo scenes. Discover the neighborhoods,
              styles, and culture that define each city&apos;s ink community.
            </p>
          </div>
        </header>

        {/* Guides Grid */}
        <section className="max-w-4xl mx-auto px-4 py-12 md:py-16">
          {guides.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-text-secondary text-lg">
                Guides coming soon. Check back for in-depth city coverage.
              </p>
            </div>
          ) : (
            <div className="space-y-16">
              {sortedStates.map((stateName) => (
                <div key={stateName}>
                  <h2 className="font-display text-2xl font-bold text-text-primary mb-6 pb-2 border-b border-border-subtle">
                    {stateName}
                  </h2>
                  <div className="grid gap-6 md:grid-cols-2">
                    {guidesByState[stateName].map((guide) => (
                      <Link
                        key={guide.citySlug}
                        href={`/guides/${guide.citySlug}`}
                        className="group block p-6 bg-bg-secondary rounded-lg hover:shadow-md transition-all duration-200 border border-transparent hover:border-border-subtle"
                      >
                        <h3 className="font-display text-xl font-semibold text-text-primary mb-2 group-hover:text-ink-black transition-colors">
                          {guide.title.replace(': A Complete Guide', '')}
                        </h3>
                        <p className="font-body text-sm text-text-secondary line-clamp-2">
                          {guide.metaDescription}
                        </p>
                        <div className="mt-4 flex items-center gap-2 text-xs text-text-tertiary">
                          <span>{guide.neighborhoods.length} neighborhoods</span>
                          <span>&middot;</span>
                          <span>
                            {guide.relatedStyles?.slice(0, 3).join(', ')}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* CTA Section */}
        <section className="border-t border-border-subtle bg-bg-secondary">
          <div className="max-w-4xl mx-auto px-4 py-12 text-center">
            <h2 className="font-display text-2xl font-bold text-text-primary mb-4">
              Looking for artists?
            </h2>
            <p className="font-body text-text-secondary mb-6">
              Search by image, style, or location to find your perfect match.
            </p>
            <Link
              href="/"
              className="inline-flex items-center justify-center px-6 py-3 bg-ink-black text-paper-white font-medium rounded-lg hover:bg-gray-900 transition-colors"
            >
              Search Artists
            </Link>
          </div>
        </section>
      </main>
    </>
  )
}
