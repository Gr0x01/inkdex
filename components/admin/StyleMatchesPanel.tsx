'use client';

import { useState } from 'react';
import { Search, Shuffle, Copy, Check, RefreshCw, ExternalLink, Users } from 'lucide-react';
import AdminSelect from './AdminSelect';
import { DISPLAY_STYLES, STYLE_DISPLAY_NAMES } from '@/lib/constants/styles';

interface ArtistMatch {
  id: string;
  name: string;
  slug: string;
  instagram_handle: string;
  follower_count: number;
  city: string;
  state: string;
  profile_url: string;
  image_count: number;
  top_styles: string[];
  similarity?: number;
}

interface StyleMatchResult {
  seed: ArtistMatch;
  matches: ArtistMatch[];
  story_copy: string;
}

const FOLLOWER_RANGES = [
  { value: 'any', label: 'Any', min: 0, max: null },
  { value: '5k-10k', label: '5K–10K', min: 5000, max: 10000 },
  { value: '10k-25k', label: '10K–25K', min: 10000, max: 25000 },
  { value: '25k-50k', label: '25K–50K', min: 25000, max: 50000 },
  { value: '50k-100k', label: '50K–100K', min: 50000, max: 100000 },
  { value: '100k+', label: '100K+', min: 100000, max: null },
];

const STYLE_OPTIONS = Array.from(DISPLAY_STYLES).map((style) => ({
  value: style,
  label: STYLE_DISPLAY_NAMES[style] || style,
}));

function formatFollowers(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(0)}K`;
  return count.toString();
}

export default function StyleMatchesPanel() {
  const [mode, setMode] = useState<'style' | 'artist'>('style');
  const [style, setStyle] = useState('traditional');
  const [artistSlug, setArtistSlug] = useState('');
  const [seedFollowerRange, setSeedFollowerRange] = useState('100k+');
  const [matchFollowerRange, setMatchFollowerRange] = useState('10k-25k');
  const [matchCount, setMatchCount] = useState(4);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<StyleMatchResult | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSearch = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    const seedRange = FOLLOWER_RANGES.find((r) => r.value === seedFollowerRange);
    const matchRange = FOLLOWER_RANGES.find((r) => r.value === matchFollowerRange);
    if (!matchRange) return;

    try {
      const body: Record<string, unknown> = {
        min_followers: matchRange.min,
        max_followers: matchRange.max,
        match_count: matchCount,
      };

      if (mode === 'artist' && artistSlug) {
        body.artist_slug = artistSlug.toLowerCase().trim();
      } else {
        body.style = style;
        // For style mode, also pass seed follower range
        if (seedRange) {
          body.seed_min_followers = seedRange.min;
          body.seed_max_followers = seedRange.max;
        }
      }

      const res = await fetch('/api/admin/marketing/style-matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to find matches');
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!result?.story_copy) return;
    await navigator.clipboard.writeText(result.story_copy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-paper border border-ink/10 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-sm font-semibold text-ink">Style Matches</h2>
        <div className="flex items-center gap-1 bg-gray-100 p-0.5 text-[11px]">
          <button
            onClick={() => setMode('style')}
            className={`px-2 py-1 transition-colors ${
              mode === 'style' ? 'bg-paper text-ink' : 'text-gray-500 hover:text-ink'
            }`}
          >
            By Style
          </button>
          <button
            onClick={() => setMode('artist')}
            className={`px-2 py-1 transition-colors ${
              mode === 'artist' ? 'bg-paper text-ink' : 'text-gray-500 hover:text-ink'
            }`}
          >
            By Artist
          </button>
        </div>
      </div>

      {/* Search Controls */}
      <div className="flex flex-wrap items-end gap-3">
        {mode === 'style' ? (
          <>
            <div className="w-32">
              <label className="block text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-1">
                Style
              </label>
              <AdminSelect
                value={style}
                onChange={setStyle}
                options={STYLE_OPTIONS}
                className="w-full"
              />
            </div>
            <div className="w-28">
              <label className="block text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-1">
                Seed Followers
              </label>
              <AdminSelect
                value={seedFollowerRange}
                onChange={setSeedFollowerRange}
                options={FOLLOWER_RANGES.map((r) => ({ value: r.value, label: r.label }))}
                className="w-full"
              />
            </div>
          </>
        ) : (
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-1">
              Artist Slug
            </label>
            <input
              type="text"
              value={artistSlug}
              onChange={(e) => setArtistSlug(e.target.value)}
              placeholder="e.g. bang-bang"
              className="w-full px-2 py-1.5 bg-paper border border-ink/10 text-[13px] font-body
                       focus:outline-none focus:border-ink/30 transition-colors"
            />
          </div>
        )}

        <div className="w-28">
          <label className="block text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-1">
            Match Followers
          </label>
          <AdminSelect
            value={matchFollowerRange}
            onChange={setMatchFollowerRange}
            options={FOLLOWER_RANGES.map((r) => ({ value: r.value, label: r.label }))}
            className="w-full"
          />
        </div>

        <div className="w-16">
          <label className="block text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-1">
            Matches
          </label>
          <AdminSelect
            value={matchCount.toString()}
            onChange={(v) => setMatchCount(parseInt(v))}
            options={[
              { value: '4', label: '4' },
              { value: '5', label: '5' },
              { value: '6', label: '6' },
            ]}
            className="w-full"
          />
        </div>

        <button
          onClick={handleSearch}
          disabled={loading || (mode === 'artist' && !artistSlug)}
          className="h-[30px] flex items-center gap-1.5 px-4 bg-ink text-paper text-[13px] font-body
                   hover:bg-gray-800 transition-colors disabled:opacity-50"
        >
          {loading ? (
            <RefreshCw className="w-3 h-3 animate-spin" />
          ) : mode === 'style' ? (
            <Shuffle className="w-3 h-3" />
          ) : (
            <Search className="w-3 h-3" />
          )}
          {mode === 'style' ? 'Random' : 'Find'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="text-status-error text-[12px] font-body">{error}</div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4 pt-2 border-t border-ink/10">
          {/* Artist Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
            {/* Seed Artist */}
            <ArtistCard artist={result.seed} isSeed />

            {/* Matches */}
            {result.matches.map((match) => (
              <ArtistCard key={match.id} artist={match} />
            ))}
          </div>

          {/* Story Copy */}
          <div className="bg-gray-50 p-3 relative">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">
                Story Copy
              </span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-ink transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    Copy
                  </>
                )}
              </button>
            </div>
            <pre className="text-[12px] font-body text-ink whitespace-pre-wrap">
              {result.story_copy}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

function ArtistCard({ artist, isSeed = false }: { artist: ArtistMatch; isSeed?: boolean }) {
  return (
    <div
      className={`p-3 border ${
        isSeed ? 'border-ink bg-ink/5' : 'border-ink/10'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <div className="text-[13px] font-body font-medium text-ink truncate">
            {artist.name}
          </div>
          <a
            href={`https://instagram.com/${artist.instagram_handle}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-gray-500 hover:text-ink transition-colors truncate block"
          >
            @{artist.instagram_handle}
          </a>
        </div>
        {isSeed && (
          <span className="text-[9px] font-mono bg-ink text-paper px-1.5 py-0.5 uppercase flex-shrink-0">
            Seed
          </span>
        )}
      </div>

      <div className="space-y-1 text-[11px] text-gray-600">
        <div className="flex items-center gap-1">
          <Users className="w-3 h-3" />
          {formatFollowers(artist.follower_count)}
        </div>
        {artist.city && (
          <div className="truncate">
            {artist.city}{artist.state ? `, ${artist.state}` : ''}
          </div>
        )}
        <div className="flex flex-wrap gap-1 mt-1">
          {artist.top_styles.slice(0, 2).map((s) => (
            <span
              key={s}
              className="text-[9px] bg-gray-100 text-gray-600 px-1.5 py-0.5"
            >
              {STYLE_DISPLAY_NAMES[s] || s}
            </span>
          ))}
        </div>
      </div>

      <a
        href={artist.profile_url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 flex items-center gap-1 text-[10px] text-gray-500 hover:text-ink transition-colors"
      >
        <ExternalLink className="w-2.5 h-2.5" />
        View Profile
      </a>
    </div>
  );
}
