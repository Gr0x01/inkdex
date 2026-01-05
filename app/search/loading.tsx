export default function SearchLoading() {
  return (
    <main className="min-h-screen bg-light">
      {/* Compact filter bar skeleton - positioned below sticky navbar */}
      <div className="sticky top-[var(--navbar-height)] md:top-[var(--navbar-height-desktop)] z-40 bg-[#F8F7F5] border-b border-ink/10">
        <div className="w-full px-3 md:px-4 md:container md:mx-auto md:px-6">
          <div className="flex items-center gap-1.5 md:gap-4 h-12 md:h-14">
            <div className="h-4 w-12 bg-ink/10 rounded animate-pulse" />
            <div className="h-3 w-px bg-ink/10" />
            <div className="h-4 w-24 bg-ink/10 rounded animate-pulse hidden sm:block" />
            <div className="ml-auto h-8 w-28 bg-ink/10 rounded animate-pulse" />
          </div>
        </div>
      </div>

      {/* Artist Cards Skeleton Grid */}
      <div className="w-full px-4 md:container md:mx-auto md:px-6 pt-4 md:pt-8 lg:pt-16 pb-6 md:pb-12">
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2 md:gap-4">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="bg-paper border-2 border-ink/10 overflow-hidden"
            >
              {/* Image skeleton */}
              <div className="aspect-square bg-gray-100 animate-pulse" />

              {/* Info skeleton */}
              <div className="p-3 sm:p-4 space-y-2">
                <div className="h-5 w-24 bg-ink/10 rounded animate-pulse" />
                <div className="flex items-center justify-between">
                  <div className="h-3 w-16 bg-ink/10 rounded animate-pulse" />
                  <div className="h-3 w-8 bg-ink/10 rounded animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
