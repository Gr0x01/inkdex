'use client';
import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function CompleteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    finalizeOnboarding();
  }, []);

  const finalizeOnboarding = async () => {
    try {
      const res = await fetch('/api/onboarding/finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to finalize');

      // Redirect to dashboard immediately (streamlined flow)
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto text-center">
        <div className="bg-paper border-2 border-border-subtle p-8 md:p-10 shadow-md">
          <div className="w-16 h-16 border-2 border-ink border-t-transparent rounded-full animate-spin mx-auto mb-5" />
          <h1 className="font-display text-3xl text-ink mb-2">Finalizing...</h1>
          <p className="font-body text-gray-700">Setting up your profile</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto text-center">
        <div className="bg-paper border-2 border-border-subtle p-8 md:p-10 shadow-md">
          {/* Error Icon */}
          <div className="w-20 h-20 bg-status-error/10 border-2 border-status-error flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-status-error" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>

          <h1 className="font-display text-3xl text-ink mb-3">Something Went Wrong</h1>
          <p className="font-body text-status-error mb-6 max-w-md mx-auto">{error}</p>

          <button
            onClick={() => router.push('/dashboard')}
            className="btn btn-primary px-8 py-3"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto text-center">
      <div className="bg-paper border-2 border-border-subtle p-8 md:p-10 shadow-md">
        {/* Success Icon */}
        <div className="w-20 h-20 bg-status-success/10 border-2 border-status-success flex items-center justify-center mx-auto mb-6">
          <svg className="w-12 h-12 text-status-success" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="font-display text-4xl text-ink mb-3">You're Live on Inkdex!</h1>
        <p className="font-body text-lg text-gray-700 mb-6 max-w-lg mx-auto leading-relaxed">
          Your profile is now visible to thousands of people looking for tattoo artists
        </p>

        {/* Auto-redirecting to dashboard - this UI should not be shown */}
        <p className="font-mono text-xs text-gray-500 uppercase tracking-wider">Redirecting to dashboard...</p>
      </div>
    </div>
  );
}

function CompleteLoadingFallback() {
  return (
    <div className="max-w-2xl mx-auto text-center">
      <div className="bg-paper border-2 border-border-subtle p-8 md:p-10 shadow-md">
        <div className="w-16 h-16 border-2 border-ink border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="font-body text-gray-700">Loading...</p>
      </div>
    </div>
  );
}

export default function CompletePage() {
  return (
    <Suspense fallback={<CompleteLoadingFallback />}>
      <CompleteContent />
    </Suspense>
  );
}
