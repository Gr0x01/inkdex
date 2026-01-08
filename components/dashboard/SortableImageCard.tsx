'use client';

/**
 * Sortable Image Card - Dashboard Design
 *
 * Clean, functional drag-drop card for portfolio reordering
 * Features a unified FAB that expands on hover to show actions
 */

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Image from 'next/image';
import { getPortfolioImageUrl } from '@/lib/utils/images';
import { Pin, Trash2, GripVertical } from 'lucide-react';

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
  isPro: boolean;
  canPin: boolean;
  onDelete: (imageId: string) => void;
  onTogglePin: (imageId: string) => void;
  deleting?: boolean;
  pinning?: boolean;
  editMode?: boolean;
}

export default function SortableImageCard({
  image,
  isPro,
  canPin,
  onDelete,
  onTogglePin,
  deleting = false,
  pinning = false,
  editMode = false,
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
  const isPinned = image.is_pinned;
  const position = image.pinned_position !== null ? image.pinned_position + 1 : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative aspect-square overflow-hidden border border-gray-200 hover:border-gray-400 transition-all bg-gray-50 ${
        deleting ? 'opacity-50' : ''
      } ${isDragging ? 'z-50 shadow-2xl ring-2 ring-amber-500' : 'hover:shadow-md'}`}
    >
      {/* Image */}
      <Image
        src={thumbnailUrl}
        alt="Portfolio image"
        fill
        className="object-cover"
        sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
      />

      {/* Unified FAB - Top Right */}
      {!deleting && (
        <div
          className={`absolute right-2 top-2 flex h-8 items-center overflow-hidden rounded-full shadow-lg transition-all duration-200 ease-out ${
            isPinned
              ? editMode
                ? 'w-auto bg-ink'
                : 'w-8 bg-ink/90 group-hover:w-auto group-hover:bg-ink'
              : editMode
                ? 'opacity-100 bg-ink/90'
                : 'opacity-0 group-hover:opacity-100 bg-ink/90'
          }`}
          role="toolbar"
          aria-label="Image actions"
        >
          {/* Position Number (pinned only) */}
          {isPinned && position !== null && (
            <span
              className="flex h-8 w-8 items-center justify-center font-mono text-[14px] font-bold text-paper"
              aria-label={`Position ${position}`}
            >
              {position}
            </span>
          )}

          {/* Divider + Actions (visible on hover or edit mode) */}
          <div
            className={`flex items-center gap-2 transition-all duration-200 ease-out ${
              isPinned
                ? editMode
                  ? 'max-w-[150px] opacity-100'
                  : 'max-w-0 overflow-hidden opacity-0 group-hover:max-w-[150px] group-hover:opacity-100'
                : ''
            }`}
          >
            {/* Divider (pinned only) */}
            {isPinned && (
              <div className="h-4 w-px bg-paper/30" aria-hidden="true" />
            )}

            {/* Drag Handle (Pro + pinned only) */}
            {isPro && isPinned && (
              <div
                {...attributes}
                {...listeners}
                role="button"
                aria-label={`Drag to reorder image${position ? ` at position ${position}` : ''}`}
                tabIndex={0}
                className="flex h-8 w-8 cursor-grab items-center justify-center text-paper transition-colors hover:bg-white/10 active:cursor-grabbing"
              >
                <GripVertical className="h-3.5 w-3.5" aria-hidden="true" />
              </div>
            )}

            {/* Pin/Unpin Button */}
            {(isPinned || canPin) && (
              <button
                onClick={() => onTogglePin(image.id)}
                disabled={pinning}
                className="flex h-8 w-8 items-center justify-center text-paper transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label={isPinned ? 'Unpin image' : 'Pin image'}
              >
                {pinning ? (
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-paper border-t-transparent" />
                ) : (
                  <Pin
                    className="h-3.5 w-3.5"
                    fill={isPinned ? 'currentColor' : 'none'}
                    aria-hidden="true"
                  />
                )}
              </button>
            )}

            {/* Delete Button */}
            <button
              onClick={() => onDelete(image.id)}
              className="flex h-8 w-8 items-center justify-center text-paper transition-colors hover:bg-error/80 hover:text-white"
              aria-label="Delete image"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}


      {/* Deleting Spinner */}
      {deleting && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-white" />
        </div>
      )}

    </div>
  );
}
