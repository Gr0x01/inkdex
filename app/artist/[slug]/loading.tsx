export default function Loading() {
  return (
    <div className="min-h-screen bg-bg-primary relative noise-overlay">
      {/* Hero Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 min-h-screen">
        {/* Featured Image Skeleton */}
        <div className="h-[50vh] md:h-full bg-surface-mid animate-pulse" />

        {/* Artist Info Skeleton */}
        <div className="flex flex-col justify-center px-6 md:px-12 lg:px-16 py-12">
          <div className="max-w-xl mx-auto w-full space-y-6">
            {/* Name skeleton */}
            <div className="space-y-2">
              <div className="h-12 bg-surface-mid rounded animate-pulse w-3/4" />
              <div className="h-6 bg-surface-mid rounded animate-pulse w-1/2" />
            </div>

            {/* Bio skeleton */}
            <div className="space-y-2">
              <div className="h-4 bg-surface-mid rounded animate-pulse w-full" />
              <div className="h-4 bg-surface-mid rounded animate-pulse w-5/6" />
              <div className="h-4 bg-surface-mid rounded animate-pulse w-4/5" />
            </div>

            {/* CTA skeleton */}
            <div className="h-12 bg-surface-mid rounded animate-pulse w-64" />
          </div>
        </div>
      </div>

      {/* Portfolio Grid Skeleton */}
      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="h-8 bg-surface-mid rounded animate-pulse w-32 mb-8" />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square bg-surface-mid rounded-lg animate-pulse"
            />
          ))}
        </div>
      </div>
    </div>
  )
}
