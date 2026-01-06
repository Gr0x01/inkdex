/* eslint-disable @typescript-eslint/no-explicit-any -- Search result types vary */
import Link from 'next/link'
import { notFound } from 'next/navigation'
import ArtistCard from '@/components/search/ArtistCard'
import LocationFilter from '@/components/search/LocationFilter'
import { StickyFilterBar } from '@/components/search/StickyFilterBar'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { generatePageNumbers } from '@/components/pagination/Pagination'
import { createClient } from '@/lib/supabase/server'
import { searchArtistsWithStyleBoost } from '@/lib/supabase/queries'
import type { StyleMatch } from '@/lib/search/style-classifier'
import { getImageUrl } from '@/lib/utils/images'
import { slugToName } from '@/lib/utils/location'

interface SearchPageProps {
  searchParams: Promise<{
    id?: string
    country?: string
    region?: string
    city?: string
    page?: string
  }>
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { id, country, region, city, page } = await searchParams

  // Require search ID
  if (!id) {
    notFound()
  }

  // Parse pagination
  const currentPage = parseInt(page || '1', 10)
  const limit = 20
  const offset = (currentPage - 1) * limit

  // Fetch search from database (direct access, no HTTP request)
  const supabase = await createClient()

  const { data: search, error: searchError } = await supabase
    .from('searches')
    .select('*')
    .eq('id', id)
    .single()

  if (searchError || !search) {
    notFound()
  }

  // Parse embedding
  let embedding: number[]
  try {
    embedding = JSON.parse(search.embedding)
  } catch (error) {
    console.error('Failed to parse embedding:', error)
    throw new Error('Invalid embedding format')
  }

  // Parse detected styles for style-weighted search
  let detectedStyles: StyleMatch[] | null = null
  if (search.detected_styles) {
    try {
      detectedStyles = typeof search.detected_styles === 'string'
        ? JSON.parse(search.detected_styles)
        : search.detected_styles
    } catch (error) {
      console.error('Failed to parse detected_styles:', error)
      // Continue without style weighting
    }
  }

  // Get is_color for color-weighted search
  const isColorQuery: boolean | null = search.is_color ?? null

  // Extract artist_id_source for exclusion (similar_artist searches)
  const excludeArtistId = search.artist_id_source || null

  // Parse location filters - convert slugs to proper format for DB query
  const countryFilter = country?.toUpperCase() || null
  const regionFilter = region?.toUpperCase() || null
  // Convert city slug to name using centralized utility
  const cityFilter = city ? slugToName(city) : null

  // Search artists with style and color weighted ranking
  const { artists: rawResults, totalCount } = await searchArtistsWithStyleBoost(embedding, {
    country: countryFilter,
    region: regionFilter,
    city: cityFilter,
    limit,
    offset,
    threshold: 0.15,
    queryStyles: detectedStyles,
    isColorQuery,
  })

  // Map results to expected format
  const allResults = (Array.isArray(rawResults) ? rawResults : []).map((result: any) => ({
    artist_id: result.id,
    artist_name: result.name,
    artist_slug: result.slug,
    city: result.city,
    profile_image_url: result.profile_image_url,
    follower_count: result.follower_count || null,
    instagram_url: result.instagram_url,
    is_verified: result.is_verified,
    is_pro: result.is_pro ?? false,
    is_featured: result.is_featured ?? false,
    max_likes: result.max_likes || 0,
    matching_images: (result.images || []).map((img: any) => ({
      url: getImageUrl(img.url),
      instagramUrl: img.instagramUrl,
      similarity: img.similarity,
      likes_count: img.likes_count || null,
    })),
    similarity: result.boosted_score || result.max_similarity || 0,
    raw_similarity: result.max_similarity || 0,
    style_boost: result.style_boost || 0,
    color_boost: result.color_boost || 0,
    location_count: result.location_count,
  }))

  // Exclude source artist for similar_artist searches
  const artists = excludeArtistId
    ? allResults.filter(artist => artist.artist_id !== excludeArtistId)
    : allResults

  // Track search appearances with details (fire-and-forget)
  if (artists.length > 0) {
    // Fire-and-forget with error logging
    void (async () => {
      try {
        const appearancesData = artists.map((artist, index) => {
          // Use raw_similarity directly (style_boost already separated)
          return {
            artist_id: artist.artist_id,
            rank: index + 1,
            similarity: artist.raw_similarity,
            boosted_score: artist.similarity,
            image_count: artist.matching_images?.length || 3
          }
        })

        await supabase.rpc('track_search_appearances_with_details', {
          p_search_id: id,
          p_appearances: appearancesData
        })
      } catch (err) {
        console.error('[Search] Tracking failed:', err)
      }
    })()
  }

  // Pagination calculations
  const totalPages = Math.ceil(totalCount / limit)

  // Helper to build pagination URL
  const buildPageUrl = (pageNum: number) => {
    const params = new URLSearchParams()
    params.set('id', id)
    if (country) params.set('country', country)
    if (region) params.set('region', region)
    if (city) params.set('city', city)
    params.set('page', pageNum.toString())
    return `/search?${params.toString()}`
  }

  return (
    <main className="min-h-screen bg-light">
      {/* COMPACT EDITORIAL FILTER BAR - Mobile Optimized */}
      <StickyFilterBar>
        <div className="w-full px-3 md:px-4 md:container md:mx-auto md:px-6">
          <div className="flex items-center gap-1.5 md:gap-4 h-12 md:h-14 overflow-visible">
            {/* Back Link - Mobile Friendly */}
            <Link
              href="/"
              className="inline-flex items-center gap-1 md:gap-1.5 font-mono text-[10px] md:text-xs font-medium text-ink/60 hover:text-ink transition-colors duration-fast group flex-shrink-0 uppercase tracking-[0.15em]"
            >
              <svg
                className="w-3.5 h-3.5 md:w-3.5 md:h-3.5 group-hover:-translate-x-0.5 transition-transform duration-fast"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              New
            </Link>

            {/* Separator */}
            <div className="w-px h-4 md:h-5 bg-ink/10 flex-shrink-0" />

            {/* Location Filter - Scrollable on Mobile */}
            <div className="flex-1 overflow-visible">
              <ErrorBoundary fallback={<div className="text-xs text-ink/40">Filter unavailable</div>}>
                <LocationFilter searchId={id} />
              </ErrorBoundary>
            </div>
          </div>
        </div>
      </StickyFilterBar>

      {/* CONTENT */}
      <div className="container mx-auto px-4 md:px-6 py-8">
        {/* Results count */}
        <div className="mb-6">
          <p className="text-sm font-mono text-ink/60">
            {totalCount} {totalCount === 1 ? 'artist' : 'artists'} found
            {cityFilter && ` in ${cityFilter}`}
            {!cityFilter && regionFilter && ` in ${regionFilter}`}
            {!cityFilter && !regionFilter && countryFilter && ` in ${countryFilter}`}
          </p>
        </div>

        {/* Artist Grid */}
        {artists.length > 0 ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-4 md:gap-6">
            {artists.map((artist) => (
              <ArtistCard
                key={artist.artist_id}
                artist={{
                  artist_id: artist.artist_id,
                  artist_name: artist.artist_name,
                  artist_slug: artist.artist_slug,
                  city: artist.city,
                  profile_image_url: artist.profile_image_url,
                  follower_count: artist.follower_count,
                  instagram_url: artist.instagram_url,
                  is_verified: artist.is_verified,
                  is_pro: artist.is_pro,
                  is_featured: artist.is_featured,
                  location_count: artist.location_count,
                  similarity: artist.similarity,
                  matching_images: artist.matching_images.map((img: any) => ({
                    url: img.url,
                    instagramUrl: img.instagramUrl,
                    similarity: img.similarity,
                    likes_count: img.likes_count,
                  })),
                }}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-ink/60">No matching artists found</p>
            {(cityFilter || regionFilter) && (
              <p className="text-sm text-ink/40 mt-2">
                Try broadening your location filter
              </p>
            )}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <nav className="mt-8 flex justify-center" aria-label="Pagination">
            <div className="flex items-center gap-1">
              {/* Previous */}
              {currentPage > 1 ? (
                <Link
                  href={buildPageUrl(currentPage - 1)}
                  className="px-3 py-2 text-sm font-mono text-ink/60 hover:text-ink transition-colors"
                >
                  ←
                </Link>
              ) : (
                <span className="px-3 py-2 text-sm font-mono text-ink/20">←</span>
              )}

              {/* Page numbers */}
              {generatePageNumbers(currentPage, totalPages).map((pageNum, i) =>
                pageNum === '...' ? (
                  <span key={`ellipsis-${i}`} className="px-2 py-2 text-sm font-mono text-ink/40">
                    ...
                  </span>
                ) : (
                  <Link
                    key={pageNum}
                    href={buildPageUrl(pageNum as number)}
                    className={`px-3 py-2 text-sm font-mono transition-colors ${
                      currentPage === pageNum
                        ? 'text-ink bg-ink/5 rounded'
                        : 'text-ink/60 hover:text-ink'
                    }`}
                  >
                    {pageNum}
                  </Link>
                )
              )}

              {/* Next */}
              {currentPage < totalPages ? (
                <Link
                  href={buildPageUrl(currentPage + 1)}
                  className="px-3 py-2 text-sm font-mono text-ink/60 hover:text-ink transition-colors"
                >
                  →
                </Link>
              ) : (
                <span className="px-3 py-2 text-sm font-mono text-ink/20">→</span>
              )}
            </div>
          </nav>
        )}
      </div>
    </main>
  )
}
