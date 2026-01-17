'use client'

import { useState, useEffect } from 'react'
import { MessageCircle, Check, X } from 'lucide-react'

interface AdminDmPushButtonProps {
  artistId: string
  artistHandle: string | null
}

export default function AdminDmPushButton({ artistId, artistHandle }: AdminDmPushButtonProps) {
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    // Check admin status via API (uses server-side whitelist)
    const checkAdmin = async () => {
      try {
        const res = await fetch('/api/admin/check-status')
        const { isAdmin } = await res.json()
        setIsAdmin(isAdmin)
      } catch {
        setIsAdmin(false)
      }
    }
    checkAdmin()
  }, [])

  // Reset status after success to allow re-pushing
  useEffect(() => {
    if (status === 'success') {
      const timer = setTimeout(() => setStatus('idle'), 5000)
      return () => clearTimeout(timer)
    }
  }, [status])

  const handlePush = async () => {
    setLoading(true)
    setStatus('idle')
    setMessage(null)

    try {
      const res = await fetch('/api/admin/airtable/push-dm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artistId }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Push failed')
      }

      if (data.pushed > 0) {
        setStatus('success')
        setMessage('Pushed to Airtable')
      } else {
        setStatus('error')
        setMessage(data.message || 'No action taken')
      }
    } catch (err) {
      setStatus('error')
      setMessage(err instanceof Error ? err.message : 'Push failed')
    } finally {
      setLoading(false)
    }
  }

  // Don't render for non-admins
  if (!isAdmin) return null

  return (
    <button
      onClick={handlePush}
      disabled={loading || status === 'success'}
      className={`
        flex items-center justify-center gap-1.5 w-full py-2 text-xs font-mono uppercase tracking-wider
        transition-all duration-200 border-2
        ${status === 'success' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : ''}
        ${status === 'error' ? 'bg-red-50 border-red-500 text-red-700' : ''}
        ${status === 'idle' ? 'bg-emerald-50 border-emerald-500 text-emerald-700 hover:bg-emerald-100' : ''}
        disabled:opacity-50 disabled:cursor-not-allowed
      `}
      title={`Push @${artistHandle} to DM campaign`}
    >
      {loading ? (
        <span className="animate-pulse">Pushing...</span>
      ) : status === 'success' ? (
        <>
          <Check className="w-3 h-3" />
          {message}
        </>
      ) : status === 'error' ? (
        <>
          <X className="w-3 h-3" />
          {message}
        </>
      ) : (
        <>
          <MessageCircle className="w-3 h-3" />
          DM Campaign
        </>
      )}
    </button>
  )
}
