/**
 * Recent Searches Table Component
 * Displays recent search appearances for Pro artist analytics
 */

'use client'

interface SearchAppearance {
  searchId: string
  queryType: 'text' | 'image' | 'hybrid' | 'instagram_post' | 'instagram_profile' | 'similar_artist'
  queryText: string | null
  instagramUsername: string | null
  rank: number
  similarityScore: number
  boostedScore: number
  timestamp: string
}

interface RecentSearchesTableProps {
  searches: SearchAppearance[]
  totalCount: number
}

export default function RecentSearchesTable({ searches, totalCount }: RecentSearchesTableProps) {
  if (searches.length === 0) {
    return (
      <div className="border border-gray-300 bg-white p-4 sm:p-6">
        <h2 className="font-heading text-base sm:text-lg mb-4">Recent Search Appearances</h2>
        <p className="font-body text-xs text-gray-500">
          No search appearances recorded yet. Check back after users search for artists.
        </p>
      </div>
    )
  }

  return (
    <div className="border border-gray-300 bg-white p-4 sm:p-6">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="font-heading text-base sm:text-lg">Recent Search Appearances</h2>
        <p className="font-mono text-[10px] uppercase tracking-wider text-gray-500">
          {totalCount.toLocaleString()} Total
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="font-mono text-[10px] uppercase tracking-wider text-gray-500 text-left pb-2 pr-4">
                Search Query
              </th>
              <th className="font-mono text-[10px] uppercase tracking-wider text-gray-500 text-left pb-2 pr-4">
                Time
              </th>
              <th className="font-mono text-[10px] uppercase tracking-wider text-gray-500 text-right pb-2 pr-4">
                Match
              </th>
              <th className="font-mono text-[10px] uppercase tracking-wider text-gray-500 text-right pb-2">
                Rank
              </th>
            </tr>
          </thead>
          <tbody>
            {searches.map((search) => (
              <tr key={search.searchId} className="border-b border-gray-100 last:border-0">
                <td className="py-2.5 pr-4 font-body text-xs">
                  {formatQueryText(search)}
                </td>
                <td className="py-2.5 pr-4 font-mono text-[10px] text-gray-500">
                  {formatRelativeTime(search.timestamp)}
                </td>
                <td className="py-2.5 pr-4 font-mono text-xs text-right">
                  {formatSimilarityScore(search.boostedScore)}
                </td>
                <td className="py-2.5 font-mono text-xs text-right text-gray-500">
                  #{search.rank}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Helper functions
function formatQueryText(search: SearchAppearance): string {
  if (search.queryText) {
    return search.queryText
  }

  if (search.queryType === 'image') {
    return 'Image search'
  }

  if (search.queryType === 'instagram_post' && search.instagramUsername) {
    return `@${search.instagramUsername} post`
  }

  if (search.queryType === 'instagram_profile' && search.instagramUsername) {
    return `@${search.instagramUsername} profile`
  }

  if (search.queryType === 'similar_artist') {
    return 'Similar artist search'
  }

  return 'Search'
}

function formatRelativeTime(timestamp: string): string {
  const now = new Date()
  const then = new Date(timestamp)
  const diffMs = now.getTime() - then.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatSimilarityScore(score: number): string {
  // Match the rescaling logic from ArtistCard.tsx
  const MIN_CLIP = 0.15
  const MAX_CLIP = 0.47
  const percentage = ((score - MIN_CLIP) / (MAX_CLIP - MIN_CLIP)) * 100
  return `${Math.round(Math.max(0, Math.min(100, percentage)))}%`
}
