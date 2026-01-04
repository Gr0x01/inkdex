/**
 * Views Chart Component
 * Line chart showing analytics trends over time with integrated time controls
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
  timeRange: 7 | 30 | 90
  onTimeRangeChange: (range: 7 | 30 | 90) => void
}

export default function ViewsChart({
  timeSeries,
  timeRange,
  onTimeRangeChange
}: ViewsChartProps) {
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
    <div className="border border-gray-300 bg-white">
      {/* Header with integrated time controls */}
      <div className="border-b border-gray-200 p-6 pb-4">
        <div className="flex flex-col sm:flex-row items-start sm:justify-between gap-3">
          <div>
            <h2 className="font-heading text-lg mb-1">
              Activity Over Time
            </h2>
            <p className="font-mono text-[10px] uppercase tracking-wider text-gray-500">
              Last {timeRange} Days
            </p>
          </div>

          {/* Segmented Time Control */}
          <div className="flex border border-gray-300 divide-x divide-gray-300">
            {[7, 30, 90].map((days) => (
              <button
                key={days}
                onClick={() => onTimeRangeChange(days as 7 | 30 | 90)}
                className={`
                  px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider
                  transition-all duration-200
                  ${days === timeRange
                    ? 'bg-ink text-paper'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                  }
                `}
              >
                {days}D
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart Body */}
      <div className="p-6 pt-4">
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={chartData}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#D8D6D2"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fontFamily: 'IBM Plex Mono' }}
              stroke="#8B8985"
            />
            <YAxis
              tick={{ fontSize: 11, fontFamily: 'IBM Plex Mono' }}
              stroke="#8B8985"
            />
            <Tooltip
              contentStyle={{
                fontFamily: 'IBM Plex Mono',
                fontSize: 11,
                border: '1px solid #D8D6D2',
                borderRadius: '4px',
              }}
            />
            <Legend
              wrapperStyle={{
                fontFamily: 'IBM Plex Mono',
                fontSize: 11,
              }}
            />
            <Line
              type="monotone"
              dataKey="Profile Views"
              stroke="#1A1A1A"
              strokeWidth={2.5}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="Image Views"
              stroke="#8B7355"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
            <Line
              type="monotone"
              dataKey="Instagram Clicks"
              stroke="#8B8985"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
