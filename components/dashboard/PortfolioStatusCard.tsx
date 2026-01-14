/**
 * Portfolio Status Card
 * Shows portfolio image count and sync status at a glance
 */

import Link from 'next/link'
import { Image, ArrowRight, Clock } from 'lucide-react'

interface PortfolioStatusCardProps {
  imageCount: number
  maxImages: number
  isPro: boolean
  lastSyncedAt?: string
  nextSyncAt?: string
}

export default function PortfolioStatusCard({
  imageCount,
  maxImages,
  isPro,
  lastSyncedAt,
  nextSyncAt,
}: PortfolioStatusCardProps) {
  const percentage = (imageCount / maxImages) * 100

  return (
    <section className="border border-gray-200 bg-white p-6">
      <div className="flex items-start gap-3 mb-4">
        <Image className="w-5 h-5 text-gray-700 shrink-0 mt-0.5" />
        <div className="flex-1">
          <h2 className="font-heading text-xl mb-1">Portfolio Status</h2>
          <p className="font-body text-sm text-gray-600">
            {imageCount} of {maxImages} images used
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="w-full h-2 bg-gray-100 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              percentage >= 90 ? 'bg-red-500' : percentage >= 70 ? 'bg-amber-500' : 'bg-green-500'
            }`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      </div>

      {/* Sync Status (Pro only) */}
      {isPro && (
        <div className="mb-4 space-y-2">
          {lastSyncedAt && (
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-gray-400" />
              <span className="font-body text-gray-600">
                Last synced: {lastSyncedAt}
              </span>
            </div>
          )}
          {nextSyncAt && (
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-gray-400" />
              <span className="font-body text-gray-600">
                Next sync: {nextSyncAt}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Manage Link */}
      <Link
        href="/dashboard/portfolio"
        className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-ink hover:underline"
      >
        Manage Portfolio
        <ArrowRight className="w-4 h-4" />
      </Link>
    </section>
  )
}
