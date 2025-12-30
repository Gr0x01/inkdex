import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { getCityArtists } from '@/lib/supabase/queries'
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
              <Link href={`/${stateSlug}`} className="btn btn-secondary mt-6">
                View Other Cities in {state.name}
              </Link>
            </div>
          )}
        </div>
      </main>
    </>
  )
}
