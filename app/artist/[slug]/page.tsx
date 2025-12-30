import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient as createServerClient } from '@supabase/supabase-js'
import { getArtistBySlug } from '@/lib/supabase/queries'
import { sanitizeForJsonLd, serializeJsonLd } from '@/lib/utils/seo'
import { getPortfolioImageUrl } from '@/lib/utils/images'
import ArtistInfoColumn from '@/components/artist/ArtistInfoColumn'
import MasonryPortfolioGrid from '@/components/artist/MasonryPortfolioGrid'

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

  const title = `${artist.name} - Tattoo Artist in ${artist.city}${artist.state ? ', ' + artist.state : ''}`
  const description =
    artist.bio_override ||
    artist.bio ||
    `Browse ${artist.name}'s tattoo portfolio and connect via Instagram. Based in ${artist.city}${artist.state ? ', ' + artist.state : ''}.`

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

  // JSON-LD structured data (sanitized to prevent XSS)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: sanitizeForJsonLd(artist.name),
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
          name: sanitizeForJsonLd(artist.name),
        },
        address: {
          '@type': 'PostalAddress',
          addressLocality: sanitizeForJsonLd(artist.city),
          addressRegion: sanitizeForJsonLd(artist.state),
        },
      }
    : null

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

      {/* Editorial Magazine Layout */}
      <main className="min-h-screen bg-paper">
        <div className="flex flex-col lg:flex-row">
          {/* Left: Sticky Info Column (Desktop) / Top Section (Mobile) */}
          <ArtistInfoColumn
            artist={artist}
            firstPortfolioImage={artist.portfolio_images?.[0] || null}
            portfolioImages={artist.portfolio_images || []}
          />

          {/* Right: Scrolling Portfolio Grid */}
          <div className="w-full lg:w-[70%] xl:w-[65%] p-5 sm:p-6 lg:pr-8 lg:pl-12 xl:pr-12 xl:pl-16">
            <MasonryPortfolioGrid
              images={artist.portfolio_images || []}
              artistName={artist.name}
            />
          </div>
        </div>
      </main>
    </>
  )
}
