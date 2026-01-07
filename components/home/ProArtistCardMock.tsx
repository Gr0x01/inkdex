'use client'

import Image from 'next/image'
import { ProBadge } from '@/components/badges/ProBadge'

/**
 * Static mock artist card showcasing Pro features
 * Used in the for-artists page comparison section
 */
export default function ProArtistCardMock() {
  return (
    <div className="w-full">
      {/* Main Card */}
      <div className="bg-paper border-2 border-ink/20 overflow-hidden h-[280px]">
        {/* Card Content - Horizontal Layout */}
        <div className="flex flex-row h-full">
          {/* Left: Portfolio Image */}
          <div className="relative flex-1 bg-gray-100">
            <div className="absolute inset-0">
              <Image
                src="/images/pro-showcase-tattoo.png"
                alt="Pro artist portfolio showcase"
                fill
                className="object-cover"
                sizes="300px"
              />
            </div>
          </div>

          {/* Right: Artist Info */}
          <div className="flex-1 flex flex-col justify-between p-4">
            {/* Top: Badge + Stats */}
            <div className="space-y-3">
              {/* Pro Badge + Match % */}
              <div className="flex items-center justify-between">
                <ProBadge variant="badge" size="md" />
                <span className="font-mono text-sm font-semibold text-ink">95%</span>
              </div>

              {/* Artist Handle */}
              <h3 className="font-heading text-lg font-bold text-ink tracking-tight">
                @inkmaster_pro
              </h3>

              {/* Location with multi-location badge */}
              <div className="flex items-center gap-2">
                <p className="font-mono text-[10px] font-medium text-gray-500 uppercase tracking-[0.15em]">
                  Austin, TX
                </p>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-700">
                  +3
                </span>
              </div>

              {/* Divider */}
              <div className="h-px bg-ink/10" />

              {/* Featured indicator - matches ArtistCard */}
              <div className="flex items-center gap-2">
                <span className="text-[#8B7355] font-bold text-[10px]">+</span>
                <span className="font-mono text-[10px] font-semibold text-[#8B7355] uppercase tracking-[0.15em]">
                  Featured Artist
                </span>
              </div>
            </div>

            {/* Bottom: Follower count */}
            <p className="font-mono text-xs font-medium text-gray-500 uppercase tracking-[0.15em]">
              156K followers
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
