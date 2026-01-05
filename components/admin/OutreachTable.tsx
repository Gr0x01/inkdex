'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import {
  ExternalLink,
  Copy,
  Sparkles,
  Check,
  Send,
  MessageSquare,
  Crown,
  CheckCircle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Eye,
} from 'lucide-react';
import Link from 'next/link';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

interface OutreachRecord {
  id: string;
  artist_id: string;
  campaign_name: string;
  status: 'pending' | 'generated' | 'posted' | 'dm_sent' | 'claimed' | 'converted';
  post_text: string | null;
  post_images: string[] | null;
  generated_at: string | null;
  posted_at: string | null;
  dm_sent_at: string | null;
  claimed_at: string | null;
  created_at: string;
  artists: {
    id: string;
    name: string;
    instagram_handle: string;
    city: string | null;
    state: string | null;
    follower_count: number | null;
    slug: string;
  } | null;
}

interface OutreachTableProps {
  records: OutreachRecord[];
  onUpdateStatus: (id: string, status: string) => void;
  onGenerate: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  loading?: boolean;
}

const statusColors: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-600',
  generated: 'bg-blue-100 text-blue-700',
  posted: 'bg-purple-100 text-purple-700',
  dm_sent: 'bg-yellow-100 text-yellow-700',
  claimed: 'bg-green-100 text-green-700',
  converted: 'bg-emerald-200 text-emerald-800',
};

const statusLabels: Record<string, string> = {
  pending: 'Pending',
  generated: 'Ready',
  posted: 'Posted',
  dm_sent: 'DM Sent',
  claimed: 'Claimed',
  converted: 'Converted',
};

type SortColumn = 'instagram_handle' | 'follower_count' | 'status' | 'created_at';

export default function OutreachTable({
  records,
  onUpdateStatus,
  onGenerate,
  onDelete,
  loading,
}: OutreachTableProps) {
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortColumn>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    recordId: string;
    newStatus: string;
    title: string;
    message: string;
  }>({
    isOpen: false,
    recordId: '',
    newStatus: '',
    title: '',
    message: '',
  });

  // Delete confirmation dialog state
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    record: OutreachRecord | null;
  }>({
    isOpen: false,
    record: null,
  });

  // Escape HTML to prevent XSS
  const escapeHtml = (str: string) => {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  const copyForBuffer = async (record: OutreachRecord) => {
    const caption = record.post_text || '';
    const images = record.post_images || [];

    // Validate URLs before using them
    const safeImages = images.filter(url => {
      try {
        const parsed = new URL(url);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
      } catch {
        return false;
      }
    });

    // Create HTML with escaped content to prevent XSS
    const html = `<div>${escapeHtml(caption)}</div>${safeImages.map(url => `<img src="${escapeHtml(url)}">`).join('')}`;

    // Create plain text fallback
    const text = `${caption}\n\n${safeImages.join('\n')}`;

    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([text], { type: 'text/plain' }),
        }),
      ]);
    } catch {
      await navigator.clipboard.writeText(text);
    }

    setCopiedId(record.id);
    // Clear any existing timeout before setting a new one
    if (copyTimeoutRef.current) {
      clearTimeout(copyTimeoutRef.current);
    }
    copyTimeoutRef.current = setTimeout(() => setCopiedId(null), 2000);
  };

  const handleGenerate = async (id: string) => {
    setGeneratingId(id);
    try {
      await onGenerate(id);
    } finally {
      setGeneratingId(null);
    }
  };

  const showStatusConfirm = (record: OutreachRecord, newStatus: string) => {
    const artist = record.artists;
    if (!artist) return;

    const configs: Record<string, { title: string; message: string }> = {
      posted: {
        title: 'Mark as Posted',
        message: `Confirm that the post for @${artist.instagram_handle} has been published to Instagram.`,
      },
      dm_sent: {
        title: 'Mark DM Sent',
        message: `Confirm that the DM has been sent to @${artist.instagram_handle}.`,
      },
      claimed: {
        title: 'Mark as Claimed',
        message: `Confirm that @${artist.instagram_handle} has claimed their profile.`,
      },
      converted: {
        title: 'Mark as Converted',
        message: `Confirm that @${artist.instagram_handle} has converted to a paying customer.`,
      },
    };

    const config = configs[newStatus];
    if (!config) return;

    setConfirmDialog({
      isOpen: true,
      recordId: record.id,
      newStatus,
      title: config.title,
      message: config.message,
    });
  };

  const handleConfirmStatus = () => {
    onUpdateStatus(confirmDialog.recordId, confirmDialog.newStatus);
    setConfirmDialog({ ...confirmDialog, isOpen: false });
  };

  const handleDelete = async () => {
    if (!deleteDialog.record) return;
    setDeletingId(deleteDialog.record.id);
    setDeleteDialog({ isOpen: false, record: null });
    try {
      await onDelete(deleteDialog.record.id);
    } finally {
      setDeletingId(null);
    }
  };

  const toggleSort = (column: SortColumn) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const SortIcon = ({ column }: { column: SortColumn }) => {
    if (sortBy !== column) {
      return <ArrowUpDown className="w-3 h-3 text-gray-300" />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-ink" />
    ) : (
      <ArrowDown className="w-3 h-3 text-ink" />
    );
  };

  // Reset to page 1 when records change (e.g., tab switch)
  useEffect(() => {
    setPage(1);
  }, [records.length]);

  // Sort records - memoized for performance
  const statusOrder = ['pending', 'generated', 'posted', 'dm_sent', 'claimed', 'converted'];
  const sortedRecords = useMemo(() => {
    return [...records].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'instagram_handle':
          comparison = (a.artists?.instagram_handle || '').localeCompare(b.artists?.instagram_handle || '');
          break;
        case 'follower_count':
          comparison = (a.artists?.follower_count || 0) - (b.artists?.follower_count || 0);
          break;
        case 'status':
          comparison = statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status);
          break;
        case 'created_at':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [records, sortBy, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(sortedRecords.length / pageSize);
  const paginatedRecords = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedRecords.slice(start, start + pageSize);
  }, [sortedRecords, page, pageSize]);

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500 text-sm font-body">
        Loading outreach records...
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500 text-sm font-body">
        No outreach records found
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-ink/10 bg-gray-50">
              <th
                onClick={() => toggleSort('instagram_handle')}
                className="px-3 py-2 text-left font-mono text-[10px] uppercase tracking-wider text-gray-500 bg-gray-50 cursor-pointer hover:text-ink select-none"
              >
                <span className="flex items-center gap-1">
                  Artist
                  <SortIcon column="instagram_handle" />
                </span>
              </th>
              <th className="px-3 py-2 text-left font-mono text-[10px] uppercase tracking-wider text-gray-500 bg-gray-50">
                Location
              </th>
              <th
                onClick={() => toggleSort('follower_count')}
                className="px-3 py-2 text-right font-mono text-[10px] uppercase tracking-wider text-gray-500 bg-gray-50 w-20 cursor-pointer hover:text-ink select-none"
              >
                <span className="flex items-center justify-end gap-1">
                  Followers
                  <SortIcon column="follower_count" />
                </span>
              </th>
              <th
                onClick={() => toggleSort('status')}
                className="px-3 py-2 text-center font-mono text-[10px] uppercase tracking-wider text-gray-500 bg-gray-50 w-24 cursor-pointer hover:text-ink select-none"
              >
                <span className="flex items-center justify-center gap-1">
                  Status
                  <SortIcon column="status" />
                </span>
              </th>
              <th className="px-3 py-2 text-left font-mono text-[10px] uppercase tracking-wider text-gray-500 bg-gray-50">
                Caption
              </th>
              <th className="px-3 py-2 text-left font-mono text-[10px] uppercase tracking-wider text-gray-500 bg-gray-50 w-40">
                Images
              </th>
              <th className="px-3 py-2 bg-gray-50 w-44"></th>
            </tr>
          </thead>
          <tbody>
            {paginatedRecords.map((record) => {
              const artist = record.artists;
              if (!artist) return null;

              const isGenerating = generatingId === record.id;
              const isCopied = copiedId === record.id;
              const hasContent = record.post_text && record.post_images?.length;

              return (
                <tr
                  key={record.id}
                  className="border-b border-ink/5 hover:bg-gray-50/50 transition-colors"
                >
                  {/* Artist */}
                  <td className="px-3 py-2">
                    <a
                      href={`https://instagram.com/${artist.instagram_handle}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-ink font-medium hover:text-pink-600 transition-colors"
                      title="Open Instagram profile"
                    >
                      @{artist.instagram_handle}
                    </a>
                  </td>

                  {/* Location */}
                  <td className="px-3 py-2 text-gray-500 text-[12px]">
                    {artist.city}{artist.state && `, ${artist.state}`}
                  </td>

                  {/* Followers */}
                  <td className="px-3 py-2 text-right font-mono text-gray-600">
                    {artist.follower_count
                      ? `${(artist.follower_count / 1000).toFixed(1)}K`
                      : '—'}
                  </td>

                  {/* Status */}
                  <td className="px-3 py-2 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 text-[11px] font-mono ${
                        statusColors[record.status] || 'bg-gray-100'
                      }`}
                    >
                      {statusLabels[record.status] || record.status}
                    </span>
                  </td>

                  {/* Caption Preview */}
                  <td className="px-3 py-2 max-w-xs">
                    {record.post_text ? (
                      <p className="text-[12px] text-gray-600 line-clamp-2">
                        {record.post_text.slice(0, 120)}
                        {record.post_text.length > 120 && '...'}
                      </p>
                    ) : (
                      <span className="text-gray-300 text-[12px]">—</span>
                    )}
                  </td>

                  {/* Image Thumbnails */}
                  <td className="px-3 py-2">
                    {record.post_images?.length ? (
                      <div className="flex gap-1">
                        {record.post_images.slice(0, 4).map((url, i) => (
                          <a
                            key={i}
                            href={url}
                            download={`${artist.instagram_handle}-${i + 1}.jpg`}
                            className="block hover:opacity-80 transition-opacity"
                            title="Download image"
                          >
                            <img
                              src={url}
                              alt=""
                              className="w-8 h-8 object-cover rounded"
                            />
                          </a>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-300 text-[12px]">—</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-3 py-1">
                    <div className="flex items-center justify-end gap-4">
                      {/* Generate button for pending */}
                      {record.status === 'pending' && (
                        <button
                          onClick={() => handleGenerate(record.id)}
                          disabled={isGenerating}
                          className="p-2 text-ink hover:bg-gray-100 transition-colors disabled:opacity-50"
                          title="Generate post"
                        >
                          <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-pulse' : ''}`} />
                        </button>
                      )}

                      {/* Copy button for generated+ */}
                      {hasContent && (
                        <button
                          onClick={() => copyForBuffer(record)}
                          className="p-2 text-gray-400 hover:text-ink hover:bg-gray-100 transition-colors"
                          title="Copy for Buffer"
                        >
                          {isCopied ? (
                            <Check className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      )}

                      {/* Regenerate for generated */}
                      {record.status === 'generated' && (
                        <button
                          onClick={() => handleGenerate(record.id)}
                          disabled={isGenerating}
                          className="p-2 text-gray-400 hover:text-ink hover:bg-gray-100 transition-colors disabled:opacity-50"
                          title="Regenerate"
                        >
                          <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-pulse' : ''}`} />
                        </button>
                      )}

                      {/* Status advance buttons */}
                      {record.status === 'generated' && (
                        <button
                          onClick={() => showStatusConfirm(record, 'posted')}
                          className="p-2 text-purple-600 hover:bg-purple-50 transition-colors"
                          title="Mark Posted"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      )}

                      {record.status === 'posted' && (
                        <button
                          onClick={() => showStatusConfirm(record, 'dm_sent')}
                          className="p-2 text-yellow-600 hover:bg-yellow-50 transition-colors"
                          title="Mark DM Sent"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </button>
                      )}

                      {record.status === 'dm_sent' && (
                        <button
                          onClick={() => showStatusConfirm(record, 'claimed')}
                          className="p-2 text-green-600 hover:bg-green-50 transition-colors"
                          title="Mark Claimed"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}

                      {record.status === 'claimed' && (
                        <button
                          onClick={() => showStatusConfirm(record, 'converted')}
                          className="p-2 text-emerald-600 hover:bg-emerald-50 transition-colors"
                          title="Mark Converted"
                        >
                          <Crown className="w-4 h-4" />
                        </button>
                      )}

                      {/* Admin artist page */}
                      <Link
                        href={`/admin/artists/${artist.id}`}
                        className="p-2 text-gray-400 hover:text-ink hover:bg-gray-100 transition-colors"
                        title="View artist details"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>

                      {/* View public profile */}
                      <a
                        href={`/artist/${artist.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-gray-400 hover:text-ink hover:bg-gray-100 transition-colors"
                        title="View public profile"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>

                      {/* Delete */}
                      <button
                        onClick={() => setDeleteDialog({ isOpen: true, record })}
                        disabled={deletingId === record.id}
                        className="p-2 text-gray-300 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-3 py-2 border-t border-ink/10 text-[12px]">
          <span className="text-gray-500 font-body">
            <span className="font-mono text-ink">
              {(page - 1) * pageSize + 1}
            </span>
            –
            <span className="font-mono text-ink">
              {Math.min(page * pageSize, sortedRecords.length)}
            </span>
            {' '}of{' '}
            <span className="font-mono text-ink">
              {sortedRecords.length}
            </span>
          </span>

          <div className="flex items-center gap-0.5">
            <button
              onClick={() => setPage((p) => p - 1)}
              disabled={page <= 1}
              className="p-1 bg-paper border border-ink/10 hover:border-ink/30
                       text-ink disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-gray-500 font-body px-2">
              <span className="font-mono text-ink">{page}</span>
              /<span className="font-mono text-ink">{totalPages}</span>
            </span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= totalPages}
              className="p-1 bg-paper border border-ink/10 hover:border-ink/30
                       text-ink disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel="Confirm"
        cancelLabel="Cancel"
        onConfirm={handleConfirmStatus}
        onCancel={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        title="Delete Outreach Record"
        message={`Are you sure you want to delete the outreach record for @${deleteDialog.record?.artists?.instagram_handle}? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialog({ isOpen: false, record: null })}
      />
    </>
  );
}
