import type { Metadata } from 'next'
import Link from 'next/link'
import { getCountriesWithCounts } from '@/lib/supabase/queries'
import { getCountryName } from '@/lib/constants/countries'
import { serializeJsonLd } from '@/lib/utils/seo'

export const revalidate = 86400 // 24 hours

export const metadata: Metadata = {
  title: 'Browse Tattoo Artists by Country | Inkdex',
  description:
    'Discover tattoo artists around the world. Browse by country to find talented artists, view portfolios, and connect via Instagram.',
  openGraph: {
    title: 'Browse Tattoo Artists by Country | Inkdex',
    description:
      'Discover tattoo artists around the world. Browse by country to find talented artists, view portfolios, and connect via Instagram.',
    type: 'website',
    siteName: 'Inkdex',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Browse Tattoo Artists by Country | Inkdex',
    description:
      'Discover tattoo artists around the world. Browse by country to find talented artists, view portfolios, and connect via Instagram.',
  },
  alternates: {
    canonical: 'https://inkdex.io/countries',
  },
}

export default async function CountriesPage() {
  const countries = await getCountriesWithCounts()

  // Sort by artist count descending
  const sortedCountries = [...countries].sort(
    (a, b) => b.artist_count - a.artist_count
  )

  // Calculate totals
  const totalArtists = sortedCountries.reduce(
    (sum, c) => sum + c.artist_count,
    0
  )

  // JSON-LD Breadcrumbs
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://inkdex.io',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Countries',
        item: 'https://inkdex.io/countries',
      },
    ],
  }

  return (
    <main className="min-h-screen bg-bg-primary">
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />

      {/* Hero Section */}
      <header className="border-b border-border-subtle">
        <div className="max-w-7xl mx-auto px-4 py-12 md:py-16">
          {/* Breadcrumbs */}
          <nav
            className="mb-8 flex items-center gap-2 text-sm text-text-tertiary flex-wrap"
            aria-label="Breadcrumb"
          >
            <Link
              href="/"
              className="hover:text-text-primary transition-colors"
            >
              Inkdex
            </Link>
            <span>/</span>
            <span className="text-text-secondary">Countries</span>
          </nav>

          {/* Header */}
          <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-text-primary mb-4 tracking-tight">
            Browse by Country
          </h1>
          <p className="font-body text-lg text-text-secondary max-w-2xl mb-6">
            Explore {totalArtists.toLocaleString()} tattoo artists across{' '}
            {sortedCountries.length} countries worldwide.
          </p>

          {/* Action Links */}
          <div className="flex flex-wrap gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-ink-black text-paper-white font-mono text-xs uppercase tracking-[0.15em] border-2 border-ink-black hover:-translate-y-0.5 hover:shadow-md transition-all"
            >
              Search by Image
            </Link>
            <Link
              href="/us"
              className="inline-flex items-center gap-2 px-6 py-3 bg-transparent text-ink-black font-mono text-xs uppercase tracking-[0.15em] border-2 border-ink-black hover:bg-ink-black hover:text-paper-white hover:-translate-y-0.5 hover:shadow-md transition-all"
            >
              Browse US States
            </Link>
          </div>
        </div>
      </header>

      {/* Countries Grid */}
      <section className="max-w-7xl mx-auto px-4 py-12 md:py-16">
        <div className="mb-8 flex items-center justify-between">
          <h2 className="font-display text-2xl font-bold text-text-primary">
            All Countries
          </h2>
          <p className="font-mono text-xs uppercase tracking-wider text-text-tertiary">
            {sortedCountries.length} countries
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sortedCountries.map((country) => {
            const countrySlug = country.country_code.toLowerCase()

            return (
              <Link
                key={country.country_code}
                href={`/${countrySlug}`}
                className="group p-6 border-2 border-border-subtle hover:border-ink-black hover:-translate-y-1 hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display text-xl font-bold text-text-primary mb-1 group-hover:text-ink-black transition-colors truncate">
                      {getCountryName(country.country_code) || country.display_name}
                    </h3>
                    <p className="font-mono text-xs uppercase tracking-wider text-text-tertiary">
                      {country.artist_count.toLocaleString()}{' '}
                      {country.artist_count === 1 ? 'artist' : 'artists'}
                    </p>
                  </div>

                  <svg
                    className="w-5 h-5 text-text-tertiary group-hover:text-ink-black group-hover:translate-x-1 transition-all shrink-0"
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
            )
          })}
        </div>
      </section>
    </main>
  )
}
