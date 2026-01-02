import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { getCityArtists, getStyleSeeds } from '@/lib/supabase/queries'
import { sanitizeForJsonLd, serializeJsonLd } from '@/lib/utils/seo'
import { CITIES, STATES } from '@/lib/constants/cities'
import ArtistCard from '@/components/search/ArtistCard'
import { transformToSearchResult } from '@/lib/utils/artists'
import { getCityEditorialContent } from '@/lib/content/editorial/cities'
import EditorialContent from '@/components/editorial/EditorialContent'
import Pagination from '@/components/pagination/Pagination'

export async function generateStaticParams() {
  return CITIES.map((city) => ({
    state: STATES.find((s) => s.code === city.state)?.slug || '',
    city: city.slug,
  }))
}

export const revalidate = 86400 // 24 hours

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ state: string; city: string }>
  searchParams: Promise<{ page?: string }>
}): Promise<Metadata> {
  const { state: stateSlug, city: citySlug } = await params
  const { page } = await searchParams
  const currentPage = parseInt(page || '1', 10)

  const state = STATES.find((s) => s.slug === stateSlug)
  const city = CITIES.find((c) => c.slug === citySlug)

  if (!state || !city) {
    return { title: 'City Not Found' }
  }

  const title = `Tattoo Artists in ${city.name}, ${state.code} | Inkdex`

  // Use editorial content for meta description if available
  const editorialContent = getCityEditorialContent(citySlug)
  const description = editorialContent
    ? sanitizeForJsonLd(editorialContent.hero.paragraphs[0].substring(0, 155) + '...')
    : `Discover talented tattoo artists in ${city.name}, ${state.code}. Browse portfolios, view styles, and connect via Instagram.`

  // Canonical URL (page 1 = no query param, page 2+ = ?page=N)
  const canonical = currentPage === 1
    ? `https://inkdex.io/${stateSlug}/${citySlug}`
    : `https://inkdex.io/${stateSlug}/${citySlug}?page=${currentPage}`

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
          url: '/og-city-default.jpg', // TODO: Create city-specific OG image
          width: 1200,
          height: 630,
          alt: `Tattoo Artists in ${city.name}, ${state.code}`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/og-city-default.jpg'],
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
  params: Promise<{ state: string; city: string }>
  searchParams: Promise<{ page?: string }>
}) {
  const { state: stateSlug, city: citySlug } = await params
  const { page } = await searchParams

  const state = STATES.find((s) => s.slug === stateSlug)
  const city = CITIES.find((c) => c.slug === citySlug)

  if (!state || !city) notFound()

  // Parse pagination
  const currentPage = parseInt(page || '1', 10)
  const limit = 20
  const offset = (currentPage - 1) * limit

  const { artists, total } = await getCityArtists(state.code, city.name, limit, offset)

  // Transform to SearchResult format for ArtistCard
  const searchResults = artists.map(artist =>
    transformToSearchResult(artist as any, city.name)
  )

  const styleSeeds = await getStyleSeeds()
  const totalPages = Math.ceil(total / limit)

  // JSON-LD Breadcrumbs (sanitized)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: '/',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: sanitizeForJsonLd(state.name),
        item: `/${stateSlug}`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: sanitizeForJsonLd(city.name),
        item: `/${stateSlug}/${citySlug}`,
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
        <div className="container mx-auto px-4 py-6 md:py-8">
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
                  href={`/${stateSlug}`}
                  className="hover:text-accent-primary transition-colors"
                >
                  {state.name}
                </Link>
              </li>
              <li>/</li>
              <li aria-current="page" className="text-text-primary">
                {city.name}
              </li>
            </ol>
          </nav>

          {/* Header */}
          <div className="mb-8">
            <h1 className="font-display text-display font-[700] text-text-primary mb-3">
              {city.name}, {state.code} Tattoo Artists
            </h1>
            <p className="font-body text-body-large text-text-secondary">
              {total.toLocaleString()} talented {total === 1 ? 'artist' : 'artists'}{' '}
              in {city.name}
            </p>
          </div>

          {/* Editorial Content */}
          {(() => {
            try {
              const editorialContent = getCityEditorialContent(citySlug)
              if (!editorialContent) return null

              return (
                <div className="mb-12 max-w-4xl">
                  <EditorialContent
                    sections={[
                      editorialContent.hero,
                      editorialContent.scene,
                      editorialContent.community,
                      editorialContent.styles,
                    ]}
                  />
                </div>
              )
            } catch (error) {
              console.error('Error loading editorial content:', error)
              return null
            }
          })()}

          {/* Artists Grid */}
          {artists.length > 0 ? (
            <>
              <div className="grid gap-3 sm:gap-6 md:gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
                    ? `/${stateSlug}/${citySlug}`
                    : `/${stateSlug}/${citySlug}?page=${pageNum}`
                }
              />
            </>
          ) : (
            <div className="text-center py-16">
              <p className="font-body text-body text-text-secondary">
                No artists found in {city.name} yet.
              </p>
              {/* Only show button if state has multiple cities */}
              {state.cities.length > 1 && (
                <Link href={`/${stateSlug}`} className="btn btn-secondary mt-6">
                  View Other Cities in {state.name}
                </Link>
              )}
            </div>
          )}

          {/* Browse by Style Section (Internal Linking for SEO) */}
          {styleSeeds.length > 0 && (
            <div className="mt-16 pt-12 border-t border-neutral-800">
              <div className="mb-8">
                <h2 className="font-display text-heading-2 font-[700] text-text-primary mb-3">
                  Browse by Style in {city.name}
                </h2>
                <p className="font-body text-body text-text-secondary">
                  Explore tattoo artists specializing in different styles
                </p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                {styleSeeds.map((style) => (
                  <Link
                    key={style.style_name}
                    href={`/${stateSlug}/${citySlug}/${style.style_name}`}
                    className="group block relative"
                  >
                    {/* Image Container - Clean, no heavy overlay */}
                    <div className="aspect-[3/4] relative overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900 mb-3 group-hover:border-accent-primary transition-all duration-300">
                      <Image
                        src={style.seed_image_url}
                        alt={`Browse ${style.display_name} tattoo artists in ${city.name}, ${state.code}`}
                        fill
                        className="object-cover group-hover:scale-[1.02] transition-transform duration-500"
                        sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 20vw"
                        loading="lazy"
                        quality={90}
                      />
                      {/* Subtle vignette only - lets tattoo shine */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />

                      {/* Hover state accent bar */}
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-accent-primary transform translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                    </div>

                    {/* Text Content - Below image, editorial style */}
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
        </div>
      </main>
    </>
  )
}
