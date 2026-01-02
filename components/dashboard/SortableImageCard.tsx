'use client';

/**
 * Sortable Image Card Component
 *
 * Drag-drop image card for portfolio reordering (Pro feature)
 * Features:
 * - Pin badge + position indicator
 * - Drag handle with visual feedback
 * - Unpin button on hover
 * - Delete button
 */

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Image from 'next/image';
import { getPortfolioImageUrl } from '@/lib/utils/images';
import { Pin, GripVertical, X } from 'lucide-react';

interface PortfolioImage {
  id: string;
  instagram_url: string;
  storage_original_path: string | null;
  storage_thumb_320: string | null;
  storage_thumb_640: string | null;
  storage_thumb_1280: string | null;
  hidden: boolean;
  is_pinned: boolean;
  pinned_position: number | null;
  import_source: string;
}

interface SortableImageCardProps {
  image: PortfolioImage;
  reorderMode: boolean;
  onDelete: (imageId: string) => void;
  onUnpin?: (imageId: string) => void;
  deleting?: boolean;
  pinning?: boolean;
}

export default function SortableImageCard({
  image,
  reorderMode,
  onDelete,
  onUnpin,
  deleting = false,
  pinning = false,
}: SortableImageCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: image.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const thumbnailUrl = getPortfolioImageUrl(image);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative aspect-square overflow-hidden rounded-lg bg-neutral-800 ${
        deleting ? 'opacity-50' : ''
      } ${isDragging ? 'z-50 shadow-2xl' : ''}`}
    >
      {/* Image */}
      <Image
        src={thumbnailUrl}
        alt="Portfolio image"
        fill
        className="object-cover"
        sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
      />

      {/* Pin Badge (Top-left) */}
      {image.is_pinned && (
        <div
          className="absolute left-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-amber-500 shadow-lg"
          aria-label="Pinned image"
        >
          <Pin className="h-4 w-4 text-black" fill="currentColor" aria-hidden="true" />
        </div>
      )}

      {/* Position Indicator (Top-right) */}
      {image.is_pinned && image.pinned_position !== null && (
        <div
          className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/80 text-sm font-bold text-white"
          aria-label={`Position ${image.pinned_position + 1}`}
        >
          {image.pinned_position + 1}
        </div>
      )}

      {/* Drag Handle (Reorder Mode) */}
      {reorderMode && !deleting && (
        <div
          {...attributes}
          {...listeners}
          role="button"
          aria-label={`Drag to reorder image${image.pinned_position !== null ? ` at position ${image.pinned_position + 1}` : ''}`}
          tabIndex={0}
          className="absolute inset-x-0 top-0 flex cursor-grab items-center justify-center bg-gradient-to-b from-black/80 to-transparent py-4 opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          <GripVertical className="h-6 w-6 text-white" aria-hidden="true" />
        </div>
      )}

      {/* Unpin Button (Hover, Reorder Mode) */}
      {reorderMode && image.is_pinned && !deleting && onUnpin && (
        <button
          onClick={() => onUnpin(image.id)}
          disabled={pinning}
          className="absolute bottom-12 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-amber-500 opacity-0 transition-opacity hover:bg-amber-400 group-hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label={`Unpin image${image.pinned_position !== null ? ` at position ${image.pinned_position + 1}` : ''}`}
        >
          {pinning ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
          ) : (
            <X className="h-4 w-4 text-black" aria-hidden="true" />
          )}
        </button>
      )}

      {/* Delete Button (Bottom-right) */}
      {!reorderMode && !deleting && (
        <button
          onClick={() => onDelete(image.id)}
          className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-red-600 opacity-0 transition-opacity hover:bg-red-500 group-hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-red-500"
          aria-label="Delete image from portfolio"
        >
          <svg
            className="h-5 w-5 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      )}

      {/* Deleting Spinner */}
      {deleting && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-700 border-t-white" />
        </div>
      )}

      {/* Import Source Indicator */}
      <div className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-1 text-xs text-neutral-300 opacity-0 transition-opacity group-hover:opacity-100">
        {image.import_source === 'oauth_onboarding' && 'Onboarding'}
        {image.import_source === 'manual_import' && 'Manual'}
        {image.import_source === 'scrape' && 'Scraped'}
        {image.import_source === 'oauth_sync' && 'Auto-sync'}
      </div>
    </div>
  );
}
