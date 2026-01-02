'use client'

/**
 * Cookie Settings Link
 *
 * Simple link component for footer that opens the Cookie Settings Modal
 * Allows users to change their cookie preferences at any time (GDPR requirement)
 */

import { useState } from 'react'
import { CookieSettingsModal } from './CookieSettingsModal'

export function CookieSettingsLink() {
  const [showModal, setShowModal] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className="font-jetbrains-mono text-sm text-stone-300 transition-colors hover:text-accent text-left"
      >
        Cookie Settings
      </button>

      <CookieSettingsModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </>
  )
}
