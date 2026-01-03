/* eslint-disable @typescript-eslint/no-explicit-any -- Dev page, types less strict */
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TEST_USER_OPTIONS } from '@/lib/dev/test-users';
import { notFound } from 'next/navigation';

export default function DevLoginPage() {
  // Security: Only show in development
  if (process.env.NODE_ENV !== 'development') {
    notFound();
  }

  const router = useRouter();
  const [selectedUser, setSelectedUser] = useState('FREE');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setLoading(true);
    setError('');

    try {
      const userOption = TEST_USER_OPTIONS.find(u => u.value === selectedUser);
      if (!userOption) throw new Error('Invalid user selection');

      // Get actual user ID from TEST_USERS constant
      const { TEST_USERS } = await import('@/lib/dev/test-users');
      const testUser = TEST_USERS[selectedUser as keyof typeof TEST_USERS];
      if (!testUser) throw new Error('Invalid user selection');

      // Step 1: Get auth token from server
      const res = await fetch('/api/dev/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: testUser.id }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');

      // Step 2: Verify OTP on client to set session cookies
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();

      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: data.token_hash,
        type: 'magiclink',
      });

      if (verifyError) {
        throw new Error('Failed to create session: ' + verifyError.message);
      }

      // Step 3: Redirect to destination
      router.push(data.redirectUrl || '/dashboard');
      router.refresh(); // Refresh to update auth state
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-heading text-2xl text-ink mb-2">Development Login</h1>
          <p className="font-body text-sm text-gray-700">Select a test user to bypass OAuth authentication</p>
        </div>

        {/* Warning banner */}
        <div className="mb-6 border-l-2 border-gray-500 bg-gray-100 p-4">
          <p className="font-mono text-[0.65rem] tracking-wider uppercase text-gray-700 mb-1">
            Development Only
          </p>
          <p className="font-body text-sm text-gray-700">
            This page is not available in production
          </p>
        </div>

        {/* User selection */}
        <div className="mb-6">
          <label className="block font-mono text-[0.65rem] tracking-wider uppercase text-gray-700 mb-3">
            Test Users
          </label>
          <div className="space-y-2">
            {TEST_USER_OPTIONS.map((user) => (
              <button
                key={user.value}
                onClick={() => setSelectedUser(user.value)}
                className={`w-full text-left p-4 border-2 transition-all ${
                  selectedUser === user.value
                    ? 'border-ink bg-gray-100'
                    : 'border-gray-300 bg-paper hover:border-gray-500'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2 mb-1">
                      <p className="font-heading text-base text-ink">{user.label}</p>
                      <span className={`font-mono text-[0.6rem] tracking-wider uppercase px-2 py-0.5 ${
                        user.tier === 'Pro'
                          ? 'bg-ink text-paper'
                          : user.tier === 'Free'
                          ? 'bg-gray-700 text-paper'
                          : 'bg-gray-300 text-gray-700'
                      }`}>
                        {user.tier}
                      </span>
                    </div>
                    <p className="font-body text-sm text-gray-700">{user.description}</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectedUser === user.value
                      ? 'border-ink bg-ink'
                      : 'border-gray-400'
                  }`}>
                    {selectedUser === user.value && (
                      <div className="w-2 h-2 bg-paper rounded-full" />
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 border-l-2 border-status-error bg-red-50 p-4">
            <p className="font-mono text-[0.65rem] tracking-wider uppercase text-status-error mb-1">
              Error
            </p>
            <p className="font-body text-sm text-red-900">{error}</p>
          </div>
        )}

        {/* Login button */}
        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full py-3 bg-ink text-paper border-2 border-ink font-mono text-[0.65rem] tracking-wider uppercase hover:bg-paper hover:text-ink transition-all disabled:opacity-50"
        >
          {loading ? 'Authenticating...' : `Login as ${TEST_USER_OPTIONS.find(u => u.value === selectedUser)?.label.split(' ')[0]}`}
        </button>
      </div>
    </div>
  );
}
