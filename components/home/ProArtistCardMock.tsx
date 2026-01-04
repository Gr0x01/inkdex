'use client'

import Image from 'next/image'
import { ProBadge } from '@/components/badges/ProBadge'

/**
 * Static mock artist card showcasing Pro features
 * Used in the homepage Pro showcase section
 */
export default function ProArtistCardMock() {
  return (
    <div className="relative w-full max-w-lg mx-auto">
      {/* Main Card */}
      <div className="bg-paper border-2 border-ink/20 overflow-hidden shadow-xl">
        {/* Card Content - Horizontal Layout */}
        <div className="flex flex-row h-full min-h-[320px]">
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
          <div className="flex-1 flex flex-col justify-between p-5 sm:p-6">
            {/* Top: Badge + Stats */}
            <div className="space-y-4">
              {/* Pro Badge */}
              <ProBadge variant="badge" size="md" />

              {/* Artist Handle */}
              <h3 className="font-heading text-xl sm:text-2xl font-bold text-ink tracking-tight">
                @inkmaster_pro
              </h3>

              {/* Location with multi-location badge */}
              <div className="flex items-center gap-2">
                <p className="font-mono text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-[0.15em]">
                  Austin, TX
                </p>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">
                  +3
                </span>
              </div>

              {/* Divider */}
              <div className="h-px bg-ink/10" />

              {/* Featured indicator - matches ArtistCard */}
              <div className="flex items-center gap-2">
                <span className="text-[#8B7355] font-bold text-xs">+</span>
                <span className="font-mono text-xs font-semibold text-[#8B7355] uppercase tracking-[0.15em]">
                  Featured Artist
                </span>
              </div>

              {/* Divider */}
              <div className="h-px bg-ink/10" />
            </div>

            {/* Bottom: Follower count */}
            <p className="font-mono text-sm font-medium text-gray-500 uppercase tracking-[0.15em]">
              156K followers
            </p>
          </div>
        </div>
      </div>

      {/* Decorative elements */}
      {/* Analytics preview floating card */}
      <div className="absolute -bottom-4 -right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-3 w-36">
        <p className="font-mono text-[9px] text-gray-500 uppercase tracking-wider mb-1">
          This month
        </p>
        <div className="flex items-end gap-1">
          <span className="font-display text-2xl font-bold text-ink">2.4K</span>
          <span className="font-mono text-[10px] text-green-600 mb-1">+18%</span>
        </div>
        <p className="font-mono text-[9px] text-gray-400 uppercase tracking-wider">
          Profile views
        </p>
      </div>

      {/* Search ranking boost indicator */}
      <div className="absolute -top-3 -right-3 bg-purple-500 text-white rounded-full px-2.5 py-1 shadow-lg flex items-center gap-1">
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
        </svg>
        <span className="font-mono text-[10px] font-bold uppercase tracking-wider">
          Boosted
        </span>
      </div>

      {/* Style breakdown mini chart - bottom left */}
      <div className="absolute -bottom-4 -left-4 bg-white border border-gray-200 rounded-lg shadow-lg p-3">
        <p className="font-mono text-[9px] text-gray-500 uppercase tracking-[0.2em] mb-2">
          Your Style
        </p>
        <div className="flex items-center gap-3">
          {/* Mini donut chart - circumference = 2 * PI * 15 ≈ 94.2 */}
          <svg viewBox="0 0 42 42" className="w-14 h-14 flex-shrink-0">
            {/* Japanese - 35% (black) - starts at top */}
            <circle
              cx="21" cy="21" r="15" fill="none"
              stroke="#1a1a1a"
              strokeWidth="6"
              strokeDasharray="33 61.2"
              strokeDashoffset="23.5"
            />
            {/* Realism - 25% (brown) */}
            <circle
              cx="21" cy="21" r="15" fill="none"
              stroke="#8B7355"
              strokeWidth="6"
              strokeDasharray="23.5 70.7"
              strokeDashoffset="-9.5"
            />
            {/* Traditional - 22% (green) */}
            <circle
              cx="21" cy="21" r="15" fill="none"
              stroke="#5d7a5d"
              strokeWidth="6"
              strokeDasharray="20.7 73.5"
              strokeDashoffset="-33"
            />
            {/* New School - 18% (blue) */}
            <circle
              cx="21" cy="21" r="15" fill="none"
              stroke="#4a6fa5"
              strokeWidth="6"
              strokeDasharray="17 77.2"
              strokeDashoffset="-53.7"
            />
          </svg>
          {/* Legend */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#1a1a1a]" />
              <span className="font-mono text-[9px] text-gray-600 uppercase tracking-wide">Japanese</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#8B7355]" />
              <span className="font-mono text-[9px] text-gray-600 uppercase tracking-wide">Realism</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#5d7a5d]" />
              <span className="font-mono text-[9px] text-gray-600 uppercase tracking-wide">Traditional</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#4a6fa5]" />
              <span className="font-mono text-[9px] text-gray-600 uppercase tracking-wide">New School</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
