import Image from 'next/image'
import BioInterstitial from './BioInterstitial'
import RelatedArtists from './RelatedArtists'
import ClaimProfileCTA from './ClaimProfileCTA'
import { getPortfolioImageUrl } from '@/lib/utils/images'

interface PortfolioImage {
  id: string
  instagram_url: string
  storage_thumb_640?: string | null
  storage_thumb_1280?: string | null
  post_caption?: string | null
}

interface PortfolioGridProps {
  images: PortfolioImage[]
  artistName: string
  artistBio?: string | null
  artistId: string
  artistSlug: string
  city: string
  verificationStatus: string
}

export default function PortfolioGrid({
  images,
  artistName,
  artistBio,
  artistId,
  artistSlug,
  city,
  verificationStatus,
}: PortfolioGridProps) {
  return (
    <section className="container mx-auto px-4 py-12 md:py-16">
      <h2 className="font-display text-h2 font-[700] text-text-primary mb-8">
        Portfolio
      </h2>

      {/* Portfolio Grid with Interstitials */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {images.map((image, index) => (
          <div key={image.id} className="contents">
            {/* Regular Image Card */}
            <a
              href={image.instagram_url}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative aspect-square overflow-hidden rounded-lg bg-surface-mid border border-border-subtle hover:border-ink transition-all duration-medium hover:-translate-y-1"
            >
              <Image
                src={getPortfolioImageUrl(image)}
                alt={
                  image.post_caption ||
                  `${artistName}'s tattoo work ${index + 1}`
                }
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="object-cover"
                loading={index < 6 ? 'eager' : 'lazy'}
              />

              {/* Instagram icon overlay */}
              <div className="absolute inset-0 flex items-center justify-center bg-bg-primary/0 group-hover:bg-bg-primary/80 transition-colors duration-medium">
                <svg
                  className="w-12 h-12 text-text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-medium"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M12 2c2.717 0 3.056.01 4.122.06 1.065.05 1.79.217 2.428.465.66.254 1.216.598 1.772 1.153a4.908 4.908 0 0 1 1.153 1.772c.247.637.415 1.363.465 2.428.047 1.066.06 1.405.06 4.122 0 2.717-.01 3.056-.06 4.122-.05 1.065-.218 1.79-.465 2.428a4.883 4.883 0 0 1-1.153 1.772 4.915 4.915 0 0 1-1.772 1.153c-.637.247-1.363.415-2.428.465-1.066.047-1.405.06-4.122.06-2.717 0-3.056-.01-4.122-.06-1.065-.05-1.79-.218-2.428-.465a4.89 4.89 0 0 1-1.772-1.153 4.904 4.904 0 0 1-1.153-1.772c-.248-.637-.415-1.363-.465-2.428C2.013 15.056 2 14.717 2 12c0-2.717.01-3.056.06-4.122.05-1.066.217-1.79.465-2.428a4.88 4.88 0 0 1 1.153-1.772A4.897 4.897 0 0 1 5.45 2.525c.638-.248 1.362-.415 2.428-.465C8.944 2.013 9.283 2 12 2z" />
                </svg>
              </div>
            </a>

            {/* Interstitial: Bio Block (after 9th image) */}
            {index === 8 && artistBio && (
              <div className="col-span-full">
                <BioInterstitial artistName={artistName} bio={artistBio} />
              </div>
            )}

            {/* Interstitial: Related Artists (after 18th image) */}
            {index === 17 && (
              <div className="col-span-full">
                <RelatedArtists
                  artistId={artistId}
                  artistSlug={artistSlug}
                  city={city}
                />
              </div>
            )}

            {/* Interstitial: Claim Profile CTA (after 27th image, only if unclaimed) */}
            {index === 26 && verificationStatus === 'unclaimed' && (
              <div className="col-span-full">
                <ClaimProfileCTA artistName={artistName} />
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
