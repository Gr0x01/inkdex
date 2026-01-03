'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type FormState = 'idle' | 'loading' | 'success' | 'error' | 'authenticating';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [formState, setFormState] = useState<FormState>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [devLink, setDevLink] = useState<string | null>(null);
  const router = useRouter();

  // Handle auth callback - detect token in URL and complete session
  useEffect(() => {
    const supabase = createClient();

    // Listen for auth state changes (handles the token from URL automatically)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[Admin Login] Auth state change:', event, session?.user?.email);

      if (event === 'SIGNED_IN' && session) {
        // Successfully authenticated - redirect to admin dashboard
        router.push('/admin');
      }
    });

    // Check if there's a hash fragment with access_token
    const handleAuthCallback = async () => {
      if (typeof window !== 'undefined' && window.location.hash.includes('access_token')) {
        setFormState('authenticating');

        // Parse the hash manually and set the session
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            console.error('[Admin Login] Auth callback error:', error);
            setFormState('error');
            setErrorMessage('Failed to complete authentication. Please try again.');
            window.history.replaceState(null, '', '/admin/login');
            return;
          }
          // onAuthStateChange will handle the redirect
        } else {
          setFormState('error');
          setErrorMessage('Invalid authentication response. Please try again.');
          window.history.replaceState(null, '', '/admin/login');
        }
      }
    };

    handleAuthCallback();

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormState('loading');
    setErrorMessage('');
    setDevLink(null);

    try {
      const response = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setFormState('error');
        setErrorMessage(data.error || 'Something went wrong');
        return;
      }

      setFormState('success');

      // In development, show the magic link for easy testing
      if (data.devLink) {
        setDevLink(data.devLink);
      }
    } catch {
      setFormState('error');
      setErrorMessage('Failed to send login link. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo/Title */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white tracking-tight">
            INKDEX
          </h1>
          <p className="text-neutral-500 text-sm mt-1 uppercase tracking-widest">
            Admin Panel
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-8">
          {formState === 'authenticating' ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <svg
                  className="animate-spin h-10 w-10 text-amber-500"
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
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">
                Authenticating...
              </h2>
              <p className="text-neutral-400 text-sm">
                Please wait while we log you in.
              </p>
            </div>
          ) : formState === 'success' ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">
                Check your email
              </h2>
              <p className="text-neutral-400 text-sm">
                If this email is authorized, we&apos;ve sent a magic link to{' '}
                <span className="text-white font-medium">{email}</span>
              </p>

              {/* Development mode: Show clickable link */}
              {devLink && (
                <div className="mt-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <p className="text-amber-500 text-xs uppercase tracking-wider mb-2">
                    Development Mode
                  </p>
                  <a
                    href={devLink}
                    className="text-amber-400 hover:text-amber-300 text-sm underline break-all"
                  >
                    Click here to login
                  </a>
                </div>
              )}

              <button
                onClick={() => {
                  setFormState('idle');
                  setEmail('');
                  setDevLink(null);
                }}
                className="mt-6 text-neutral-400 hover:text-white text-sm transition-colors"
              >
                Try a different email
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <h2 className="text-xl font-semibold text-white mb-6">
                Sign in with magic link
              </h2>

              <div className="mb-6">
                <label
                  htmlFor="email"
                  className="block text-xs uppercase tracking-wider text-neutral-500 mb-2"
                >
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  required
                  disabled={formState === 'loading'}
                  className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg
                             text-white placeholder-neutral-500
                             focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500
                             disabled:opacity-50 disabled:cursor-not-allowed
                             transition-colors"
                />
              </div>

              {formState === 'error' && (
                <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <p className="text-red-400 text-sm">{errorMessage}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={formState === 'loading' || !email}
                className="w-full py-3 px-4 bg-white text-black font-medium rounded-lg
                           hover:bg-neutral-200
                           disabled:opacity-50 disabled:cursor-not-allowed
                           transition-colors"
              >
                {formState === 'loading' ? (
                  <span className="flex items-center justify-center">
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-black"
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
                    Sending...
                  </span>
                ) : (
                  'Send Magic Link'
                )}
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-neutral-600 text-xs mt-6">
          Only authorized administrators can access this panel.
        </p>
      </div>
    </div>
  );
}
