'use client';
import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';

function PortfolioContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');

  const [images, setImages] = useState<any[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSessionImages = async () => {
      if (!sessionId) {
        setError('No session ID found');
        setLoading(false);
        return;
      }

      try {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();

        const { data: session, error: sessionError } = await supabase
          .from('onboarding_sessions')
          .select('fetched_images, current_step')
          .eq('id', sessionId)
          .single();

        if (sessionError || !session) {
          setError('Session not found. Please start over.');
          setLoading(false);
          return;
        }

        if (!session.fetched_images || session.fetched_images.length === 0) {
          setError('No images found. Please go back and fetch images first.');
          setLoading(false);
          return;
        }

        setImages(session.fetched_images);
        setLoading(false);
      } catch (err: any) {
        console.error('[Portfolio] Error fetching session:', err);
        setError('Failed to load images. Please try again.');
        setLoading(false);
      }
    };

    fetchSessionImages();
  }, [sessionId]);

  const toggleImage = (id: string) => {
    const newSelected = new Set(selected);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else if (newSelected.size < 20) {
      newSelected.add(id);
    }
    setSelected(newSelected);
  };

  const handleContinue = async () => {
    if (selected.size === 0) {
      setError('Please select at least 1 image');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/onboarding/update-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          step: 'portfolio',
          data: { selectedImageIds: Array.from(selected) },
        }),
      });

      if (!res.ok) throw new Error('Failed to save');
      router.push(`/onboarding/booking?session_id=${sessionId}`);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-ether border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-400">Loading your images...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-6 text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => router.push('/add-artist')}
            className="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition"
          >
            Start Over
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="font-display text-3xl text-white">Select Your Portfolio</h1>
          <p className="text-gray-400 mt-2">Pick up to 20 of your best images</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-display text-ether">{selected.size}/20</p>
          <p className="text-sm text-gray-500">selected</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
        {images.filter(img => img.classified).map((img) => (
          <div
            key={img.instagram_post_id}
            onClick={() => toggleImage(img.instagram_post_id)}
            className={`relative aspect-square cursor-pointer rounded-lg overflow-hidden border-2 transition ${
              selected.has(img.instagram_post_id)
                ? 'border-ether'
                : 'border-transparent hover:border-gray-700'
            }`}
          >
            <Image src={img.url} alt="" fill className="object-cover" />
            {selected.has(img.instagram_post_id) && (
              <div className="absolute inset-0 bg-ether/20 flex items-center justify-center">
                <div className="w-8 h-8 bg-ether rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-ink" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {error && <p className="text-red-400 text-center mb-4">{error}</p>}

      <button
        onClick={handleContinue}
        disabled={loading || selected.size === 0}
        className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 transition"
      >
        {loading ? 'Saving...' : 'Continue →'}
      </button>
    </div>
  );
}

function PortfolioLoadingFallback() {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-ether border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    </div>
  );
}

export default function PortfolioPage() {
  return (
    <Suspense fallback={<PortfolioLoadingFallback />}>
      <PortfolioContent />
    </Suspense>
  );
}
