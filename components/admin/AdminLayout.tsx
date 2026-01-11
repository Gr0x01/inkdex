'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Users, LogOut, LayoutDashboard, Workflow, Palette, Megaphone } from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
  userEmail: string;
}

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/pipeline', label: 'Pipeline', icon: Workflow },
  { href: '/admin/artists', label: 'Artists', icon: Users },
  { href: '/admin/styles', label: 'Styles', icon: Palette },
  { href: '/admin/marketing', label: 'Marketing', icon: Megaphone },
];

export default function AdminLayout({ children, userEmail }: AdminLayoutProps) {
  const pathname = usePathname();

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-paper flex">
      {/* Sidebar - Compact admin style */}
      <aside className="w-40 bg-paper border-r border-ink/10 flex flex-col text-[13px]">
        {/* Logo */}
        <div className="px-3 py-2.5 border-b border-ink/10">
          <Link href="/admin" className="block">
            <span className="font-display text-sm font-[900] text-ink tracking-tight">
              INKDEX
            </span>
            <span className="font-mono text-[9px] text-gray-400 uppercase tracking-wider block">
              Admin
            </span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-1.5 py-2">
          <ul className="space-y-0.5">
            {navItems.map((item) => {
              const active = isActive(item.href, item.exact);
              const Icon = item.icon;

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`
                      flex items-center gap-1.5 px-2 py-1.5 text-[13px] font-body
                      transition-colors duration-100
                      ${
                        active
                          ? 'bg-ink text-paper'
                          : 'text-gray-600 hover:bg-gray-100'
                      }
                    `}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User section */}
        <div className="px-2 py-2 border-t border-ink/10">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 bg-ink text-paper flex items-center justify-center font-mono text-[10px] font-medium flex-shrink-0">
              {userEmail.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-body text-gray-600 truncate">
                {userEmail.split('@')[0]}
              </p>
            </div>
            <form action="/api/admin/auth/logout" method="POST">
              <button
                type="submit"
                className="p-1 text-gray-400 hover:text-ink hover:bg-gray-100 transition-colors"
                title="Log out"
              >
                <LogOut className="w-3 h-3" />
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <main className="flex-1 overflow-auto">
        <div className="p-4">
          {children}
        </div>
      </main>
    </div>
  );
}
