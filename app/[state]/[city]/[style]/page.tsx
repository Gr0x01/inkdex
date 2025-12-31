import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { getArtistsByStyle, getStyleSeedBySlug, getStyleSeeds } from '@/lib/supabase/queries'
import { sanitizeForJsonLd, serializeJsonLd } from '@/lib/utils/seo'
import { CITIES, STATES } from '@/lib/constants/cities'
import ArtistCard from '@/components/search/ArtistCard'
import { getImageUrl } from '@/lib/utils/images'
import { styleSeedsData } from '@/scripts/style-seeds/style-seeds-data'

export async function generateStaticParams() {
  // Use static style data instead of database query (can't use async queries in generateStaticParams)
  // Generate params for all city × style combinations
  const params = []
  for (const city of CITIES) {
    const state = STATES.find((s) => s.code === city.state)
    if (!state) continue

    for (const style of styleSeedsData) {
      params.push({
        state: state.slug,
        city: city.slug,
        style: style.styleName,
      })
    }
  }

  return params
}

export const revalidate = 86400 // 24 hours

export async function generateMetadata({
  params,
}: {
  params: Promise<{ state: string; city: string; style: string }>
}): Promise<Metadata> {
  const { state: stateSlug, city: citySlug, style: styleSlug } = await params

  const state = STATES.find((s) => s.slug === stateSlug)
  const city = CITIES.find((c) => c.slug === citySlug)
  const styleSeed = await getStyleSeedBySlug(styleSlug)

  if (!state || !city || !styleSeed) {
    return { title: 'Style Not Found' }
  }

  // Sanitize all user-facing strings to prevent XSS in metadata
  const title = sanitizeForJsonLd(`${styleSeed.display_name} Tattoo Artists in ${city.name}, ${state.code} | Inkdex`)
  const description = sanitizeForJsonLd(
    `${styleSeed.description} Discover ${styleSeed.display_name.toLowerCase()} tattoo artists in ${city.name}, ${state.code}. Browse portfolios and connect via Instagram.`
  )

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
          url: '/og-style-default.jpg', // TODO: Use style seed image for OG
          width: 1200,
          height: 630,
          alt: sanitizeForJsonLd(`${styleSeed.display_name} Tattoo in ${city.name}, ${state.code}`),
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/og-style-default.jpg'],
    },
    alternates: {
      canonical: `/${stateSlug}/${citySlug}/${styleSlug}`,
    },
  }
}

export default async function StylePage({
  params,
}: {
  params: Promise<{ state: string; city: string; style: string }>
}) {
  const { state: stateSlug, city: citySlug, style: styleSlug } = await params

  const state = STATES.find((s) => s.slug === stateSlug)
  const city = CITIES.find((c) => c.slug === citySlug)
  const styleSeed = await getStyleSeedBySlug(styleSlug)

  if (!state || !city || !styleSeed) notFound()

  // Get artists whose work matches this style (using style seed embedding)
  const { artists } = await getArtistsByStyle(styleSlug, city.name, 100, 0)

  // JSON-LD Breadcrumbs (sanitized)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: sanitizeForJsonLd('Home'),
        item: sanitizeForJsonLd(process.env.NEXT_PUBLIC_APP_URL || 'https://inkdex.io'),
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: sanitizeForJsonLd(state.name),
        item: sanitizeForJsonLd(`${process.env.NEXT_PUBLIC_APP_URL || 'https://inkdex.io'}/${stateSlug}`),
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: sanitizeForJsonLd(city.name),
        item: sanitizeForJsonLd(`${process.env.NEXT_PUBLIC_APP_URL || 'https://inkdex.io'}/${stateSlug}/${citySlug}`),
      },
      {
        '@type': 'ListItem',
        position: 4,
        name: sanitizeForJsonLd(styleSeed.display_name),
        item: sanitizeForJsonLd(
          `${process.env.NEXT_PUBLIC_APP_URL || 'https://inkdex.io'}/${stateSlug}/${citySlug}/${styleSlug}`
        ),
      },
    ],
  }

  return (
    <div className="min-h-screen">
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />

      {/* Breadcrumbs */}
      <div className="border-b border-neutral-800 bg-[#0a0a0a]">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <nav className="flex items-center space-x-2 text-sm">
            <Link href="/" className="text-neutral-400 hover:text-white transition-colors">
              Home
            </Link>
            <span className="text-neutral-600">/</span>
            <Link href={`/${stateSlug}`} className="text-neutral-400 hover:text-white transition-colors">
              {state.name}
            </Link>
            <span className="text-neutral-600">/</span>
            <Link href={`/${stateSlug}/${citySlug}`} className="text-neutral-400 hover:text-white transition-colors">
              {city.name}
            </Link>
            <span className="text-neutral-600">/</span>
            <span className="text-white">{styleSeed.display_name}</span>
          </nav>
        </div>
      </div>

      {/* Hero Section */}
      <div className="bg-gradient-to-b from-[#0a0a0a] via-[#0f0f0f] to-[#0a0a0a]">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
            {/* Text Content */}
            <div className="flex flex-col justify-center">
              <h1 className="font-display text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
                {styleSeed.display_name} Tattoo Artists
              </h1>
              <p className="mt-4 font-display text-xl text-neutral-300">
                in {city.name}, {state.code}
              </p>
              <p className="mt-6 text-lg leading-relaxed text-neutral-400">
                {styleSeed.description}
              </p>
              <p className="mt-6 text-base text-neutral-500">
                Showing <span className="font-medium text-white">{artists.length}</span> artists whose work matches the {styleSeed.display_name.toLowerCase()} style in {city.name}.
              </p>

              {/* Internal Links */}
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href={`/${stateSlug}/${citySlug}`}
                  className="inline-flex items-center rounded-lg bg-neutral-800 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 transition-colors"
                >
                  All {city.name} Artists
                </Link>
                <Link
                  href="/"
                  className="inline-flex items-center rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-neutral-300 hover:bg-neutral-800 transition-colors"
                >
                  Search by Image
                </Link>
              </div>
            </div>

            {/* Style Example Image (Seed Image) */}
            {styleSeed.seed_image_url && (
              <div className="relative aspect-square overflow-hidden rounded-2xl bg-neutral-900 lg:aspect-[4/5]">
                <Image
                  src={getImageUrl(styleSeed.seed_image_url)}
                  alt={`${styleSeed.display_name} tattoo example`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute bottom-6 left-6 right-6">
                  <p className="text-sm font-medium text-white/90">Example of {styleSeed.display_name} style</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Artist Grid */}
      <div className="bg-[#0a0a0a] py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {artists.length === 0 ? (
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-12 text-center">
              <p className="text-lg text-neutral-400">
                No {styleSeed.display_name.toLowerCase()} artists found in {city.name} yet.
              </p>
              <p className="mt-2 text-sm text-neutral-500">
                Check back soon as we add more artists!
              </p>
            </div>
          ) : (
            <>
              <div className="mb-8 flex items-center justify-between">
                <h2 className="font-display text-2xl font-bold text-white">
                  {styleSeed.display_name} Artists in {city.name}
                </h2>
                <p className="text-sm text-neutral-500">{artists.length} results</p>
              </div>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {artists.map((artist: any) => (
                  <ArtistCard key={artist.id} artist={artist} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Other Styles Section (Internal Linking) */}
      <div className="border-t border-neutral-800 bg-[#0a0a0a] py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="mb-6 font-display text-2xl font-bold text-white">
            Explore Other Styles in {city.name}
          </h2>
          <div className="flex flex-wrap gap-3">
            {(await getStyleSeeds())
              .filter((s) => s.style_name !== styleSlug)
              .slice(0, 9)
              .map((style) => (
                <Link
                  key={style.style_name}
                  href={`/${stateSlug}/${citySlug}/${style.style_name}`}
                  className="inline-flex items-center rounded-lg border border-neutral-800 bg-neutral-900/50 px-4 py-2 text-sm font-medium text-neutral-300 hover:border-accent hover:bg-neutral-800 hover:text-white transition-colors"
                >
                  {style.display_name}
                </Link>
              ))}
          </div>
        </div>
      </div>
    </div>
  )
}
