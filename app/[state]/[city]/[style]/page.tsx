import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { getArtistsByStyleSeed, getStyleSeedBySlug, getStyleSeeds } from '@/lib/supabase/queries'
import { sanitizeForJsonLd, serializeJsonLd } from '@/lib/utils/seo'
import { CITIES, STATES } from '@/lib/constants/cities'
import ArtistCard from '@/components/search/ArtistCard'
import { getImageUrl } from '@/lib/utils/images'
import { styleSeedsData } from '@/scripts/style-seeds/style-seeds-data'
import { getStyleEditorialContent } from '@/lib/content/editorial/styles'
import EditorialContent from '@/components/editorial/EditorialContent'
import type { SearchResult } from '@/types/search'
import Pagination from '@/components/pagination/Pagination'

export async function generateStaticParams() {
  // Use static style data instead of database query (can't use async queries in generateStaticParams)
  // Generate params for all city × style combinations
  const params = []
  for (const city of CITIES) {
    const state = STATES.find((s) => s.code === city.state)
    if (!state) continue

    for (const style of styleSeedsData) {
      params.push({
        state: state.slug,
        city: city.slug,
        style: style.styleName,
      })
    }
  }

  return params
}

export const revalidate = 86400 // 24 hours

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ state: string; city: string; style: string }>
  searchParams: Promise<{ page?: string }>
}): Promise<Metadata> {
  const { state: stateSlug, city: citySlug, style: styleSlug } = await params
  const { page } = await searchParams
  const currentPage = parseInt(page || '1', 10)

  const state = STATES.find((s) => s.slug === stateSlug)
  const city = CITIES.find((c) => c.slug === citySlug)
  const styleSeed = await getStyleSeedBySlug(styleSlug)

  if (!state || !city || !styleSeed) {
    return { title: 'Style Not Found' }
  }

  // Sanitize all user-facing strings to prevent XSS in metadata
  const title = sanitizeForJsonLd(`${styleSeed.display_name} Tattoo Artists in ${city.name}, ${state.code} | Inkdex`)
  const description = sanitizeForJsonLd(
    `${styleSeed.description} Discover ${styleSeed.display_name.toLowerCase()} tattoo artists in ${city.name}, ${state.code}. Browse portfolios and connect via Instagram.`
  )

  // Canonical URL (page 1 = no query param, page 2+ = ?page=N)
  const canonical = currentPage === 1
    ? `https://inkdex.io/${stateSlug}/${citySlug}/${styleSlug}`
    : `https://inkdex.io/${stateSlug}/${citySlug}/${styleSlug}?page=${currentPage}`

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
          url: '/og-style-default.jpg', // TODO: Use style seed image for OG
          width: 1200,
          height: 630,
          alt: sanitizeForJsonLd(`${styleSeed.display_name} Tattoo in ${city.name}, ${state.code}`),
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
  params: Promise<{ state: string; city: string; style: string }>
  searchParams: Promise<{ page?: string }>
}) {
  const { state: stateSlug, city: citySlug, style: styleSlug } = await params
  const { page } = await searchParams

  const state = STATES.find((s) => s.slug === stateSlug)
  const city = CITIES.find((c) => c.slug === citySlug)
  const styleSeed = await getStyleSeedBySlug(styleSlug)

  if (!state || !city || !styleSeed) notFound()

  // Parse pagination
  const currentPage = parseInt(page || '1', 10)
  const limit = 20
  const offset = (currentPage - 1) * limit

  // Get artists whose work matches this style (using pre-fetched style seed embedding)
  const { artists, total } = await getArtistsByStyleSeed(styleSeed, city.name, limit, offset)
  const totalPages = Math.ceil(total / limit)

  // Get editorial content for potential use in schema
  const editorialContent = getStyleEditorialContent(styleSlug, citySlug)

  // JSON-LD Breadcrumbs (sanitized)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: sanitizeForJsonLd('Home'),
        item: sanitizeForJsonLd(process.env.NEXT_PUBLIC_APP_URL || 'https://inkdex.io'),
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: sanitizeForJsonLd(state.name),
        item: sanitizeForJsonLd(`${process.env.NEXT_PUBLIC_APP_URL || 'https://inkdex.io'}/${stateSlug}`),
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: sanitizeForJsonLd(city.name),
        item: sanitizeForJsonLd(`${process.env.NEXT_PUBLIC_APP_URL || 'https://inkdex.io'}/${stateSlug}/${citySlug}`),
      },
      {
        '@type': 'ListItem',
        position: 4,
        name: sanitizeForJsonLd(styleSeed.display_name),
        item: sanitizeForJsonLd(
          `${process.env.NEXT_PUBLIC_APP_URL || 'https://inkdex.io'}/${stateSlug}/${citySlug}/${styleSlug}`
        ),
      },
    ],
  }

  // JSON-LD Article schema (if editorial content exists)
  const articleJsonLd = editorialContent
    ? {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: sanitizeForJsonLd(`${styleSeed.display_name} Tattoo Artists in ${city.name}, ${state.code}`),
        description: sanitizeForJsonLd(editorialContent.intro.paragraphs[0]),
        articleBody: sanitizeForJsonLd(
          [
            ...editorialContent.intro.paragraphs,
            ...editorialContent.cityContext.paragraphs,
            ...editorialContent.expectations.paragraphs,
            ...editorialContent.finding.paragraphs,
          ].join(' ')
        ),
        author: {
          '@type': 'Organization',
          name: 'Inkdex',
        },
        publisher: {
          '@type': 'Organization',
          name: 'Inkdex',
          logo: {
            '@type': 'ImageObject',
            url: sanitizeForJsonLd(`${process.env.NEXT_PUBLIC_APP_URL || 'https://inkdex.io'}/logo.png`),
          },
        },
        datePublished: new Date().toISOString(),
        dateModified: new Date().toISOString(),
      }
    : null

  return (
    <div className="min-h-screen">
      {/* JSON-LD Breadcrumbs */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />

      {/* JSON-LD Article Schema (if editorial content exists) */}
      {articleJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(articleJsonLd) }}
        />
      )}

      {/* Breadcrumbs */}
      <div className="border-b border-neutral-800 bg-[#0a0a0a]">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <nav className="flex items-center space-x-2 text-sm">
            <Link href="/" className="text-neutral-400 hover:text-white transition-colors">
              Home
            </Link>
            <span className="text-neutral-600">/</span>
            <Link href={`/${stateSlug}`} className="text-neutral-400 hover:text-white transition-colors">
              {state.name}
            </Link>
            <span className="text-neutral-600">/</span>
            <Link href={`/${stateSlug}/${citySlug}`} className="text-neutral-400 hover:text-white transition-colors">
              {city.name}
            </Link>
            <span className="text-neutral-600">/</span>
            <span className="text-white">{styleSeed.display_name}</span>
          </nav>
        </div>
      </div>

      {/* Hero Section */}
      <div className="bg-gradient-to-b from-[#0a0a0a] via-[#0f0f0f] to-[#0a0a0a]">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
            {/* Text Content */}
            <div className="flex flex-col justify-center">
              <h1 className="font-display text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
                {styleSeed.display_name} Tattoo Artists
              </h1>
              <p className="mt-4 font-display text-xl text-neutral-300">
                in {city.name}, {state.code}
              </p>
              {/* Editorial intro content or fallback to description */}
              {(() => {
                try {
                  const editorialContent = getStyleEditorialContent(styleSlug, citySlug)
                  if (editorialContent?.intro) {
                    return (
                      <div className="mt-6">
                        {editorialContent.intro.paragraphs.map((paragraph, idx) => (
                          <p key={idx} className="text-lg leading-relaxed text-neutral-400 mb-4 last:mb-0">
                            {paragraph}
                          </p>
                        ))}
                      </div>
                    )
                  }
                  return (
                    <p className="mt-6 text-lg leading-relaxed text-neutral-400">
                      {styleSeed.description}
                    </p>
                  )
                } catch (error) {
                  console.error('Error loading editorial content:', error)
                  return (
                    <p className="mt-6 text-lg leading-relaxed text-neutral-400">
                      {styleSeed.description}
                    </p>
                  )
                }
              })()}
              <p className="mt-6 text-base text-neutral-500">
                Showing <span className="font-medium text-white">{total.toLocaleString()}</span> artists whose work matches the {styleSeed.display_name.toLowerCase()} style in {city.name}.
              </p>

              {/* Internal Links */}
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href={`/${stateSlug}/${citySlug}`}
                  className="inline-flex items-center rounded-lg bg-neutral-800 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 transition-colors"
                >
                  All {city.name} Artists
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

      {/* Editorial Content - City Context, Expectations, Finding */}
      {(() => {
        const editorialContent = getStyleEditorialContent(styleSlug, citySlug)
        if (!editorialContent) return null

        return (
          <div className="bg-[#0a0a0a] py-12 border-b border-neutral-800">
            <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
              <EditorialContent
                sections={[
                  editorialContent.cityContext,
                  editorialContent.expectations,
                  editorialContent.finding,
                ]}
              />
            </div>
          </div>
        )
      })()}

      {/* Artist Grid */}
      <div className="bg-[#0a0a0a] py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {artists.length === 0 ? (
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-12 text-center">
              <p className="text-lg text-neutral-400">
                No {styleSeed.display_name.toLowerCase()} artists found in {city.name} yet.
              </p>
              <p className="mt-2 text-sm text-neutral-500">
                Check back soon as we add more artists!
              </p>
            </div>
          ) : (
            <>
              <div className="mb-8 flex items-center justify-between">
                <h2 className="font-display text-2xl font-bold text-white">
                  {styleSeed.display_name} Artists in {city.name}
                </h2>
                <p className="text-sm text-neutral-500">{total} total results</p>
              </div>
              <div className="grid gap-3 sm:gap-6 md:gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
                    ? `/${stateSlug}/${citySlug}/${styleSlug}`
                    : `/${stateSlug}/${citySlug}/${styleSlug}?page=${pageNum}`
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
            Explore Other Styles in {city.name}
          </h2>
          <div className="flex flex-wrap gap-3">
            {(await getStyleSeeds())
              .filter((s) => s.style_name !== styleSlug)
              .slice(0, 9)
              .map((style) => (
                <Link
                  key={style.style_name}
                  href={`/${stateSlug}/${citySlug}/${style.style_name}`}
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
