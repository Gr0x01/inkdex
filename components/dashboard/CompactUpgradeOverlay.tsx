/**
 * Compact Upgrade Overlay Component
 * Centered upgrade CTA for blurred analytics preview
 */

import Link from 'next/link'
import { Crown } from 'lucide-react'

export default function CompactUpgradeOverlay() {
  return (
    <div className="border border-gray-300 bg-white p-6 sm:p-8 max-w-md mx-4 shadow-lg">
      <div className="flex flex-col items-center text-center gap-4">
        <Crown className="w-10 h-10 text-purple-500" aria-hidden="true" />
        <div>
          <h2 className="font-heading text-xl sm:text-2xl mb-2">
            Unlock Analytics
          </h2>
          <p className="font-body text-sm text-gray-600">
            Track performance, see top images, and understand your audience
          </p>
        </div>
        <Link
          href="/dashboard/subscription"
          className="inline-block px-6 py-3 bg-purple-600 text-white font-mono text-xs uppercase tracking-wider hover:bg-purple-700 transition-colors w-full sm:w-auto text-center"
        >
          Upgrade to Pro
        </Link>
      </div>
    </div>
  )
}
