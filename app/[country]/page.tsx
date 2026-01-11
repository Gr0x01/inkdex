import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { getRegionsWithCounts, getCountryEditorialContent } from '@/lib/supabase/queries'
import { sanitizeForJsonLd, serializeJsonLd } from '@/lib/utils/seo'
import { getCountryName, getRegionName } from '@/lib/utils/location'

interface RegionData {
  region: string
  region_name: string
  artist_count: number
}

// Validation pattern for country code
const COUNTRY_CODE_REGEX = /^[a-z]{2}$/

// Use ISR with dynamicParams to avoid build-time queries
// Pages are generated on-demand and cached for 24 hours
export const dynamicParams = true
export const revalidate = 86400 // 24 hours

export async function generateMetadata({
  params,
}: {
  params: Promise<{ country: string }>
}): Promise<Metadata> {
  const { country: countrySlug } = await params

  if (!COUNTRY_CODE_REGEX.test(countrySlug)) {
    return { title: 'Country Not Found' }
  }

  const countryCode = countrySlug.toUpperCase()
  const countryName = getCountryName(countryCode)
  const title = `Tattoo Artists in ${countryName} | Inkdex`
  const description = `Discover talented tattoo artists across ${countryName}. Browse portfolios, find artists by region and city, and connect via Instagram.`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      siteName: 'Inkdex',
      // OG image generated dynamically by opengraph-image.tsx
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      // Twitter image generated dynamically by opengraph-image.tsx
    },
    alternates: {
      canonical: `https://inkdex.io/${countrySlug}`,
    },
  }
}

export default async function CountryPage({
  params,
}: {
  params: Promise<{ country: string }>
}) {
  const { country: countrySlug } = await params

  // Validate country code format
  if (!COUNTRY_CODE_REGEX.test(countrySlug)) {
    notFound()
  }

  const countryCode = countrySlug.toUpperCase()
  const countryName = getCountryName(countryCode)

  // Fetch regions with artist counts and editorial content in parallel
  const [regions, editorialContent] = await Promise.all([
    getRegionsWithCounts(countryCode),
    getCountryEditorialContent(countryCode),
  ])

  // If no regions found, return 404
  if (!regions || regions.length === 0) {
    notFound()
  }

  // Calculate total artists
  const totalArtists = regions.reduce((sum, r) => sum + (r.artist_count || 0), 0)

  // JSON-LD Breadcrumbs
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://inkdex.io',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: sanitizeForJsonLd(countryName),
        item: `https://inkdex.io/${countrySlug}`,
      },
    ],
  }

  return (
    <main className="min-h-screen bg-bg-primary">
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />

      {/* Hero Section */}
      <header className="border-b border-border-subtle">
        <div className="max-w-7xl mx-auto px-4 py-12 md:py-16">
          {/* Breadcrumbs */}
          <nav className="mb-8 flex items-center gap-2 text-sm text-text-tertiary flex-wrap" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-text-primary transition-colors">
              Inkdex
            </Link>
            <span>/</span>
            <span className="text-text-secondary">{countryName}</span>
          </nav>

          {/* Header */}
          <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-text-primary mb-4 tracking-tight">
            {countryName} Tattoo Artists
          </h1>
          <p className="font-body text-lg text-text-secondary max-w-2xl mb-6">
            Explore {totalArtists.toLocaleString()} talented tattoo artists
            across {regions.length} {regions.length === 1 ? 'state' : 'states'} in {countryName}.
          </p>

          {/* Action Links */}
          <div className="flex flex-wrap gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-ink-black text-paper-white font-mono text-xs uppercase tracking-[0.15em] border-2 border-ink-black hover:-translate-y-0.5 hover:shadow-md transition-all"
            >
              Search by Image
            </Link>
          </div>

          {/* Editorial Content (if available) */}
          {editorialContent && (
            <div className="mt-10 max-w-3xl">
              <p className="font-body text-base text-text-secondary leading-relaxed">
                {editorialContent.heroText}
              </p>
            </div>
          )}
        </div>
      </header>

      {/* Editorial Scene Section (if available) */}
      {editorialContent && (
        <section className="border-b border-border-subtle">
          <div className="max-w-7xl mx-auto px-4 py-12 md:py-16">
            <div className="max-w-3xl">
              {editorialContent.sceneHeading && (
                <h2 className="font-display text-2xl font-bold text-text-primary mb-4">
                  {editorialContent.sceneHeading}
                </h2>
              )}
              <p className="font-body text-base text-text-secondary leading-relaxed mb-6">
                {editorialContent.sceneText}
              </p>

              {editorialContent.tipsHeading && (
                <h3 className="font-display text-xl font-bold text-text-primary mb-3">
                  {editorialContent.tipsHeading}
                </h3>
              )}
              <p className="font-body text-base text-text-secondary leading-relaxed">
                {editorialContent.tipsText}
              </p>

              {/* Major Cities */}
              {editorialContent.majorCities && editorialContent.majorCities.length > 0 && (
                <div className="mt-6 pt-6 border-t border-border-subtle">
                  <p className="font-mono text-xs uppercase tracking-wider text-text-tertiary mb-2">
                    Major Tattoo Cities
                  </p>
                  <p className="font-body text-sm text-text-secondary">
                    {editorialContent.majorCities.join(' • ')}
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Regions Grid */}
      <section className="max-w-7xl mx-auto px-4 py-12 md:py-16">
        <div className="mb-8 flex items-center justify-between">
          <h2 className="font-display text-2xl font-bold text-text-primary">
            States in {countryName}
          </h2>
          <p className="font-mono text-xs uppercase tracking-wider text-text-tertiary">
            {regions.length} {regions.length === 1 ? 'state' : 'states'}
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {regions.map((region: RegionData) => {
            const regionSlug = region.region.toLowerCase()
            const displayName = getRegionName(region.region, countryCode)

            return (
              <Link
                key={region.region}
                href={`/${countrySlug}/${regionSlug}`}
                className="group p-6 border-2 border-border-subtle hover:border-ink-black hover:-translate-y-1 hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display text-xl font-bold text-text-primary mb-1 group-hover:text-ink-black transition-colors truncate">
                      {displayName}
                    </h3>
                    <p className="font-mono text-xs uppercase tracking-wider text-text-tertiary">
                      {region.artist_count} {region.artist_count === 1 ? 'artist' : 'artists'}
                    </p>
                  </div>

                  <svg
                    className="w-5 h-5 text-text-tertiary group-hover:text-ink-black group-hover:translate-x-1 transition-all flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </Link>
            )
          })}
        </div>
      </section>
    </main>
  )
}
