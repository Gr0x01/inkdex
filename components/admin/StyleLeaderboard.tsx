'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw,
  Crown,
  Star,
  Copy,
  Check,
  ExternalLink,
  Palette,
} from 'lucide-react';
import Image from 'next/image';
import { getImageUrl } from '@/lib/utils/images';

interface StyleSeed {
  style_name: string;
  display_name: string;
  description: string | null;
}

interface LeaderboardArtist {
  artist_id: string;
  artist_name: string;
  instagram_handle: string | null;
  city: string | null;
  state: string | null;
  similarity_score: number;
  best_image_url: string | null;
  is_pro: boolean;
  is_featured: boolean;
}

export default function StyleLeaderboard() {
  const [styles, setStyles] = useState<StyleSeed[]>([]);
  const [selectedStyle, setSelectedStyle] = useState<string>('');
  const [currentStyle, setCurrentStyle] = useState<StyleSeed | null>(null);
  const [artists, setArtists] = useState<LeaderboardArtist[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingArtists, setLoadingArtists] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedHandle, setCopiedHandle] = useState<string | null>(null);
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());

  // Fetch available styles on mount
  useEffect(() => {
    async function fetchStyles() {
      try {
        const response = await fetch('/api/admin/styles/leaderboard');
        if (!response.ok) throw new Error('Failed to fetch styles');

        const data = await response.json();
        setStyles(data.styles || []);

        // Auto-select first style if available
        if (data.styles && data.styles.length > 0) {
          setSelectedStyle(data.styles[0].style_name);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load styles');
      } finally {
        setLoading(false);
      }
    }

    fetchStyles();
  }, []);

  // Fetch leaderboard when style changes
  const fetchLeaderboard = useCallback(async () => {
    if (!selectedStyle) return;

    setLoadingArtists(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/admin/styles/leaderboard?style=${selectedStyle}`
      );
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch leaderboard');
      }

      const data = await response.json();
      setCurrentStyle(data.style);
      setArtists(data.artists || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leaderboard');
      setArtists([]);
    } finally {
      setLoadingArtists(false);
    }
  }, [selectedStyle]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  // Copy handle to clipboard
  const copyHandle = async (handle: string) => {
    try {
      await navigator.clipboard.writeText(`@${handle}`);
      setCopiedHandle(handle);
      setTimeout(() => setCopiedHandle(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Toggle featured status
  const toggleFeatured = async (artist: LeaderboardArtist) => {
    setUpdatingIds((prev) => new Set(prev).add(artist.artist_id));

    try {
      const response = await fetch(
        `/api/admin/artists/${artist.artist_id}/featured`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_featured: !artist.is_featured }),
        }
      );

      if (!response.ok) throw new Error('Failed to update');

      // Update local state
      setArtists((prev) =>
        prev.map((a) =>
          a.artist_id === artist.artist_id
            ? { ...a, is_featured: !a.is_featured }
            : a
        )
      );
    } catch (err) {
      console.error('Failed to update featured status:', err);
    } finally {
      setUpdatingIds((prev) => {
        const next = new Set(prev);
        next.delete(artist.artist_id);
        return next;
      });
    }
  };

  // Convert similarity score to percentage (rescale from [0.15, 0.47] to [0, 100])
  const similarityToPercent = (score: number): number => {
    const MIN_CLIP = 0.15;
    const MAX_CLIP = 0.47;
    const normalized = (score - MIN_CLIP) / (MAX_CLIP - MIN_CLIP);
    return Math.round(Math.max(0, Math.min(100, normalized * 100)));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2 text-gray-500">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>Loading styles...</span>
        </div>
      </div>
    );
  }

  if (styles.length === 0) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-amber-800">
          <Palette className="w-5 h-5" />
          <span className="font-medium">No style seeds found</span>
        </div>
        <p className="text-sm text-amber-700 mt-1">
          Add style seeds to the database to enable style rankings.
          Use the seed upload script after providing images.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Style Selector */}
      <div className="flex items-center gap-4">
        <div className="flex-1 max-w-xs">
          <label className="block text-[12px] text-gray-500 mb-1">
            Select Style
          </label>
          <select
            value={selectedStyle}
            onChange={(e) => setSelectedStyle(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ink/20"
          >
            {styles.map((style) => (
              <option key={style.style_name} value={style.style_name}>
                {style.display_name}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={fetchLeaderboard}
          disabled={loadingArtists}
          className="mt-5 p-2 text-gray-500 hover:text-ink hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw
            className={`w-4 h-4 ${loadingArtists ? 'animate-spin' : ''}`}
          />
        </button>

        {currentStyle?.description && (
          <p className="mt-5 text-[12px] text-gray-500 flex-1">
            {currentStyle.description}
          </p>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Artists Grid */}
      {loadingArtists ? (
        <div className="flex items-center justify-center h-48">
          <div className="flex items-center gap-2 text-gray-500">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Loading artists...</span>
          </div>
        </div>
      ) : artists.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No artists found for this style
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
          {artists.map((artist, index) => (
            <div
              key={artist.artist_id}
              className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Rank Badge */}
              <div className="relative">
                <div className="absolute top-2 left-2 z-10 bg-ink text-white text-xs font-bold px-2 py-1 rounded">
                  #{index + 1}
                </div>

                {/* Best Image */}
                {artist.best_image_url ? (
                  <div className="aspect-square relative bg-gray-100">
                    <Image
                      src={getImageUrl(artist.best_image_url)}
                      alt={`${artist.artist_name}'s best matching work`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 20vw"
                    />
                  </div>
                ) : (
                  <div className="aspect-square bg-gray-100 flex items-center justify-center">
                    <Palette className="w-8 h-8 text-gray-300" />
                  </div>
                )}

                {/* Similarity Score */}
                <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs font-medium px-2 py-1 rounded">
                  {similarityToPercent(artist.similarity_score)}% match
                </div>
              </div>

              {/* Artist Info */}
              <div className="p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-medium text-sm text-ink truncate">
                      {artist.artist_name}
                    </h3>
                    {artist.instagram_handle && (
                      <p className="text-[12px] text-gray-500 truncate">
                        @{artist.instagram_handle}
                      </p>
                    )}
                  </div>

                  {/* Badges */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {artist.is_pro && (
                      <Crown className="w-4 h-4 text-amber-500" />
                    )}
                    {artist.is_featured && (
                      <Star className="w-4 h-4 text-blue-500 fill-current" />
                    )}
                  </div>
                </div>

                {/* Location */}
                {(artist.city || artist.state) && (
                  <p className="text-[11px] text-gray-400">
                    {[artist.city, artist.state].filter(Boolean).join(', ')}
                  </p>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1">
                  {/* Copy Handle */}
                  {artist.instagram_handle && (
                    <button
                      onClick={() => copyHandle(artist.instagram_handle!)}
                      className="flex items-center gap-1 px-2 py-1 text-[11px] text-gray-600 hover:text-ink hover:bg-gray-100 rounded transition-colors"
                    >
                      {copiedHandle === artist.instagram_handle ? (
                        <>
                          <Check className="w-3 h-3 text-green-600" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  )}

                  {/* Instagram Link */}
                  {artist.instagram_handle && (
                    <a
                      href={`https://instagram.com/${artist.instagram_handle}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-2 py-1 text-[11px] text-gray-600 hover:text-ink hover:bg-gray-100 rounded transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>IG</span>
                    </a>
                  )}

                  {/* Featured Toggle */}
                  <button
                    onClick={() => toggleFeatured(artist)}
                    disabled={updatingIds.has(artist.artist_id)}
                    className={`ml-auto flex items-center gap-1 px-2 py-1 text-[11px] rounded transition-colors ${
                      artist.is_featured
                        ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                        : 'text-gray-600 hover:text-ink hover:bg-gray-100'
                    } disabled:opacity-50`}
                  >
                    <Star
                      className={`w-3 h-3 ${
                        artist.is_featured ? 'fill-current' : ''
                      }`}
                    />
                    <span>{artist.is_featured ? 'Featured' : 'Feature'}</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      {artists.length > 0 && (
        <div className="text-[12px] text-gray-500 text-right">
          Showing {artists.length} artists for{' '}
          <span className="font-medium">{currentStyle?.display_name}</span>
        </div>
      )}
    </div>
  );
}
