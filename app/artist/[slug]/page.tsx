import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient as createServerClient } from '@supabase/supabase-js'
import { getArtistBySlug } from '@/lib/supabase/queries'
import { sanitizeForJsonLd, serializeJsonLd } from '@/lib/utils/seo'
import { getPortfolioImageUrl, getProfileImageUrl } from '@/lib/utils/images'
import { getPrimaryLocation } from '@/lib/utils/location'
import { CITIES } from '@/lib/constants/cities'
import { US_STATES } from '@/lib/constants/states'
import ArtistInfoColumn from '@/components/artist/ArtistInfoColumn'
import MasonryPortfolioGrid from '@/components/artist/MasonryPortfolioGrid'
import RelatedArtists from '@/components/artist/RelatedArtists'
import FindSimilarArtistsButton from '@/components/artist/FindSimilarArtistsButton'
import AnalyticsTracker from '@/components/analytics/AnalyticsTracker'

export async function generateStaticParams() {
  // Use service role client for build-time static generation
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Fetch all artists using pagination (no limit)
  let allArtists: { slug: string }[] = []
  let page = 0
  const pageSize = 1000

  while (true) {
    const { data: artists, error } = await supabase
      .from('artists')
      .select('slug')
      .range(page * pageSize, (page + 1) * pageSize - 1)

    if (error) {
      console.error('Error fetching artists for static generation:', error)
      break
    }

    if (!artists || artists.length === 0) break

    allArtists = allArtists.concat(artists)

    // If we got fewer than pageSize, we've reached the end
    if (artists.length < pageSize) break

    page++
  }

  console.log(`Generated static params for ${allArtists.length} artists`)

  return allArtists.map((artist) => ({
    slug: artist.slug,
  }))
}

export const revalidate = 86400 // 24 hours

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const artist = await getArtistBySlug(slug)

  if (!artist) {
    return { title: 'Artist Not Found' }
  }

  // Get primary location from artist_locations (single source of truth)
  const primaryLoc = getPrimaryLocation(artist.locations)
  const artistCity = primaryLoc?.city || null
  const artistRegion = primaryLoc?.region || null
  const locationStr = [artistCity, artistRegion].filter(Boolean).join(', ')

  const title = `@${artist.instagram_handle} - Tattoo Artist${locationStr ? ` in ${locationStr}` : ''}`
  const description =
    artist.bio_override ||
    artist.bio ||
    `Browse @${artist.instagram_handle}'s tattoo portfolio and connect via Instagram.${locationStr ? ` Based in ${locationStr}.` : ''}`

  // Use profile image or first portfolio image for OG
  // Priority: stored profile image > legacy profile URL > first portfolio image > default
  let ogImage = getProfileImageUrl(artist)

  if (ogImage === '/placeholder-tattoo.jpg' && artist.portfolio_images?.[0]) {
    ogImage = getPortfolioImageUrl(artist.portfolio_images[0])
  } else if (ogImage === '/placeholder-tattoo.jpg') {
    ogImage = '/og-default.jpg'
  }

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'profile',
      images: [{ url: ogImage, width: 1200, height: 630 }],
      siteName: 'Inkdex',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
    alternates: {
      canonical: `/artist/${slug}`,
    },
  }
}

export default async function ArtistPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const artist = await getArtistBySlug(slug)

  if (!artist) notFound()

  // Get primary location from artist_locations (single source of truth)
  const primaryLoc = getPrimaryLocation(artist.locations)
  const artistCity = primaryLoc?.city || null
  const artistRegion = primaryLoc?.region || null

  // Get state and city data for breadcrumb navigation
  // Using new international URL format: /us/tx/austin
  const state = US_STATES.find((s) => s.code === artistRegion)
  const city = CITIES.find((c) => c.name === artistCity)
  const countrySlug = 'us' // Currently US-only, can be expanded later
  const stateSlug = artistRegion?.toLowerCase() || ''
  const citySlug = city?.slug || artistCity?.toLowerCase().replace(/\s+/g, '-') || ''

  // JSON-LD structured data (sanitized to prevent XSS)
  const jsonLdImage = getProfileImageUrl(artist)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: `@${sanitizeForJsonLd(artist.instagram_handle)}`,
    description: sanitizeForJsonLd(artist.bio_override || artist.bio),
    url: `/artist/${slug}`,
    image: jsonLdImage !== '/placeholder-tattoo.jpg' ? jsonLdImage : undefined,
    jobTitle: 'Tattoo Artist',
    sameAs: artist.instagram_url ? [artist.instagram_url] : [],
    address: {
      '@type': 'PostalAddress',
      addressLocality: sanitizeForJsonLd(artistCity),
      addressRegion: sanitizeForJsonLd(artistRegion),
    },
  }

  // If artist has a shop, add LocalBusiness schema too (sanitized)
  const shopJsonLd = artist.shop_name
    ? {
        '@context': 'https://schema.org',
        '@type': 'LocalBusiness',
        name: sanitizeForJsonLd(artist.shop_name),
        employee: {
          '@type': 'Person',
          name: `@${sanitizeForJsonLd(artist.instagram_handle)}`,
        },
        address: {
          '@type': 'PostalAddress',
          addressLocality: sanitizeForJsonLd(artistCity),
          addressRegion: sanitizeForJsonLd(artistRegion),
        },
      }
    : null

  // Breadcrumb structured data (sanitized)
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: '/',
      },
      ...(state
        ? [
            {
              '@type': 'ListItem',
              position: 2,
              name: sanitizeForJsonLd(state.name),
              item: `/${countrySlug}/${stateSlug}`,
            },
          ]
        : []),
      ...(city
        ? [
            {
              '@type': 'ListItem',
              position: state ? 3 : 2,
              name: sanitizeForJsonLd(city.name),
              item: `/${countrySlug}/${stateSlug}/${citySlug}`,
            },
          ]
        : []),
      {
        '@type': 'ListItem',
        position: state && city ? 4 : state || city ? 3 : 2,
        name: `@${sanitizeForJsonLd(artist.instagram_handle)}`,
        item: `/artist/${slug}`,
      },
    ],
  }

  return (
    <>
      {/* Analytics Tracking */}
      <AnalyticsTracker type="profile_view" artistId={artist.id} />

      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      {shopJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(shopJsonLd) }}
        />
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }}
      />

      {/* Editorial Magazine Layout */}
      <main className="min-h-screen bg-paper">
        {/* Breadcrumbs - Above the flex layout, scrolls away naturally */}
        <nav className="font-body text-small text-text-secondary px-4 pt-4 pb-2 sm:px-6 sm:pt-6 sm:pb-3 lg:px-8 lg:pt-8 lg:pb-4" aria-label="Breadcrumb">
          <ol className="flex items-center gap-2 flex-wrap">
            <li>
              <Link
                href="/"
                className="hover:text-accent-primary transition-colors"
              >
                Home
              </Link>
            </li>
            {state && (
              <>
                <li>/</li>
                <li>
                  <Link
                    href={`/${countrySlug}/${stateSlug}`}
                    className="hover:text-accent-primary transition-colors"
                  >
                    {state.name}
                  </Link>
                </li>
              </>
            )}
            {city && (
              <>
                <li>/</li>
                <li>
                  <Link
                    href={`/${countrySlug}/${stateSlug}/${citySlug}`}
                    className="hover:text-accent-primary transition-colors"
                  >
                    {city.name}
                  </Link>
                </li>
              </>
            )}
            <li>/</li>
            <li aria-current="page" className="text-text-primary">
              @{artist.instagram_handle}
            </li>
          </ol>
        </nav>

        <div className="flex flex-col lg:flex-row">
          {/* Left: Sticky Info Column (Desktop) / Top Section (Mobile) - below sticky navbar */}
          <aside className="w-full lg:w-[30%] xl:w-[35%] lg:sticky lg:top-[calc(var(--navbar-height-desktop)+24px)] lg:self-start">
            <ArtistInfoColumn
              artist={artist}
              portfolioImages={artist.portfolio_images || []}
            />
          </aside>

          {/* Right: Scrolling Portfolio Grid */}
          <div className="w-full lg:w-[70%] xl:w-[65%] p-5 sm:p-6 lg:pl-6 lg:pr-8">
            <MasonryPortfolioGrid
              images={artist.portfolio_images || []}
              artistName={artist.name}
            />

            {/* Related Artists Section */}
            <RelatedArtists
              artistId={artist.id}
              artistSlug={artist.slug}
              city={artistCity}
            />

            {/* Find Similar Artists - positioned after related artists */}
            <div className="mt-4 mb-12 max-w-md mx-auto">
              <FindSimilarArtistsButton
                artistId={artist.id}
                artistName={artist.name}
                city={artistCity}
              />
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
