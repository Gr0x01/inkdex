import Link from 'next/link'
import Image from 'next/image'
import { SearchResult } from '@/types/search'

interface ArtistCardProps {
  artist: SearchResult
}

export default function ArtistCard({ artist }: ArtistCardProps) {
  const {
    artist_slug,
    artist_name,
    city,
    instagram_url,
    is_verified,
    matching_images,
    similarity,
  } = artist

  // Take top 4 matching images for gallery display (handle undefined and filter invalid)
  const topImages = (matching_images || [])
    .filter(img => img.url && img.instagramUrl)
    .slice(0, 4)

  // Convert similarity to percentage (0.0-1.0 → 0-100%)
  const matchPercentage = Math.round(similarity * 100)

  // Extract Instagram handle from URL
  const instagramHandle = instagram_url
    ? instagram_url.replace('https://www.instagram.com/', '@')
    : null

  return (
    <article className="group bg-surface-low rounded-lg border border-border-subtle shadow-md hover:shadow-glow-accent transition-all duration-medium hover:-translate-y-1 overflow-hidden">
      {/* Portfolio Images Grid */}
      {topImages.length > 0 && (
        <div className="grid grid-cols-2 gap-1 bg-bg-primary p-1">
          {topImages.map((image, index) => (
            <a
              key={image.url}
              href={image.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="relative aspect-square overflow-hidden bg-surface-mid"
              aria-label={`View ${artist_name}'s portfolio work ${index + 1} on Instagram`}
            >
              <Image
                src={image.url}
                alt={`${artist_name} portfolio work ${index + 1}`}
                fill
                sizes="(max-width: 768px) 50vw, (max-width: 1024px) 25vw, 15vw"
                className="object-cover grayscale-hover group-hover:scale-105 transition-all duration-medium"
              />
              {/* Hover Overlay with Instagram Icon */}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-medium flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-medium"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" />
                </svg>
              </div>
            </a>
          ))}
        </div>
      )}

      {/* Artist Info */}
      <div className="p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          {/* Name and Location */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-display text-xl font-[700] text-text-primary truncate">
                {artist_name}
              </h3>
              {is_verified && (
                <svg
                  className="w-5 h-5 text-accent-primary flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  aria-label="Verified artist"
                >
                  <path
                    fillRule="evenodd"
                    d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </div>

            {/* Location */}
            <p className="font-body text-sm text-text-secondary mb-1 flex items-center gap-1">
              <svg
                className="w-4 h-4 text-text-tertiary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              {city}
            </p>

            {/* Instagram Handle */}
            {instagramHandle && (
              <p className="font-body text-sm text-text-tertiary">
                {instagramHandle}
              </p>
            )}
          </div>

          {/* Match Score Badge */}
          {matchPercentage > 0 && (
            <div
              className={`
                flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-body font-[600] uppercase tracking-wide
                ${
                  matchPercentage >= 80
                    ? 'bg-status-success/20 text-status-success border border-status-success/30'
                    : matchPercentage >= 60
                    ? 'bg-accent-primary/20 text-accent-primary border border-accent-primary/30'
                    : 'bg-surface-mid text-text-secondary border border-border-medium'
                }
              `}
              aria-label={`${matchPercentage}% style match`}
            >
              {matchPercentage}%
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {instagram_url && (
            <a
              href={instagram_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 btn btn-primary py-2.5 text-xs justify-center"
            >
              <svg
                className="w-4 h-4"
                fill="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" />
              </svg>
              Instagram
            </a>
          )}

          <Link
            href={`/artist/${artist_slug}`}
            className="btn btn-secondary py-2.5 text-xs"
          >
            Profile
          </Link>
        </div>
      </div>
    </article>
  )
}
