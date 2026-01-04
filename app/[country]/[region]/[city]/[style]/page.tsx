import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { getArtistsByStyleSeed, getStyleSeedBySlug, getStyleSeeds } from '@/lib/supabase/queries'
import { sanitizeForJsonLd, serializeJsonLd } from '@/lib/utils/seo'
import { getCountryName, getRegionName, slugToName } from '@/lib/utils/location'
import ArtistCard from '@/components/search/ArtistCard'
import { getImageUrl } from '@/lib/utils/images'
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
    <div className="min-h-screen">
      {/* JSON-LD Breadcrumbs */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />

      {/* Breadcrumbs */}
      <div className="border-b border-neutral-800 bg-[#0a0a0a]">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <nav className="flex items-center space-x-2 text-sm">
            <Link href="/" className="text-neutral-400 hover:text-white transition-colors">
              Home
            </Link>
            <span className="text-neutral-600">/</span>
            <Link href={`/${countrySlug}`} className="text-neutral-400 hover:text-white transition-colors">
              {countryName}
            </Link>
            <span className="text-neutral-600">/</span>
            <Link href={`/${countrySlug}/${regionSlug}`} className="text-neutral-400 hover:text-white transition-colors">
              {regionName}
            </Link>
            <span className="text-neutral-600">/</span>
            <Link href={`/${countrySlug}/${regionSlug}/${citySlug}`} className="text-neutral-400 hover:text-white transition-colors">
              {cityName}
            </Link>
            <span className="text-neutral-600">/</span>
            <span className="text-white">{styleSeed.display_name}</span>
          </nav>
        </div>
      </div>

      {/* Hero Section */}
      <div className="bg-gradient-to-b from-[#0a0a0a] via-[#0f0f0f] to-[#0a0a0a]">
        <div className="mx-auto max-w-7xl px-4 pt-4 md:pt-8 lg:pt-16 pb-12 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
            {/* Text Content */}
            <div className="flex flex-col justify-center">
              <h1 className="font-display text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
                {styleSeed.display_name} Tattoo Artists
              </h1>
              <p className="mt-4 font-display text-xl text-neutral-300">
                in {cityName}, {regionCode}
              </p>
              <p className="mt-6 text-lg leading-relaxed text-neutral-400">
                {styleSeed.description}
              </p>
              <p className="mt-6 text-base text-neutral-500">
                Showing <span className="font-medium text-white">{total.toLocaleString()}</span> artists whose work matches the {styleSeed.display_name.toLowerCase()} style in {cityName}.
              </p>

              {/* Internal Links */}
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href={`/${countrySlug}/${regionSlug}/${citySlug}`}
                  className="inline-flex items-center rounded-lg bg-neutral-800 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 transition-colors"
                >
                  All {cityName} Artists
                </Link>
                <Link
                  href="/"
                  className="inline-flex items-center rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-neutral-300 hover:bg-neutral-800 transition-colors"
                >
                  Search by Image
                </Link>
              </div>
            </div>

            {/* Style Example Image (Seed Image) */}
            {styleSeed.seed_image_url && (
              <div className="relative aspect-square overflow-hidden rounded-2xl bg-neutral-900 lg:aspect-[4/5]">
                <Image
                  src={getImageUrl(styleSeed.seed_image_url)}
                  alt={`${styleSeed.display_name} tattoo example`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute bottom-6 left-6 right-6">
                  <p className="text-sm font-medium text-white/90">Example of {styleSeed.display_name} style</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Artist Grid */}
      <div className="bg-[#0a0a0a] py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {artists.length === 0 ? (
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-12 text-center">
              <p className="text-lg text-neutral-400">
                No {styleSeed.display_name.toLowerCase()} artists found in {cityName} yet.
              </p>
              <p className="mt-2 text-sm text-neutral-500">
                Check back soon as we add more artists!
              </p>
            </div>
          ) : (
            <>
              <div className="mb-8 flex items-center justify-between">
                <h2 className="font-display text-2xl font-bold text-white">
                  {styleSeed.display_name} Artists in {cityName}
                </h2>
                <p className="text-sm text-neutral-500">{total} total results</p>
              </div>
              <div className="grid gap-2 md:gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
        </div>
      </div>

      {/* Other Styles Section (Internal Linking) */}
      <div className="border-t border-neutral-800 bg-[#0a0a0a] py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="mb-6 font-display text-2xl font-bold text-white">
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
                  className="inline-flex items-center rounded-lg border border-neutral-800 bg-neutral-900/50 px-4 py-2 text-sm font-medium text-neutral-300 hover:border-accent hover:bg-neutral-800 hover:text-white transition-colors"
                >
                  {style.display_name}
                </Link>
              ))}
          </div>
        </div>
      </div>
    </div>
  )
}
