/**
 * Metrics Cards Component
 * Displays summary analytics metrics
 */

'use client'

import { Eye, Image, Instagram, Calendar, TrendingUp } from 'lucide-react'

interface MetricsCardsProps {
  summary: {
    profileViews: number
    imageViews: number
    instagramClicks: number
    bookingClicks: number
    searchAppearances: number
    totalEngagement: number
  }
}

export default function MetricsCards({ summary }: MetricsCardsProps) {
  const metrics = [
    {
      label: 'Profile Views',
      value: summary.profileViews.toLocaleString(),
      icon: Eye,
      color: 'text-blue-600',
    },
    {
      label: 'Image Views',
      value: summary.imageViews.toLocaleString(),
      icon: Image,
      color: 'text-purple-600',
    },
    {
      label: 'Instagram Clicks',
      value: summary.instagramClicks.toLocaleString(),
      icon: Instagram,
      color: 'text-pink-600',
    },
    {
      label: 'Booking Clicks',
      value: summary.bookingClicks.toLocaleString(),
      icon: Calendar,
      color: 'text-green-600',
    },
    {
      label: 'Search Appearances',
      value: summary.searchAppearances.toLocaleString(),
      icon: TrendingUp,
      color: 'text-orange-600',
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
      {metrics.map((metric) => (
        <div key={metric.label} className="border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2 mb-2">
            <metric.icon className={`w-4 h-4 ${metric.color}`} />
            <p className="font-mono text-[10px] uppercase tracking-wider text-gray-500">
              {metric.label}
            </p>
          </div>
          <p className="font-heading text-2xl">{metric.value}</p>
        </div>
      ))}
    </div>
  )
}
