import Image from 'next/image'
import { getArtistFeaturedImageUrl } from '@/lib/utils/images'
import { sanitizeText } from '@/lib/utils/sanitize'
import { getPrimaryLocation, ArtistLocationData } from '@/lib/utils/location'

interface ArtistHeroProps {
  artist: {
    id: string
    name: string
    slug: string
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
    locations?: ArtistLocationData[]
  }
  featuredImage?: {
    storage_thumb_1280?: string | null
    storage_thumb_640?: string | null
    instagram_url: string
  } | null
}

export default function ArtistHero({ artist, featuredImage }: ArtistHeroProps) {
  const displayBio = sanitizeText(artist.bio_override || artist.bio)
  const fullImageUrl = getArtistFeaturedImageUrl(
    featuredImage,
    artist.profile_image_url
  )

  // Get primary location from artist_locations
  const primaryLoc = getPrimaryLocation(artist.locations)
  const locationStr = primaryLoc
    ? [primaryLoc.city, primaryLoc.region].filter(Boolean).join(', ')
    : ''

  return (
    <section className="relative w-full min-h-[80vh] md:min-h-screen bg-bg-primary">
      {/* Desktop: Split-screen layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 min-h-[80vh] md:min-h-screen">
        {/* Left: Featured Image */}
        <div className="relative h-[50vh] md:h-full overflow-hidden bg-surface-mid">
          <Image
            src={fullImageUrl}
            alt={`Featured work by ${artist.name}`}
            fill
            priority
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover"
          />
        </div>

        {/* Right: Artist Info */}
        <div className="flex flex-col justify-center px-6 md:px-12 lg:px-16 py-12 bg-bg-primary">
          <div className="max-w-xl mx-auto w-full space-y-6">
            {/* Name */}
            <div>
              <h1 className="font-display text-h1 md:text-display font-[700] text-text-primary mb-2">
                {artist.name}
              </h1>

              {/* Location */}
              {(locationStr || artist.shop_name) && (
                <p className="font-body text-body text-text-secondary">
                  {locationStr}
                  {artist.shop_name && ` • ${sanitizeText(artist.shop_name)}`}
                </p>
              )}
            </div>

            {/* Bio */}
            {displayBio && (
              <div className="space-y-2">
                <p className="font-body text-body leading-relaxed text-text-primary italic line-clamp-4">
                  {displayBio}
                </p>
              </div>
            )}

            {/* Instagram Handle */}
            {artist.instagram_handle && (
              <p className="font-mono text-small text-text-secondary">
                @{artist.instagram_handle}
                {artist.follower_count && artist.follower_count > 0 && (
                  <span className="ml-2">
                    • {artist.follower_count.toLocaleString()} followers
                  </span>
                )}
              </p>
            )}

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              {/* Primary CTA: Instagram */}
              {artist.instagram_url && (
                <a
                  href={artist.instagram_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary inline-flex items-center justify-center gap-2 group"
                >
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d="M12 2c2.717 0 3.056.01 4.122.06 1.065.05 1.79.217 2.428.465.66.254 1.216.598 1.772 1.153a4.908 4.908 0 0 1 1.153 1.772c.247.637.415 1.363.465 2.428.047 1.066.06 1.405.06 4.122 0 2.717-.01 3.056-.06 4.122-.05 1.065-.218 1.79-.465 2.428a4.883 4.883 0 0 1-1.153 1.772 4.915 4.915 0 0 1-1.772 1.153c-.637.247-1.363.415-2.428.465-1.066.047-1.405.06-4.122.06-2.717 0-3.056-.01-4.122-.06-1.065-.05-1.79-.218-2.428-.465a4.89 4.89 0 0 1-1.772-1.153 4.904 4.904 0 0 1-1.153-1.772c-.248-.637-.415-1.363-.465-2.428C2.013 15.056 2 14.717 2 12c0-2.717.01-3.056.06-4.122.05-1.066.217-1.79.465-2.428a4.88 4.88 0 0 1 1.153-1.772A4.897 4.897 0 0 1 5.45 2.525c.638-.248 1.362-.415 2.428-.465C8.944 2.013 9.283 2 12 2z" />
                  </svg>
                  Follow on Instagram
                  <svg
                    className="w-4 h-4 group-hover:translate-x-1 transition-transform"
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
                </a>
              )}

              {/* Secondary CTAs */}
              <div className="flex gap-3">
                {artist.booking_url && (
                  <a
                    href={artist.booking_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary"
                  >
                    Book Appointment
                  </a>
                )}
                {artist.website_url && (
                  <a
                    href={artist.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary"
                  >
                    Website
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 hidden md:block animate-bounce">
        <svg
          className="w-6 h-6 text-text-tertiary"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </div>
    </section>
  )
}
