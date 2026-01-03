'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, Users, LogOut, Terminal, ChevronRight } from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
  userEmail: string;
}

const navItems = [
  { href: '/admin/mining', label: 'Mining', icon: Activity, description: 'Pipeline ops' },
  { href: '/admin/artists', label: 'Artists', icon: Users, description: 'Featured mgmt' },
];

export default function AdminLayout({ children, userEmail }: AdminLayoutProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-neutral-950 flex">
      {/* Sidebar - Industrial/utilitarian design */}
      <aside className="w-56 bg-neutral-900/50 border-r border-neutral-800/50 flex flex-col">
        {/* Header - Compact, terminal-inspired */}
        <div className="px-4 py-4 border-b border-neutral-800/50">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-500">
              Admin Console
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-neutral-600" />
            <span className="text-sm font-semibold text-white tracking-tight font-[family-name:var(--font-space-grotesk)]">
              INKDEX
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-4">
          <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-600 px-2 mb-2">
            Operations
          </div>
          <ul className="space-y-0.5">
            {navItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              const Icon = item.icon;

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`
                      group flex items-center gap-2.5 px-2.5 py-2 rounded text-sm
                      transition-all duration-150
                      ${
                        isActive
                          ? 'bg-emerald-500/10 text-emerald-400 border-l-2 border-emerald-500 -ml-px pl-[9px]'
                          : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
                      }
                    `}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-neutral-500 group-hover:text-neutral-400'}`} />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium font-[family-name:var(--font-space-grotesk)]">
                        {item.label}
                      </span>
                      <p className={`text-[10px] truncate ${isActive ? 'text-emerald-400/60' : 'text-neutral-600'}`}>
                        {item.description}
                      </p>
                    </div>
                    {isActive && (
                      <ChevronRight className="w-3 h-3 text-emerald-500/50" />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* System Status */}
        <div className="px-3 py-3 border-t border-neutral-800/50">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <div className="w-1.5 h-1.5 rounded-full bg-neutral-700" />
            </div>
            <span className="text-[10px] font-mono text-neutral-600">
              SYS OK
            </span>
          </div>
        </div>

        {/* User section - Minimal */}
        <div className="px-3 py-3 border-t border-neutral-800/50 bg-neutral-900/30">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-mono text-neutral-600 uppercase tracking-wider">
                Session
              </p>
              <p className="text-xs text-neutral-400 truncate font-mono">
                {userEmail.split('@')[0]}
              </p>
            </div>
            <form action="/api/admin/auth/logout" method="POST">
              <button
                type="submit"
                className="p-1.5 text-neutral-500 hover:text-red-400 hover:bg-red-500/10
                         rounded transition-colors"
                title="End session"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <main className="flex-1 overflow-auto">
        <div className="min-h-full">
          {/* Subtle top border accent */}
          <div className="h-px bg-gradient-to-r from-emerald-500/20 via-emerald-500/5 to-transparent" />
          <div className="p-6 lg:p-8">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
