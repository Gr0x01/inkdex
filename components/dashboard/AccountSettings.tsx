/**
 * Account Settings Component
 * Display account information and settings
 */

'use client'

import { Instagram, Mail, Calendar, Shield } from 'lucide-react'

interface AccountSettingsProps {
  instagramUsername?: string
  accountType: string
  memberSince?: string
  email?: string
}

export default function AccountSettings({
  instagramUsername,
  accountType,
  memberSince,
  email,
}: AccountSettingsProps) {
  return (
    <div>
      {/* Header */}
      <header className="mb-8">
        <h1 className="font-heading text-3xl mb-1">Account Settings</h1>
        <p className="font-mono text-xs uppercase tracking-wider text-gray-500">
          Manage your account details
        </p>
      </header>

      {/* Account Details */}
      <section className="border border-gray-200 bg-white p-6 mb-6">
        <h2 className="font-heading text-xl mb-6">Account Details</h2>

        <div className="space-y-6">
          <div className="flex items-start gap-4">
            <Instagram className="w-5 h-5 text-gray-400 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <p className="font-mono text-[10px] tracking-widest uppercase text-gray-500 mb-1">
                Instagram
              </p>
              <p className="font-body text-lg text-ink">
                @{instagramUsername || 'Not connected'}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <Mail className="w-5 h-5 text-gray-400 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <p className="font-mono text-[10px] tracking-widest uppercase text-gray-500 mb-1">
                Email
              </p>
              <p className="font-body text-lg text-ink">{email || 'Not available'}</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <Shield className="w-5 h-5 text-gray-400 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <p className="font-mono text-[10px] tracking-widest uppercase text-gray-500 mb-1">
                Account Type
              </p>
              <p className="font-body text-lg text-ink capitalize">{accountType}</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <Calendar className="w-5 h-5 text-gray-400 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <p className="font-mono text-[10px] tracking-widest uppercase text-gray-500 mb-1">
                Member Since
              </p>
              <p className="font-body text-lg text-ink">{memberSince || 'Unknown'}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Danger Zone (Future: Delete Account) */}
      <section className="border border-red-200 bg-red-50 p-6">
        <h2 className="font-heading text-xl mb-2 text-red-900">Danger Zone</h2>
        <p className="font-body text-sm text-red-700 mb-4">
          Permanent actions that cannot be undone
        </p>
        <button
          disabled
          className="px-6 py-2 bg-red-600 text-white font-mono text-xs uppercase tracking-wider opacity-50 cursor-not-allowed"
        >
          Delete Account (Coming Soon)
        </button>
      </section>
    </div>
  )
}
