'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Copy, Check, ExternalLink, Search } from 'lucide-react';

interface ArtistResult {
  artist_id: string;
  name: string;
  instagram_handle: string | null;
  city: string | null;
  state: string | null;
  follower_count: number | null;
  claimed_at: string | null;
  percentage: number;
  image_count: number;
}

interface StyleOption {
  style_name: string;
  display_name: string;
}

const STYLE_DISPLAY_NAMES: Record<string, string> = {
  'traditional': 'Traditional',
  'neo-traditional': 'Neo-Traditional',
  'fine-line': 'Fine Line',
  'blackwork': 'Blackwork',
  'geometric': 'Geometric',
  'realism': 'Realism',
  'japanese': 'Japanese',
  'watercolor': 'Watercolor',
  'dotwork': 'Dotwork',
  'tribal': 'Tribal',
  'illustrative': 'Illustrative',
  'surrealism': 'Surrealism',
  'minimalist': 'Minimalist',
  'lettering': 'Lettering',
  'new-school': 'New School',
  'trash-polka': 'Trash Polka',
  'chicano': 'Chicano',
  'biomechanical': 'Biomechanical',
  'ornamental': 'Ornamental',
  'sketch': 'Sketch',
};

export default function StyleArtistFinder() {
  const [styles, setStyles] = useState<StyleOption[]>([]);
  const [selectedStyle, setSelectedStyle] = useState<string>('');
  const [minPercentage, setMinPercentage] = useState<number>(40);
  const [unclaimedOnly, setUnclaimedOnly] = useState<boolean>(true);
  const [artists, setArtists] = useState<ArtistResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingStyles, setLoadingStyles] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedHandle, setCopiedHandle] = useState<string | null>(null);

  // Fetch available styles
  useEffect(() => {
    async function fetchStyles() {
      try {
        const response = await fetch('/api/admin/styles/profiles/styles');
        if (!response.ok) throw new Error('Failed to fetch styles');
        const data = await response.json();
        setStyles(data.styles || []);
        if (data.styles?.length > 0) {
          setSelectedStyle(data.styles[0].style_name);
        }
      } catch (err) {
        console.error('Failed to fetch styles:', err);
      } finally {
        setLoadingStyles(false);
      }
    }
    fetchStyles();
  }, []);

  // Search for artists
  const searchArtists = useCallback(async () => {
    if (!selectedStyle) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        style: selectedStyle,
        min_percentage: minPercentage.toString(),
        unclaimed_only: unclaimedOnly.toString(),
        limit: '50',
      });

      const response = await fetch(`/api/admin/styles/profiles/search?${params}`);
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to search');
      }

      const data = await response.json();
      setArtists(data.artists || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
      setArtists([]);
    } finally {
      setLoading(false);
    }
  }, [selectedStyle, minPercentage, unclaimedOnly]);

  // Copy handle
  const copyHandle = async (handle: string) => {
    try {
      await navigator.clipboard.writeText(`@${handle}`);
      setCopiedHandle(handle);
      setTimeout(() => setCopiedHandle(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Copy all handles
  const copyAllHandles = async () => {
    const handles = artists
      .filter((a) => a.instagram_handle)
      .map((a) => `@${a.instagram_handle}`)
      .join('\n');
    try {
      await navigator.clipboard.writeText(handles);
      setCopiedHandle('__all__');
      setTimeout(() => setCopiedHandle(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (loadingStyles) {
    return (
      <div className="flex items-center justify-center h-32">
        <RefreshCw className="w-4 h-4 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex flex-wrap items-end gap-4">
          {/* Style Selector */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[12px] text-gray-500 mb-1">Style</label>
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

          {/* Min Percentage */}
          <div className="w-32">
            <label className="block text-[12px] text-gray-500 mb-1">
              Min % ({minPercentage}%)
            </label>
            <input
              type="range"
              min="10"
              max="80"
              step="5"
              value={minPercentage}
              onChange={(e) => setMinPercentage(parseInt(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Unclaimed Only */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="unclaimed"
              checked={unclaimedOnly}
              onChange={(e) => setUnclaimedOnly(e.target.checked)}
              className="rounded border-gray-300"
            />
            <label htmlFor="unclaimed" className="text-sm text-gray-600">
              Unclaimed only
            </label>
          </div>

          {/* Search Button */}
          <button
            onClick={searchArtists}
            disabled={loading || !selectedStyle}
            className="px-4 py-2 bg-ink text-white rounded-lg text-sm font-medium hover:bg-ink/90 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            Search
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Results */}
      {artists.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <span className="text-sm text-gray-600">
              {artists.length} artists found ({minPercentage}%+ {STYLE_DISPLAY_NAMES[selectedStyle] || selectedStyle})
            </span>
            <button
              onClick={copyAllHandles}
              className="text-sm text-ink hover:underline flex items-center gap-1"
            >
              {copiedHandle === '__all__' ? (
                <>
                  <Check className="w-3 h-3" /> Copied all
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" /> Copy all handles
                </>
              )}
            </button>
          </div>

          {/* Table */}
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-4 py-2 font-medium text-gray-600">Artist</th>
                <th className="px-4 py-2 font-medium text-gray-600">Location</th>
                <th className="px-4 py-2 font-medium text-gray-600 text-right">Style %</th>
                <th className="px-4 py-2 font-medium text-gray-600 text-right">Images</th>
                <th className="px-4 py-2 font-medium text-gray-600 text-right">Followers</th>
                <th className="px-4 py-2 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {artists.map((artist) => (
                <tr key={artist.artist_id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <div>
                      <div className="font-medium text-ink">{artist.name}</div>
                      {artist.instagram_handle && (
                        <div className="text-gray-500 text-[12px]">
                          @{artist.instagram_handle}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2 text-gray-600">
                    {[artist.city, artist.state].filter(Boolean).join(', ') || '-'}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <span className="font-medium text-ink">
                      {artist.percentage.toFixed(0)}%
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right text-gray-600">
                    {artist.image_count}
                  </td>
                  <td className="px-4 py-2 text-right text-gray-600">
                    {artist.follower_count?.toLocaleString() || '-'}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      {artist.instagram_handle && (
                        <>
                          <button
                            onClick={() => copyHandle(artist.instagram_handle!)}
                            className="p-1 text-gray-400 hover:text-ink"
                            title="Copy handle"
                          >
                            {copiedHandle === artist.instagram_handle ? (
                              <Check className="w-4 h-4 text-green-600" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                          <a
                            href={`https://instagram.com/${artist.instagram_handle}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 text-gray-400 hover:text-ink"
                            title="Open Instagram"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty State */}
      {!loading && artists.length === 0 && selectedStyle && (
        <div className="text-center py-8 text-gray-500">
          Click Search to find {STYLE_DISPLAY_NAMES[selectedStyle] || selectedStyle} artists
        </div>
      )}
    </div>
  );
}
