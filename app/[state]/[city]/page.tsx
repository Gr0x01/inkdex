import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { getCityArtists, getStyleSeeds } from '@/lib/supabase/queries'
import { sanitizeForJsonLd, serializeJsonLd } from '@/lib/utils/seo'
import { CITIES, STATES } from '@/lib/constants/cities'
import ArtistPreviewCard from '@/components/home/ArtistPreviewCard'

export async function generateStaticParams() {
  return CITIES.map((city) => ({
    state: STATES.find((s) => s.code === city.state)?.slug || '',
    city: city.slug,
  }))
}

export const revalidate = 86400 // 24 hours

export async function generateMetadata({
  params,
}: {
  params: Promise<{ state: string; city: string }>
}): Promise<Metadata> {
  const { state: stateSlug, city: citySlug } = await params

  const state = STATES.find((s) => s.slug === stateSlug)
  const city = CITIES.find((c) => c.slug === citySlug)

  if (!state || !city) {
    return { title: 'City Not Found' }
  }

  const title = `Tattoo Artists in ${city.name}, ${state.code} | Inkdex`
  const description = `Discover talented tattoo artists in ${city.name}, ${state.code}. Browse portfolios, view styles, and connect via Instagram.`

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
      canonical: `/${stateSlug}/${citySlug}`,
    },
  }
}

export default async function CityPage({
  params,
}: {
  params: Promise<{ state: string; city: string }>
}) {
  const { state: stateSlug, city: citySlug } = await params

  const state = STATES.find((s) => s.slug === stateSlug)
  const city = CITIES.find((c) => c.slug === citySlug)

  if (!state || !city) notFound()

  const { artists, total } = await getCityArtists(state.code, city.name, 100, 0)
  const styleSeeds = await getStyleSeeds()

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
          <div className="mb-12">
            <h1 className="font-display text-display font-[700] text-text-primary mb-4">
              {city.name}, {state.code} Tattoo Artists
            </h1>
            <p className="font-body text-body-large text-text-secondary">
              {total.toLocaleString()} talented {total === 1 ? 'artist' : 'artists'}{' '}
              in {city.name}
            </p>
          </div>

          {/* Artists Grid */}
          {artists.length > 0 ? (
            <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6">
              {artists.map((artist) => (
                <ArtistPreviewCard key={artist.id} artist={artist} />
              ))}
            </div>
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
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {styleSeeds.map((style) => (
                  <Link
                    key={style.style_name}
                    href={`/${stateSlug}/${citySlug}/${style.style_name}`}
                    className="group relative overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900/50 hover:border-accent-primary transition-all duration-200"
                  >
                    {/* Hero Image with Editorial Overlay */}
                    <div className="aspect-[4/3] relative overflow-hidden">
                      <Image
                        src={style.seed_image_url}
                        alt={`Browse ${style.display_name} tattoo artists in ${city.name}, ${state.code}`}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 20vw"
                        loading="lazy"
                        quality={85}
                      />
                      {/* Dark gradient overlay for text readability */}
                      <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-neutral-900/60 to-transparent" />
                    </div>

                    {/* Text Content - Positioned over image */}
                    <div className="absolute inset-x-0 bottom-0 p-4 flex flex-col items-center text-center">
                      <h3 className="font-display text-body-large font-[600] text-text-primary group-hover:text-accent-primary transition-colors mb-1">
                        {style.display_name}
                      </h3>
                      <p className="font-mono text-small text-text-secondary line-clamp-2">
                        {style.description.split('.')[0]}
                      </p>
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
