'use client';

import { useState } from 'react';
import { ExternalLink, MessageSquare, CheckCircle, Crown, Copy, ChevronDown, ChevronRight, Sparkles } from 'lucide-react';

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
  loading?: boolean;
}

const statusColors: Record<string, string> = {
  pending: 'bg-gray-200 text-gray-700',
  generated: 'bg-blue-100 text-blue-700',
  posted: 'bg-purple-100 text-purple-700',
  dm_sent: 'bg-yellow-100 text-yellow-700',
  claimed: 'bg-green-100 text-green-700',
  converted: 'bg-emerald-200 text-emerald-800',
};

const statusLabels: Record<string, string> = {
  pending: 'Pending',
  generated: 'Ready to Post',
  posted: 'Posted - Send DM',
  dm_sent: 'DM Sent',
  claimed: 'Claimed',
  converted: 'Converted',
};

export default function OutreachTable({
  records,
  onUpdateStatus,
  onGenerate,
  loading,
}: OutreachTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const getDmTemplate = (record: OutreachRecord) => {
    if (!record.artists) return '';
    const profileUrl = `https://inkdex.io/artist/${record.artists.slug}`;
    return `Hey! We featured your work on Inkdex today. Check it out: ${profileUrl}

We'd love to have you claim your profile - you'll get 3 months of Pro free (auto-sync, analytics, unlimited portfolio).

Let me know if you have any questions!`;
  };

  // Copy as HTML with image tags so Buffer can parse images
  const copyForBuffer = async (record: OutreachRecord, field: string) => {
    const caption = record.post_text || '';
    const images = record.post_images || [];

    // Create HTML with actual img tags
    const html = `<div>${caption}</div>${images.map(url => `<img src="${url}">`).join('')}`;

    // Create plain text fallback
    const text = `${caption}\n\n${images.join('\n')}`;

    try {
      // Try to copy as HTML (rich text) so Buffer can parse images
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([text], { type: 'text/plain' }),
        }),
      ]);
    } catch {
      // Fallback to plain text
      await navigator.clipboard.writeText(text);
    }

    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleGenerate = async (id: string) => {
    setGeneratingId(id);
    try {
      await onGenerate(id);
      setExpandedId(id); // Auto-expand to show the generated content
    } finally {
      setGeneratingId(null);
    }
  };

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
    <div className="divide-y divide-ink/5">
      {records.map((record) => {
        const artist = record.artists;
        if (!artist) return null;

        const isExpanded = expandedId === record.id;
        const isGenerating = generatingId === record.id;

        return (
          <div key={record.id} className="bg-white">
            {/* Main Row */}
            <div className="flex items-center gap-3 p-3 hover:bg-gray-50">
              {/* Expand toggle */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : record.id)}
                className="p-1 text-gray-400 hover:text-ink"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>

              {/* Artist info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-body text-ink font-medium truncate">
                    {artist.name}
                  </p>
                  <a
                    href={`https://instagram.com/${artist.instagram_handle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-gray-400 hover:text-ink flex items-center gap-0.5"
                  >
                    @{artist.instagram_handle}
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
                <p className="text-[11px] text-gray-500">
                  {artist.city}{artist.state && `, ${artist.state}`} · {artist.follower_count ? `${(artist.follower_count / 1000).toFixed(1)}K` : '—'}
                </p>
              </div>

              {/* Status */}
              <span
                className={`px-2 py-0.5 rounded text-[11px] font-mono whitespace-nowrap ${
                  statusColors[record.status] || 'bg-gray-100'
                }`}
              >
                {statusLabels[record.status] || record.status}
              </span>

              {/* Primary Action Button */}
              <div className="flex items-center gap-1">
                {record.status === 'pending' && (
                  <button
                    onClick={() => handleGenerate(record.id)}
                    disabled={isGenerating}
                    className="flex items-center gap-1 px-2.5 py-1 bg-ink text-paper text-[12px] font-body
                             hover:bg-gray-800 disabled:opacity-50 rounded"
                  >
                    <Sparkles className={`w-3 h-3 ${isGenerating ? 'animate-pulse' : ''}`} />
                    {isGenerating ? 'Generating...' : 'Generate'}
                  </button>
                )}

                {record.status === 'generated' && (
                  <button
                    onClick={() => onUpdateStatus(record.id, 'posted')}
                    className="flex items-center gap-1 px-2.5 py-1 bg-purple-600 text-white text-[12px] font-body
                             hover:bg-purple-700 rounded"
                  >
                    <CheckCircle className="w-3 h-3" />
                    Mark Posted
                  </button>
                )}

                {record.status === 'posted' && (
                  <button
                    onClick={() => onUpdateStatus(record.id, 'dm_sent')}
                    className="flex items-center gap-1 px-2.5 py-1 bg-yellow-500 text-white text-[12px] font-body
                             hover:bg-yellow-600 rounded"
                  >
                    <MessageSquare className="w-3 h-3" />
                    Mark DM Sent
                  </button>
                )}

                {record.status === 'dm_sent' && (
                  <button
                    onClick={() => onUpdateStatus(record.id, 'claimed')}
                    className="flex items-center gap-1 px-2.5 py-1 bg-green-600 text-white text-[12px] font-body
                             hover:bg-green-700 rounded"
                  >
                    <CheckCircle className="w-3 h-3" />
                    Mark Claimed
                  </button>
                )}

                {record.status === 'claimed' && (
                  <button
                    onClick={() => onUpdateStatus(record.id, 'converted')}
                    className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 text-white text-[12px] font-body
                             hover:bg-emerald-700 rounded"
                  >
                    <Crown className="w-3 h-3" />
                    Mark Converted
                  </button>
                )}

                {/* View profile link */}
                <a
                  href={`https://inkdex.io/artist/${artist.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 text-gray-400 hover:text-ink hover:bg-gray-100 rounded"
                  title="View Profile"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
              <div className="px-10 pb-4 bg-gray-50 border-t border-ink/5">
                {record.status === 'pending' ? (
                  <p className="text-sm text-gray-500 py-4">
                    Click "Generate" to create post content for this artist.
                  </p>
                ) : (
                  <div className="pt-4 space-y-4">
                    {/* Copy All Button */}
                    <div className="flex justify-end">
                      <button
                        onClick={() => copyForBuffer(record, `all-${record.id}`)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-ink text-paper text-[12px] font-body
                                 hover:bg-gray-800 rounded"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        {copiedField === `all-${record.id}` ? 'Copied!' : 'Copy All for Buffer'}
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                    {/* Caption */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-[11px] font-mono text-gray-500 uppercase tracking-wider">
                          Caption
                        </h4>
                        <button
                          onClick={() => copyToClipboard(record.post_text || '', `caption-${record.id}`)}
                          className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-ink"
                        >
                          <Copy className="w-3 h-3" />
                          {copiedField === `caption-${record.id}` ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                      <div className="bg-white border border-ink/10 p-3 rounded text-sm font-body whitespace-pre-wrap">
                        {record.post_text || 'No caption generated'}
                      </div>
                    </div>

                    {/* Images */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-[11px] font-mono text-gray-500 uppercase tracking-wider">
                          Images ({record.post_images?.length || 0})
                        </h4>
                        <button
                          onClick={() => copyToClipboard(record.post_images?.join('\n') || '', `images-${record.id}`)}
                          className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-ink"
                        >
                          <Copy className="w-3 h-3" />
                          {copiedField === `images-${record.id}` ? 'Copied!' : 'Copy URLs'}
                        </button>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        {record.post_images?.map((url, i) => (
                          <a
                            key={i}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="aspect-square bg-gray-200 rounded overflow-hidden hover:opacity-80"
                          >
                            <img
                              src={url}
                              alt={`Image ${i + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </a>
                        )) || (
                          <p className="text-sm text-gray-400 col-span-4">No images</p>
                        )}
                      </div>
                    </div>

                    </div>

                    {/* DM Template (show for posted status) */}
                    {(record.status === 'posted' || record.status === 'dm_sent') && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-[11px] font-mono text-gray-500 uppercase tracking-wider">
                            DM Template
                          </h4>
                          <button
                            onClick={() => copyToClipboard(getDmTemplate(record), `dm-${record.id}`)}
                            className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-ink"
                          >
                            <Copy className="w-3 h-3" />
                            {copiedField === `dm-${record.id}` ? 'Copied!' : 'Copy DM'}
                          </button>
                        </div>
                        <div className="bg-white border border-ink/10 p-3 rounded text-sm font-body whitespace-pre-wrap">
                          {getDmTemplate(record)}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
