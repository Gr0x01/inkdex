'use client'

import Image from 'next/image'
import { isArtistFeatured } from '@/lib/utils/featured'
import ClaimProfileButton from './ClaimProfileButton'
import { ProBadge } from '@/components/badges/ProBadge'
import { trackClick } from '@/lib/analytics/client'
import { sanitizeText } from '@/lib/utils/sanitize'
import { ArtistLocation } from '@/types/search'

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
    is_pro: boolean | null
    locations?: ArtistLocation[]
  }
  portfolioImages?: PortfolioImage[]
}

export default function ArtistInfoColumn({
  artist,
  portfolioImages = [],
}: ArtistInfoColumnProps) {
  const isFeatured = isArtistFeatured(artist.follower_count)
  const displayBio = sanitizeText(artist.bio_override || artist.bio)

  // Calculate portfolio stats
  const portfolioCount = portfolioImages.length

  // Multi-location support
  const locations = artist.locations || []
  const primaryLocation = locations.find(l => l.is_primary) || {
    city: artist.city,
    region: artist.state,
    country_code: 'US'
  }
  const otherLocations = locations.filter(l => !l.is_primary)
  const hasMultipleLocations = otherLocations.length > 0

  // Format location string (US vs international)
  const formatLocation = (loc: ArtistLocation | typeof primaryLocation) => {
    if (loc.country_code === 'US') {
      return `${loc.city}${loc.region ? `, ${loc.region}` : ''}`
    } else {
      return `${loc.city || ''}${loc.region ? `, ${loc.region}` : ''}${loc.country_code ? `, ${loc.country_code}` : ''}`
    }
  }

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
                  <span className="font-mono text-xs font-semibold text-ink uppercase tracking-wider leading-none">
                    Featured
                  </span>
                </div>
              </div>
            )}

            {/* Minimal corner accent - top right only */}
            <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-warm-gray" />
          </div>
        )}

        {/* Header: Name (overline) + Handle + Badges + Location - TIGHT SPACING */}
        {artist.instagram_handle && (
          <div className="space-y-0.5 text-center">
            {/* Artist Name - overline above handle */}
            <p className="font-body text-sm font-light text-gray-900 leading-tight">
              {artist.name}
            </p>

            {/* Handle with Pro badge */}
            <div className="flex items-center justify-center gap-2 flex-wrap !mt-0 mb-2">
              <h1 className="font-heading text-xl sm:text-2xl font-black tracking-tight leading-none text-ink">
                @{artist.instagram_handle}
              </h1>
              {artist.is_pro && <ProBadge variant="badge" size="md" />}
            </div>

            {/* Location - all locations shown by default */}
            <div className="space-y-1">
              <p className="font-mono text-xs font-medium text-gray-500 leading-tight tracking-wide uppercase">
                {formatLocation(primaryLocation)}
              </p>

              {/* Other locations - always visible */}
              {hasMultipleLocations && (
                <div className="space-y-0.5 pt-1">
                  <p className="font-mono text-xs text-gray-400 uppercase">
                    Also works in:
                  </p>
                  {otherLocations.map((loc) => (
                    <p key={loc.id} className="font-mono text-xs text-gray-400 uppercase">
                      • {formatLocation(loc)}
                    </p>
                  ))}
                </div>
              )}
            </div>

            {/* Shop name if present */}
            {artist.shop_name && (
              <p className="font-mono text-xs font-normal text-gray-400 leading-tight">
                {artist.shop_name}
              </p>
            )}
          </div>
        )}

        {/* Stats - Inline, No Box, Typographic Only */}
        {(artist.follower_count || portfolioCount > 0) && (
          <div className="flex items-center justify-center gap-2.5 text-xs pt-1">
            {artist.follower_count && artist.follower_count > 0 && (
              <div>
                <span className="font-heading font-black text-ink">
                  {artist.follower_count >= 1000
                    ? `${(artist.follower_count / 1000).toFixed(1)}K`
                    : artist.follower_count.toLocaleString()}
                </span>
                <span className="font-mono font-normal text-gray-500 ml-1 text-xs uppercase tracking-wide">
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
                <span className="font-mono font-normal text-gray-500 ml-1 text-xs uppercase tracking-wide">
                  pieces
                </span>
              </div>
            )}
          </div>
        )}

        {/* Bio - Truncated at 4 lines */}
        {displayBio && (
          <div className="pt-1">
            <p className="font-body text-sm font-light text-gray-700 leading-snug line-clamp-4 italic">
              &ldquo;{displayBio}&rdquo;
            </p>
          </div>
        )}

        {/* CTAs - Compact */}
        <div className="pt-2 space-y-1.5">
          {/* Primary CTAs: Instagram + Book side-by-side if both exist */}
          {artist.instagram_url && artist.booking_url ? (
            <div className="grid grid-cols-2 gap-1.5">
              {/* Instagram - Primary with gradient */}
              <div
                className="group relative transition-all duration-200 overflow-hidden"
                style={{
                  background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
                  padding: '2px'
                }}
              >
                <div className="relative bg-gradient-to-r from-[#f09433] via-[#dc2743] to-[#bc1888] group-hover:bg-none group-hover:bg-paper transition-all duration-200">
                  <a
                    href={artist.instagram_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full py-2.5 text-paper text-center
                             font-mono text-xs tracking-widest uppercase font-semibold
                             focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
                  >
                    <span className="group-hover:bg-gradient-to-r group-hover:from-[#f09433] group-hover:via-[#dc2743] group-hover:to-[#bc1888] group-hover:bg-clip-text group-hover:text-transparent transition-all duration-200">
                      Instagram →
                    </span>
                  </a>
                </div>
              </div>

              {/* Book - Secondary */}
              <a
                href={artist.booking_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackClick('booking_click', artist.id)}
                className="block py-2.5 bg-transparent text-ink text-center font-mono text-xs font-semibold tracking-wider uppercase transition-all duration-200 hover:bg-gray-100 border border-gray-400 hover:border-ink"
              >
                Book
              </a>
            </div>
          ) : (
            <>
              {/* Instagram only - full width */}
              {artist.instagram_url && (
                <div
                  className="group relative transition-all duration-200 overflow-hidden"
                  style={{
                    background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
                    padding: '2px'
                  }}
                >
                  <div className="relative bg-gradient-to-r from-[#f09433] via-[#dc2743] to-[#bc1888] group-hover:bg-none group-hover:bg-paper transition-all duration-200">
                    <a
                      href={artist.instagram_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full py-2.5 text-paper text-center
                               font-mono text-xs tracking-widest uppercase font-semibold
                               focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
                    >
                      <span className="group-hover:bg-gradient-to-r group-hover:from-[#f09433] group-hover:via-[#dc2743] group-hover:to-[#bc1888] group-hover:bg-clip-text group-hover:text-transparent transition-all duration-200">
                        Instagram →
                      </span>
                    </a>
                  </div>
                </div>
              )}

              {/* Book only - full width */}
              {artist.booking_url && !artist.instagram_url && (
                <a
                  href={artist.booking_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackClick('booking_click', artist.id)}
                  className="block py-2.5 bg-transparent text-ink text-center font-mono text-xs font-semibold tracking-wider uppercase transition-all duration-200 hover:bg-gray-100 border border-gray-400 hover:border-ink"
                >
                  Book
                </a>
              )}
            </>
          )}

          {/* Website - always full width below */}
          {artist.website_url && (
            <a
              href={artist.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="block py-2.5 bg-transparent text-ink text-center font-mono text-xs font-semibold tracking-wider uppercase transition-all duration-200 hover:bg-gray-100 border border-gray-400 hover:border-ink"
            >
              Website
            </a>
          )}

          {/* Claim Profile CTA */}
          <div className="pt-2 border-t border-gray-200">
            <ClaimProfileButton
              artistId={artist.id}
              artistName={artist.name}
              instagramHandle={artist.instagram_handle || ''}
              verificationStatus={artist.verification_status}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
