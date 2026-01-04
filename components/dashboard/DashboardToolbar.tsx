'use client';

/**
 * Dashboard sticky navigation toolbar
 *
 * Features:
 * - Editorial "Paper & Ink" aesthetic matching main site header
 * - Sticky positioning with backdrop blur
 * - Centered navigation items only (Overview, Portfolio, Profile, Account)
 * - Responsive mobile tabs with animated sliding bottom indicator
 * - Optimized for touch targets (min 44px) and screen sizes from 320px+
 *
 * Note: Handle, Pro badge, and Sign Out are available in the main header dropdown
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, Image, User, Settings } from 'lucide-react';
import { useRef, useEffect, useState } from 'react';

const navItems = [
  { label: 'Overview', href: '/dashboard', icon: BarChart3, exact: true },
  { label: 'Portfolio', href: '/dashboard/portfolio', icon: Image },
  { label: 'Profile', href: '/dashboard/profile', icon: User },
  { label: 'Account', href: '/dashboard/account', icon: Settings },
];

export default function DashboardToolbar() {
  const pathname = usePathname();
  const navRef = useRef<HTMLDivElement>(null);
  const [underlineStyle, setUnderlineStyle] = useState({ left: 0, width: 0 });

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  // Find active tab index
  const activeIndex = navItems.findIndex((item) => isActive(item.href, item.exact));

  // Update underline position when active tab changes
  useEffect(() => {
    if (navRef.current && activeIndex >= 0) {
      const links = navRef.current.querySelectorAll('a');
      const activeLink = links[activeIndex];
      if (activeLink) {
        const navRect = navRef.current.getBoundingClientRect();
        const linkRect = activeLink.getBoundingClientRect();
        setUnderlineStyle({
          left: linkRect.left - navRect.left,
          width: linkRect.width,
        });
      }
    }
  }, [activeIndex, pathname]);

  return (
    <div className="sticky top-0 z-40 bg-paper/95 backdrop-blur-md border-b-2 border-ink/10 relative">
      {/* Top decorative line - editorial accent */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-ink/15 to-transparent"
        aria-hidden="true"
      />

      <div className="mx-auto px-4 sm:px-6 max-w-7xl">
        {/* Unified Navigation - All screen sizes */}
        <div
          ref={navRef}
          className="relative flex overflow-x-auto -mx-4 px-4 pb-0 scrollbar-hide md:justify-center md:overflow-visible md:mx-0 md:px-0"
        >
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
                  whitespace-nowrap transition-colors duration-medium
                  ${
                    active
                      ? 'text-ink'
                      : 'text-gray-600 hover:text-ink'
                  }
                `}
              >
                <Icon className="w-3.5 h-3.5" strokeWidth={2.5} />
                <span>{item.label}</span>
              </Link>
            );
          })}

          {/* Animated sliding underline */}
          <div
            className="absolute bottom-0 h-[2px] bg-ink transition-all duration-300 ease-out"
            style={{
              left: `${underlineStyle.left}px`,
              width: `${underlineStyle.width}px`,
            }}
            aria-hidden="true"
          />
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
