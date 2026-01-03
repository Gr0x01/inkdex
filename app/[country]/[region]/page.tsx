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
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />

      <main className="min-h-screen bg-bg-primary relative noise-overlay">
        <div className="container mx-auto px-4 py-12 md:py-16">
          {/* Breadcrumbs */}
          <nav className="font-body text-small text-text-secondary mb-6" aria-label="Breadcrumb">
            <ol className="flex items-center gap-2">
              <li>
                <Link
                  href="/"
                  className="hover:text-accent-primary transition-colors"
                >
                  Home
                </Link>
              </li>
              <li>/</li>
              <li>
                <Link
                  href={`/${countrySlug}`}
                  className="hover:text-accent-primary transition-colors"
                >
                  {countryName}
                </Link>
              </li>
              <li>/</li>
              <li aria-current="page" className="text-text-primary">
                {regionName}
              </li>
            </ol>
          </nav>

          {/* Header */}
          <div className="mb-12">
            <h1 className="font-display text-display font-[700] text-text-primary mb-4">
              {regionName} Tattoo Artists
            </h1>
            <p className="font-body text-body-large text-text-secondary max-w-2xl">
              Explore {totalArtists.toLocaleString()} talented tattoo artists
              across {cities.length}{' '}
              {cities.length === 1 ? 'city' : 'cities'} in {regionName}.
            </p>
          </div>

          {/* Cities Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cities.map((city: CityData) => {
              const citySlug = nameToSlug(city.city)

              return (
                <Link
                  key={`${city.city}-${city.region}`}
                  href={`/${countrySlug}/${regionSlug}/${citySlug}`}
                  className="group bg-surface-low border border-border-subtle rounded-xl p-8 hover:border-accent-primary transition-all duration-medium lift-hover"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-display text-h3 font-[700] text-text-primary mb-2 group-hover:text-accent-primary transition-colors">
                        {city.city}
                      </h3>
                      <p className="font-body text-body text-text-secondary">
                        {city.artist_count} {city.artist_count === 1 ? 'artist' : 'artists'}
                      </p>
                    </div>

                    <svg
                      className="w-6 h-6 text-accent-primary group-hover:translate-x-1 transition-transform flex-shrink-0"
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
        </div>
      </main>
    </>
  )
}
