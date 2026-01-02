'use client';

/**
 * Cloudflare Turnstile Widget
 *
 * Client-side captcha widget that loads Cloudflare Turnstile
 * Displays after rate limit threshold (3rd submission)
 */

import { useEffect, useRef, useState } from 'react';

interface TurnstileWidgetProps {
  onVerify: (token: string) => void;
  onError?: () => void;
}

// Declare Turnstile global type
declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement | string,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          'error-callback'?: () => void;
          theme?: 'light' | 'dark' | 'auto';
          size?: 'normal' | 'compact';
        }
      ) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

export function TurnstileWidget({ onVerify, onError }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [error, setError] = useState(false);

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  // Load Turnstile script
  useEffect(() => {
    if (typeof window === 'undefined' || !siteKey) return;

    // Check if script already loaded
    if (window.turnstile) {
      setScriptLoaded(true);
      return;
    }

    // Load script
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
    script.async = true;
    script.defer = true;
    script.onload = () => setScriptLoaded(true);
    script.onerror = () => {
      console.error('Failed to load Turnstile script');
      setError(true);
      onError?.();
    };

    document.head.appendChild(script);

    return () => {
      // Cleanup on unmount
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
      }
    };
  }, [siteKey, onError]);

  // Render widget when script loaded
  useEffect(() => {
    if (!scriptLoaded || !containerRef.current || !window.turnstile || !siteKey) return;

    // Render widget
    try {
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        callback: (token: string) => {
          onVerify(token);
        },
        'error-callback': () => {
          setError(true);
          onError?.();
        },
        theme: 'dark',
        size: 'normal',
      });
    } catch (err) {
      console.error('Error rendering Turnstile widget:', err);
      setError(true);
      onError?.();
    }
  }, [scriptLoaded, siteKey, onVerify, onError]);

  if (!siteKey) {
    return (
      <div className="text-red-500 text-sm">
        Captcha configuration error. Please contact support.
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 text-sm">
        Failed to load captcha. Please refresh the page.
      </div>
    );
  }

  return (
    <div className="flex justify-center">
      <div ref={containerRef} />
    </div>
  );
}
