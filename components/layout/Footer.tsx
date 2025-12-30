import Link from 'next/link'
import { STATES, CITIES } from '@/lib/constants/cities'

export default function Footer() {
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

          {/* Browse by State */}
          <div>
            <h4 className="font-jetbrains-mono text-sm font-medium uppercase tracking-wider text-stone-400">
              Browse by State
            </h4>
            <ul className="mt-4 space-y-3">
              {STATES.map((state) => (
                <li key={state.slug}>
                  <Link
                    href={`/${state.slug}`}
                    className="font-jetbrains-mono text-sm text-stone-300 transition-colors hover:text-accent"
                  >
                    {state.name}
                  </Link>
                  <ul className="mt-2 ml-4 space-y-2">
                    {state.cities.map((citySlug) => {
                      // Find city from CITIES constant
                      const city = CITIES.find((c) => c.slug === citySlug)
                      const cityName = city?.name || citySlug
                      return (
                        <li key={citySlug}>
                          <Link
                            href={`/${state.slug}/${citySlug}`}
                            className="font-jetbrains-mono text-xs text-stone-400 transition-colors hover:text-stone-300"
                          >
                            {cityName}
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                </li>
              ))}
            </ul>
          </div>

          {/* About */}
          <div>
            <h4 className="font-jetbrains-mono text-sm font-medium uppercase tracking-wider text-stone-400">
              About
            </h4>
            <ul className="mt-4 space-y-3">
              <li>
                <Link
                  href="/"
                  className="font-jetbrains-mono text-sm text-stone-300 transition-colors hover:text-accent"
                >
                  How It Works
                </Link>
              </li>
              <li>
                <span className="font-jetbrains-mono text-sm text-stone-500">
                  For Artists (Coming Soon)
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 border-t border-stone-800 pt-8">
          <p className="font-jetbrains-mono text-center text-xs text-stone-500">
            © {new Date().getFullYear()} Inkdex. Visual search
            platform for finding tattoo artists.
          </p>
        </div>
      </div>
    </footer>
  )
}
