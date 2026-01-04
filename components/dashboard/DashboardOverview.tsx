/**
 * Dashboard Overview Component
 * Shows analytics for Pro users, upgrade CTA for Free users
 */

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Loader2, ExternalLink } from 'lucide-react'
import MetricsCards from '@/components/analytics/MetricsCards'
import ViewsChart from '@/components/analytics/ViewsChart'
import RecentSearchesTable from '@/components/analytics/RecentSearchesTable'
import ProUpgradeCTA from './ProUpgradeCTA'

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

      {/* Free User: Upgrade CTA + Quick Actions */}
      {!isPro && (
        <div className="space-y-6">
          {/* Upgrade CTA */}
          <ProUpgradeCTA />

          {/* Quick Actions */}
          <section className="border border-gray-200 bg-white p-6">
            <h2 className="font-heading text-xl mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Link
                href="/dashboard/portfolio"
                className="flex items-center justify-between p-3 border border-gray-200 hover:border-gray-400 transition-colors group"
              >
                <span className="font-mono text-xs uppercase tracking-wider text-gray-700">
                  Add Portfolio Images
                </span>
                <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-ink" />
              </Link>
              <Link
                href="/dashboard/profile"
                className="flex items-center justify-between p-3 border border-gray-200 hover:border-gray-400 transition-colors group"
              >
                <span className="font-mono text-xs uppercase tracking-wider text-gray-700">
                  Edit Profile
                </span>
                <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-ink" />
              </Link>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
