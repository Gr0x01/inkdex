'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Crown,
  ExternalLink,
  Eye,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Ban,
} from 'lucide-react';
import Link from 'next/link';
import AdminSelect from './AdminSelect';
import AdminLocationSelect from './AdminLocationSelect';

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
  is_blacklisted: boolean;
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
  const [locationFilter, setLocationFilter] = useState('');
  const [tierFilter, setTierFilter] = useState<string>('');
  const [isFeaturedFilter, setIsFeaturedFilter] = useState<string>('');
  const [hasImagesFilter, setHasImagesFilter] = useState<string>('');
  const [minFollowers, setMinFollowers] = useState<string>('');
  const [maxFollowers, setMaxFollowers] = useState<string>('');
  const [minImages, setMinImages] = useState<string>('');
  const [maxImages, setMaxImages] = useState<string>('');
  const [showBlacklisted, setShowBlacklisted] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<string>('instagram_handle');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkUpdating, setBulkUpdating] = useState(false);

  const fetchArtists = useCallback(async () => {
    setLoading(true);

    const params = new URLSearchParams({
      page: pagination.page.toString(),
      limit: pagination.limit.toString(),
    });

    if (search) params.set('search', search);
    if (locationFilter) params.set('location', locationFilter);
    if (tierFilter) params.set('tier', tierFilter);
    if (isFeaturedFilter) params.set('is_featured', isFeaturedFilter);
    if (hasImagesFilter) params.set('has_images', hasImagesFilter);
    if (minFollowers) params.set('min_followers', minFollowers);
    if (maxFollowers) params.set('max_followers', maxFollowers);
    if (minImages) params.set('min_images', minImages);
    if (maxImages) params.set('max_images', maxImages);
    if (showBlacklisted) params.set('show_blacklisted', 'true');
    if (sortBy) params.set('sort_by', sortBy);
    if (sortOrder) params.set('sort_order', sortOrder);

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
  }, [pagination.page, pagination.limit, search, locationFilter, tierFilter, isFeaturedFilter, hasImagesFilter, minFollowers, maxFollowers, minImages, maxImages, showBlacklisted, sortBy, sortOrder]);

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
    // New international URL format: /us/tx/austin (artist pages are at /artist/[slug])
    return `/artist/${artist.slug}`;
  };

  const toggleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
    setPagination((p) => ({ ...p, page: 1 }));
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortBy !== column) {
      return <ArrowUpDown className="w-3 h-3 text-gray-300" />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-ink" />
    ) : (
      <ArrowDown className="w-3 h-3 text-ink" />
    );
  };

  return (
    <div className="space-y-3 text-[13px]">
      {/* Search and Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search name or @handle..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-paper border border-ink/10
                       text-ink font-body text-[13px] placeholder-gray-400
                       focus:outline-none focus:border-ink/30 transition-colors"
          />
        </div>

        <AdminLocationSelect
          value={locationFilter}
          onChange={(val) => {
            setLocationFilter(val);
            setPagination((p) => ({ ...p, page: 1 }));
          }}
          className="w-36"
        />

        <AdminSelect
          value={tierFilter}
          onChange={(val) => {
            setTierFilter(val);
            setPagination((p) => ({ ...p, page: 1 }));
          }}
          options={[
            { value: '', label: 'All' },
            { value: 'unclaimed', label: 'Unclaimed' },
            { value: 'free', label: 'Free' },
            { value: 'pro', label: 'Pro' },
          ]}
          className="w-28"
        />

        <AdminSelect
          value={isFeaturedFilter}
          onChange={(val) => {
            setIsFeaturedFilter(val);
            setPagination((p) => ({ ...p, page: 1 }));
          }}
          options={[
            { value: '', label: 'Any' },
            { value: 'true', label: 'Featured' },
            { value: 'false', label: 'Not Featured' },
          ]}
          className="w-28"
        />

        <AdminSelect
          value={hasImagesFilter}
          onChange={(val) => {
            setHasImagesFilter(val);
            setPagination((p) => ({ ...p, page: 1 }));
          }}
          options={[
            { value: '', label: 'Images' },
            { value: 'true', label: 'Has Images' },
            { value: 'false', label: 'No Images' },
          ]}
          className="w-28"
        />

        <div className="w-px h-4 bg-ink/10" />

        <label className="flex items-center gap-1.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showBlacklisted}
            onChange={(e) => {
              setShowBlacklisted(e.target.checked);
              setPagination((p) => ({ ...p, page: 1 }));
            }}
            className="w-3.5 h-3.5 border border-ink/30 bg-paper
                       text-ink focus:ring-0 focus:ring-offset-0
                       checked:bg-ink checked:border-ink"
          />
          <span className="text-[11px] text-gray-500 font-body">Show Blacklisted</span>
        </label>
      </div>

      {/* Range Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-gray-400 font-mono uppercase">Followers</span>
          <input
            type="number"
            placeholder="Min"
            value={minFollowers}
            onChange={(e) => {
              setMinFollowers(e.target.value);
              setPagination((p) => ({ ...p, page: 1 }));
            }}
            className="w-20 px-2 py-1 bg-paper border border-ink/10 text-ink font-mono text-[11px]
                       placeholder-gray-400 focus:outline-none focus:border-ink/30"
          />
          <span className="text-gray-400">–</span>
          <input
            type="number"
            placeholder="Max"
            value={maxFollowers}
            onChange={(e) => {
              setMaxFollowers(e.target.value);
              setPagination((p) => ({ ...p, page: 1 }));
            }}
            className="w-20 px-2 py-1 bg-paper border border-ink/10 text-ink font-mono text-[11px]
                       placeholder-gray-400 focus:outline-none focus:border-ink/30"
          />
        </div>

        <div className="w-px h-4 bg-ink/10" />

        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-gray-400 font-mono uppercase">Images</span>
          <input
            type="number"
            placeholder="Min"
            value={minImages}
            onChange={(e) => {
              setMinImages(e.target.value);
              setPagination((p) => ({ ...p, page: 1 }));
            }}
            className="w-16 px-2 py-1 bg-paper border border-ink/10 text-ink font-mono text-[11px]
                       placeholder-gray-400 focus:outline-none focus:border-ink/30"
          />
          <span className="text-gray-400">–</span>
          <input
            type="number"
            placeholder="Max"
            value={maxImages}
            onChange={(e) => {
              setMaxImages(e.target.value);
              setPagination((p) => ({ ...p, page: 1 }));
            }}
            className="w-16 px-2 py-1 bg-paper border border-ink/10 text-ink font-mono text-[11px]
                       placeholder-gray-400 focus:outline-none focus:border-ink/30"
          />
        </div>

        {(minFollowers || maxFollowers || minImages || maxImages) && (
          <button
            onClick={() => {
              setMinFollowers('');
              setMaxFollowers('');
              setMinImages('');
              setMaxImages('');
              setPagination((p) => ({ ...p, page: 1 }));
            }}
            className="text-[10px] text-gray-400 hover:text-ink font-mono uppercase transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 px-2.5 py-1.5 bg-status-warning/10 border border-status-warning/30">
          <span className="text-status-warning text-[13px] font-body">
            {selectedIds.size} selected
          </span>
          <button
            onClick={() => handleBulkUpdate(true)}
            disabled={bulkUpdating}
            className="px-2 py-1 bg-ink text-paper text-[12px] font-body
                       hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            Feature
          </button>
          <button
            onClick={() => handleBulkUpdate(false)}
            disabled={bulkUpdating}
            className="px-2 py-1 bg-paper border border-ink/20 text-ink text-[12px] font-body
                       hover:border-ink/40 disabled:opacity-50 transition-colors"
          >
            Unfeature
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-gray-500 hover:text-ink text-[12px] font-body transition-colors"
          >
            Clear
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-paper border border-ink/10 overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-ink/10 bg-gray-50">
              <th className="w-10 py-2 text-center bg-gray-50">
                <input
                  type="checkbox"
                  checked={selectedIds.size === artists.length && artists.length > 0}
                  onChange={toggleSelectAll}
                  className="w-3.5 h-3.5 border border-ink/30 bg-paper
                             text-ink focus:ring-0 focus:ring-offset-0
                             checked:bg-ink checked:border-ink"
                />
              </th>
              <th
                onClick={() => toggleSort('instagram_handle')}
                className="px-2 py-2 text-left font-mono text-[10px] uppercase tracking-wider text-gray-500 bg-gray-50 cursor-pointer hover:text-ink select-none"
              >
                <span className="flex items-center gap-1">
                  Artist
                  <SortIcon column="instagram_handle" />
                </span>
              </th>
              <th
                onClick={() => toggleSort('city')}
                className="px-2 py-2 text-left font-mono text-[10px] uppercase tracking-wider text-gray-500 bg-gray-50 cursor-pointer hover:text-ink select-none"
              >
                <span className="flex items-center gap-1">
                  Location
                  <SortIcon column="city" />
                </span>
              </th>
              <th
                onClick={() => toggleSort('verification_status')}
                className="px-2 py-2 text-center font-mono text-[10px] uppercase tracking-wider text-gray-500 bg-gray-50 cursor-pointer hover:text-ink select-none"
              >
                <span className="flex items-center justify-center gap-1">
                  Status
                  <SortIcon column="verification_status" />
                </span>
              </th>
              <th
                onClick={() => toggleSort('follower_count')}
                className="px-2 py-2 text-right font-mono text-[10px] uppercase tracking-wider text-gray-500 bg-gray-50 cursor-pointer hover:text-ink select-none"
              >
                <span className="flex items-center justify-end gap-1">
                  Followers
                  <SortIcon column="follower_count" />
                </span>
              </th>
              <th
                onClick={() => toggleSort('image_count')}
                className="px-2 py-2 text-right font-mono text-[10px] uppercase tracking-wider text-gray-500 bg-gray-50 cursor-pointer hover:text-ink select-none"
              >
                <span className="flex items-center justify-end gap-1">
                  Imgs
                  <SortIcon column="image_count" />
                </span>
              </th>
              <th className="px-2 py-2 w-24 bg-gray-50"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-2 py-6 text-center text-gray-500 font-body text-[13px]">
                  Loading...
                </td>
              </tr>
            ) : artists.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-2 py-6 text-center text-gray-500 font-body text-[13px]">
                  No artists found
                </td>
              </tr>
            ) : (
              artists.map((artist) => (
                <tr
                  key={artist.id}
                  className="border-b border-ink/5 hover:bg-gray-50/50 transition-colors"
                >
                  <td className="w-10 py-1.5 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(artist.id)}
                      onChange={() => toggleSelect(artist.id)}
                      className="w-3.5 h-3.5 border border-ink/30 bg-paper
                                 text-ink focus:ring-0 focus:ring-offset-0
                                 checked:bg-ink checked:border-ink"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <div className="flex items-center gap-1">
                      {artist.is_blacklisted && (
                        <span title="Blacklisted">
                          <Ban className="w-3 h-3 text-status-error shrink-0" />
                        </span>
                      )}
                      <Link
                        href={`/admin/artists/${artist.id}`}
                        className="text-ink text-[13px] font-medium truncate hover:underline"
                      >
                        @{artist.instagram_handle}
                      </Link>
                      {artist.is_pro && (
                        <Crown className="w-2.5 h-2.5 text-status-warning shrink-0" />
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-1.5">
                    <span className="text-ink text-[13px]">
                      {artist.city}, {artist.state}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <span
                      className={`px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wide ${
                        artist.verification_status === 'claimed'
                          ? 'bg-status-success/10 text-status-success'
                          : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      {artist.verification_status}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono text-[12px] text-gray-500 tabular-nums">
                    {artist.follower_count?.toLocaleString() || '—'}
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono text-[13px] text-ink tabular-nums">
                    {artist.image_count}
                  </td>
                  <td className="px-2 py-1">
                    <div className="flex items-center justify-end gap-4">
                      <Link
                        href={`/admin/artists/${artist.id}`}
                        className="p-2 text-gray-300 hover:text-ink transition-colors"
                        title="View artist"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      <a
                        href={getProfileUrl(artist)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-gray-300 hover:text-ink transition-colors"
                        title="View profile"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-[12px]">
        <span className="text-gray-500 font-body">
          <span className="font-mono text-ink">
            {(pagination.page - 1) * pagination.limit + 1}
          </span>
          –
          <span className="font-mono text-ink">
            {Math.min(pagination.page * pagination.limit, pagination.total)}
          </span>
          {' '}of{' '}
          <span className="font-mono text-ink">
            {pagination.total.toLocaleString()}
          </span>
        </span>

        <div className="flex items-center gap-0.5">
          <button
            onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
            disabled={pagination.page <= 1}
            className="p-1 bg-paper border border-ink/10 hover:border-ink/30
                       text-ink disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="text-gray-500 font-body px-2">
            <span className="font-mono text-ink">{pagination.page}</span>
            /<span className="font-mono text-ink">{pagination.totalPages}</span>
          </span>
          <button
            onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
            disabled={pagination.page >= pagination.totalPages}
            className="p-1 bg-paper border border-ink/10 hover:border-ink/30
                       text-ink disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
