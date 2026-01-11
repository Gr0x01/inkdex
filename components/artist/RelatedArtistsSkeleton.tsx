export default function RelatedArtistsSkeleton() {
  return (
    <div className="my-12 pt-12 border-t border-gray-300 animate-pulse">
      <div className="mb-8">
        {/* Title skeleton */}
        <div className="h-8 w-48 bg-gray-200 rounded mb-2" />
        {/* Subtitle skeleton */}
        <div className="h-4 w-64 bg-gray-200 rounded" />
      </div>

      {/* Cards grid - 4 cards matching the real component */}
      <div className="overflow-x-auto pb-4 -mx-4 px-4 md:overflow-visible md:pb-0 md:mx-0 md:px-0">
        <div className="flex md:grid md:grid-cols-4 gap-2 md:gap-4 min-w-max md:min-w-0">
          {[...Array(4)].map((_, index) => (
            <div
              key={index}
              className="flex-shrink-0 w-[280px] md:w-auto bg-paper border border-gray-300 overflow-hidden"
            >
              {/* Image placeholder */}
              <div className="aspect-[3/4] bg-gray-200" />

              {/* Info section */}
              <div className="p-4 bg-paper">
                {/* Name skeleton */}
                <div className="h-5 w-32 bg-gray-200 rounded mb-3" />
                {/* Shop name skeleton */}
                <div className="h-3 w-24 bg-gray-200 rounded mb-3" />
                {/* Followers skeleton */}
                <div className="pt-3 border-t border-gray-200">
                  <div className="h-4 w-20 bg-gray-200 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
