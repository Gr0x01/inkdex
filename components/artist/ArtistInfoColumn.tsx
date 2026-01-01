import Image from 'next/image'
import { isArtistFeatured } from '@/lib/utils/featured'
import FindSimilarArtistsButton from './FindSimilarArtistsButton'

interface PortfolioImage {
  id: string
  instagram_url: string
  storage_thumb_640?: string | null
  storage_thumb_1280?: string | null
  post_caption?: string | null
  likes_count: number | null
}

interface ArtistInfoColumnProps {
  artist: {
    id: string
    name: string
    slug: string
    city: string
    state: string | null
    shop_name: string | null
    bio: string | null
    bio_override: string | null
    instagram_url: string | null
    instagram_handle: string | null
    website_url: string | null
    booking_url: string | null
    profile_image_url: string | null
    follower_count: number | null
    verification_status: string
  }
  portfolioImages?: PortfolioImage[]
}

export default function ArtistInfoColumn({
  artist,
  portfolioImages = [],
}: ArtistInfoColumnProps) {
  const isVerified = artist.verification_status === 'verified'
  const isFeatured = isArtistFeatured(artist.follower_count)
  const displayBio = artist.bio_override || artist.bio

  // Calculate portfolio stats
  const portfolioCount = portfolioImages.length

  return (
    <div className="bg-paper relative">
      {/* Subtle grain texture overlay */}
      <div className="grain-overlay absolute inset-0 pointer-events-none opacity-20 sm:opacity-30" />

      {/* Compact Editorial Layout - Tight vertical spacing for no scrollbars */}
      <div className="relative px-5 pt-2 pb-5 sm:px-6 sm:pt-3 sm:pb-6 lg:px-8 lg:pt-4 lg:pb-8 space-y-2.5">

        {/* Profile Image - Portrait 3:4, More Compact */}
        {artist.profile_image_url && (
          <div className="relative w-full max-w-[200px] mx-auto">
            <div className="relative w-full aspect-[3/4] border-2 border-ink overflow-hidden">
              <Image
                src={artist.profile_image_url}
                alt={`${artist.name} profile`}
                fill
                className="object-cover"
                sizes="200px"
              />
            </div>

            {/* Featured Badge - Hanging Tag */}
            {isFeatured && (
              <div className="absolute bottom-2 -right-1 z-10">
                <div className="bg-featured px-2 py-[0.75rem] flex items-center justify-center">
                  <span className="font-mono text-[9px] font-semibold text-ink uppercase tracking-wider leading-none">
                    Featured
                  </span>
                </div>
              </div>
            )}

            {/* Minimal corner accent - top right only */}
            <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-warm-gray" />
          </div>
        )}

        {/* Header: Handle + Badges + Name + Location - TIGHT SPACING */}
        {artist.instagram_handle && (
          <div className="space-y-0.5 text-center">
            {/* Handle with inline badges */}
            <div className="flex items-center justify-center gap-1.5 flex-wrap">
              <h1 className="font-heading text-xl sm:text-2xl font-black tracking-tight leading-none text-ink">
                @{artist.instagram_handle}
              </h1>
              {isVerified && (
                <svg
                  className="w-3.5 h-3.5 text-blue-600 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  aria-label="Verified artist"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </div>

            {/* Artist Name - lighter weight, smaller */}
            <p className="font-body text-sm font-light text-gray-900 leading-tight">
              {artist.name}
            </p>

            {/* Location - very compact */}
            <p className="font-mono text-[10px] font-light text-gray-500 leading-tight tracking-wide uppercase">
              {artist.city}{artist.state && `, ${artist.state}`}
            </p>

            {/* Shop name if present */}
            {artist.shop_name && (
              <p className="font-mono text-[9px] font-light text-gray-400 leading-tight">
                {artist.shop_name}
              </p>
            )}
          </div>
        )}

        {/* Stats - Inline, No Box, Typographic Only */}
        {(artist.follower_count || portfolioCount > 0) && (
          <div className="flex items-center justify-center gap-2.5 text-[11px] pt-1">
            {artist.follower_count && artist.follower_count > 0 && (
              <div>
                <span className="font-heading font-black text-ink">
                  {artist.follower_count >= 1000
                    ? `${(artist.follower_count / 1000).toFixed(1)}K`
                    : artist.follower_count.toLocaleString()}
                </span>
                <span className="font-mono font-light text-gray-500 ml-1 text-[10px] uppercase tracking-wide">
                  followers
                </span>
              </div>
            )}
            {artist.follower_count && portfolioCount > 0 && (
              <span className="text-gray-300 font-light">•</span>
            )}
            {portfolioCount > 0 && (
              <div>
                <span className="font-heading font-black text-ink">
                  {portfolioCount}
                </span>
                <span className="font-mono font-light text-gray-500 ml-1 text-[10px] uppercase tracking-wide">
                  pieces
                </span>
              </div>
            )}
          </div>
        )}

        {/* Bio - Truncated at 3 lines, expandable */}
        {displayBio && (
          <div className="pt-1">
            <p className="font-body text-xs font-light text-gray-700 leading-snug line-clamp-3 italic">
              &ldquo;{displayBio}&rdquo;
            </p>
          </div>
        )}

        {/* CTAs - Compact */}
        <div className="pt-2 space-y-1.5">
          {/* Primary CTA: Instagram */}
          {artist.instagram_url && (
            <a
              href={artist.instagram_url}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full py-2 bg-ink text-paper text-center font-mono text-[10px] font-semibold tracking-widest uppercase transition-all duration-200 hover:bg-gray-900 border-2 border-ink"
            >
              Instagram →
            </a>
          )}

          {/* Secondary CTAs - Side by Side */}
          <div className="grid grid-cols-2 gap-1.5">
            {artist.booking_url && (
              <a
                href={artist.booking_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block py-1.5 bg-transparent text-ink text-center font-mono text-[9px] font-medium tracking-wider uppercase transition-all duration-200 hover:bg-gray-100 border border-gray-400 hover:border-ink"
              >
                Book
              </a>
            )}
            {artist.website_url && (
              <a
                href={artist.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block py-1.5 bg-transparent text-ink text-center font-mono text-[9px] font-medium tracking-wider uppercase transition-all duration-200 hover:bg-gray-100 border border-gray-400 hover:border-ink"
              >
                Website
              </a>
            )}
          </div>

          {/* Tertiary CTA: Find Similar Artists */}
          <div className="pt-2 border-t border-gray-200">
            <FindSimilarArtistsButton
              artistId={artist.id}
              artistName={artist.name}
              city={artist.city}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
