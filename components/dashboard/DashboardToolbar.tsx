'use client';

/**
 * Shared sticky toolbar for dashboard pages
 *
 * Features:
 * - Sticky positioning with backdrop blur
 * - Scroll-aware shadow and border styling
 * - Consistent back navigation to dashboard
 * - @handle + Pro badge as primary identifier
 * - Flexible right-side actions via children
 */

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ProBadge } from '@/components/badges/ProBadge';

interface DashboardToolbarProps {
  /** Artist's Instagram handle (without @) */
  handle: string;
  /** Whether artist has Pro subscription */
  isPro: boolean;
  /** Whether page has been scrolled (controls shadow/border) */
  isScrolled: boolean;
  /** Right-side action buttons */
  children?: React.ReactNode;
  /** Hide back button (for main dashboard page) */
  hideBack?: boolean;
}

export default function DashboardToolbar({
  handle,
  isPro,
  isScrolled,
  children,
  hideBack = false,
}: DashboardToolbarProps) {
  return (
    <div
      className={`
        sticky top-0 z-50 transition-all duration-300 ease-out
        bg-paper/95 backdrop-blur-md border-b
        ${isScrolled ? 'shadow-sm border-gray-300' : 'border-gray-200'}
      `}
    >
      <div className="mx-auto px-2 sm:px-6 max-w-7xl">
        <div className="flex items-center justify-between gap-2 sm:gap-4 py-2.5 sm:py-3">
          {/* Left: Back + Handle + Pro Badge */}
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            {!hideBack && (
              <>
                <Link
                  href="/dashboard"
                  className="group inline-flex items-center gap-1 sm:gap-1.5 font-mono text-[10px] uppercase tracking-wider text-gray-600 hover:text-ink transition-colors shrink-0"
                >
                  <ArrowLeft className="w-3.5 h-3.5 sm:w-3 sm:h-3 transition-transform group-hover:-translate-x-0.5" />
                  <span className="hidden sm:inline">Back</span>
                </Link>
                <div className="h-4 w-px bg-gray-300 shrink-0" />
              </>
            )}
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              <span className="font-heading text-sm sm:text-base truncate">@{handle}</span>
              {isPro && <ProBadge variant="icon-only" size="sm" />}
            </div>
          </div>

          {/* Right: Action buttons */}
          {children && (
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {children}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
