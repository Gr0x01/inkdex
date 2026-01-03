'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Star,
  Crown,
  ExternalLink,
  Check,
} from 'lucide-react';

interface Artist {
  id: string;
  name: string;
  instagram_handle: string;
  city: string;
  state: string;
  is_featured: boolean;
  is_pro: boolean;
  verification_status: string;
  follower_count: number | null;
  image_count: number;
  slug: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function ArtistTable() {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [isProFilter, setIsProFilter] = useState<string>('');
  const [isFeaturedFilter, setIsFeaturedFilter] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());
  const [bulkUpdating, setBulkUpdating] = useState(false);

  const fetchArtists = useCallback(async () => {
    setLoading(true);

    const params = new URLSearchParams({
      page: pagination.page.toString(),
      limit: pagination.limit.toString(),
    });

    if (search) params.set('search', search);
    if (cityFilter) params.set('city', cityFilter);
    if (isProFilter) params.set('is_pro', isProFilter);
    if (isFeaturedFilter) params.set('is_featured', isFeaturedFilter);

    try {
      const response = await fetch(`/api/admin/artists?${params}`);
      if (!response.ok) throw new Error('Failed to fetch artists');

      const data = await response.json();
      setArtists(data.artists);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Failed to fetch artists:', error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search, cityFilter, isProFilter, isFeaturedFilter]);

  useEffect(() => {
    fetchArtists();
  }, [fetchArtists]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPagination((p) => ({ ...p, page: 1 }));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const toggleFeatured = async (artist: Artist) => {
    setUpdatingIds((prev) => new Set(prev).add(artist.id));

    try {
      const response = await fetch(`/api/admin/artists/${artist.id}/featured`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_featured: !artist.is_featured }),
      });

      if (!response.ok) throw new Error('Failed to update');

      setArtists((prev) =>
        prev.map((a) =>
          a.id === artist.id ? { ...a, is_featured: !a.is_featured } : a
        )
      );
    } catch (error) {
      console.error('Failed to toggle featured:', error);
    } finally {
      setUpdatingIds((prev) => {
        const next = new Set(prev);
        next.delete(artist.id);
        return next;
      });
    }
  };

  const handleBulkUpdate = async (is_featured: boolean) => {
    if (selectedIds.size === 0) return;

    setBulkUpdating(true);

    try {
      const response = await fetch('/api/admin/artists/bulk-featured', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          artistIds: Array.from(selectedIds),
          is_featured,
        }),
      });

      if (!response.ok) throw new Error('Failed to bulk update');

      // Update local state
      setArtists((prev) =>
        prev.map((a) =>
          selectedIds.has(a.id) ? { ...a, is_featured } : a
        )
      );
      setSelectedIds(new Set());
    } catch (error) {
      console.error('Failed to bulk update:', error);
    } finally {
      setBulkUpdating(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === artists.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(artists.map((a) => a.id)));
    }
  };

  const getProfileUrl = (artist: Artist) => {
    const stateSlug = artist.state?.toLowerCase().replace(/\s+/g, '-') || 'unknown';
    const citySlug = artist.city?.toLowerCase().replace(/\s+/g, '-') || 'unknown';
    return `/${stateSlug}/${citySlug}/artists/${artist.slug}`;
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
          <input
            type="text"
            placeholder="Search by name or @handle..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg
                       text-white placeholder-neutral-500
                       focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
          />
        </div>

        <input
          type="text"
          placeholder="City..."
          value={cityFilter}
          onChange={(e) => {
            setCityFilter(e.target.value);
            setPagination((p) => ({ ...p, page: 1 }));
          }}
          className="w-32 px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg
                     text-white placeholder-neutral-500 text-sm
                     focus:outline-none focus:ring-2 focus:ring-amber-500/50"
        />

        <select
          value={isProFilter}
          onChange={(e) => {
            setIsProFilter(e.target.value);
            setPagination((p) => ({ ...p, page: 1 }));
          }}
          className="px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg
                     text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
        >
          <option value="">All Tiers</option>
          <option value="true">Pro Only</option>
          <option value="false">Free Only</option>
        </select>

        <select
          value={isFeaturedFilter}
          onChange={(e) => {
            setIsFeaturedFilter(e.target.value);
            setPagination((p) => ({ ...p, page: 1 }));
          }}
          className="px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg
                     text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
        >
          <option value="">All Status</option>
          <option value="true">Featured Only</option>
          <option value="false">Not Featured</option>
        </select>
      </div>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
          <span className="text-amber-500 text-sm">
            {selectedIds.size} artist{selectedIds.size !== 1 ? 's' : ''} selected
          </span>
          <button
            onClick={() => handleBulkUpdate(true)}
            disabled={bulkUpdating}
            className="px-3 py-1.5 bg-amber-500 text-black text-sm font-medium rounded-lg
                       hover:bg-amber-400 disabled:opacity-50 transition-colors"
          >
            Feature Selected
          </button>
          <button
            onClick={() => handleBulkUpdate(false)}
            disabled={bulkUpdating}
            className="px-3 py-1.5 bg-neutral-700 text-white text-sm font-medium rounded-lg
                       hover:bg-neutral-600 disabled:opacity-50 transition-colors"
          >
            Unfeature Selected
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-neutral-400 hover:text-white text-sm transition-colors"
          >
            Clear
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-neutral-800">
              <th className="px-4 py-3 w-10">
                <input
                  type="checkbox"
                  checked={selectedIds.size === artists.length && artists.length > 0}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded border-neutral-600 bg-neutral-800
                             text-amber-500 focus:ring-amber-500/50"
                />
              </th>
              <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-neutral-500 font-medium">
                Artist
              </th>
              <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-neutral-500 font-medium">
                Location
              </th>
              <th className="px-4 py-3 text-center text-xs uppercase tracking-wider text-neutral-500 font-medium">
                Status
              </th>
              <th className="px-4 py-3 text-right text-xs uppercase tracking-wider text-neutral-500 font-medium">
                Images
              </th>
              <th className="px-4 py-3 text-center text-xs uppercase tracking-wider text-neutral-500 font-medium">
                Featured
              </th>
              <th className="px-4 py-3 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-neutral-500">
                  Loading...
                </td>
              </tr>
            ) : artists.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-neutral-500">
                  No artists found
                </td>
              </tr>
            ) : (
              artists.map((artist) => (
                <tr
                  key={artist.id}
                  className="border-b border-neutral-800/50 hover:bg-neutral-800/30 transition-colors"
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(artist.id)}
                      onChange={() => toggleSelect(artist.id)}
                      className="w-4 h-4 rounded border-neutral-600 bg-neutral-800
                                 text-amber-500 focus:ring-amber-500/50"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium">{artist.name}</span>
                          {artist.is_pro && (
                            <Crown className="w-4 h-4 text-amber-500" />
                          )}
                        </div>
                        <span className="text-neutral-500 text-sm">
                          @{artist.instagram_handle}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-neutral-300">
                      {artist.city}, {artist.state}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`px-2 py-0.5 text-xs font-medium rounded ${
                        artist.verification_status === 'claimed'
                          ? 'bg-green-500/10 text-green-500'
                          : 'bg-neutral-500/10 text-neutral-500'
                      }`}
                    >
                      {artist.verification_status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-neutral-300 tabular-nums">
                    {artist.image_count}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggleFeatured(artist)}
                      disabled={updatingIds.has(artist.id)}
                      className={`p-2 rounded-lg transition-colors ${
                        artist.is_featured
                          ? 'bg-amber-500/20 text-amber-500 hover:bg-amber-500/30'
                          : 'bg-neutral-800 text-neutral-500 hover:text-white hover:bg-neutral-700'
                      } disabled:opacity-50`}
                      title={artist.is_featured ? 'Remove from featured' : 'Add to featured'}
                    >
                      {updatingIds.has(artist.id) ? (
                        <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : artist.is_featured ? (
                        <Star className="w-5 h-5 fill-current" />
                      ) : (
                        <Star className="w-5 h-5" />
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <a
                      href={getProfileUrl(artist)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-neutral-500 hover:text-white transition-colors inline-block"
                      title="View profile"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-neutral-500">
          Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
          {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
          {pagination.total.toLocaleString()} artists
        </span>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
            disabled={pagination.page <= 1}
            className="p-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg
                       text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-sm text-neutral-400 px-3">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
            disabled={pagination.page >= pagination.totalPages}
            className="p-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg
                       text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
