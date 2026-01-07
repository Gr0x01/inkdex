import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { getLocationArtists, getStyleSeeds } from '@/lib/supabase/queries'
import { sanitizeForJsonLd, serializeJsonLd } from '@/lib/utils/seo'
import { getCountryName, getRegionName, slugToName } from '@/lib/utils/location'
import ArtistCard from '@/components/search/ArtistCard'
import { transformToSearchResult } from '@/lib/utils/artists'
import Pagination from '@/components/pagination/Pagination'
import FAQSection from '@/components/seo/FAQSection'
import { getCityFAQs } from '@/lib/content/editorial/city-faqs'
import { getCityGuide } from '@/lib/content/editorial/guides'

// Validation patterns
const COUNTRY_CODE_REGEX = /^[a-z]{2}$/
const REGION_REGEX = /^[a-z0-9-]+$/
const CITY_SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

// Use ISR with dynamicParams to avoid N+1 queries at build time
// Pages are generated on-demand and cached for 24 hours
export const dynamicParams = true
export const revalidate = 86400 // 24 hours

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ country: string; region: string; city: string }>
  searchParams: Promise<{ page?: string }>
}): Promise<Metadata> {
  const { country: countrySlug, region: regionSlug, city: citySlug } = await params
  const { page } = await searchParams
  const currentPage = parseInt(page || '1', 10)

  if (!COUNTRY_CODE_REGEX.test(countrySlug) || !REGION_REGEX.test(regionSlug) || !CITY_SLUG_REGEX.test(citySlug)) {
    return { title: 'City Not Found' }
  }

  const countryCode = countrySlug.toUpperCase()
  const regionCode = regionSlug.toUpperCase()
  const cityName = slugToName(citySlug)
  const regionName = getRegionName(regionCode, countryCode)

  const title = `Tattoo Artists in ${cityName}, ${regionCode} | Inkdex`
  const description = `Discover talented tattoo artists in ${cityName}, ${regionName}. Browse portfolios, view styles, and connect via Instagram.`

  // Canonical URL (page 1 = no query param, page 2+ = ?page=N)
  const canonical = currentPage === 1
    ? `https://inkdex.io/${countrySlug}/${regionSlug}/${citySlug}`
    : `https://inkdex.io/${countrySlug}/${regionSlug}/${citySlug}?page=${currentPage}`

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
      canonical,
    },
  }
}

export default async function CityPage({
  params,
  searchParams,
}: {
  params: Promise<{ country: string; region: string; city: string }>
  searchParams: Promise<{ page?: string }>
}) {
  const { country: countrySlug, region: regionSlug, city: citySlug } = await params
  const { page } = await searchParams

  // Validate params format
  if (!COUNTRY_CODE_REGEX.test(countrySlug) || !REGION_REGEX.test(regionSlug) || !CITY_SLUG_REGEX.test(citySlug)) {
    notFound()
  }

  const countryCode = countrySlug.toUpperCase()
  const regionCode = regionSlug.toUpperCase()
  const cityName = slugToName(citySlug)
  const countryName = getCountryName(countryCode)
  const regionName = getRegionName(regionCode, countryCode)

  // Parse pagination
  const currentPage = parseInt(page || '1', 10)
  const limit = 20
  const offset = (currentPage - 1) * limit

  // Fetch artists for this city
  const { artists, total } = await getLocationArtists(countryCode, regionCode, cityName, limit, offset)

  // If no artists found for this city, return 404
  if (total === 0) notFound()

  // Transform to SearchResult format for ArtistCard
  const searchResults = artists.map(artist =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- transformToSearchResult accepts flexible artist type
    transformToSearchResult(artist as any, cityName)
  )

  const styleSeeds = await getStyleSeeds()
  const totalPages = Math.ceil(total / limit)
  const cityFAQs = getCityFAQs(citySlug)
  const cityGuide = getCityGuide(citySlug)

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
      {
        '@type': 'ListItem',
        position: 4,
        name: sanitizeForJsonLd(cityName),
        item: `https://inkdex.io/${countrySlug}/${regionSlug}/${citySlug}`,
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
        <div className="container mx-auto px-4 pt-4 md:pt-8 lg:pt-16 pb-6 md:pb-12">
          {/* Breadcrumbs */}
          <nav className="font-body text-small text-text-secondary mb-4" aria-label="Breadcrumb">
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
              <li>
                <Link
                  href={`/${countrySlug}/${regionSlug}`}
                  className="hover:text-accent-primary transition-colors"
                >
                  {regionName}
                </Link>
              </li>
              <li>/</li>
              <li aria-current="page" className="text-text-primary">
                {cityName}
              </li>
            </ol>
          </nav>

          {/* Header */}
          <div className="mb-8">
            <h1 className="font-display text-display font-[700] text-text-primary mb-3">
              {cityName}, {regionCode} Tattoo Artists
            </h1>
            <p className="font-body text-body-large text-text-secondary">
              {total.toLocaleString()} talented {total === 1 ? 'artist' : 'artists'}{' '}
              in {cityName}
            </p>
          </div>

          {/* Description */}
          <div className="mb-8 max-w-4xl">
            <p className="font-body text-body text-text-secondary">
              Browse tattoo artists based in {cityName}, {regionName}. Discover talented artists, view their portfolios, and connect via Instagram.
            </p>
            {cityGuide && (
              <Link
                href={`/guides/${citySlug}`}
                className="inline-flex items-center gap-2 mt-4 text-accent-primary hover:text-accent-secondary transition-colors font-body text-body"
              >
                <span>Read our {cityName} tattoo guide</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            )}
          </div>

          {/* Artists Grid */}
          {artists.length > 0 ? (
            <>
              <div className="grid gap-2 md:gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {searchResults.map((artist) => (
                  <ArtistCard
                    key={artist.artist_id}
                    artist={artist}
                    displayMode="browse"
                  />
                ))}
              </div>

              {/* Pagination */}
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                buildUrl={(pageNum) =>
                  pageNum === 1
                    ? `/${countrySlug}/${regionSlug}/${citySlug}`
                    : `/${countrySlug}/${regionSlug}/${citySlug}?page=${pageNum}`
                }
              />
            </>
          ) : (
            <div className="text-center py-16">
              <p className="font-body text-body text-text-secondary">
                No artists found in {cityName} yet.
              </p>
              <Link href={`/${countrySlug}/${regionSlug}`} className="btn btn-secondary mt-6">
                View Other Cities in {regionName}
              </Link>
            </div>
          )}

          {/* Browse by Style Section (Internal Linking for SEO) */}
          {styleSeeds.length > 0 && (
            <div className="mt-16 pt-12 border-t border-neutral-800">
              <div className="mb-8">
                <h2 className="font-display text-heading-2 font-[700] text-text-primary mb-3">
                  Browse by Style in {cityName}
                </h2>
                <p className="font-body text-body text-text-secondary">
                  Explore tattoo artists specializing in different styles
                </p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 md:gap-4">
                {styleSeeds.map((style) => (
                  <Link
                    key={style.style_name}
                    href={`/${countrySlug}/${regionSlug}/${citySlug}/${style.style_name}`}
                    className="group block relative"
                  >
                    {/* Image Container */}
                    <div className="aspect-[3/4] relative overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900 mb-3 group-hover:border-accent-primary transition-all duration-300">
                      <Image
                        src={style.seed_image_url}
                        alt={`Browse ${style.display_name} tattoo artists in ${cityName}, ${regionCode}`}
                        fill
                        className="object-cover group-hover:scale-[1.02] transition-transform duration-500"
                        sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 20vw"
                        loading="lazy"
                        quality={90}
                      />
                      {/* Subtle vignette */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />

                      {/* Hover state accent bar */}
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-accent-primary transform translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                    </div>

                    {/* Text Content */}
                    <div className="space-y-1">
                      <h3 className="font-display text-body-large font-[700] text-text-primary group-hover:text-accent-primary transition-colors leading-tight">
                        {style.display_name}
                      </h3>
                      <p className="font-body text-small text-text-secondary line-clamp-2 leading-relaxed">
                        {style.description.split('.')[0]}
                      </p>
                    </div>

                    {/* Arrow indicator on hover */}
                    <div className="mt-2 flex items-center gap-1 text-text-secondary group-hover:text-accent-primary transition-colors">
                      <span className="font-mono text-xs uppercase tracking-wider">Explore</span>
                      <svg
                        className="w-3 h-3 transform group-hover:translate-x-1 transition-transform duration-300"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* FAQ Section (for SEO featured snippets) */}
          {cityFAQs && cityFAQs.length > 0 && (
            <div className="mt-16 pt-12 border-t border-border-subtle">
              <FAQSection faqs={cityFAQs} />
            </div>
          )}
        </div>
      </main>
    </>
  )
}
