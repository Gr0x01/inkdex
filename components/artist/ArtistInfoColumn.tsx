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

  return (
    <aside className="w-full lg:w-[30%] xl:w-[35%] lg:sticky lg:top-0 lg:self-start bg-paper">
      <div className="p-6 lg:p-8 space-y-5">
        {/* Instagram Handle (Primary) */}
        {artist.instagram_handle && (
          <div className="flex items-center gap-2">
            <h1 className="font-heading text-[2rem] lg:text-[2.5rem] font-[700] leading-[1.1] text-ink">
              @{artist.instagram_handle}
            </h1>
            {isVerified && (
              <svg
                className="w-6 h-6 text-warm-gray flex-shrink-0 mt-1"
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
        )}

        {/* Artist Name (Secondary) */}
        <div>
          <p className="font-body text-[1.125rem] text-gray-700 leading-relaxed">
            {artist.name}
          </p>

          {/* Location & Shop */}
          <p className="font-body text-[0.9375rem] text-gray-500 leading-relaxed mt-1">
            {artist.city}
            {artist.state && `, ${artist.state}`}
            {artist.shop_name && ` • ${artist.shop_name}`}
          </p>

          {/* Follower Count */}
          {artist.follower_count && artist.follower_count > 0 && (
            <p className="font-body text-[0.875rem] text-gray-500 mt-1">
              {artist.follower_count.toLocaleString()} followers
            </p>
          )}

          {/* Featured badge */}
          {isFeatured && (
            <div className="inline-flex items-center px-2.5 py-1 bg-accent/10 border border-accent/30 rounded-sm mt-2">
              <span className="font-mono text-[10px] font-bold text-accent uppercase tracking-[0.15em]">
                Featured
              </span>
            </div>
          )}
        </div>

        {/* Bio */}
        {displayBio && (
          <blockquote className="border-l-2 border-gray-500 pl-4 py-1">
            <p className="font-body text-[1rem] leading-[1.7] text-ink italic font-[300]">
              &ldquo;{displayBio}&rdquo;
            </p>
          </blockquote>
        )}

        {/* CTAs */}
        <div className="border-t border-gray-300 pt-5 space-y-2.5">
          {/* Primary CTA: Instagram */}
          {artist.instagram_url && (
            <a
              href={artist.instagram_url}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full py-2.5 px-5 bg-ink text-paper text-center font-body font-[600] text-[0.8125rem] tracking-wide uppercase transition-all duration-medium hover:bg-gray-900 hover:shadow-md border border-ink"
            >
              View on Instagram →
            </a>
          )}

          {/* Secondary CTAs */}
          {artist.booking_url && (
            <a
              href={artist.booking_url}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full py-2 px-4 bg-transparent text-ink text-center font-body font-[500] text-[0.75rem] tracking-wide uppercase transition-all duration-medium hover:bg-gray-100 border border-gray-500"
            >
              Book Appointment
            </a>
          )}
          {artist.website_url && (
            <a
              href={artist.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full py-2 px-4 bg-transparent text-ink text-center font-body font-[500] text-[0.75rem] tracking-wide uppercase transition-all duration-medium hover:bg-gray-100 border border-gray-500"
            >
              Website
            </a>
          )}
        </div>
      </div>
    </aside>
  )
}
