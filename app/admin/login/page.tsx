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
    <div className="min-h-screen bg-paper flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <h1 className="font-display text-4xl font-[900] text-ink tracking-tight mb-2">
            INKDEX
          </h1>
          <div className="flex items-center justify-center gap-2 mb-1">
            <div className="h-px w-8 bg-gray-300" />
            <p className="font-mono text-[10px] text-gray-500 uppercase tracking-[0.2em]">
              Admin Panel
            </p>
            <div className="h-px w-8 bg-gray-300" />
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-paper border border-gray-300 shadow-sm">
          {formState === 'authenticating' ? (
            <div className="text-center py-12 px-6">
              <Loader2 className="w-4 h-4 text-ink animate-spin mx-auto mb-3" />
              <p className="font-body text-sm text-gray-700">Authenticating...</p>
            </div>
          ) : formState === 'success' ? (
            <div className="text-center py-10 px-6">
              <div className="w-10 h-10 rounded-full bg-status-success/10 mx-auto mb-4 flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-status-success" />
              </div>
              <h2 className="font-heading text-lg text-ink mb-2">Check your inbox</h2>
              <p className="font-body text-sm text-gray-600 mb-1">Magic link sent to</p>
              <p className="font-body text-sm text-ink font-semibold">{email}</p>

              {/* Development mode: Show clickable link */}
              {devLink && (
                <div className="mt-6 p-4 bg-status-warning/5 border border-status-warning/20">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <div className="h-px w-4 bg-status-warning/30" />
                    <p className="font-mono text-[9px] text-status-warning uppercase tracking-[0.2em]">
                      Development
                    </p>
                    <div className="h-px w-4 bg-status-warning/30" />
                  </div>
                  <a
                    href={devLink}
                    className="text-status-warning hover:underline text-xs break-all font-body block"
                  >
                    Click here to sign in
                  </a>
                </div>
              )}

              <button
                onClick={() => {
                  setFormState('idle');
                  setEmail('');
                  setDevLink(null);
                }}
                className="mt-6 text-xs text-gray-500 hover:text-ink font-mono uppercase tracking-[0.1em] transition-colors"
              >
                Use different email
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-8">
              <div className="mb-6">
                <label
                  htmlFor="email"
                  className="block font-mono text-[10px] text-gray-500 uppercase tracking-[0.2em] mb-3"
                >
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Mail className="w-3.5 h-3.5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your.email@example.com"
                    required
                    disabled={formState === 'loading'}
                    className="w-full pl-10 pr-4 py-3 bg-paper border border-gray-300
                             text-ink font-body text-sm placeholder:text-gray-400 placeholder:italic
                             focus:outline-none focus:border-ink focus:ring-1 focus:ring-ink
                             disabled:opacity-50 disabled:cursor-not-allowed
                             transition-all"
                  />
                </div>
              </div>

              {formState === 'error' && (
                <div className="mb-6 p-3 bg-status-error/5 border border-status-error/20 flex items-start gap-2.5">
                  <AlertCircle className="w-3.5 h-3.5 text-status-error shrink-0 mt-0.5" />
                  <p className="text-status-error text-xs font-body leading-relaxed">{errorMessage}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={formState === 'loading' || !email}
                className="w-full py-3 px-4 bg-ink hover:bg-gray-900
                         text-paper font-mono text-[10px] uppercase tracking-[0.15em]
                         disabled:opacity-50 disabled:cursor-not-allowed
                         transition-all duration-200
                         border-2 border-ink hover:border-gray-900
                         focus:outline-none focus:ring-2 focus:ring-ink focus:ring-offset-2"
              >
                {formState === 'loading' ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
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
        <div className="mt-6 text-center">
          <p className="font-mono text-[9px] text-gray-400 uppercase tracking-[0.2em]">
            Authorized Access Only
          </p>
        </div>
      </div>
    </div>
  );
}
