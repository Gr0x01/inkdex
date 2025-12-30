import Image from 'next/image'
import { getPortfolioImageUrl } from '@/lib/utils/images'
import { isArtistFeatured } from '@/lib/utils/featured'

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
  firstPortfolioImage?: PortfolioImage | null
  portfolioImages?: PortfolioImage[]
}

export default function ArtistInfoColumn({
  artist,
  firstPortfolioImage,
  portfolioImages = [],
}: ArtistInfoColumnProps) {
  const isVerified = artist.verification_status === 'verified'
  const isFeatured = isArtistFeatured(portfolioImages)
  const displayBio = artist.bio_override || artist.bio

  // Calculate portfolio stats
  const portfolioCount = portfolioImages.length
  const totalLikes = portfolioImages.reduce((sum, img) => sum + (img.likes_count || 0), 0)

  return (
    <aside className="w-full lg:w-[30%] xl:w-[35%] lg:sticky lg:top-0 lg:self-start bg-paper relative">
      {/* Subtle grain texture overlay - reduced on mobile */}
      <div className="grain-overlay absolute inset-0 pointer-events-none opacity-20 sm:opacity-30" />

      <div className="relative p-5 sm:p-6 lg:p-8 space-y-5 sm:space-y-6">
        {/* Profile Image - Editorial Style */}
        {artist.profile_image_url && (
          <div className="relative">
            <div className="relative w-32 h-32 sm:w-40 sm:h-40 mx-auto border-2 sm:border-4 border-ink overflow-hidden">
              <Image
                src={artist.profile_image_url}
                alt={`${artist.name} profile`}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 128px, 160px"
              />
            </div>
            {/* Decorative corner accents - smaller on mobile */}
            <div className="absolute -top-1 -left-1 sm:-top-2 sm:-left-2 w-4 h-4 sm:w-6 sm:h-6 border-t-2 border-l-2 border-warm-gray" />
            <div className="absolute -bottom-1 -right-1 sm:-bottom-2 sm:-right-2 w-4 h-4 sm:w-6 sm:h-6 border-b-2 border-r-2 border-warm-gray" />
          </div>
        )}

        {/* Instagram Handle (Primary) */}
        {artist.instagram_handle && (
          <div className="text-center">
            <div className="flex items-center justify-center gap-2">
              <h1 className="font-heading text-[1.75rem] sm:text-[2rem] lg:text-[2.25rem] font-[700] leading-[1.1] text-ink break-words">
                @{artist.instagram_handle}
              </h1>
              {isVerified && (
                <svg
                  className="w-5 h-5 sm:w-6 sm:h-6 text-warm-gray flex-shrink-0 mt-1"
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

            {/* Artist Name (Secondary) */}
            <p className="font-body text-[1rem] sm:text-[1.0625rem] text-gray-700 leading-relaxed mt-2">
              {artist.name}
            </p>

            {/* Location & Shop */}
            <p className="font-body text-[0.8125rem] sm:text-[0.875rem] text-gray-500 leading-relaxed mt-1">
              {artist.city}
              {artist.state && `, ${artist.state}`}
            </p>
            {artist.shop_name && (
              <p className="font-body text-[0.8125rem] sm:text-[0.875rem] text-gray-500 leading-relaxed">
                {artist.shop_name}
              </p>
            )}
          </div>
        )}

        {/* Stats Module - Editorial Card */}
        <div className="border-2 border-ink bg-gray-100/50 p-3 sm:p-4">
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {/* Follower Count */}
            {artist.follower_count && artist.follower_count > 0 && (
              <div className="text-center">
                <div className="font-heading text-[1.75rem] sm:text-[2rem] font-[700] text-ink leading-none">
                  {artist.follower_count >= 1000
                    ? `${(artist.follower_count / 1000).toFixed(1)}K`
                    : artist.follower_count.toLocaleString()}
                </div>
                <div className="font-mono text-[0.625rem] text-gray-500 tracking-[0.15em] uppercase mt-1">
                  Followers
                </div>
              </div>
            )}

            {/* Portfolio Count */}
            {portfolioCount > 0 && (
              <div className="text-center">
                <div className="font-heading text-[1.75rem] sm:text-[2rem] font-[700] text-ink leading-none">
                  {portfolioCount}
                </div>
                <div className="font-mono text-[0.625rem] text-gray-500 tracking-[0.15em] uppercase mt-1">
                  Pieces
                </div>
              </div>
            )}
          </div>

          {/* Total Likes (if significant) */}
          {totalLikes > 100 && (
            <div className="text-center mt-3 pt-3 border-t border-gray-300">
              <div className="font-body text-[0.875rem] text-gray-600">
                <span className="font-[600] text-ink">{totalLikes.toLocaleString()}</span> total likes
              </div>
            </div>
          )}
        </div>

        {/* Featured badge */}
        {isFeatured && (
          <div className="flex justify-center">
            <div className="inline-flex items-center px-3 py-1.5 bg-ink border-2 border-ink">
              <span className="font-mono text-[0.625rem] font-bold text-paper uppercase tracking-[0.2em]">
                Featured Artist
              </span>
            </div>
          </div>
        )}

        {/* Bio */}
        {displayBio && (
          <blockquote className="border-l-2 border-ink pl-4 py-1">
            <p className="font-body text-[0.9375rem] sm:text-[1rem] leading-[1.7] text-ink italic font-[300]">
              &ldquo;{displayBio}&rdquo;
            </p>
          </blockquote>
        )}

        {/* CTAs */}
        <div className="border-t-2 border-ink pt-5 space-y-2.5">
          {/* Primary CTA: Instagram */}
          {artist.instagram_url && (
            <a
              href={artist.instagram_url}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full py-3 px-5 bg-ink text-paper text-center font-mono text-[0.6875rem] font-[600] tracking-[0.15em] uppercase transition-all duration-medium hover:bg-gray-900 hover:shadow-lg hover:translate-y-[-2px] border-2 border-ink"
            >
              View on Instagram →
            </a>
          )}

          {/* Secondary CTAs */}
          <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
            {artist.booking_url && (
              <a
                href={artist.booking_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block py-2 px-2 sm:px-3 bg-transparent text-ink text-center font-mono text-[0.625rem] font-[500] tracking-[0.1em] uppercase transition-all duration-medium hover:bg-gray-100 border border-gray-500 hover:border-ink"
              >
                Book
              </a>
            )}
            {artist.website_url && (
              <a
                href={artist.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block py-2 px-2 sm:px-3 bg-transparent text-ink text-center font-mono text-[0.625rem] font-[500] tracking-[0.1em] uppercase transition-all duration-medium hover:bg-gray-100 border border-gray-500 hover:border-ink"
              >
                Website
              </a>
            )}
          </div>
        </div>
      </div>
    </aside>
  )
}
