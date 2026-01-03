import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { getRegionsWithCounts } from '@/lib/supabase/queries'
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
      images: [
        {
          url: '/og-country-default.jpg',
          width: 1200,
          height: 630,
          alt: `Tattoo Artists in ${countryName}`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/og-country-default.jpg'],
    },
    alternates: {
      canonical: `/${countrySlug}`,
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

  // Fetch regions with artist counts
  const regions = await getRegionsWithCounts(countryCode)

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
              <li aria-current="page" className="text-text-primary">
                {countryName}
              </li>
            </ol>
          </nav>

          {/* Header */}
          <div className="mb-12">
            <h1 className="font-display text-display font-[700] text-text-primary mb-4">
              {countryName} Tattoo Artists
            </h1>
            <p className="font-body text-body-large text-text-secondary max-w-2xl">
              Explore {totalArtists.toLocaleString()} talented tattoo artists
              across {regions.length}{' '}
              {regions.length === 1 ? 'region' : 'regions'} in {countryName}.
            </p>
          </div>

          {/* Regions Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {regions.map((region: RegionData) => {
              const regionSlug = region.region.toLowerCase()
              const displayName = getRegionName(region.region, countryCode)

              return (
                <Link
                  key={region.region}
                  href={`/${countrySlug}/${regionSlug}`}
                  className="group bg-surface-low border border-border-subtle rounded-xl p-8 hover:border-accent-primary transition-all duration-medium lift-hover"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-display text-h3 font-[700] text-text-primary mb-2 group-hover:text-accent-primary transition-colors">
                        {displayName}
                      </h3>
                      <p className="font-body text-body text-text-secondary">
                        {region.artist_count} {region.artist_count === 1 ? 'artist' : 'artists'}
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
