import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient as createServerClient } from '@supabase/supabase-js'
import { getArtistBySlug } from '@/lib/supabase/queries'
import { sanitizeForJsonLd, serializeJsonLd } from '@/lib/utils/seo'
import { getPortfolioImageUrl } from '@/lib/utils/images'
import { STATES, CITIES } from '@/lib/constants/cities'
import ArtistInfoColumn from '@/components/artist/ArtistInfoColumn'
import MasonryPortfolioGrid from '@/components/artist/MasonryPortfolioGrid'
import RelatedArtists from '@/components/artist/RelatedArtists'

export async function generateStaticParams() {
  // Use service role client for build-time static generation
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data: artists } = await supabase.from('artists').select('slug')

  return (
    artists?.map((artist) => ({
      slug: artist.slug,
    })) ?? []
  )
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

  const title = `@${artist.instagram_handle} - Tattoo Artist in ${artist.city}${artist.state ? ', ' + artist.state : ''}`
  const description =
    artist.bio_override ||
    artist.bio ||
    `Browse @${artist.instagram_handle}'s tattoo portfolio and connect via Instagram. Based in ${artist.city}${artist.state ? ', ' + artist.state : ''}.`

  // Use profile image or first portfolio image for OG
  let ogImage = artist.profile_image_url || '/og-default.jpg'

  if (!ogImage.startsWith('http') && artist.portfolio_images?.[0]) {
    ogImage = getPortfolioImageUrl(artist.portfolio_images[0])
  }

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'profile',
      images: [{ url: ogImage, width: 1200, height: 630 }],
      siteName: 'Tattoo Artist Discovery',
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

  // Get state and city slugs for breadcrumb navigation
  const state = STATES.find((s) => s.code === artist.state)
  const city = CITIES.find((c) => c.name === artist.city)
  const stateSlug = state?.slug || ''
  const citySlug = city?.slug || ''

  // JSON-LD structured data (sanitized to prevent XSS)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: `@${sanitizeForJsonLd(artist.instagram_handle)}`,
    description: sanitizeForJsonLd(artist.bio_override || artist.bio),
    url: `/artist/${slug}`,
    image: artist.profile_image_url,
    jobTitle: 'Tattoo Artist',
    sameAs: artist.instagram_url ? [artist.instagram_url] : [],
    address: {
      '@type': 'PostalAddress',
      addressLocality: sanitizeForJsonLd(artist.city),
      addressRegion: sanitizeForJsonLd(artist.state),
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
          addressLocality: sanitizeForJsonLd(artist.city),
          addressRegion: sanitizeForJsonLd(artist.state),
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
              item: `/${stateSlug}`,
            },
          ]
        : []),
      ...(city
        ? [
            {
              '@type': 'ListItem',
              position: state ? 3 : 2,
              name: sanitizeForJsonLd(city.name),
              item: `/${stateSlug}/${citySlug}`,
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
        <div className="flex flex-col lg:flex-row">
          {/* Left: Sticky Info Column (Desktop) / Top Section (Mobile) */}
          <aside className="w-full lg:w-[30%] xl:w-[35%] lg:sticky lg:top-0 lg:self-start lg:max-h-screen lg:overflow-y-auto">
            {/* Breadcrumbs */}
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
                        href={`/${stateSlug}`}
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
                        href={`/${stateSlug}/${citySlug}`}
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

            <ArtistInfoColumn
              artist={artist}
              portfolioImages={artist.portfolio_images || []}
            />
          </aside>

          {/* Right: Scrolling Portfolio Grid */}
          <div className="w-full lg:w-[70%] xl:w-[65%] p-5 sm:p-6 lg:pr-8 lg:pl-12 xl:pr-12 xl:pl-16">
            <MasonryPortfolioGrid
              images={artist.portfolio_images || []}
              artistName={artist.name}
            />

            {/* Related Artists Section */}
            <RelatedArtists artistId={artist.id} city={artist.city} />
          </div>
        </div>
      </main>
    </>
  )
}
