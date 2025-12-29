import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient as createServerClient } from '@supabase/supabase-js'
import { getArtistBySlug } from '@/lib/supabase/queries'
import { sanitizeForJsonLd } from '@/lib/utils/seo'
import { getPortfolioImageUrl } from '@/lib/utils/images'
import ArtistHero from '@/components/artist/ArtistHero'
import PortfolioGrid from '@/components/artist/PortfolioGrid'
import InstagramStickyFooter from '@/components/artist/InstagramStickyFooter'

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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {shopJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(shopJsonLd) }}
        />
      )}

      <main className="min-h-screen bg-bg-primary relative">
        {/* Hero Section */}
        <ArtistHero
          artist={artist}
          featuredImage={artist.portfolio_images?.[0] || null}
        />

        {/* Portfolio Grid with Interstitials */}
        <PortfolioGrid
          images={artist.portfolio_images || []}
          artistName={artist.name}
          artistBio={artist.bio_override || artist.bio}
          artistId={artist.id}
          city={artist.city}
          verificationStatus={artist.verification_status}
        />

        {/* Mobile Sticky Footer */}
        {artist.instagram_url && artist.instagram_handle && (
          <InstagramStickyFooter
            instagramUrl={artist.instagram_url}
            instagramHandle={artist.instagram_handle}
          />
        )}
      </main>
    </>
  )
}
