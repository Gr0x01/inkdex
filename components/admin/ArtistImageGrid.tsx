'use client';

/**
 * Admin Artist Image Grid
 *
 * Displays all portfolio images for an artist with selection and delete functionality.
 */

import { useState } from 'react';
import { Trash2, Pin, EyeOff, Sparkles, Download } from 'lucide-react';
import { getImageUrl } from '@/lib/utils/images';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

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

interface ArtistImageGridProps {
  artistId: string;
  images: PortfolioImage[];
  onImagesDeleted: (deletedIds: string[]) => void;
}

export default function ArtistImageGrid({
  artistId,
  images,
  onImagesDeleted,
}: ArtistImageGridProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const selectAll = () => {
    setSelectedIds(new Set(images.map((img) => img.id)));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleDelete = async () => {
    if (selectedIds.size === 0) return;

    setDeleting(true);
    setShowDeleteDialog(false);

    try {
      const response = await fetch(`/api/admin/artists/${artistId}/images`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageIds: Array.from(selectedIds) }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete images');
      }

      const data = await response.json();
      console.log(`Deleted ${data.deleted.imagesDeleted} images`);

      // Notify parent to update state
      onImagesDeleted(Array.from(selectedIds));
      setSelectedIds(new Set());
    } catch (err) {
      console.error('Failed to delete images:', err);
      const message = err instanceof Error ? err.message : 'Failed to delete images';
      setError(message);
      setTimeout(() => setError(null), 5000);
    } finally {
      setDeleting(false);
    }
  };

  const handleDownload = async () => {
    if (selectedIds.size === 0) return;

    setDownloading(true);

    try {
      const selectedImages = images.filter((img) => selectedIds.has(img.id));

      for (let i = 0; i < selectedImages.length; i++) {
        const img = selectedImages[i];
        const originalPath = img.storage_original_path;

        if (!originalPath) {
          console.warn(`No original path for image ${img.id}`);
          continue;
        }

        const url = getImageUrl(originalPath);

        try {
          const response = await fetch(url);
          if (!response.ok) throw new Error(`Failed to fetch ${url}`);

          const blob = await response.blob();
          const filename = originalPath.split('/').pop() || `${img.instagram_post_id}.jpg`;

          const downloadUrl = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = downloadUrl;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(downloadUrl);

          // Small delay between downloads to avoid browser blocking
          if (i < selectedImages.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 300));
          }
        } catch (err) {
          console.error(`Failed to download image ${img.id}:`, err);
        }
      }
    } finally {
      setDownloading(false);
    }
  };

  if (images.length === 0) {
    return (
      <div className="bg-gray-50 border border-ink/10 p-8 text-center">
        <p className="text-gray-500 font-body text-[13px]">No images found</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Error Display */}
      {error && (
        <div className="flex items-center justify-between bg-red-50 border border-red-200 px-3 py-2 text-[12px]">
          <span className="text-red-700 font-body">{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-red-500 hover:text-red-700 font-mono text-[10px] uppercase"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Actions Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={selectAll}
            disabled={selectedIds.size === images.length}
            className="px-2 py-1 bg-paper border border-ink/20 text-ink text-[12px] font-body
                       hover:border-ink/40 disabled:opacity-50 transition-colors"
          >
            Select All
          </button>
          <button
            onClick={clearSelection}
            disabled={selectedIds.size === 0}
            className="px-2 py-1 bg-paper border border-ink/20 text-ink text-[12px] font-body
                       hover:border-ink/40 disabled:opacity-50 transition-colors"
          >
            Clear
          </button>
          {selectedIds.size > 0 && (
            <span className="text-gray-500 text-[12px] font-body ml-2">
              {selectedIds.size} selected
            </span>
          )}
        </div>

        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              disabled={downloading || deleting}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[12px] font-body
                         hover:bg-purple-700 disabled:opacity-50 transition-colors"
            >
              {downloading ? (
                <div className="w-3.5 h-3.5 border border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              {downloading
                ? 'Downloading...'
                : `Download ${selectedIds.size}`}
            </button>
            <button
              onClick={() => setShowDeleteDialog(true)}
              disabled={deleting || downloading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white text-[12px] font-body
                         hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {deleting ? (
                <div className="w-3.5 h-3.5 border border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5" />
              )}
              {deleting
                ? 'Deleting...'
                : `Delete ${selectedIds.size}`}
            </button>
          </div>
        )}
      </div>

      {/* Image Grid */}
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
        {images.map((image) => {
          const isSelected = selectedIds.has(image.id);
          const imageUrl = getImageUrl(
            image.storage_thumb_320 || image.storage_thumb_640
          );

          return (
            <div
              key={image.id}
              onClick={() => toggleSelect(image.id)}
              className={`relative aspect-square cursor-pointer group overflow-hidden border-2 transition-all ${
                isSelected
                  ? 'border-ink ring-2 ring-ink/20'
                  : 'border-transparent hover:border-ink/30'
              }`}
            >
              {/* Checkbox */}
              <div
                className={`absolute top-1 left-1 z-10 w-5 h-5 border-2 flex items-center justify-center transition-all ${
                  isSelected
                    ? 'bg-ink border-ink'
                    : 'bg-white/80 border-gray-300 group-hover:border-ink/50'
                }`}
              >
                {isSelected && (
                  <svg
                    className="w-3 h-3 text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>

              {/* Status Badges */}
              <div className="absolute top-1 right-1 z-10 flex flex-col gap-0.5">
                {image.is_pinned && (
                  <div
                    className="w-5 h-5 bg-status-warning flex items-center justify-center"
                    title="Pinned"
                  >
                    <Pin className="w-3 h-3 text-white" />
                  </div>
                )}
                {image.hidden && (
                  <div
                    className="w-5 h-5 bg-gray-500 flex items-center justify-center"
                    title="Hidden"
                  >
                    <EyeOff className="w-3 h-3 text-white" />
                  </div>
                )}
                {image.has_embedding && (
                  <div
                    className="w-5 h-5 bg-status-success flex items-center justify-center"
                    title="Has Embedding"
                  >
                    <Sparkles className="w-3 h-3 text-white" />
                  </div>
                )}
              </div>

              {/* Image */}
              <img
                src={imageUrl}
                alt=""
                className="w-full h-full object-cover"
                loading="lazy"
              />

              {/* Overlay on hover/select */}
              <div
                className={`absolute inset-0 transition-opacity ${
                  isSelected
                    ? 'bg-ink/10'
                    : 'bg-transparent group-hover:bg-ink/5'
                }`}
              />
            </div>
          );
        })}
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        title="Delete Images"
        message={`Are you sure you want to permanently delete ${selectedIds.size} ${
          selectedIds.size === 1 ? 'image' : 'images'
        }? This will remove them from the database and storage. This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteDialog(false)}
      />
    </div>
  );
}
