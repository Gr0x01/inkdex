export default function SearchLoading() {
  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header Skeleton */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
            <div className="h-10 w-40 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
      </div>

      {/* Results Skeleton */}
      <div className="container mx-auto px-4 py-8">
        {/* Title Skeleton */}
        <div className="mb-6">
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-2" />
          <div className="h-5 w-64 bg-gray-200 rounded animate-pulse" />
        </div>

        {/* Artist Cards Skeleton Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-xl shadow-md overflow-hidden"
            >
              {/* Header */}
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-start gap-4">
                  {/* Profile Image Skeleton */}
                  <div className="w-14 h-14 rounded-full bg-gray-200 animate-pulse flex-shrink-0" />

                  {/* Artist Info Skeleton */}
                  <div className="flex-1 space-y-2">
                    <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
                    <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                  </div>

                  {/* Badge Skeleton */}
                  <div className="h-7 w-20 bg-gray-200 rounded-full animate-pulse" />
                </div>
              </div>

              {/* Portfolio Images Skeleton */}
              <div className="grid grid-cols-3 gap-1 bg-gray-100 p-1">
                {[...Array(3)].map((_, j) => (
                  <div
                    key={j}
                    className="aspect-square bg-gray-200 animate-pulse"
                  />
                ))}
              </div>

              {/* Footer Skeleton */}
              <div className="p-6 flex gap-3">
                <div className="flex-1 h-10 bg-gray-200 rounded-lg animate-pulse" />
                <div className="w-28 h-10 bg-gray-200 rounded-lg animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
