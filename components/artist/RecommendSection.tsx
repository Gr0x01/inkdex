'use client';

/**
 * Recommend Artist Section
 *
 * Form for users to submit tattoo artist recommendations
 * Features:
 * - Instagram handle input
 * - Progressive Turnstile captcha (after 3rd submission)
 * - Rate limiting (5 submissions/hour)
 * - Real-time validation
 */

import { useState, useRef } from 'react';
import { TurnstileWidget } from './TurnstileWidget';

export function RecommendSection() {
  const [handle, setHandle] = useState('');
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [showCaptcha, setShowCaptcha] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | React.ReactNode | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validate handle
    if (!handle.trim()) {
      setError('Please enter an Instagram handle');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/add-artist/recommend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instagram_handle: handle,
          turnstile_token: turnstileToken,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle different error types
        if (data.error === 'RATE_LIMITED') {
          const resetDate = new Date(data.reset);
          const minutes = Math.ceil((resetDate.getTime() - Date.now()) / 60000);
          setError(`Too many recommendations. Please try again in ${minutes} minute${minutes > 1 ? 's' : ''}.`);
        } else if (data.error === 'DUPLICATE') {
          setError(
            <span>
              {data.message}{' '}
              <a
                href={data.artistUrl}
                className="text-ether underline hover:text-ether-light transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                View profile →
              </a>
            </span>
          );
        } else if (data.error === 'CLASSIFIER_FAILED') {
          setError(data.message || 'This account does not appear to be a tattoo artist.');
        } else if (data.error === 'CAPTCHA_REQUIRED') {
          // Backend tells us to show captcha
          setShowCaptcha(true);
          setError('Please complete the captcha verification');
        } else {
          setError(data.message || 'Something went wrong. Please try again.');
        }
        return;
      }

      // Success!
      setSuccess(data.message);
      setHandle('');
      setTurnstileToken(null);
    } catch (err) {
      console.error('Submit error:', err);
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTurnstileVerify = (token: string) => {
    setTurnstileToken(token);
    setError(null);
  };

  const handleTurnstileError = () => {
    setTurnstileToken(null);
    setError('Captcha verification failed. Please try again.');
  };

  return (
    <div className="space-y-6">
      {/* Heading */}
      <div>
        <h2 className="font-display text-2xl md:text-3xl text-white mb-3">
          Recommend an Artist
        </h2>
        <p className="font-body text-gray-400 text-sm md:text-base">
          Know a talented tattoo artist who should be on Inkdex? Submit their Instagram handle and we'll add them to our platform.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Instagram Handle Input */}
        <div>
          <label htmlFor="instagram-handle" className="sr-only">
            Instagram Handle
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-mono text-sm">
              @
            </span>
            <input
              ref={inputRef}
              id="instagram-handle"
              type="text"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              placeholder="username"
              disabled={isSubmitting}
              className="w-full pl-9 pr-4 py-3 bg-paper-dark border border-gray-800 rounded-lg
                       text-white font-mono text-sm md:text-base
                       placeholder:text-gray-600
                       focus:border-ether focus:ring-1 focus:ring-ether focus:outline-none
                       disabled:opacity-50 disabled:cursor-not-allowed
                       transition-colors"
              autoComplete="off"
              spellCheck="false"
            />
          </div>
          <p className="mt-2 text-xs text-gray-500 font-body">
            Enter the Instagram username (without the @)
          </p>
        </div>

        {/* Turnstile Captcha */}
        {showCaptcha && (
          <div className="py-4">
            <TurnstileWidget
              onVerify={handleTurnstileVerify}
              onError={handleTurnstileError}
            />
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting || !handle.trim()}
          className="w-full py-3 px-6 bg-gradient-to-r from-purple-600 to-pink-600
                   text-white font-body font-medium rounded-lg
                   hover:from-purple-700 hover:to-pink-700
                   disabled:opacity-50 disabled:cursor-not-allowed
                   transition-all duration-200 transform hover:scale-[1.02]
                   focus:outline-none focus:ring-2 focus:ring-ether focus:ring-offset-2 focus:ring-offset-ink"
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <svg
                className="animate-spin h-4 w-4 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Submitting...
            </span>
          ) : (
            'Submit Recommendation'
          )}
        </button>

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-900/20 border border-red-800 rounded-lg">
            <p className="text-red-400 text-sm font-body">{error}</p>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="p-4 bg-green-900/20 border border-green-800 rounded-lg">
            <p className="text-green-400 text-sm font-body">{success}</p>
          </div>
        )}
      </form>

      {/* Fine Print */}
      <p className="text-xs text-gray-600 font-body leading-relaxed">
        By submitting, you confirm that this is a legitimate tattoo artist's Instagram account. We verify all submissions before adding them to our platform.
      </p>
    </div>
  );
}
