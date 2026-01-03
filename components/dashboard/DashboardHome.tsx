'use client';

/**
 * Dashboard Home - Overview content for main dashboard page
 */

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { SyncSettingsCard } from './SyncSettingsCard';

interface DashboardHomeProps {
  handle: string;
  isPro: boolean;
  name?: string;
  instagramUsername?: string;
  accountType?: string;
  memberSince?: string;
}

export default function DashboardHome({
  handle: _handle,
  isPro,
  name,
  instagramUsername,
  accountType,
  memberSince,
}: DashboardHomeProps) {
  const firstName = name?.split(' ')[0];

  return (
    <div className="max-w-4xl">{/* Content wrapper */}

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
            <Link
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
            </Link>

            <Link
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
            </Link>

            {isPro && (
              <Link
                href="/dashboard/analytics"
                className="group border border-gray-200 bg-white p-5 hover:border-gray-400 hover:shadow-sm transition-all"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-heading text-lg mb-1">View Analytics</h3>
                    <p className="font-body text-sm text-gray-600">
                      Track your performance and engagement
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-ink group-hover:translate-x-1 transition-all" />
                </div>
              </Link>
            )}
          </div>
        </section>

        {/* Instagram Sync Settings (Pro only) */}
        {isPro && (
          <section className="mb-8">
            <h2 className="font-mono text-[11px] font-medium tracking-widest uppercase text-gray-700 mb-4">
              Pro Features
            </h2>
            <SyncSettingsCard />
          </section>
        )}
    </div>
  );
}
