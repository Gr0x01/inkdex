/**
 * Pro Upgrade CTA
 * Call-to-action for upgrading to Pro tier
 */

import Link from 'next/link'
import { Crown, TrendingUp, Image, RefreshCw, MapPin } from 'lucide-react'

export default function ProUpgradeCTA() {
  return (
    <section className="border border-gray-200 bg-white p-8">
      <div className="flex items-start gap-3 mb-6">
        <Crown className="w-6 h-6 text-amber-500 shrink-0 mt-1" />
        <div>
          <h2 className="font-heading text-2xl mb-2">Unlock Analytics with Pro</h2>
          <p className="font-body text-gray-600">
            Get insights into how people discover and engage with your work
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <div className="flex items-start gap-3">
          <TrendingUp className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-heading text-sm mb-1">Performance Tracking</p>
            <p className="font-body text-xs text-gray-600">
              Track profile views, searches, and engagement trends
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Image className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-heading text-sm mb-1">Top-Performing Images</p>
            <p className="font-body text-xs text-gray-600">
              See which images get the most views and clicks
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <RefreshCw className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-heading text-sm mb-1">Daily Auto-Sync</p>
            <p className="font-body text-xs text-gray-600">
              Automatically sync new Instagram posts daily
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <MapPin className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-heading text-sm mb-1">Multiple Locations</p>
            <p className="font-body text-xs text-gray-600">
              List up to 20 locations and expand your reach
            </p>
          </div>
        </div>
      </div>

      <Link
        href="/pricing"
        className="inline-block bg-ink text-paper px-8 py-3 font-mono text-xs uppercase tracking-wider hover:bg-gray-800 transition-colors"
      >
        Upgrade to Pro
      </Link>
    </section>
  )
}
