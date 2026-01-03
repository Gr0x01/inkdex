export default function SearchLoading() {
  return (
    <main className="min-h-screen bg-bg-primary relative noise-overlay">
      {/* Header Skeleton */}
      <div className="bg-surface-low/80 border-b border-border-subtle backdrop-blur-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="h-6 w-32 bg-surface-mid rounded animate-shimmer" style={{
              backgroundImage: 'linear-gradient(90deg, rgb(40, 40, 40) 0px, rgb(50, 50, 50) 40px, rgb(40, 40, 40) 80px)',
              backgroundSize: '1000px 100%',
            }} />
            <div className="h-10 w-40 bg-surface-mid rounded animate-shimmer" style={{
              backgroundImage: 'linear-gradient(90deg, rgb(40, 40, 40) 0px, rgb(50, 50, 50) 40px, rgb(40, 40, 40) 80px)',
              backgroundSize: '1000px 100%',
            }} />
          </div>
        </div>
      </div>

      {/* Results Skeleton */}
      <div className="w-full px-4 md:container md:mx-auto md:px-6 pt-4 pb-6 md:pb-12 relative z-10">
        {/* Title Skeleton */}
        <div className="mb-8 md:mb-12">
          <div className="h-10 w-64 bg-surface-mid rounded animate-shimmer mb-3" style={{
            backgroundImage: 'linear-gradient(90deg, rgb(40, 40, 40) 0px, rgb(50, 50, 50) 40px, rgb(40, 40, 40) 80px)',
            backgroundSize: '1000px 100%',
          }} />
          <div className="h-6 w-80 bg-surface-mid rounded animate-shimmer" style={{
            backgroundImage: 'linear-gradient(90deg, rgb(40, 40, 40) 0px, rgb(50, 50, 50) 40px, rgb(40, 40, 40) 80px)',
            backgroundSize: '1000px 100%',
          }} />
        </div>

        {/* Artist Cards Skeleton Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 md:gap-4">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="bg-surface-low rounded-lg border border-border-subtle shadow-md overflow-hidden"
            >
              {/* Portfolio Images Skeleton */}
              <div className="grid grid-cols-2 gap-1 bg-bg-primary p-1">
                {[...Array(4)].map((_, j) => (
                  <div
                    key={j}
                    className="aspect-square bg-surface-mid animate-shimmer"
                    style={{
                      backgroundImage: 'linear-gradient(90deg, rgb(40, 40, 40) 0px, rgb(50, 50, 50) 40px, rgb(40, 40, 40) 80px)',
                      backgroundSize: '1000px 100%',
                    }}
                  />
                ))}
              </div>

              {/* Artist Info Skeleton */}
              <div className="p-6">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex-1 space-y-3">
                    <div className="h-6 w-32 bg-surface-mid rounded animate-shimmer" style={{
                      backgroundImage: 'linear-gradient(90deg, rgb(40, 40, 40) 0px, rgb(50, 50, 50) 40px, rgb(40, 40, 40) 80px)',
                      backgroundSize: '1000px 100%',
                    }} />
                    <div className="h-4 w-24 bg-surface-mid rounded animate-shimmer" style={{
                      backgroundImage: 'linear-gradient(90deg, rgb(40, 40, 40) 0px, rgb(50, 50, 50) 40px, rgb(40, 40, 40) 80px)',
                      backgroundSize: '1000px 100%',
                    }} />
                    <div className="h-4 w-28 bg-surface-mid rounded animate-shimmer" style={{
                      backgroundImage: 'linear-gradient(90deg, rgb(40, 40, 40) 0px, rgb(50, 50, 50) 40px, rgb(40, 40, 40) 80px)',
                      backgroundSize: '1000px 100%',
                    }} />
                  </div>
                  {/* Badge Skeleton */}
                  <div className="h-8 w-16 bg-surface-mid rounded-full animate-shimmer" style={{
                    backgroundImage: 'linear-gradient(90deg, rgb(40, 40, 40) 0px, rgb(50, 50, 50) 40px, rgb(40, 40, 40) 80px)',
                    backgroundSize: '1000px 100%',
                  }} />
                </div>

                {/* Buttons Skeleton */}
                <div className="flex gap-2">
                  <div className="flex-1 h-10 bg-surface-mid rounded-lg animate-shimmer" style={{
                    backgroundImage: 'linear-gradient(90deg, rgb(40, 40, 40) 0px, rgb(50, 50, 50) 40px, rgb(40, 40, 40) 80px)',
                    backgroundSize: '1000px 100%',
                  }} />
                  <div className="w-24 h-10 bg-surface-mid rounded-lg animate-shimmer" style={{
                    backgroundImage: 'linear-gradient(90deg, rgb(40, 40, 40) 0px, rgb(50, 50, 50) 40px, rgb(40, 40, 40) 80px)',
                    backgroundSize: '1000px 100%',
                  }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Background Decorative Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        {/* Top gradient orb */}
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-accent-primary opacity-5 rounded-full blur-3xl" />
        {/* Bottom gradient orb */}
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-accent-secondary opacity-5 rounded-full blur-3xl" />
      </div>
    </main>
  )
}
