'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { CITIES } from '@/lib/constants/cities'
import { getStateSlug } from '@/lib/utils/city-helpers'
import { CookieSettingsLink } from '@/components/consent/CookieSettingsLink'

export default function Footer() {
  // Memoize sorted cities - only compute once
  const sortedCities = useMemo(
    () => [...CITIES].sort((a, b) => a.name.localeCompare(b.name)),
    []
  )

  return (
    <footer className="border-t border-stone-800 bg-black">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
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
          </div>

          {/* Browse Cities - Flat Alphabetical List */}
          <div>
            <h4 className="font-jetbrains-mono text-sm font-medium uppercase tracking-wider text-stone-400">
              Browse Cities
            </h4>
            <ul className="mt-4 space-y-2.5">
              {sortedCities.map((city) => (
                <li key={city.slug}>
                  <Link
                    href={`/${getStateSlug(city.state)}/${city.slug}`}
                    className="font-jetbrains-mono text-sm text-stone-300 transition-colors hover:text-accent inline-flex items-baseline gap-1.5"
                  >
                    <span className="font-medium">{city.name}</span>
                    <span className="text-xs text-stone-500">{city.state}</span>
                  </Link>
                </li>
              ))}
            </ul>
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
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-2 font-jetbrains-mono text-xs text-stone-500">
              <Link
                href="/legal/terms"
                className="transition-colors hover:text-accent"
              >
                Terms
              </Link>
              <span>·</span>
              <Link
                href="/legal/privacy"
                className="transition-colors hover:text-accent"
              >
                Privacy
              </Link>
              <span>·</span>
              <Link
                href="/contact"
                className="transition-colors hover:text-accent"
              >
                Contact
              </Link>
            </div>
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
