import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { getCitiesWithCounts } from '@/lib/supabase/queries'
import { sanitizeForJsonLd, serializeJsonLd } from '@/lib/utils/seo'
import { getCountryName, getRegionName, nameToSlug } from '@/lib/utils/location'

interface CityData {
  city: string
  region: string
  country_code: string
  artist_count: number
}

// Validation patterns
const COUNTRY_CODE_REGEX = /^[a-z]{2}$/
const REGION_REGEX = /^[a-z0-9-]+$/

// Use ISR with dynamicParams to avoid N+1 queries at build time
// Pages are generated on-demand and cached for 24 hours
export const dynamicParams = true
export const revalidate = 86400 // 24 hours

export async function generateMetadata({
  params,
}: {
  params: Promise<{ country: string; region: string }>
}): Promise<Metadata> {
  const { country: countrySlug, region: regionSlug } = await params

  if (!COUNTRY_CODE_REGEX.test(countrySlug) || !REGION_REGEX.test(regionSlug)) {
    return { title: 'Region Not Found' }
  }

  const countryCode = countrySlug.toUpperCase()
  const regionCode = regionSlug.toUpperCase()
  const regionName = getRegionName(regionCode, countryCode)

  const title = `Tattoo Artists in ${regionName}, ${countryCode} | Inkdex`
  const description = `Discover talented tattoo artists across ${regionName}. Browse portfolios, find artists by city, and connect via Instagram.`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      siteName: 'Inkdex',
      images: [
        {
          url: '/og-region-default.jpg',
          width: 1200,
          height: 630,
          alt: `Tattoo Artists in ${regionName}`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/og-region-default.jpg'],
    },
    alternates: {
      canonical: `/${countrySlug}/${regionSlug}`,
    },
  }
}

export default async function RegionPage({
  params,
}: {
  params: Promise<{ country: string; region: string }>
}) {
  const { country: countrySlug, region: regionSlug } = await params

  // Validate params format
  if (!COUNTRY_CODE_REGEX.test(countrySlug) || !REGION_REGEX.test(regionSlug)) {
    notFound()
  }

  const countryCode = countrySlug.toUpperCase()
  const regionCode = regionSlug.toUpperCase()
  const countryName = getCountryName(countryCode)
  const regionName = getRegionName(regionCode, countryCode)

  // Fetch cities with artist counts for this region
  const cities = await getCitiesWithCounts(1, countryCode, regionCode) // min_count = 1

  // If no cities found, return 404
  if (!cities || cities.length === 0) {
    notFound()
  }

  // Calculate total artists
  const totalArtists = cities.reduce((sum, c) => sum + (c.artist_count || 0), 0)

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
      {
        '@type': 'ListItem',
        position: 3,
        name: sanitizeForJsonLd(regionName),
        item: `https://inkdex.io/${countrySlug}/${regionSlug}`,
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
            <Link href={`/${countrySlug}`} className="hover:text-text-primary transition-colors">
              {countryName}
            </Link>
            <span>/</span>
            <span className="text-text-secondary">{regionName}</span>
          </nav>

          {/* Header */}
          <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-text-primary mb-4 tracking-tight">
            {regionName} Tattoo Artists
          </h1>
          <p className="font-body text-lg text-text-secondary max-w-2xl mb-6">
            Explore {totalArtists.toLocaleString()} talented tattoo artists
            across {cities.length} {cities.length === 1 ? 'city' : 'cities'} in {regionName}.
          </p>

          {/* Action Links */}
          <div className="flex flex-wrap gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-ink-black text-paper-white font-mono text-xs uppercase tracking-[0.15em] border-2 border-ink-black hover:-translate-y-0.5 hover:shadow-md transition-all"
            >
              Search by Image
            </Link>
            <Link
              href={`/${countrySlug}`}
              className="inline-flex items-center px-4 py-3 font-mono text-xs uppercase tracking-[0.15em] text-text-secondary border-2 border-border-subtle hover:border-ink-black hover:text-ink-black transition-all"
            >
              All {countryName} States
            </Link>
          </div>
        </div>
      </header>

      {/* Cities Grid */}
      <section className="max-w-7xl mx-auto px-4 py-12 md:py-16">
        <div className="mb-8 flex items-center justify-between">
          <h2 className="font-display text-2xl font-bold text-text-primary">
            Cities in {regionName}
          </h2>
          <p className="font-mono text-xs uppercase tracking-wider text-text-tertiary">
            {cities.length} {cities.length === 1 ? 'city' : 'cities'}
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cities.map((city: CityData) => {
            const citySlug = nameToSlug(city.city)

            return (
              <Link
                key={`${city.city}-${city.region}`}
                href={`/${countrySlug}/${regionSlug}/${citySlug}`}
                className="group p-6 border-2 border-border-subtle hover:border-ink-black hover:-translate-y-1 hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display text-xl font-bold text-text-primary mb-1 group-hover:text-ink-black transition-colors truncate">
                      {city.city}
                    </h3>
                    <p className="font-mono text-xs uppercase tracking-wider text-text-tertiary">
                      {city.artist_count} {city.artist_count === 1 ? 'artist' : 'artists'}
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
