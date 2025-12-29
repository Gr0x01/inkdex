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
}

interface RelatedArtistsProps {
  artistId: string
  city: string
}

export default async function RelatedArtists({
  artistId,
  city,
}: RelatedArtistsProps) {
  const relatedArtists = await getRelatedArtists(artistId, city, 4)

  if (relatedArtists.length === 0) {
    return null
  }

  return (
    <div className="my-12 py-12 border-y border-border-subtle">
      <div className="mb-8">
        <h3 className="font-display text-h3 font-[700] text-text-primary mb-2">
          Similar Artists in {city}
        </h3>
        <p className="font-body text-small text-text-secondary">
          Artists with comparable styles based on portfolio similarity
        </p>
      </div>

      {/* Horizontal scroll on mobile, grid on desktop */}
      <div className="overflow-x-auto pb-4 -mx-4 px-4 md:overflow-visible md:pb-0 md:mx-0 md:px-0">
        <div className="flex md:grid md:grid-cols-4 gap-6 min-w-max md:min-w-0">
          {relatedArtists.map((artist: RelatedArtist) => (
            <Link
              key={artist.id}
              href={`/artist/${artist.slug}`}
              className="group flex-shrink-0 w-[240px] md:w-auto"
            >
              <div className="bg-surface-low border border-border-subtle rounded-lg overflow-hidden hover:border-border-strong transition-all duration-medium lift-hover">
                {/* Profile Image */}
                <div className="relative aspect-square bg-surface-mid">
                  {artist.profile_image_url ? (
                    <Image
                      src={artist.profile_image_url}
                      alt={artist.name}
                      fill
                      sizes="(max-width: 768px) 240px, 25vw"
                      className="object-cover grayscale-hover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-surface-mid">
                      <svg
                        className="w-16 h-16 text-text-tertiary"
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
                </div>

                {/* Artist Info */}
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-display text-base font-[700] text-text-primary truncate group-hover:text-accent-primary transition-colors">
                      {artist.name}
                    </h4>
                    {artist.verification_status === 'verified' && (
                      <svg
                        className="w-4 h-4 text-accent-primary flex-shrink-0"
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
                    <p className="font-body text-tiny text-text-secondary truncate">
                      {artist.shop_name}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
