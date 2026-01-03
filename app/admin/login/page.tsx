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
    <div className="min-h-screen bg-paper flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-6">
          <span className="font-display text-3xl font-[900] text-ink tracking-tight">
            INKDEX
          </span>
          <p className="font-mono text-[10px] text-gray-500 uppercase tracking-[0.15em] mt-1">
            Admin Panel
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-paper border-2 border-ink/10 p-6">
          {formState === 'authenticating' ? (
            <div className="text-center py-6">
              <Loader2 className="w-6 h-6 text-ink animate-spin mx-auto mb-3" />
              <p className="text-sm font-body text-gray-700">Signing you in...</p>
            </div>
          ) : formState === 'success' ? (
            <div className="text-center py-4">
              <CheckCircle className="w-6 h-6 text-status-success mx-auto mb-3" />
              <p className="text-sm font-heading font-semibold text-ink mb-1">Check your email</p>
              <p className="text-sm text-gray-500 font-body">Magic link sent to</p>
              <p className="text-sm text-ink font-body font-medium">{email}</p>

              {/* Development mode: Show clickable link */}
              {devLink && (
                <div className="mt-4 p-3 bg-status-warning/10 border border-status-warning/20">
                  <p className="font-mono text-[10px] text-status-warning uppercase tracking-[0.15em] mb-1">
                    Dev Mode
                  </p>
                  <a
                    href={devLink}
                    className="text-status-warning hover:underline text-sm break-all font-body"
                  >
                    Click to login
                  </a>
                </div>
              )}

              <button
                onClick={() => {
                  setFormState('idle');
                  setEmail('');
                  setDevLink(null);
                }}
                className="mt-4 text-sm text-gray-500 hover:text-ink font-body transition-colors"
              >
                Try a different email
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label
                  htmlFor="email"
                  className="block font-mono text-[10px] text-gray-500 uppercase tracking-[0.15em] mb-2"
                >
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="w-4 h-4 text-gray-500" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@inkdex.io"
                    required
                    disabled={formState === 'loading'}
                    className="w-full pl-10 pr-3 py-2.5 bg-paper border-2 border-ink/10
                             text-ink font-body placeholder-gray-500
                             focus:outline-none focus:border-ink
                             disabled:opacity-50 disabled:cursor-not-allowed
                             transition-colors"
                  />
                </div>
              </div>

              {formState === 'error' && (
                <div className="mb-4 p-3 bg-status-error/10 border border-status-error/20 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-status-error shrink-0 mt-0.5" />
                  <p className="text-status-error text-sm font-body">{errorMessage}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={formState === 'loading' || !email}
                className="w-full py-2.5 px-4 bg-ink hover:bg-gray-900
                         text-paper font-body text-sm
                         disabled:opacity-50 disabled:cursor-not-allowed
                         transition-colors"
              >
                {formState === 'loading' ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
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
        <p className="text-center text-gray-500 text-xs font-mono mt-4">
          Authorized administrators only
        </p>
      </div>
    </div>
  );
}
