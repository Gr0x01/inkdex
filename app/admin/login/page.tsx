'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Terminal, Mail, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

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
      {/* Background grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />

      <div className="relative w-full max-w-sm">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-600">
              Secure Access
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-neutral-700" />
            <h1 className="text-xl font-semibold text-white tracking-tight font-[family-name:var(--font-space-grotesk)]">
              INKDEX
            </h1>
          </div>
          <p className="text-[10px] text-neutral-600 font-mono uppercase tracking-widest mt-1 ml-7">
            Admin Console
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-neutral-900/50 border border-neutral-800/50 rounded-lg p-6">
          {formState === 'authenticating' ? (
            <div className="text-center py-6">
              <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mx-auto mb-4" />
              <h2 className="text-sm font-medium text-white mb-1 font-[family-name:var(--font-space-grotesk)]">
                Authenticating
              </h2>
              <p className="text-[11px] text-neutral-500 font-mono">
                Establishing secure session...
              </p>
            </div>
          ) : formState === 'success' ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-6 h-6 text-emerald-500" />
              </div>
              <h2 className="text-sm font-medium text-white mb-2 font-[family-name:var(--font-space-grotesk)]">
                Check your email
              </h2>
              <p className="text-[11px] text-neutral-500 font-mono">
                Magic link sent to
              </p>
              <p className="text-xs text-neutral-300 font-mono mt-1">{email}</p>

              {/* Development mode: Show clickable link */}
              {devLink && (
                <div className="mt-4 p-3 bg-amber-500/5 border border-amber-500/20 rounded">
                  <p className="text-[9px] text-amber-500/70 uppercase tracking-wider font-mono mb-2">
                    Dev Mode
                  </p>
                  <a
                    href={devLink}
                    className="text-amber-400 hover:text-amber-300 text-xs font-mono underline break-all"
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
                className="mt-4 text-neutral-500 hover:text-neutral-300 text-[10px] font-mono uppercase tracking-wider transition-colors"
              >
                Try different email
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="flex items-center gap-2 mb-4">
                <Mail className="w-4 h-4 text-neutral-600" />
                <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-600">
                  Magic Link Auth
                </span>
              </div>

              <div className="mb-4">
                <label
                  htmlFor="email"
                  className="block text-[10px] uppercase tracking-wider text-neutral-600 font-mono mb-1.5"
                >
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@inkdex.io"
                  required
                  disabled={formState === 'loading'}
                  className="w-full px-3 py-2.5 bg-neutral-800/50 border border-neutral-700/50 rounded
                           text-sm text-white placeholder-neutral-600 font-mono
                           focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50
                           disabled:opacity-50 disabled:cursor-not-allowed
                           transition-colors"
                />
              </div>

              {formState === 'error' && (
                <div className="mb-4 p-2.5 bg-red-500/5 border border-red-500/20 rounded flex items-start gap-2">
                  <AlertCircle className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" />
                  <p className="text-red-400 text-[11px] font-mono">{errorMessage}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={formState === 'loading' || !email}
                className="w-full py-2.5 px-4 bg-emerald-500/10 hover:bg-emerald-500/20
                         border border-emerald-500/30 hover:border-emerald-500/50
                         text-emerald-400 text-xs font-mono uppercase tracking-wider rounded
                         disabled:opacity-50 disabled:cursor-not-allowed
                         transition-all"
              >
                {formState === 'loading' ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Sending...
                  </span>
                ) : (
                  'Request Access'
                )}
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-[9px] text-neutral-700 font-mono mt-4 uppercase tracking-wider">
          Authorized personnel only
        </p>
      </div>
    </div>
  );
}
