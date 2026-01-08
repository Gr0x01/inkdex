'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, Power } from 'lucide-react'
import ConfirmDialog from '@/components/ui/ConfirmDialog'

export default function MaintenanceToggle() {
  const [enabled, setEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  useEffect(() => {
    fetch('/api/admin/maintenance')
      .then(res => res.json())
      .then(data => {
        setEnabled(data.enabled)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const handleToggleClick = () => {
    setShowConfirm(true)
  }

  const handleConfirm = async () => {
    setShowConfirm(false)
    const newState = !enabled

    setUpdating(true)
    try {
      const res = await fetch('/api/admin/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: newState }),
      })

      if (res.ok) {
        setEnabled(newState)
      }
    } catch {
      // silently fail
    } finally {
      setUpdating(false)
    }
  }

  const handleCancel = () => {
    setShowConfirm(false)
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-400 text-sm">
        <Power className="w-4 h-4" />
        <span>Loading...</span>
      </div>
    )
  }

  return (
    <>
      <button
        onClick={handleToggleClick}
        disabled={updating}
        className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium transition-colors ${
          enabled
            ? 'bg-amber-500/10 text-amber-600 border border-amber-500/30 hover:bg-amber-500/20'
            : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
        } disabled:opacity-50`}
      >
        {enabled ? (
          <>
            <AlertTriangle className="w-4 h-4" />
            <span>Maintenance ON</span>
          </>
        ) : (
          <>
            <Power className="w-4 h-4" />
            <span>Maintenance Off</span>
          </>
        )}
      </button>

      <ConfirmDialog
        isOpen={showConfirm}
        title={enabled ? 'Disable Maintenance Mode' : 'Enable Maintenance Mode'}
        message={
          enabled
            ? 'The site will be accessible to all users again.'
            : 'All users will see the maintenance page. Admin routes will remain accessible.'
        }
        confirmLabel={enabled ? 'Disable' : 'Enable'}
        cancelLabel="Cancel"
        variant={enabled ? 'default' : 'danger'}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </>
  )
}
