/**
 * Metrics Cards Component
 * Displays summary analytics metrics
 */

'use client'

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
    },
    {
      label: 'Image Views',
      value: summary.imageViews.toLocaleString(),
    },
    {
      label: 'Instagram Clicks',
      value: summary.instagramClicks.toLocaleString(),
    },
    {
      label: 'Booking Clicks',
      value: summary.bookingClicks.toLocaleString(),
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((metric) => (
        <div key={metric.label} className="border border-gray-200 bg-white p-4">
          <p className="font-mono text-[10px] uppercase tracking-wider text-gray-500 mb-2">
            {metric.label}
          </p>
          <p className="font-heading text-2xl">{metric.value}</p>
        </div>
      ))}
    </div>
  )
}
