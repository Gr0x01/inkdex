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
  Send,
} from 'lucide-react';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import ArtistImageGrid from './ArtistImageGrid';
import ScrapingStatusCard from './ScrapingStatusCard';

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
  featured_at: string | null;
  featured_expires_at: string | null;
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

interface PipelineState {
  pipeline_status: string | null;
  scraping_blacklisted: boolean;
  blacklist_reason: string | null;
  last_scraped_at: string | null;
}

interface ScrapingJob {
  id: string;
  status: string;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
  result_data: { images_scraped?: number } | null;
}

interface ArtistDetailViewProps {
  initialArtist: Artist;
  initialImages: PortfolioImage[];
  initialImageCount: number;
  initialAnalytics: Analytics;
  initialStyles: StyleProfile[];
  initialPipelineState: PipelineState | null;
  initialScrapingHistory: ScrapingJob[];
}

export default function ArtistDetailView({
  initialArtist,
  initialImages,
  initialImageCount,
  initialAnalytics,
  initialStyles,
  initialPipelineState,
  initialScrapingHistory,
}: ArtistDetailViewProps) {
  const [artist, setArtist] = useState(initialArtist);
  const [images, setImages] = useState(initialImages);
  const [imageCount, setImageCount] = useState(initialImageCount);
  const [analytics] = useState(initialAnalytics);
  const [styles] = useState(initialStyles);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showProDialog, setShowProDialog] = useState(false);
  const [showBasicDialog, setShowBasicDialog] = useState(false);
  const [showFeatureDialog, setShowFeatureDialog] = useState(false);
  const [showUnfeatureDialog, setShowUnfeatureDialog] = useState(false);
  const [featureDays, setFeatureDays] = useState<number>(14);
  const [deleted, setDeleted] = useState(false);
  const [pushingToAirtable, setPushingToAirtable] = useState(false);
  const [airtablePushResult, setAirtablePushResult] = useState<string | null>(null);

  const handleMakePro = async () => {
    setShowProDialog(false);
    setUpdating(true);
    try {
      const response = await fetch(`/api/admin/artists/${artist.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_pro: true }),
      });

      if (!response.ok) {
        throw new Error('Failed to update');
      }

      const data = await response.json();
      setArtist((prev) => ({ ...prev, is_pro: data.artist.is_pro }));
    } catch (error) {
      console.error('Failed to make pro:', error);
    } finally {
      setUpdating(false);
    }
  };

  const handleMakeBasic = async () => {
    setShowBasicDialog(false);
    setUpdating(true);
    try {
      const response = await fetch(`/api/admin/artists/${artist.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_pro: false }),
      });

      if (!response.ok) {
        throw new Error('Failed to update');
      }

      const data = await response.json();
      setArtist((prev) => ({ ...prev, is_pro: data.artist.is_pro }));
    } catch (error) {
      console.error('Failed to make basic:', error);
    } finally {
      setUpdating(false);
    }
  };

  const handleFeature = async () => {
    setShowFeatureDialog(false);
    setUpdating(true);
    try {
      const response = await fetch(`/api/admin/artists/${artist.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_featured: true, feature_days: featureDays }),
      });

      if (!response.ok) {
        throw new Error('Failed to update');
      }

      const data = await response.json();
      setArtist((prev) => ({
        ...prev,
        is_featured: data.artist.is_featured,
        featured_at: data.artist.featured_at,
        featured_expires_at: data.artist.featured_expires_at,
      }));
    } catch (error) {
      console.error('Failed to feature:', error);
    } finally {
      setUpdating(false);
    }
  };

  const handleUnfeature = async () => {
    setShowUnfeatureDialog(false);
    setUpdating(true);
    try {
      const response = await fetch(`/api/admin/artists/${artist.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_featured: false }),
      });

      if (!response.ok) {
        throw new Error('Failed to update');
      }

      const data = await response.json();
      setArtist((prev) => ({
        ...prev,
        is_featured: data.artist.is_featured,
        featured_at: null,
        featured_expires_at: null,
      }));
    } catch (error) {
      console.error('Failed to unfeature:', error);
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

  const handlePushToAirtable = async () => {
    setPushingToAirtable(true);
    setAirtablePushResult(null);

    try {
      const response = await fetch('/api/admin/airtable/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artistIds: [artist.id] }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to push to Airtable');
      }

      if (data.created > 0) {
        setAirtablePushResult('Added to Airtable');
      } else if (data.updated > 0) {
        setAirtablePushResult('Updated in Airtable');
      } else {
        setAirtablePushResult('Already in Airtable');
      }

      // Clear message after 3 seconds
      setTimeout(() => setAirtablePushResult(null), 3000);
    } catch (error) {
      console.error('Failed to push to Airtable:', error);
      setAirtablePushResult(error instanceof Error ? error.message : 'Push failed');
      setTimeout(() => setAirtablePushResult(null), 3000);
    } finally {
      setPushingToAirtable(false);
    }
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

      {/* Artist Header + Actions Combined */}
      <div className="bg-paper border border-ink/10 p-4">
        <div className="flex flex-col lg:flex-row lg:items-start gap-4">

          {/* Left: Artist Info */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="font-heading text-2xl tracking-tight text-ink truncate">
                {artist.name}
              </h1>
              {artist.is_pro && (
                <Crown className="w-5 h-5 text-status-warning shrink-0" />
              )}
              {artist.is_featured && (
                <Star className="w-5 h-5 text-status-warning fill-current shrink-0" />
              )}
              {/* External Links */}
              <div className="flex items-center gap-1 ml-2">
                {artist.instagram_url && (
                  <a
                    href={artist.instagram_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 text-gray-400 hover:text-ink transition-colors"
                    title="View on Instagram"
                  >
                    <Instagram className="w-4 h-4" />
                  </a>
                )}
                <a
                  href={`/artist/${artist.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 text-gray-400 hover:text-ink transition-colors"
                  title="View public profile"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>

            <div className="flex items-center gap-3 text-gray-500 font-body text-[12px]">
              <span className="font-mono">@{artist.instagram_handle}</span>
              {artist.city && artist.state && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {artist.city}, {artist.state}
                </span>
              )}
              <span className="flex items-center gap-1">
                <ImageIcon className="w-3 h-3" />
                {imageCount} images
              </span>
              <span
                className={`px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wide ${
                  artist.verification_status === 'claimed'
                    ? 'bg-status-success/10 text-status-success'
                    : 'bg-gray-100 text-gray-400'
                }`}
              >
                {artist.verification_status}
              </span>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 lg:flex-nowrap">
            {/* Tier Toggle */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-gray-400 font-mono uppercase">Tier</span>
              {artist.is_pro ? (
                <button
                  onClick={() => setShowBasicDialog(true)}
                  disabled={updating}
                  className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono uppercase transition-colors disabled:opacity-50
                             bg-status-warning/10 text-status-warning border border-status-warning/30 hover:bg-status-warning/20"
                >
                  <Crown className="w-2.5 h-2.5" />
                  Pro
                </button>
              ) : (
                <button
                  onClick={() => setShowProDialog(true)}
                  disabled={updating}
                  className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono uppercase transition-colors disabled:opacity-50
                             bg-gray-100 text-gray-500 border border-gray-200 hover:border-gray-300"
                >
                  <Crown className="w-2.5 h-2.5" />
                  Free
                </button>
              )}
            </div>

            <div className="w-px h-4 bg-ink/10 hidden lg:block" />

            {/* Featured Toggle */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-gray-400 font-mono uppercase">Featured</span>
              {artist.is_featured ? (
                <>
                  <button
                    onClick={() => setShowUnfeatureDialog(true)}
                    disabled={updating}
                    className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono uppercase transition-colors disabled:opacity-50
                               bg-status-warning/10 text-status-warning border border-status-warning/30 hover:bg-status-warning/20"
                  >
                    <Star className="w-2.5 h-2.5 fill-current" />
                    Yes
                  </button>
                  {artist.featured_expires_at && (
                    <span className="text-[9px] text-gray-400 font-mono">
                      → {new Date(artist.featured_expires_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                </>
              ) : (
                <button
                  onClick={() => setShowFeatureDialog(true)}
                  disabled={updating}
                  className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono uppercase transition-colors disabled:opacity-50
                             bg-gray-100 text-gray-500 border border-gray-200 hover:border-gray-300"
                >
                  <Star className="w-2.5 h-2.5" />
                  No
                </button>
              )}
            </div>

            <div className="w-px h-4 bg-ink/10 hidden lg:block" />

            {/* Airtable */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={handlePushToAirtable}
                disabled={pushingToAirtable}
                className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono uppercase transition-colors disabled:opacity-50
                           bg-paper border border-ink/20 text-ink hover:border-ink/40"
              >
                {pushingToAirtable ? (
                  <div className="w-2.5 h-2.5 border border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send className="w-2.5 h-2.5" />
                )}
                Airtable
              </button>
              {airtablePushResult && (
                <span className={`text-[9px] font-mono ${
                  airtablePushResult.includes('failed') || airtablePushResult.includes('Failed')
                    ? 'text-red-500'
                    : 'text-status-success'
                }`}>
                  {airtablePushResult}
                </span>
              )}
            </div>

            <div className="w-px h-4 bg-red-200 hidden lg:block" />

            {/* Delete */}
            <button
              onClick={() => setShowDeleteDialog(true)}
              disabled={deleting}
              className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono uppercase transition-colors disabled:opacity-50
                         bg-paper border border-red-200 text-red-500 hover:bg-red-50 hover:border-red-300"
            >
              <Trash2 className="w-2.5 h-2.5" />
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Scraping Status & Analytics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Scraping Status */}
        <ScrapingStatusCard
          artistId={artist.id}
          initialPipelineState={initialPipelineState}
          initialScrapingHistory={initialScrapingHistory}
        />
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

      {/* Make Pro Confirmation */}
      <ConfirmDialog
        isOpen={showProDialog}
        title="Make Pro"
        message={`Are you sure you want to upgrade ${artist.name} (@${artist.instagram_handle}) to Pro status? This will give them access to Pro features.`}
        confirmLabel="Make Pro"
        cancelLabel="Cancel"
        onConfirm={handleMakePro}
        onCancel={() => setShowProDialog(false)}
      />

      {/* Make Basic Confirmation */}
      <ConfirmDialog
        isOpen={showBasicDialog}
        title="Make Basic"
        message={`Are you sure you want to downgrade ${artist.name} (@${artist.instagram_handle}) to Basic status? They will lose access to Pro features.`}
        confirmLabel="Make Basic"
        cancelLabel="Cancel"
        onConfirm={handleMakeBasic}
        onCancel={() => setShowBasicDialog(false)}
      />

      {/* Feature Dialog with Duration Selection */}
      {showFeatureDialog && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setShowFeatureDialog(false)}
            aria-hidden="true"
          />

          {/* Dialog */}
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="feature-dialog-title"
            className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 animate-in zoom-in-95 fade-in duration-200"
          >
            <div className="bg-paper border border-gray-200 shadow-xl">
              {/* Header - thin top accent line */}
              <div className="h-1 bg-status-warning" />

              {/* Content */}
              <div className="p-6">
                <h2
                  id="feature-dialog-title"
                  className="font-heading text-xl tracking-tight text-ink mb-2"
                >
                  Feature Artist
                </h2>
                <p className="font-body text-sm text-gray-600 leading-relaxed mb-4">
                  How long should @{artist.instagram_handle} be featured?
                </p>

                {/* Duration Presets */}
                <div className="flex gap-2 mb-2">
                  {[7, 14, 30].map((days) => (
                    <button
                      key={days}
                      onClick={() => setFeatureDays(days)}
                      className={`flex-1 py-2 text-[12px] font-mono uppercase tracking-wide border transition-colors ${
                        featureDays === days
                          ? 'bg-status-warning text-white border-status-warning'
                          : 'bg-paper text-ink border-ink/20 hover:border-ink/40'
                      }`}
                    >
                      {days} days
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex border-t border-gray-200">
                <button
                  onClick={() => setShowFeatureDialog(false)}
                  className="flex-1 py-3 font-mono text-xs uppercase tracking-widest text-gray-500 transition-colors hover:bg-gray-50 hover:text-ink focus:outline-none focus:bg-gray-50"
                >
                  Cancel
                </button>
                <div className="w-px bg-gray-200" />
                <button
                  onClick={handleFeature}
                  className="flex-1 py-3 font-mono text-xs uppercase tracking-widest text-status-warning transition-colors hover:bg-status-warning hover:text-white focus:outline-none focus:bg-status-warning focus:text-white"
                >
                  Feature
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Unfeature Confirmation */}
      <ConfirmDialog
        isOpen={showUnfeatureDialog}
        title="Unfeature Artist"
        message={`Are you sure you want to remove ${artist.name} (@${artist.instagram_handle}) from featured? They will no longer appear in featured sections.`}
        confirmLabel="Unfeature"
        cancelLabel="Cancel"
        onConfirm={handleUnfeature}
        onCancel={() => setShowUnfeatureDialog(false)}
      />

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
