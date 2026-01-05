import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { getArtistsByStyleSeed, getStyleSeedBySlug, getStyleSeeds } from '@/lib/supabase/queries'
import { sanitizeForJsonLd, serializeJsonLd } from '@/lib/utils/seo'
import { getCountryName, getRegionName, slugToName } from '@/lib/utils/location'
import ArtistCard from '@/components/search/ArtistCard'
import type { SearchResult } from '@/types/search'
import Pagination from '@/components/pagination/Pagination'

// Validation patterns
const COUNTRY_CODE_REGEX = /^[a-z]{2}$/
const REGION_REGEX = /^[a-z0-9-]+$/
const CITY_SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const STYLE_SLUG_REGEX = /^[a-z0-9-]+$/

// Use ISR with dynamicParams to avoid N+1 queries at build time
// Pages are generated on-demand and cached for 24 hours
export const dynamicParams = true
export const revalidate = 86400 // 24 hours

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ country: string; region: string; city: string; style: string }>
  searchParams: Promise<{ page?: string }>
}): Promise<Metadata> {
  const { country: countrySlug, region: regionSlug, city: citySlug, style: styleSlug } = await params
  const { page } = await searchParams
  const currentPage = parseInt(page || '1', 10)

  const styleSeed = await getStyleSeedBySlug(styleSlug)

  if (!COUNTRY_CODE_REGEX.test(countrySlug) || !REGION_REGEX.test(regionSlug) ||
      !CITY_SLUG_REGEX.test(citySlug) || !styleSeed) {
    return { title: 'Style Not Found' }
  }

  const regionCode = regionSlug.toUpperCase()
  const cityName = slugToName(citySlug)

  const title = sanitizeForJsonLd(`${styleSeed.display_name} Tattoo Artists in ${cityName}, ${regionCode} | Inkdex`)
  const description = sanitizeForJsonLd(
    `${styleSeed.description} Discover ${styleSeed.display_name.toLowerCase()} tattoo artists in ${cityName}. Browse portfolios and connect via Instagram.`
  )

  // Canonical URL
  const canonical = currentPage === 1
    ? `https://inkdex.io/${countrySlug}/${regionSlug}/${citySlug}/${styleSlug}`
    : `https://inkdex.io/${countrySlug}/${regionSlug}/${citySlug}/${styleSlug}?page=${currentPage}`

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
          url: '/og-style-default.jpg',
          width: 1200,
          height: 630,
          alt: sanitizeForJsonLd(`${styleSeed.display_name} Tattoo in ${cityName}, ${regionCode}`),
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/og-style-default.jpg'],
    },
    alternates: {
      canonical,
    },
  }
}

export default async function StylePage({
  params,
  searchParams,
}: {
  params: Promise<{ country: string; region: string; city: string; style: string }>
  searchParams: Promise<{ page?: string }>
}) {
  const { country: countrySlug, region: regionSlug, city: citySlug, style: styleSlug } = await params
  const { page } = await searchParams

  // Validate params
  if (!COUNTRY_CODE_REGEX.test(countrySlug) || !REGION_REGEX.test(regionSlug) ||
      !CITY_SLUG_REGEX.test(citySlug) || !STYLE_SLUG_REGEX.test(styleSlug)) {
    notFound()
  }

  const styleSeed = await getStyleSeedBySlug(styleSlug)
  if (!styleSeed) notFound()

  const countryCode = countrySlug.toUpperCase()
  const regionCode = regionSlug.toUpperCase()
  const cityName = slugToName(citySlug)
  const countryName = getCountryName(countryCode)
  const regionName = getRegionName(regionCode, countryCode)

  // Parse pagination
  const currentPage = parseInt(page || '1', 10)
  const limit = 20
  const offset = (currentPage - 1) * limit

  // Get artists whose work matches this style
  const { artists, total } = await getArtistsByStyleSeed(styleSeed, cityName, limit, offset)
  const totalPages = Math.ceil(total / limit)

  // JSON-LD Breadcrumbs
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: sanitizeForJsonLd('Home'),
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
      {
        '@type': 'ListItem',
        position: 5,
        name: sanitizeForJsonLd(styleSeed.display_name),
        item: `https://inkdex.io/${countrySlug}/${regionSlug}/${citySlug}/${styleSlug}`,
      },
    ],
  }

  return (
    <main className="min-h-screen bg-bg-primary">
      {/* JSON-LD Breadcrumbs */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />

      {/* Hero Section */}
      <header className="border-b border-border-subtle">
        <div className="max-w-4xl mx-auto px-4 py-12 md:py-16">
          {/* Breadcrumbs */}
          <nav className="mb-8 flex items-center gap-2 text-sm text-text-tertiary flex-wrap">
            <Link href="/" className="hover:text-text-primary transition-colors">
              Inkdex
            </Link>
            <span>/</span>
            <Link href={`/${countrySlug}/${regionSlug}`} className="hover:text-text-primary transition-colors">
              {regionName}
            </Link>
            <span>/</span>
            <Link href={`/${countrySlug}/${regionSlug}/${citySlug}`} className="hover:text-text-primary transition-colors">
              {cityName}
            </Link>
            <span>/</span>
            <span className="text-text-secondary">{styleSeed.display_name}</span>
          </nav>

          <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-text-primary mb-4 tracking-tight">
            {styleSeed.display_name} Tattoo Artists in {cityName}
          </h1>

          <p className="font-body text-lg text-text-secondary max-w-2xl mb-6">
            {styleSeed.description}
          </p>

          <p className="font-body text-text-tertiary mb-8">
            Showing <span className="font-medium text-text-primary">{total.toLocaleString()}</span> artists whose work matches the {styleSeed.display_name.toLowerCase()} style.
          </p>

          {/* Action Links */}
          <div className="flex flex-wrap gap-4">
            <Link
              href={`/${countrySlug}/${regionSlug}/${citySlug}`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-ink-black text-paper-white font-mono text-xs uppercase tracking-[0.15em] border-2 border-ink-black hover:-translate-y-0.5 hover:shadow-md transition-all"
            >
              All {cityName} Artists
            </Link>
            <Link
              href="/"
              className="inline-flex items-center px-4 py-3 font-mono text-xs uppercase tracking-[0.15em] text-text-secondary border-2 border-border-subtle hover:border-ink-black hover:text-ink-black transition-all"
            >
              Search by Image
            </Link>
          </div>
        </div>
      </header>

      {/* Artist Grid */}
      <section className="max-w-7xl mx-auto px-4 py-12 md:py-16">
        {artists.length === 0 ? (
          <div className="p-12 text-center border-2 border-border-subtle bg-bg-secondary">
            <p className="font-body text-lg text-text-secondary">
              No {styleSeed.display_name.toLowerCase()} artists found in {cityName} yet.
            </p>
            <p className="mt-2 font-body text-sm text-text-tertiary">
              Check back soon as we add more artists!
            </p>
          </div>
        ) : (
          <>
            <div className="mb-8 flex items-center justify-between">
              <h2 className="font-display text-2xl font-bold text-text-primary">
                {styleSeed.display_name} Artists
              </h2>
              <p className="font-mono text-xs uppercase tracking-wider text-text-tertiary">
                {total} results
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {artists.map((artist: SearchResult) => (
                <ArtistCard key={artist.artist_id} artist={artist} />
              ))}
            </div>

            {/* Pagination */}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              buildUrl={(pageNum) =>
                pageNum === 1
                  ? `/${countrySlug}/${regionSlug}/${citySlug}/${styleSlug}`
                  : `/${countrySlug}/${regionSlug}/${citySlug}/${styleSlug}?page=${pageNum}`
              }
            />
          </>
        )}
      </section>

      {/* Other Styles Section */}
      <section className="border-t border-border-subtle bg-bg-secondary">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <h2 className="font-display text-xl font-bold text-text-primary mb-6">
            Explore Other Styles in {cityName}
          </h2>
          <div className="flex flex-wrap gap-3">
            {(await getStyleSeeds())
              .filter((s) => s.style_name !== styleSlug)
              .slice(0, 9)
              .map((style) => (
                <Link
                  key={style.style_name}
                  href={`/${countrySlug}/${regionSlug}/${citySlug}/${style.style_name}`}
                  className="inline-flex items-center px-4 py-2 font-mono text-xs uppercase tracking-wider text-text-secondary border-2 border-border-subtle hover:border-ink-black hover:text-ink-black transition-all"
                >
                  {style.display_name}
                </Link>
              ))}
          </div>
        </div>
      </section>
    </main>
  )
}
