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
      const user = TEST_USER_OPTIONS.find(u => u.value === selectedUser);
      if (!user) throw new Error('Invalid user selection');

      // Step 1: Get auth token from server
      const res = await fetch('/api/dev/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.value }),
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
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Warning banner */}
        <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <p className="text-yellow-500 text-sm text-center font-medium">
            🚧 Development Only - Not available in production
          </p>
        </div>

        {/* Login card */}
        <div className="bg-paper-dark border border-gray-800 rounded-lg p-8">
          <h1 className="font-display text-3xl text-white mb-2">Test User Login</h1>
          <p className="text-gray-400 mb-8">Bypass OAuth for testing</p>

          <div className="space-y-6">
            <div>
              <label className="block text-sm text-gray-400 mb-3">Select Test User</label>
              <div className="space-y-2">
                {TEST_USER_OPTIONS.map((user) => (
                  <button
                    key={user.value}
                    onClick={() => setSelectedUser(user.value)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition ${
                      selectedUser === user.value
                        ? 'border-ether bg-ether/10'
                        : 'border-gray-800 bg-ink hover:border-gray-700'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-white font-medium">{user.label}</p>
                        <p className="text-sm text-gray-400 mt-1">{user.description}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded ${
                        user.tier === 'Pro'
                          ? 'bg-purple-500/20 text-purple-400'
                          : user.tier === 'Free'
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'bg-gray-500/20 text-gray-400'
                      }`}>
                        {user.tier}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-900/20 border border-red-800 rounded-lg">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 transition"
            >
              {loading ? 'Logging in...' : `Login as ${TEST_USER_OPTIONS.find(u => u.value === selectedUser)?.label.split(' ')[0]}`}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-gray-600 mt-6">
          Use this page to test different user flows without OAuth
        </p>
      </div>
    </div>
  );
}
