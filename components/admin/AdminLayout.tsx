'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, Users, LogOut } from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
  userEmail: string;
}

const navItems = [
  { href: '/admin/mining', label: 'Mining', icon: Activity },
  { href: '/admin/artists', label: 'Artists', icon: Users },
];

export default function AdminLayout({ children, userEmail }: AdminLayoutProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-neutral-950 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-neutral-900 border-r border-neutral-800 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-neutral-800">
          <Link href="/admin" className="block">
            <h1 className="text-lg font-bold text-white tracking-tight">
              INKDEX
            </h1>
            <p className="text-xs text-neutral-500 uppercase tracking-widest mt-0.5">
              Admin Panel
            </p>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              const Icon = item.icon;

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`
                      flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                      transition-colors
                      ${
                        isActive
                          ? 'bg-amber-500/10 text-amber-500'
                          : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                      }
                    `}
                  >
                    <Icon className="w-5 h-5" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-neutral-800">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">
                Signed in as
              </p>
              <p className="text-sm text-white truncate">{userEmail}</p>
            </div>
            <form action="/api/admin/auth/logout" method="POST">
              <button
                type="submit"
                className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
                title="Sign out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
