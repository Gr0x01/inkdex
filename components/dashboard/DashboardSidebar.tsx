'use client'

/**
 * Dashboard Sidebar Navigation
 * Persistent navigation for dashboard tabs
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BarChart3, Image, User, Settings } from 'lucide-react'

export default function DashboardSidebar() {
  const pathname = usePathname()

  const navItems = [
    {
      label: 'Overview',
      href: '/dashboard',
      icon: BarChart3,
    },
    {
      label: 'Portfolio',
      href: '/dashboard/portfolio',
      icon: Image,
    },
    {
      label: 'Profile',
      href: '/dashboard/profile',
      icon: User,
    },
    {
      label: 'Account',
      href: '/dashboard/account',
      icon: Settings,
    },
  ]

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard'
    }
    return pathname.startsWith(href)
  }

  return (
    <nav className="w-full lg:w-64 flex-shrink-0">
      {/* Mobile: Horizontal tabs */}
      <div className="lg:hidden border-b border-gray-200 bg-white mb-6">
        <div className="flex overflow-x-auto">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center gap-2 px-4 py-3 font-mono text-xs uppercase tracking-wider
                  whitespace-nowrap transition-colors border-b-2
                  ${
                    active
                      ? 'border-ink text-ink'
                      : 'border-transparent text-gray-600 hover:text-ink'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            )
          })}
        </div>
      </div>

      {/* Desktop: Vertical sidebar - sticky below navbar + toolbar */}
      <div className="hidden lg:block pr-8">
        <div className="space-y-1 sticky top-[calc(var(--navbar-height-desktop)+56px)]">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center gap-3 px-4 py-3
                  font-mono text-xs uppercase tracking-wider
                  transition-all duration-200
                  ${
                    active
                      ? 'bg-ink text-paper'
                      : 'text-gray-700 hover:bg-gray-100'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
