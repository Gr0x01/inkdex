'use client';

import { useEffect } from 'react';

/**
 * Pre-warms Modal.com container on page load
 *
 * Fires a lightweight warmup request to spin up the GPU container
 * before the user submits their first search.
 *
 * Result: First search is 2-5s (warm) instead of 25s (cold start)
 *
 * Controlled by NEXT_PUBLIC_ENABLE_WARMUP env var
 */
export function ModalWarmup() {
  useEffect(() => {
    // Check if warmup is enabled
    const warmupEnabled = process.env.NEXT_PUBLIC_ENABLE_WARMUP === 'true';

    if (!warmupEnabled) {
      console.log('ℹ️  Modal warmup disabled');
      return;
    }

    // Fire-and-forget warmup request
    console.log('🔥 Triggering Modal warmup...');

    fetch('/api/warmup', {
      method: 'POST',
    })
      .then(() => console.log('✅ Warmup request sent'))
      .catch((err) => console.warn('⚠️  Warmup failed (non-critical):', err));

  }, []); // Run once on mount

  // This component renders nothing
  return null;
}
