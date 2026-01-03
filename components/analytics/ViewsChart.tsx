/**
 * Views Chart Component
 * Line chart showing analytics trends over time
 */

'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

interface ViewsChartProps {
  timeSeries: Array<{
    date: string
    profileViews: number
    imageViews: number
    instagramClicks: number
    bookingClicks: number
    searchAppearances: number
  }>
}

export default function ViewsChart({ timeSeries }: ViewsChartProps) {
  // Format data for chart
  const chartData = timeSeries.map((item) => ({
    date: new Date(item.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
    'Profile Views': item.profileViews,
    'Image Views': item.imageViews,
    'Instagram Clicks': item.instagramClicks,
  }))

  if (chartData.length === 0) {
    return null
  }

  return (
    <div className="border border-gray-200 bg-white p-6">
      <h2 className="font-heading text-xl mb-4">Activity Over Time</h2>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12, fontFamily: 'IBM Plex Mono' }}
            stroke="#9ca3af"
          />
          <YAxis
            tick={{ fontSize: 12, fontFamily: 'IBM Plex Mono' }}
            stroke="#9ca3af"
          />
          <Tooltip
            contentStyle={{
              fontFamily: 'IBM Plex Mono',
              fontSize: 12,
              border: '1px solid #e5e7eb',
            }}
          />
          <Legend
            wrapperStyle={{
              fontFamily: 'IBM Plex Mono',
              fontSize: 12,
            }}
          />
          <Line
            type="monotone"
            dataKey="Profile Views"
            stroke="#2563eb"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
          <Line
            type="monotone"
            dataKey="Image Views"
            stroke="#9333ea"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
          <Line
            type="monotone"
            dataKey="Instagram Clicks"
            stroke="#ec4899"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
