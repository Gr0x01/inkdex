import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { getStateWithCities } from '@/lib/supabase/queries'
import { sanitizeForJsonLd, serializeJsonLd } from '@/lib/utils/seo'
import { STATES } from '@/lib/constants/cities'

export async function generateStaticParams() {
  return STATES.map((state) => ({
    state: state.slug,
  }))
}

export const revalidate = 86400 // 24 hours

export async function generateMetadata({
  params,
}: {
  params: Promise<{ state: string }>
}): Promise<Metadata> {
  const { state: stateSlug } = await params
  const state = STATES.find((s) => s.slug === stateSlug)

  if (!state) {
    return { title: 'State Not Found' }
  }

  const title = `Tattoo Artists in ${state.name} | Inkdex`
  const description = `Discover talented tattoo artists across ${state.name}. Browse portfolios, find artists by city, and connect via Instagram.`

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
          url: '/og-state-default.jpg', // TODO: Create state-specific OG image
          width: 1200,
          height: 630,
          alt: `Tattoo Artists in ${state.name}`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/og-state-default.jpg'],
    },
    alternates: {
      canonical: `/${stateSlug}`,
    },
  }
}

export default async function StatePage({
  params,
}: {
  params: Promise<{ state: string }>
}) {
  const { state: stateSlug } = await params
  const state = STATES.find((s) => s.slug === stateSlug)

  if (!state) notFound()

  const stateData = await getStateWithCities(state.code)

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
              <li aria-current="page" className="text-text-primary">
                {state.name}
              </li>
            </ol>
          </nav>

          {/* Header */}
          <div className="mb-12">
            <h1 className="font-display text-display font-[700] text-text-primary mb-4">
              {state.name} Tattoo Artists
            </h1>
            <p className="font-body text-body-large text-text-secondary max-w-2xl">
              Explore {stateData.total.toLocaleString()} talented tattoo artists
              across {stateData.cities.length}{' '}
              {stateData.cities.length === 1 ? 'city' : 'cities'} in {state.name}
              .
            </p>
          </div>

          {/* Cities Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stateData.cities.map((city) => (
              <Link
                key={city.slug}
                href={`/${stateSlug}/${city.slug}`}
                className="group bg-surface-low border border-border-subtle rounded-xl p-8 hover:border-accent-primary transition-all duration-medium lift-hover"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-display text-h3 font-[700] text-text-primary mb-2 group-hover:text-accent-primary transition-colors">
                      {city.name}
                    </h3>
                    <p className="font-body text-body text-text-secondary">
                      {city.artistCount} {city.artistCount === 1 ? 'artist' : 'artists'}
                    </p>
                  </div>

                  <svg
                    className="w-6 h-6 text-accent-primary group-hover:translate-x-1 transition-transform flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </>
  )
}
