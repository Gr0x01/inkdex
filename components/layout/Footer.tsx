'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { CITIES } from '@/lib/constants/cities'
import { US_STATES } from '@/lib/constants/states'
import { getCountryName } from '@/lib/constants/countries'
import { buildCityUrl } from '@/lib/utils/city-helpers'
import { CookieSettingsLink } from '@/components/consent/CookieSettingsLink'

// Top cities to feature in footer (major metros)
const TOP_CITIES = [
  'los-angeles', 'new-york', 'chicago', 'houston', 'phoenix',
  'austin', 'miami', 'seattle', 'denver', 'portland',
  'las-vegas', 'san-diego', 'atlanta', 'dallas', 'san-francisco'
]

interface StateWithArtists {
  region: string
  region_name: string
  artist_count: number
}

interface CountryWithArtists {
  country_code: string
  country_name: string
  artist_count: number
}

interface FooterProps {
  statesWithArtists?: StateWithArtists[]
  countriesWithArtists?: CountryWithArtists[]
}

export default function Footer({ statesWithArtists = [], countriesWithArtists = [] }: FooterProps) {
  // Get featured cities and process location data
  const { featuredCities, statesForFooter, countriesForFooter } = useMemo(() => {
    // Create a set of states that have artists with images
    const statesWithData = new Set(statesWithArtists.map(s => s.region))

    // Filter featured cities to only those in states with data
    const featured = TOP_CITIES
      .map(slug => CITIES.find(c => c.slug === slug))
      .filter((c): c is typeof CITIES[0] => c !== undefined && statesWithData.has(c.state))

    // Map state data to display format, sorted by artist count
    const states = statesWithArtists
      .map(s => ({
        code: s.region,
        name: US_STATES.find(st => st.code === s.region)?.name || s.region,
        count: s.artist_count
      }))
      .sort((a, b) => b.count - a.count) // Sort by artist count descending

    // Map country data to display format, sorted by artist count
    const countries = countriesWithArtists
      .map(c => ({
        code: c.country_code,
        name: getCountryName(c.country_code) || c.country_name,
        count: c.artist_count
      }))
      .sort((a, b) => b.count - a.count) // Sort by artist count descending

    return { featuredCities: featured, statesForFooter: states, countriesForFooter: countries }
  }, [statesWithArtists, countriesWithArtists])

  return (
    <footer className="border-t border-stone-800 bg-black">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <Link href="/" className="group">
              <h3 className="font-libre-baskerville text-xl font-bold tracking-tight text-white transition-colors group-hover:text-accent">
                Inkdex
              </h3>
            </Link>
            <p className="mt-4 font-jetbrains-mono text-sm text-stone-400">
              Find your perfect tattoo artist through visual search. Upload an
              image or describe your vision.
            </p>
            <p className="mt-3 font-jetbrains-mono text-xs text-stone-500">
              {statesForFooter.length} states
            </p>
            <a
              href="https://instagram.com/inkdexio"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 font-jetbrains-mono text-sm text-stone-400 transition-colors hover:text-accent"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4s1.791-4 4-4 4 1.791 4 4-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
              @inkdexio
            </a>
          </div>

          {/* Popular Cities */}
          <div>
            <h4 className="font-jetbrains-mono text-sm font-medium uppercase tracking-wider text-stone-400">
              Popular Cities
            </h4>
            <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2">
              {featuredCities.slice(0, 10).map((city) => (
                <li key={city.slug}>
                  <Link
                    href={buildCityUrl(city.state, city.slug)}
                    className="font-jetbrains-mono text-sm text-stone-300 transition-colors hover:text-accent"
                  >
                    {city.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Browse by State */}
          <div>
            <h4 className="font-jetbrains-mono text-sm font-medium uppercase tracking-wider text-stone-400">
              Browse by State
            </h4>
            <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5">
              {statesForFooter.slice(0, 8).map((state) => (
                <li key={state.code}>
                  <Link
                    href={`/us/${state.code.toLowerCase()}`}
                    className="font-jetbrains-mono text-sm text-stone-300 transition-colors hover:text-accent"
                  >
                    {state.name}
                  </Link>
                </li>
              ))}
            </ul>
            {statesForFooter.length > 8 && (
              <Link
                href="/us"
                className="mt-3 inline-block font-jetbrains-mono text-xs text-stone-400 hover:text-accent transition-colors"
              >
                View all states →
              </Link>
            )}
          </div>

          {/* Browse by Country */}
          {countriesForFooter.length > 0 && (
            <div>
              <h4 className="font-jetbrains-mono text-sm font-medium uppercase tracking-wider text-stone-400">
                Browse by Country
              </h4>
              <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5">
                {countriesForFooter.slice(0, 8).map((country) => (
                  <li key={country.code}>
                    <Link
                      href={`/${country.code.toLowerCase()}`}
                      className="font-jetbrains-mono text-sm text-stone-300 transition-colors hover:text-accent"
                    >
                      {country.name}
                    </Link>
                  </li>
                ))}
              </ul>
              {countriesForFooter.length > 8 && (
                <Link
                  href="/countries"
                  className="mt-3 inline-block font-jetbrains-mono text-xs text-stone-400 hover:text-accent transition-colors"
                >
                  View all countries →
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Bottom bar with Company links */}
        <div className="mt-12 border-t border-stone-800 pt-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {/* Company links - horizontal on larger screens */}
            <nav className="flex flex-wrap gap-x-6 gap-y-2 font-jetbrains-mono text-xs text-stone-400">
              <Link href="/guides" className="hover:text-accent transition-colors">Guides</Link>
              <Link href="/about" className="hover:text-accent transition-colors">About</Link>
              <Link href="/contact" className="hover:text-accent transition-colors">Contact</Link>
              <Link href="/legal/terms" className="hover:text-accent transition-colors">Terms</Link>
              <Link href="/legal/privacy" className="hover:text-accent transition-colors">Privacy</Link>
              <CookieSettingsLink />
            </nav>
            {/* Copyright */}
            <p className="font-jetbrains-mono text-xs text-stone-500">
              © {new Date().getFullYear()} Inkdex
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
