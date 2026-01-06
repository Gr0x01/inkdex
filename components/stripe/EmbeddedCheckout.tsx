'use client';

import { useCallback, useState } from 'react';
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout as StripeEmbeddedCheckout,
} from '@stripe/react-stripe-js';
import { getStripe } from '@/lib/stripe/client';

interface EmbeddedCheckoutProps {
  plan: 'monthly' | 'yearly';
  artistId: string;
  sessionId: string;
  promoCode?: string;
  onError?: (error: string) => void;
}

export default function EmbeddedCheckout({
  plan,
  artistId,
  sessionId,
  promoCode,
  onError,
}: EmbeddedCheckoutProps) {
  const [loading, setLoading] = useState(true);

  const fetchClientSecret = useCallback(async () => {
    try {
      const response = await fetch('/api/stripe/create-embedded-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan,
          artistId,
          sessionId,
          promoCode,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create checkout session');
      }

      const { clientSecret } = await response.json();
      setLoading(false);
      return clientSecret;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to initialize checkout';
      onError?.(message);
      throw error;
    }
  }, [plan, artistId, sessionId, promoCode, onError]);

  const stripePromise = getStripe();

  if (!stripePromise) {
    return (
      <div className="bg-status-error/10 border-2 border-status-error p-4 text-center">
        <p className="font-body text-status-error">
          Payment system unavailable. Please try again later.
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-paper/80 z-10">
          <div className="text-center">
            <div className="w-10 h-10 border-2 border-ink border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="font-body text-sm text-gray-600">
              Loading payment form...
            </p>
          </div>
        </div>
      )}
      <EmbeddedCheckoutProvider
        stripe={stripePromise}
        options={{ fetchClientSecret }}
      >
        <StripeEmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
