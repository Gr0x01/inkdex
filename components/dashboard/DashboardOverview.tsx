/**
 * Dashboard Overview Component
 * Shows analytics for Pro users, upgrade CTA for Free users
 */

'use client'

import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import MetricsCards from '@/components/analytics/MetricsCards'
import ViewsChart from '@/components/analytics/ViewsChart'
import RecentSearchesTable from '@/components/analytics/RecentSearchesTable'
import ProUpgradeCTA from './ProUpgradeCTA'
import CompactUpgradeOverlay from './CompactUpgradeOverlay'

type TimeRange = 7 | 30 | 90

interface AnalyticsData {
  summary: {
    profileViews: number
    imageViews: number
    instagramClicks: number
    bookingClicks: number
    searchAppearances: number
    totalEngagement: number
  }
  timeSeries: Array<{
    date: string
    profileViews: number
    imageViews: number
    instagramClicks: number
    bookingClicks: number
    searchAppearances: number
  }>
  recentSearches: Array<{
    searchId: string
    queryType: 'text' | 'image' | 'hybrid' | 'instagram_post' | 'instagram_profile' | 'similar_artist'
    queryText: string | null
    instagramUsername: string | null
    rank: number
    similarityScore: number
    boostedScore: number
    timestamp: string
  }>
}

interface DashboardOverviewProps {
  isPro: boolean
  firstName?: string
  artistId?: string
}

// Generate demo analytics data for free user preview
function generateDemoData(): AnalyticsData['timeSeries'] {
  const data = []
  const baseDate = new Date()
  baseDate.setDate(baseDate.getDate() - 30)

  for (let i = 0; i < 30; i++) {
    const date = new Date(baseDate)
    date.setDate(date.getDate() + i)
    data.push({
      date: date.toISOString().split('T')[0],
      profileViews: Math.floor(Math.random() * 50) + 20,
      imageViews: Math.floor(Math.random() * 100) + 50,
      instagramClicks: Math.floor(Math.random() * 30) + 10,
      bookingClicks: Math.floor(Math.random() * 15) + 5,
      searchAppearances: Math.floor(Math.random() * 40) + 15,
    })
  }
  return data
}

export default function DashboardOverview({
  isPro,
  firstName,
  artistId,
}: DashboardOverviewProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>(30)
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(isPro)

  useEffect(() => {
    if (!isPro || !artistId) return

    setLoading(true)
    fetch(`/api/analytics/${artistId}?days=${timeRange}`)
      .then((res) => res.json())
      .then((data: AnalyticsData) => {
        setData(data)
        setLoading(false)
      })
      .catch((err) => {
        console.error('[Overview] Analytics fetch failed:', err)
        setLoading(false)
      })
  }, [isPro, artistId, timeRange])

  return (
    <div>
      {/* Welcome Header */}
      <header className="pt-8 mb-8">
        <h1 className="font-heading text-3xl mb-1">
          Welcome back{firstName ? `, ${firstName}` : ''}
        </h1>
        <p className="font-mono text-xs uppercase tracking-wider text-gray-500">
          Overview
        </p>
      </header>

      {/* Pro User: Analytics Dashboard */}
      {isPro && artistId && (
        <div className="space-y-6">
          {/* Loading State */}
          {loading && (
            <div className="border border-gray-300 bg-white p-12">
              <div className="flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
                <p className="font-mono text-[10px] uppercase tracking-wider text-gray-500">
                  Loading Analytics
                </p>
              </div>
            </div>
          )}

          {/* Analytics Data */}
          {!loading && data && (
            <>
              {/* 1. HERO: Chart with integrated time controls */}
              {data.timeSeries.length > 0 && (
                <ViewsChart
                  timeSeries={data.timeSeries}
                  timeRange={timeRange}
                  onTimeRangeChange={setTimeRange}
                />
              )}

              {/* 2. Stats Grid */}
              <MetricsCards summary={data.summary} />

              {/* 3. Recent Search Appearances */}
              <RecentSearchesTable
                searches={data.recentSearches || []}
                totalCount={data.summary.searchAppearances}
              />
            </>
          )}

          {/* No Data State */}
          {!loading && data && data.summary.totalEngagement === 0 && (
            <div className="border border-gray-300 bg-white p-12 text-center">
              <p className="font-heading text-xl text-gray-500 mb-2">No data yet</p>
              <p className="font-body text-sm text-gray-500">
                Your analytics will appear here once people start viewing your profile.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Free User: Blurred Analytics Preview */}
      {!isPro && (
        <div className="relative">
          {/* Demo Chart (sharp border, content will be blurred by overlay) */}
          <div className="pointer-events-none select-none" aria-hidden="true">
            <ViewsChart
              timeSeries={generateDemoData()}
              timeRange={30}
              onTimeRangeChange={() => {}}
            />
          </div>

          {/* Blur Overlay (blurs the content behind it) */}
          <div className="absolute inset-0 backdrop-blur-sm bg-white/40" />

          {/* Upgrade CTA */}
          <div className="absolute inset-0 flex items-center justify-center">
            <CompactUpgradeOverlay />
          </div>
        </div>
      )}
    </div>
  )
}
