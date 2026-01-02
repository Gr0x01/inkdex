'use client';

/**
 * Dashboard Home - Client wrapper for main dashboard page
 * Handles scroll state for sticky toolbar
 */

import { useState, useEffect, useRef } from 'react';
import { ArrowRight } from 'lucide-react';
import DashboardToolbar from './DashboardToolbar';

interface DashboardHomeProps {
  handle: string;
  isPro: boolean;
  name?: string;
  instagramUsername?: string;
  accountType?: string;
  memberSince?: string;
}

export default function DashboardHome({
  handle,
  isPro,
  name,
  instagramUsername,
  accountType,
  memberSince,
}: DashboardHomeProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsScrolled(!entry.isIntersecting);
      },
      { threshold: 0, rootMargin: '-1px 0px 0px 0px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  const firstName = name?.split(' ')[0];

  return (
    <div className="min-h-screen bg-paper">
      {/* Grain texture overlay */}
      <div className="grain-overlay fixed inset-0 pointer-events-none opacity-10" />

      {/* Sticky Toolbar */}
      <DashboardToolbar handle={handle} isPro={isPro} isScrolled={isScrolled} hideBack>
        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="font-mono text-[10px] uppercase tracking-wider text-gray-500 hover:text-red-600 transition-colors"
          >
            Sign Out
          </button>
        </form>
      </DashboardToolbar>

      <div className="container mx-auto px-4 sm:px-6 pt-4 pb-8 max-w-4xl relative z-10">
        {/* Sentinel for intersection observer */}
        <div ref={sentinelRef} className="absolute top-0 h-px w-full" />

        {/* Welcome Header */}
        <header className="mb-8 pt-2">
          <h1 className="font-heading text-3xl mb-1">
            Welcome back{firstName ? `, ${firstName}` : ''}
          </h1>
          <p className="font-mono text-xs uppercase tracking-wider text-gray-500">
            Artist Dashboard
          </p>
        </header>

        {/* Account Info Card */}
        <section className="border border-gray-200 bg-white p-6 mb-8">
          <h2 className="font-heading text-xl mb-4">Account Details</h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <p className="font-mono text-[10px] tracking-widest uppercase text-gray-500 mb-1">
                Instagram
              </p>
              <p className="font-body text-lg text-ink">
                @{instagramUsername || 'Not connected'}
              </p>
            </div>

            <div>
              <p className="font-mono text-[10px] tracking-widest uppercase text-gray-500 mb-1">
                Account Type
              </p>
              <p className="font-body text-lg text-ink capitalize">
                {isPro ? 'Pro Artist' : accountType || 'Fan'}
              </p>
            </div>

            <div>
              <p className="font-mono text-[10px] tracking-widest uppercase text-gray-500 mb-1">
                Member Since
              </p>
              <p className="font-body text-lg text-ink">
                {memberSince || 'Unknown'}
              </p>
            </div>
          </div>
        </section>

        {/* Quick Actions */}
        <section className="mb-8">
          <h2 className="font-mono text-[11px] font-medium tracking-widest uppercase text-gray-700 mb-4">
            Quick Actions
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <a
              href="/dashboard/portfolio"
              className="group border border-gray-200 bg-white p-5 hover:border-gray-400 hover:shadow-sm transition-all"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-heading text-lg mb-1">Manage Portfolio</h3>
                  <p className="font-body text-sm text-gray-600">
                    Add, remove, and reorder your images
                  </p>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-ink group-hover:translate-x-1 transition-all" />
              </div>
            </a>

            <a
              href="/dashboard/profile"
              className="group border border-gray-200 bg-white p-5 hover:border-gray-400 hover:shadow-sm transition-all"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-heading text-lg mb-1">Edit Profile</h3>
                  <p className="font-body text-sm text-gray-600">
                    Update your bio, location, and links
                  </p>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-ink group-hover:translate-x-1 transition-all" />
              </div>
            </a>
          </div>
        </section>

      </div>
    </div>
  );
}
