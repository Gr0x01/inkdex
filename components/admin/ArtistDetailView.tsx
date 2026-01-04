'use client';

/**
 * Admin Artist Detail View
 *
 * Displays full artist details with management controls:
 * - Toggle Pro/Featured status
 * - Delete artist
 * - View and delete images
 */

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Crown,
  Star,
  Trash2,
  ExternalLink,
  MapPin,
  Image as ImageIcon,
  Instagram,
  Eye,
  MousePointer,
  Search,
  Palette,
} from 'lucide-react';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import ArtistImageGrid from './ArtistImageGrid';

interface Artist {
  id: string;
  name: string;
  instagram_handle: string;
  slug: string;
  city: string | null;
  state: string | null;
  shop_name: string | null;
  is_pro: boolean;
  is_featured: boolean;
  verification_status: string;
  follower_count: number | null;
  profile_image_url: string | null;
  instagram_url: string | null;
  website_url: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
}

interface PortfolioImage {
  id: string;
  instagram_post_id: string;
  storage_thumb_320: string | null;
  storage_thumb_640: string | null;
  storage_thumb_1280: string | null;
  storage_original_path: string | null;
  is_pinned: boolean;
  hidden: boolean;
  has_embedding: boolean;
  likes_count: number | null;
  created_at: string;
}

interface Analytics {
  profileViews: number;
  imageViews: number;
  instagramClicks: number;
  bookingClicks: number;
  searchAppearances: number;
}

interface StyleProfile {
  style_name: string;
  percentage: number;
  image_count: number;
}

interface ArtistDetailViewProps {
  initialArtist: Artist;
  initialImages: PortfolioImage[];
  initialImageCount: number;
  initialAnalytics: Analytics;
  initialStyles: StyleProfile[];
}

export default function ArtistDetailView({
  initialArtist,
  initialImages,
  initialImageCount,
  initialAnalytics,
  initialStyles,
}: ArtistDetailViewProps) {
  const [artist, setArtist] = useState(initialArtist);
  const [images, setImages] = useState(initialImages);
  const [imageCount, setImageCount] = useState(initialImageCount);
  const [analytics] = useState(initialAnalytics);
  const [styles] = useState(initialStyles);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleted, setDeleted] = useState(false);

  const handleTogglePro = async () => {
    setUpdating(true);
    try {
      const response = await fetch(`/api/admin/artists/${artist.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_pro: !artist.is_pro }),
      });

      if (!response.ok) {
        throw new Error('Failed to update');
      }

      const data = await response.json();
      setArtist((prev) => ({ ...prev, is_pro: data.artist.is_pro }));
    } catch (error) {
      console.error('Failed to toggle pro:', error);
      alert('Failed to update pro status');
    } finally {
      setUpdating(false);
    }
  };

  const handleToggleFeatured = async () => {
    setUpdating(true);
    try {
      const response = await fetch(`/api/admin/artists/${artist.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_featured: !artist.is_featured }),
      });

      if (!response.ok) {
        throw new Error('Failed to update');
      }

      const data = await response.json();
      setArtist((prev) => ({ ...prev, is_featured: data.artist.is_featured }));
    } catch (error) {
      console.error('Failed to toggle featured:', error);
      alert('Failed to update featured status');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteArtist = async () => {
    setDeleting(true);
    setShowDeleteDialog(false);

    try {
      const response = await fetch(`/api/admin/artists/${artist.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete artist');
      }

      setDeleted(true);
    } catch (error) {
      console.error('Failed to delete artist:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete artist');
    } finally {
      setDeleting(false);
    }
  };

  const handleImagesDeleted = (deletedIds: string[]) => {
    setImages((prev) => prev.filter((img) => !deletedIds.includes(img.id)));
    setImageCount((prev) => prev - deletedIds.length);
  };

  // Show deleted state
  if (deleted) {
    return (
      <div className="space-y-6 text-[13px]">
        <Link
          href="/admin/artists"
          className="inline-flex items-center gap-1.5 text-gray-500 hover:text-ink transition-colors font-body"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Artists
        </Link>

        <div className="bg-red-50 border border-red-200 p-8 text-center">
          <Trash2 className="w-8 h-8 text-red-500 mx-auto mb-3" />
          <h2 className="font-heading text-xl text-ink mb-2">Artist Deleted</h2>
          <p className="text-gray-600 font-body mb-4">
            {artist.name} and all their images have been permanently deleted.
          </p>
          <Link
            href="/admin/artists"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-ink text-paper font-body hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Return to Artists
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-[13px]">
      {/* Back Link */}
      <Link
        href="/admin/artists"
        className="inline-flex items-center gap-1.5 text-gray-500 hover:text-ink transition-colors font-body"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Artists
      </Link>

      {/* Artist Header */}
      <div className="bg-paper border border-ink/10 p-4">
        <div className="flex items-start justify-between gap-4">
          {/* Left: Artist Info */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="font-heading text-2xl tracking-tight text-ink truncate">
                {artist.name}
              </h1>
              {artist.is_pro && (
                <Crown className="w-5 h-5 text-status-warning flex-shrink-0" />
              )}
              {artist.is_featured && (
                <Star className="w-5 h-5 text-status-warning fill-current flex-shrink-0" />
              )}
            </div>

            <div className="flex items-center gap-3 text-gray-500 font-body mb-3">
              <span className="font-mono text-[12px]">@{artist.instagram_handle}</span>
              {artist.city && artist.state && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {artist.city}, {artist.state}
                </span>
              )}
              <span className="flex items-center gap-1">
                <ImageIcon className="w-3.5 h-3.5" />
                {imageCount} images
              </span>
            </div>

            {/* Status Badges */}
            <div className="flex items-center gap-2">
              <span
                className={`px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide ${
                  artist.verification_status === 'claimed'
                    ? 'bg-status-success/10 text-status-success'
                    : 'bg-gray-100 text-gray-400'
                }`}
              >
                {artist.verification_status}
              </span>
              <span
                className={`px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide ${
                  artist.is_pro
                    ? 'bg-status-warning/10 text-status-warning'
                    : 'bg-gray-100 text-gray-400'
                }`}
              >
                {artist.is_pro ? 'Pro' : 'Free'}
              </span>
              {artist.shop_name && (
                <span className="text-gray-400 text-[12px]">{artist.shop_name}</span>
              )}
            </div>
          </div>

          {/* Right: External Links */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {artist.instagram_url && (
              <a
                href={artist.instagram_url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-gray-400 hover:text-ink transition-colors"
                title="View on Instagram"
              >
                <Instagram className="w-4 h-4" />
              </a>
            )}
            <a
              href={`/artist/${artist.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-gray-400 hover:text-ink transition-colors"
              title="View public profile"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="bg-paper border border-ink/10 p-4">
        <h2 className="font-mono text-[10px] uppercase tracking-wider text-gray-500 mb-3">
          Actions
        </h2>

        <div className="flex flex-wrap items-center gap-3">
          {/* Toggle Pro */}
          <button
            onClick={handleTogglePro}
            disabled={updating}
            className={`flex items-center gap-2 px-3 py-1.5 text-[12px] font-body transition-colors disabled:opacity-50 ${
              artist.is_pro
                ? 'bg-status-warning/10 text-status-warning border border-status-warning/30 hover:bg-status-warning/20'
                : 'bg-paper border border-ink/20 text-ink hover:border-ink/40'
            }`}
          >
            <Crown className="w-3.5 h-3.5" />
            {artist.is_pro ? 'Remove Pro' : 'Make Pro'}
          </button>

          {/* Toggle Featured */}
          <button
            onClick={handleToggleFeatured}
            disabled={updating}
            className={`flex items-center gap-2 px-3 py-1.5 text-[12px] font-body transition-colors disabled:opacity-50 ${
              artist.is_featured
                ? 'bg-status-warning/10 text-status-warning border border-status-warning/30 hover:bg-status-warning/20'
                : 'bg-paper border border-ink/20 text-ink hover:border-ink/40'
            }`}
          >
            <Star className={`w-3.5 h-3.5 ${artist.is_featured ? 'fill-current' : ''}`} />
            {artist.is_featured ? 'Unfeature' : 'Feature'}
          </button>

          {/* Delete Artist */}
          <button
            onClick={() => setShowDeleteDialog(true)}
            disabled={deleting}
            className="flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white text-[12px] font-body
                       hover:bg-red-700 disabled:opacity-50 transition-colors ml-auto"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete Artist
          </button>
        </div>
      </div>

      {/* Analytics & Styles Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Analytics (Last 30 Days) */}
        <div className="bg-paper border border-ink/10 p-4">
          <h2 className="font-mono text-[10px] uppercase tracking-wider text-gray-500 mb-3">
            Analytics (Last 30 Days)
          </h2>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-50 flex items-center justify-center">
                <Eye className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <div className="font-mono text-lg text-ink">{analytics.profileViews.toLocaleString()}</div>
                <div className="text-[10px] text-gray-500">Profile Views</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-purple-50 flex items-center justify-center">
                <ImageIcon className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <div className="font-mono text-lg text-ink">{analytics.imageViews.toLocaleString()}</div>
                <div className="text-[10px] text-gray-500">Image Views</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-pink-50 flex items-center justify-center">
                <Instagram className="w-4 h-4 text-pink-600" />
              </div>
              <div>
                <div className="font-mono text-lg text-ink">{analytics.instagramClicks.toLocaleString()}</div>
                <div className="text-[10px] text-gray-500">IG Clicks</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-green-50 flex items-center justify-center">
                <MousePointer className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <div className="font-mono text-lg text-ink">{analytics.bookingClicks.toLocaleString()}</div>
                <div className="text-[10px] text-gray-500">Booking Clicks</div>
              </div>
            </div>

            <div className="flex items-center gap-2 col-span-2">
              <div className="w-8 h-8 bg-orange-50 flex items-center justify-center">
                <Search className="w-4 h-4 text-orange-600" />
              </div>
              <div>
                <div className="font-mono text-lg text-ink">{analytics.searchAppearances.toLocaleString()}</div>
                <div className="text-[10px] text-gray-500">Search Appearances</div>
              </div>
            </div>
          </div>

          {analytics.profileViews === 0 && analytics.imageViews === 0 && (
            <p className="text-gray-400 text-[12px] mt-3 font-body">No analytics data yet</p>
          )}
        </div>

        {/* Style Tags */}
        <div className="bg-paper border border-ink/10 p-4">
          <h2 className="font-mono text-[10px] uppercase tracking-wider text-gray-500 mb-3">
            Style Tags
          </h2>

          {styles.length > 0 ? (
            <div className="space-y-2">
              {styles.map((style) => (
                <div key={style.style_name} className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-ink/5 flex items-center justify-center">
                    <Palette className="w-4 h-4 text-ink/60" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-body text-[13px] text-ink capitalize">
                        {style.style_name.replace(/-/g, ' ')}
                      </span>
                      <span className="font-mono text-[12px] text-gray-500">
                        {style.percentage.toFixed(0)}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-100 mt-1">
                      <div
                        className="h-full bg-ink/40"
                        style={{ width: `${Math.min(style.percentage, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-[12px] font-body">
              No style tags computed yet. Run the style computation script.
            </p>
          )}
        </div>
      </div>

      {/* Portfolio Images */}
      <div className="bg-paper border border-ink/10 p-4">
        <h2 className="font-mono text-[10px] uppercase tracking-wider text-gray-500 mb-3">
          Portfolio Images ({imageCount})
        </h2>

        <ArtistImageGrid
          artistId={artist.id}
          images={images}
          onImagesDeleted={handleImagesDeleted}
        />
      </div>

      {/* Delete Artist Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        title="Delete Artist"
        message={`Are you sure you want to permanently delete ${artist.name} (@${artist.instagram_handle})? This will remove the artist and all ${imageCount} images from the database and storage. This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleDeleteArtist}
        onCancel={() => setShowDeleteDialog(false)}
      />
    </div>
  );
}
