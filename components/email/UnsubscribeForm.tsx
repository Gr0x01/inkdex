'use client';

/**
 * Email Unsubscribe Form Component
 *
 * Allows users to:
 * 1. View email preferences
 * 2. Toggle specific email types
 * 3. Unsubscribe from all emails
 */

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

export function UnsubscribeForm() {
  const searchParams = useSearchParams();
  const emailParam = searchParams.get('email');

  const [email, setEmail] = useState(emailParam || '');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUnsubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/email/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to unsubscribe');
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center py-8">
        <div className="mb-4 text-green-600">
          <svg
            className="w-16 h-16 mx-auto"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Successfully Unsubscribed</h2>
        <p className="text-gray-600">
          You've been unsubscribed from all Inkdex emails. You won't receive any more notifications.
        </p>
        <p className="text-sm text-gray-500 mt-4">
          Changed your mind?{' '}
          <Link href="/dashboard" className="text-blue-600 hover:underline">
            Update your preferences in your dashboard
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleUnsubscribe} className="space-y-6">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
          Email Address
        </label>
        <input
          type="email"
          id="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="your-email@example.com"
        />
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md text-sm text-red-800">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
      >
        {loading ? 'Unsubscribing...' : 'Unsubscribe from All Emails'}
      </button>

      <p className="text-xs text-gray-500 text-center">
        This will unsubscribe you from all Inkdex emails including welcome messages, sync
        notifications, and subscription updates.
      </p>
    </form>
  );
}
