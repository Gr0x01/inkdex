'use client'

import Image from 'next/image'
import ClaimProfileButton from './ClaimProfileButton'
import { ProBadge } from '@/components/badges/ProBadge'
import { trackClick } from '@/lib/analytics/client'
import { sanitizeText } from '@/lib/utils/sanitize'
import { getProfileImageUrl } from '@/lib/utils/images'
import { ArtistLocation } from '@/types/search'
import { US_STATES } from '@/lib/constants/states'

interface PortfolioImage {
  id: string
  instagram_url: string
  storage_thumb_640?: string | null
  storage_thumb_1280?: string | null
  post_caption?: string | null
  likes_count: number | null
}

interface StyleProfile {
  style_name: string
  percentage: number
}

const STYLE_DISPLAY_NAMES: Record<string, string> = {
  'traditional': 'Traditional',
  'neo-traditional': 'Neo-Traditional',
  'fine-line': 'Fine Line',
  'blackwork': 'Blackwork',
  'geometric': 'Geometric',
  'realism': 'Realism',
  'japanese': 'Japanese',
  'watercolor': 'Watercolor',
  'dotwork': 'Dotwork',
  'tribal': 'Tribal',
  'illustrative': 'Illustrative',
  'surrealism': 'Surrealism',
  'minimalist': 'Minimalist',
  'lettering': 'Lettering',
  'new-school': 'New School',
  'trash-polka': 'Trash Polka',
  'black-and-gray': 'Black & Gray',
  'biomechanical': 'Biomechanical',
  'ornamental': 'Ornamental',
  'sketch': 'Sketch',
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
    profile_storage_path?: string | null
    profile_storage_thumb_320?: string | null
    profile_storage_thumb_640?: string | null
    follower_count: number | null
    verification_status: string
    is_pro: boolean | null
    is_featured: boolean | null
    last_instagram_sync_at: string | null
    locations?: ArtistLocation[]
    style_profiles?: StyleProfile[]
  }
  portfolioImages?: PortfolioImage[]
}

export default function ArtistInfoColumn({
  artist,
  portfolioImages = [],
}: ArtistInfoColumnProps) {
  const isFeatured = artist.is_featured === true
  const displayBio = sanitizeText(artist.bio_override || artist.bio)

  // Calculate portfolio stats
  const portfolioCount = portfolioImages.length

  // Format sync time for Pro users
  const formatSyncTime = (timestamp: string | null): string => {
    if (!timestamp) return 'Never synced'
    const now = new Date()
    const syncDate = new Date(timestamp)
    const diffMs = now.getTime() - syncDate.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays}d ago`
    return syncDate.toLocaleDateString()
  }

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
      // Handle state-only (no city) - show full state name
      if (!loc.city && loc.region) {
        const state = US_STATES.find(s => s.code === loc.region)
        return state ? state.name : loc.region
      }
      // Handle city + state
      return `${loc.city}${loc.region ? `, ${loc.region}` : ''}`
    } else {
      // International: handle missing city
      const parts = []
      if (loc.city) parts.push(loc.city)
      if (loc.region) parts.push(loc.region)
      if (loc.country_code) parts.push(loc.country_code)
      return parts.join(', ')
    }
  }

  return (
    <div className="bg-paper relative">
      {/* Subtle grain texture overlay */}
      <div className="grain-overlay absolute inset-0 pointer-events-none opacity-20 sm:opacity-30" />

      {/* Compact Editorial Layout - Tight vertical spacing for no scrollbars */}
      <div className="relative px-5 pt-2 pb-5 sm:px-6 sm:pt-3 sm:pb-6 lg:px-8 lg:pt-4 lg:pb-8 space-y-2.5">

        {/* Profile Image - Portrait 3:4, More Compact */}
        {(artist.profile_storage_thumb_640 || artist.profile_image_url) && (
          <div className="relative w-full max-w-[200px] mx-auto">
            <div className="relative w-full aspect-[3/4] border-2 border-ink overflow-hidden">
              <Image
                src={getProfileImageUrl(artist)}
                alt={`${artist.name} profile`}
                fill
                className="object-cover"
                sizes="200px"
              />
            </div>

            {/* Pro Badge - Hanging Tag (0.5rem above Featured when both exist) */}
            {artist.is_pro && (
              <div className={`absolute -right-1 z-10 ${isFeatured ? 'bottom-[3.25rem]' : 'bottom-2'}`}>
                <ProBadge variant="badge" size="md" className="py-3" />
              </div>
            )}

            {/* Featured Badge - Hanging Tag (below Pro if both exist) */}
            {isFeatured && (
              <div className="absolute bottom-2 -right-1 z-10">
                <div className="bg-featured px-2 py-3 flex items-center justify-center">
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

            {/* Handle */}
            <h1 className="font-heading text-xl sm:text-2xl font-black tracking-tight leading-none text-ink !mt-0 mb-2">
              @{artist.instagram_handle}
            </h1>

            {/* Location + Shop (inline) */}
            <div className="flex items-center justify-center gap-1.5 flex-wrap">
              {hasMultipleLocations && (
                <span className="relative group inline-flex items-center justify-center bg-ink text-paper w-[14px] h-[14px] text-[10px] font-bold font-sans leading-none p-0.5">
                  P
                  <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-ink text-paper text-xs font-mono whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 delay-1000 pointer-events-none">
                    Primary location
                  </span>
                </span>
              )}
              <p className="font-body text-base font-normal text-gray-600">
                {formatLocation(primaryLocation)}
                {artist.shop_name && (
                  <span className="text-gray-400"> — {artist.shop_name}</span>
                )}
              </p>
              {otherLocations.map((loc) => (
                <p key={loc.id} className="font-body text-base font-normal text-gray-600">
                  • {formatLocation(loc)}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Stats + Styles - Grouped together */}
        {(artist.follower_count || portfolioCount > 0 || (artist.style_profiles && artist.style_profiles.length > 0)) && (
          <div className="pt-1 space-y-2">
            {/* Stats row */}
            {(artist.follower_count || portfolioCount > 0) && (
              <div className="flex items-center justify-center gap-2.5 text-xs">
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

            {/* Style Badges - ink-stamped look */}
            {artist.style_profiles && artist.style_profiles.length > 0 && (
              <div className="flex items-center justify-center gap-2.5 flex-wrap">
                {artist.style_profiles.slice(0, 3).map((style) => (
                  <span
                    key={style.style_name}
                    className="font-mono text-[11px] uppercase tracking-[0.15em] font-semibold text-ink border border-ink px-2.5 py-1"
                  >
                    {STYLE_DISPLAY_NAMES[style.style_name] || style.style_name}
                  </span>
                ))}
              </div>
            )}

            {/* Sync status for Pro users */}
            {artist.is_pro && artist.last_instagram_sync_at && (
              <div className="flex items-center justify-center gap-1.5 text-xs">
                <span className="font-mono text-gray-400 uppercase tracking-wide">
                  Synced {formatSyncTime(artist.last_instagram_sync_at)}
                </span>
              </div>
            )}
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
                className="block py-2.5 bg-transparent text-ink text-center font-mono text-xs font-semibold tracking-wider uppercase transition-all duration-200 hover:bg-gray-100 border-2 border-ink hover:border-ink"
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
                  className="block py-2.5 bg-transparent text-ink text-center font-mono text-xs font-semibold tracking-wider uppercase transition-all duration-200 hover:bg-gray-100 border-2 border-ink hover:border-ink"
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
              className="block py-2.5 bg-transparent text-ink text-center font-mono text-xs font-semibold tracking-wider uppercase transition-all duration-200 hover:bg-gray-100 border-2 border-ink hover:border-ink"
            >
              Website
            </a>
          )}
        </div>

        {/* Bio - Prominent, supports paragraphs */}
        {displayBio && (
          <div className="pt-3">
            <p className="font-body text-base font-normal text-gray-900 leading-relaxed whitespace-pre-wrap">
              {displayBio}
            </p>
          </div>
        )}

        {/* Claim Profile CTA */}
        <div className="pt-3">
          <ClaimProfileButton
            artistId={artist.id}
            artistName={artist.name}
            instagramHandle={artist.instagram_handle || ''}
            verificationStatus={artist.verification_status}
          />
        </div>
      </div>
    </div>
  )
}
