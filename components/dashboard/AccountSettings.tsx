/**
 * Account Settings Component
 * Display account information and settings
 */

'use client'

import { useState } from 'react'
import { Instagram, Mail, Calendar, Shield } from 'lucide-react'

interface AccountSettingsProps {
  instagramUsername?: string
  accountType: string
  memberSince?: string
  email?: string
  artistId?: string
  artistName?: string
}

export default function AccountSettings({
  instagramUsername,
  accountType,
  memberSince,
  email,
  artistId,
  artistName: _artistName,
}: AccountSettingsProps) {
  // Delete modal state
  const [showDeleteWarning, setShowDeleteWarning] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // Delete flow handlers
  const handleDeleteClick = () => {
    setShowDeleteWarning(true)
    setDeleteError(null)
  }

  const handleDeleteProceed = () => {
    setShowDeleteWarning(false)
    setShowDeleteConfirm(true)
  }

  const handleDeleteExecute = async () => {
    if (deleteConfirmText !== 'DELETE') {
      setDeleteError('Please type DELETE to confirm')
      return
    }

    if (!artistId) {
      setDeleteError('No artist profile found to delete')
      return
    }

    setIsDeleting(true)
    setDeleteError(null)

    try {
      const response = await fetch('/api/dashboard/profile/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artistId }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete profile')
      }

      window.location.href = '/'
    } catch (error) {
      console.error('[AccountSettings] Delete error:', error)
      setDeleteError(error instanceof Error ? error.message : 'Failed to delete profile')
      setIsDeleting(false)
    }
  }

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

      {/* Danger Zone - Delete Profile */}
      {artistId && (
        <section className="border-2 border-red-200 bg-red-50/50 p-5 lg:p-6">
          <h3 className="font-heading text-lg text-[var(--error)] mb-2">
            Danger Zone
          </h3>
          <p className="font-body text-sm text-[var(--gray-700)] mb-4">
            Permanently delete your artist profile. This action cannot be undone and will remove all your portfolio images and analytics data.
          </p>
          <button
            onClick={handleDeleteClick}
            className="font-mono text-xs tracking-[0.1em] uppercase px-4 py-2 bg-[var(--error)] text-white hover:bg-red-700 transition-colors"
          >
            Delete Profile
          </button>
        </section>
      )}

      {/* Delete Warning Modal */}
      {showDeleteWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--ink-black)]/80 p-4 animate-fade-in">
          <div className="w-full max-w-md bg-white border-2 border-[var(--ink-black)] p-8 animate-scale-in">
            <h3 className="font-heading text-2xl text-[var(--error)] mb-4">
              Warning
            </h3>
            <p className="font-body text-[var(--ink-black)] mb-4">
              Deleting your profile is <strong>permanent and cannot be undone</strong>. All of your:
            </p>
            <ul className="font-body text-[var(--gray-700)] mb-6 space-y-1 ml-4">
              <li className="flex items-center gap-2">
                <span className="w-1 h-1 bg-[var(--gray-500)] rounded-full" />
                Portfolio images
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1 h-1 bg-[var(--gray-500)] rounded-full" />
                Profile information
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1 h-1 bg-[var(--gray-500)] rounded-full" />
                Analytics data
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1 h-1 bg-[var(--gray-500)] rounded-full" />
                Subscription (if applicable)
              </li>
            </ul>
            <p className="font-body text-[var(--ink-black)] mb-6">
              will be permanently deleted.
            </p>

            <div className="flex gap-3">
              <button
                onClick={handleDeleteProceed}
                className="flex-1 font-mono text-xs tracking-[0.1em] uppercase px-4 py-3 bg-[var(--error)] text-white hover:bg-red-700 transition-colors"
              >
                I Understand
              </button>
              <button
                onClick={() => setShowDeleteWarning(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--ink-black)]/80 p-4 animate-fade-in">
          <div className="w-full max-w-md bg-white border-2 border-[var(--ink-black)] p-8 animate-scale-in">
            <h3 className="font-heading text-2xl text-[var(--error)] mb-4">
              Final Confirmation
            </h3>
            <p className="font-body text-[var(--ink-black)] mb-4">
              Type <span className="font-mono font-bold bg-[var(--gray-100)] px-2 py-0.5">DELETE</span> to confirm permanent deletion:
            </p>

            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              className="w-full px-4 py-3 border-2 border-[var(--gray-300)] font-mono text-lg tracking-wider focus:outline-none focus:border-[var(--error)] mb-4"
              placeholder="Type DELETE"
              autoFocus
            />

            {deleteError && (
              <div className="border-2 border-[var(--error)] bg-red-50 p-3 mb-4">
                <p className="font-body text-sm text-[var(--error)]">{deleteError}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleDeleteExecute}
                disabled={isDeleting || deleteConfirmText !== 'DELETE'}
                className="flex-1 font-mono text-xs tracking-[0.1em] uppercase px-4 py-3 bg-[var(--error)] text-white hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isDeleting ? 'Deleting...' : 'Delete Forever'}
              </button>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false)
                  setDeleteConfirmText('')
                  setDeleteError(null)
                }}
                disabled={isDeleting}
                className="btn btn-secondary disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
