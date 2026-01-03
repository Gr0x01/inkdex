'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Mail, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

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
    <div className="min-h-screen bg-[#f8f9fc] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 mb-4">
            <span className="text-white font-bold text-2xl">I</span>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 font-[family-name:var(--font-space-grotesk)]">
            Inkdex Admin
          </h1>
          <p className="text-gray-500 mt-1">Sign in to access the admin panel</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
          {formState === 'authenticating' ? (
            <div className="text-center py-8">
              <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Signing you in...</h2>
              <p className="text-gray-500">Please wait while we verify your credentials.</p>
            </div>
          ) : formState === 'success' ? (
            <div className="text-center py-6">
              <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-7 h-7 text-emerald-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Check your email</h2>
              <p className="text-gray-500 mb-1">We&apos;ve sent a magic link to</p>
              <p className="text-gray-900 font-medium">{email}</p>

              {/* Development mode: Show clickable link */}
              {devLink && (
                <div className="mt-6 p-4 bg-amber-50 border border-amber-100 rounded-xl">
                  <p className="text-xs text-amber-600 uppercase tracking-wider font-medium mb-2">
                    Development Mode
                  </p>
                  <a
                    href={devLink}
                    className="text-amber-700 hover:text-amber-800 text-sm underline break-all"
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
                className="mt-6 text-emerald-600 hover:text-emerald-700 text-sm font-medium transition-colors"
              >
                Try a different email
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="mb-6">
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="w-5 h-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@inkdex.io"
                    required
                    disabled={formState === 'loading'}
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl
                             text-gray-900 placeholder-gray-400
                             focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500
                             disabled:opacity-50 disabled:cursor-not-allowed
                             transition-colors"
                  />
                </div>
              </div>

              {formState === 'error' && (
                <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-red-700 text-sm">{errorMessage}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={formState === 'loading' || !email}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700
                         text-white font-medium rounded-xl
                         disabled:opacity-50 disabled:cursor-not-allowed
                         transition-colors shadow-sm"
              >
                {formState === 'loading' ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
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
        <p className="text-center text-gray-400 text-sm mt-6">
          Only authorized administrators can access this panel.
        </p>
      </div>
    </div>
  );
}
