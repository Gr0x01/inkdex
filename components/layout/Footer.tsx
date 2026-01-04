'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { CITIES } from '@/lib/constants/cities'
import { US_STATES } from '@/lib/constants/states'
import { buildCityUrl } from '@/lib/utils/city-helpers'
import { CookieSettingsLink } from '@/components/consent/CookieSettingsLink'

// Top cities to feature in footer (major metros)
const TOP_CITIES = [
  'los-angeles', 'new-york', 'chicago', 'houston', 'phoenix',
  'austin', 'miami', 'seattle', 'denver', 'portland',
  'las-vegas', 'san-diego', 'atlanta', 'dallas', 'san-francisco'
]

export default function Footer() {
  // Get featured cities and group remaining by state
  const { featuredCities, statesWithCities } = useMemo(() => {
    const featured = TOP_CITIES
      .map(slug => CITIES.find(c => c.slug === slug))
      .filter((c): c is typeof CITIES[0] => c !== undefined)

    // Group all cities by state
    const byState = CITIES.reduce((acc, city) => {
      if (!acc[city.state]) acc[city.state] = []
      acc[city.state].push(city)
      return acc
    }, {} as Record<string, typeof CITIES[number][]>)

    // Sort states and get state names
    const states = Object.keys(byState)
      .sort()
      .map(code => ({
        code,
        name: US_STATES.find(s => s.code === code)?.name || code,
        count: byState[code].length
      }))

    return { featuredCities: featured, statesWithCities: states }
  }, [])

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
              {CITIES.length} cities • {statesWithCities.length} states
            </p>
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
            <ul className="mt-4 space-y-1.5">
              {statesWithCities.slice(0, 8).map((state) => (
                <li key={state.code}>
                  <Link
                    href={`/us/${state.code.toLowerCase()}`}
                    className="font-jetbrains-mono text-sm text-stone-300 transition-colors hover:text-accent inline-flex items-baseline gap-1"
                  >
                    <span>{state.name}</span>
                    <span className="text-xs text-stone-500">({state.count})</span>
                  </Link>
                </li>
              ))}
            </ul>
            {statesWithCities.length > 8 && (
              <Link
                href="/browse"
                className="mt-3 inline-block font-jetbrains-mono text-xs text-stone-400 hover:text-accent transition-colors"
              >
                View all {statesWithCities.length} states →
              </Link>
            )}
          </div>

          {/* Company */}
          <div>
            <h4 className="font-jetbrains-mono text-sm font-medium uppercase tracking-wider text-stone-400">
              Company
            </h4>
            <ul className="mt-4 space-y-3">
              <li>
                <Link
                  href="/about"
                  className="font-jetbrains-mono text-sm text-stone-300 transition-colors hover:text-accent"
                >
                  About
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="font-jetbrains-mono text-sm text-stone-300 transition-colors hover:text-accent"
                >
                  Contact
                </Link>
              </li>
              <li>
                <Link
                  href="/legal/terms"
                  className="font-jetbrains-mono text-sm text-stone-300 transition-colors hover:text-accent"
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link
                  href="/legal/privacy"
                  className="font-jetbrains-mono text-sm text-stone-300 transition-colors hover:text-accent"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <CookieSettingsLink />
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 border-t border-stone-800 pt-8">
          <div className="flex flex-col items-center">
            <p className="font-jetbrains-mono text-center text-xs text-stone-500">
              © {new Date().getFullYear()} Inkdex. Visual search platform for
              finding tattoo artists.
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
