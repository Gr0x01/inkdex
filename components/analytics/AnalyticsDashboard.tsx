/**
 * Analytics Dashboard
 * Main container for Pro artist analytics
 */

'use client'

import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import MetricsCards from './MetricsCards'
import ViewsChart from './ViewsChart'
import TopImagesGrid from './TopImagesGrid'

type TimeRange = 7 | 30 | 90 | null

interface AnalyticsDashboardProps {
  artistId: string
  artistName: string
}

export default function AnalyticsDashboard({
  artistId,
  artistName,
}: AnalyticsDashboardProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>(30)
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/analytics/${artistId}?days=${timeRange || 'all'}`)
      .then((res) => res.json())
      .then((data) => {
        setData(data)
        setLoading(false)
      })
      .catch((err) => {
        console.error('[Analytics] Fetch failed:', err)
        setLoading(false)
      })
  }, [artistId, timeRange])

  return (
    <div className="max-w-6xl">{/* Content wrapper */}
        {/* Header */}
        <header className="mb-6">
          <h1 className="font-heading text-3xl mb-2">Analytics</h1>
          <p className="font-mono text-xs uppercase tracking-wider text-gray-500">
            Performance insights for your profile
          </p>
        </header>

        {/* Time Range Selector */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {[
            { label: '7 Days', value: 7 },
            { label: '30 Days', value: 30 },
            { label: '90 Days', value: 90 },
            { label: 'All Time', value: null },
          ].map((option) => (
            <button
              key={option.label}
              onClick={() => setTimeRange(option.value as TimeRange)}
              className={`
                px-4 py-2 font-mono text-xs uppercase tracking-wider
                transition-all duration-200
                ${
                  timeRange === option.value
                    ? 'bg-ink text-paper'
                    : 'bg-white border border-gray-300 text-gray-700 hover:border-ink'
                }
              `}
            >
              {option.label}
            </button>
          ))}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        )}

        {/* Data Display */}
        {!loading && data && (
          <div className="space-y-6">
            <MetricsCards summary={data.summary} />
            {data.timeSeries.length > 0 && <ViewsChart timeSeries={data.timeSeries} />}
            <TopImagesGrid topImages={data.topImages} />
          </div>
        )}

        {/* No Data State */}
        {!loading && data && data.summary.totalEngagement === 0 && (
          <div className="border border-gray-200 bg-white p-12 text-center">
            <p className="font-heading text-xl text-gray-400 mb-2">No data yet</p>
            <p className="font-body text-sm text-gray-500">
              Your analytics will appear here once people start viewing your profile.
            </p>
          </div>
        )}
    </div>
  )
}
