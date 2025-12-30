import Link from 'next/link'
import Image from 'next/image'
import { getRelatedArtists } from '@/lib/supabase/queries'

interface RelatedArtist {
  id: string
  name: string
  slug: string
  city: string
  profile_image_url: string | null
  instagram_url: string | null
  shop_name: string | null
  verification_status: string
  follower_count: number
  similarity: number
}

interface RelatedArtistsProps {
  artistId: string
  artistSlug: string
  city: string
}

function formatFollowers(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`
  }
  return count.toString()
}

export default async function RelatedArtists({
  artistId,
  artistSlug,
  city,
}: RelatedArtistsProps) {
  const relatedArtists = await getRelatedArtists(artistId, city, 4)

  // Additional safety: filter out current artist by both ID and slug
  const filteredArtists = relatedArtists.filter(
    (artist: RelatedArtist) =>
      artist.id !== artistId && artist.slug !== artistSlug
  )

  if (filteredArtists.length === 0) {
    return null
  }

  return (
    <div className="my-12 py-12 border-y border-gray-300">
      <div className="mb-8">
        <h3 className="font-display text-[2rem] font-[900] text-ink mb-2 tracking-tight">
          Similar Artists in {city}
        </h3>
        <p className="font-body text-[0.9375rem] text-gray-600">
          Artists with comparable styles based on portfolio similarity
        </p>
      </div>

      {/* Horizontal scroll on mobile, grid on desktop */}
      <div className="overflow-x-auto pb-4 -mx-4 px-4 md:overflow-visible md:pb-0 md:mx-0 md:px-0">
        <div className="flex md:grid md:grid-cols-4 gap-4 min-w-max md:min-w-0">
          {filteredArtists.map((artist: RelatedArtist, index: number) => (
            <Link
              key={artist.id}
              href={`/artist/${artist.slug}`}
              className="group flex-shrink-0 w-[280px] md:w-auto"
              style={{
                animationDelay: `${index * 50}ms`,
              }}
            >
              <div className="relative bg-paper border border-gray-300 overflow-hidden transition-all duration-300 hover:border-ink hover:shadow-xl hover:-translate-y-1">
                {/* Profile Image */}
                <div className="relative aspect-[3/4] bg-gray-100 overflow-hidden">
                  {artist.profile_image_url ? (
                    <Image
                      src={artist.profile_image_url}
                      alt={artist.name}
                      fill
                      sizes="(max-width: 768px) 280px, 25vw"
                      className="object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100">
                      <svg
                        className="w-16 h-16 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                    </div>
                  )}

                  {/* Gradient overlay on hover */}
                  <div className="absolute inset-0 bg-gradient-to-t from-ink/60 via-ink/0 to-ink/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>

                {/* Artist Info */}
                <div className="p-4 bg-paper">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="font-display text-[1.125rem] font-[800] text-ink leading-tight group-hover:text-accent-primary transition-colors line-clamp-2 decoration-0">
                      <span className="inline-block">@</span>
                      <span className="break-words">{artist.name}</span>
                    </h4>
                    {artist.verification_status === 'verified' && (
                      <svg
                        className="w-5 h-5 text-accent-primary flex-shrink-0 mt-0.5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                        aria-label="Verified"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>

                  {artist.shop_name && (
                    <p className="font-body text-[0.8125rem] text-gray-500 mb-3 truncate italic no-underline">
                      {artist.shop_name}
                    </p>
                  )}

                  {/* Stats */}
                  <div className="flex items-center gap-4 pt-3 border-t border-gray-200">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[0.9375rem] font-[700] text-ink">
                        {formatFollowers(artist.follower_count)}
                      </span>
                      <span className="font-body text-[0.6875rem] text-gray-500 uppercase tracking-wide">
                        Followers
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
