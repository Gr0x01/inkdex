'use client';

/**
 * Dashboard sticky navigation toolbar
 *
 * Features:
 * - Editorial "Paper & Ink" aesthetic matching main site header
 * - Sticky positioning with backdrop blur
 * - Centered navigation items only (Overview, Portfolio, Profile, Account)
 * - Responsive mobile tabs with bottom indicator
 * - Optimized for touch targets (min 44px) and screen sizes from 320px+
 *
 * Note: Handle, Pro badge, and Sign Out are available in the main header dropdown
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, Image, User, Settings } from 'lucide-react';

const navItems = [
  { label: 'Overview', href: '/dashboard', icon: BarChart3, exact: true },
  { label: 'Portfolio', href: '/dashboard/portfolio', icon: Image },
  { label: 'Profile', href: '/dashboard/profile', icon: User },
  { label: 'Account', href: '/dashboard/account', icon: Settings },
];

export default function DashboardToolbar() {
  const pathname = usePathname();

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <div className="sticky top-0 z-40 bg-paper/95 backdrop-blur-md border-b-2 border-ink/10 relative">
      {/* Top decorative line - editorial accent */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-ink/15 to-transparent"
        aria-hidden="true"
      />

      <div className="mx-auto px-4 sm:px-6 max-w-7xl">
        {/* Desktop: Centered Navigation Only */}
        <nav
          className="hidden lg:flex items-center gap-1.5 xl:gap-2 justify-center py-3 sm:py-3.5"
          aria-label="Dashboard navigation"
        >
          {navItems.map((item) => {
            const active = isActive(item.href, item.exact);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  relative group flex items-center gap-2 px-3 xl:px-4 py-2.5
                  font-mono text-[0.6875rem] uppercase tracking-[0.15em] font-medium
                  transition-all duration-medium min-h-[44px]
                  ${
                    active
                      ? 'bg-ink text-paper shadow-sm'
                      : 'text-gray-700 hover:text-ink hover:bg-gray-100'
                  }
                `}
              >
                <Icon className="w-3.5 h-3.5" strokeWidth={2.5} />
                <span>{item.label}</span>

                {/* Bottom accent line for active state */}
                {active && (
                  <div
                    className="absolute bottom-0 left-2 right-2 h-[2px] bg-paper/20"
                    aria-hidden="true"
                  />
                )}

                {/* Hover underline for inactive state */}
                {!active && (
                  <div
                    className="absolute bottom-0 left-0 right-0 h-[2px] bg-ink transform scale-x-0 group-hover:scale-x-100 transition-transform duration-medium origin-center"
                    aria-hidden="true"
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Mobile/Tablet: Horizontal scroll tabs - Editorial (shown on < lg) */}
        <div className="lg:hidden flex overflow-x-auto -mx-4 px-4 pb-0 scrollbar-hide">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href, item.exact);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  relative flex items-center gap-2 px-3 sm:px-4 py-3.5 min-h-[44px]
                  font-mono text-[0.6875rem] uppercase tracking-[0.15em] font-medium
                  whitespace-nowrap transition-all duration-medium
                  border-b-2
                  ${
                    active
                      ? 'border-ink text-ink'
                      : 'border-transparent text-gray-600 hover:text-ink hover:border-gray-300'
                  }
                `}
              >
                <Icon className="w-3.5 h-3.5" strokeWidth={2.5} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Bottom decorative line - subtle accent */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-ink/5 to-transparent"
        aria-hidden="true"
      />
    </div>
  );
}
