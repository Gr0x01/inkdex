'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, Users, LogOut, LayoutDashboard } from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
  userEmail: string;
}

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/mining', label: 'Mining', icon: Activity },
  { href: '/admin/artists', label: 'Artists', icon: Users },
];

export default function AdminLayout({ children, userEmail }: AdminLayoutProps) {
  const pathname = usePathname();

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-paper flex">
      {/* Sidebar - Editorial style */}
      <aside className="w-52 bg-paper border-r-2 border-ink/10 flex flex-col">
        {/* Logo */}
        <div className="px-4 py-4 border-b-2 border-ink/10">
          <Link href="/admin" className="block">
            <span className="font-display text-xl font-[900] text-ink tracking-tight">
              INKDEX
            </span>
            <span className="font-mono text-[10px] text-gray-500 uppercase tracking-[0.15em] block mt-0.5">
              Admin
            </span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-3">
          <ul className="space-y-0.5">
            {navItems.map((item) => {
              const active = isActive(item.href, item.exact);
              const Icon = item.icon;

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`
                      flex items-center gap-2 px-3 py-2 text-sm font-body
                      transition-colors duration-150
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
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User section */}
        <div className="p-3 border-t-2 border-ink/10">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-ink text-paper flex items-center justify-center font-mono text-xs font-medium">
              {userEmail.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-body text-ink truncate">
                {userEmail.split('@')[0]}
              </p>
            </div>
            <form action="/api/admin/auth/logout" method="POST">
              <button
                type="submit"
                className="p-1.5 text-gray-500 hover:text-ink hover:bg-gray-100 transition-colors"
                title="Log out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <main className="flex-1 overflow-auto">
        {/* Page content */}
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
