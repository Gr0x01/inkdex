'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, SkipForward, Check, Loader2, Trash2 } from 'lucide-react';
import { ALL_LABELING_STYLES as _ALL_LABELING_STYLES, STYLE_DISPLAY_NAMES } from '@/lib/constants/styles';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

interface CurrentImage {
  id: string;
  thumbnailUrl: string | null;
  artist: {
    id: string;
    name: string;
    instagram_handle: string;
  };
  currentTags: { style_name: string; confidence: number }[];
}

interface Stats {
  totalImages: number;
  labeledCount: number;
  skippedCount: number;
  remaining: number;
  styleDistribution: { style: string; count: number }[];
  targetPerStyle: number;
}

// Keyboard shortcuts mapping
const STYLE_SHORTCUTS: Record<string, string> = {
  '1': 'traditional',
  '2': 'neo-traditional',
  '3': 'realism',
  '4': 'black-and-gray',
  '5': 'blackwork',
  '6': 'new-school',
  '7': 'watercolor',
  '8': 'ornamental',
  '9': 'fine-line',
  'q': 'tribal',
  'w': 'biomechanical',
  'e': 'trash-polka',
  'r': 'sketch',
  't': 'geometric',
  'y': 'dotwork',
  'u': 'surrealism',
  'i': 'lettering',
  'o': 'anime',
  'p': 'japanese',
};

export default function StyleLabelingPage() {
  const [currentImage, setCurrentImage] = useState<CurrentImage | null>(null);
  const [selectedStyles, setSelectedStyles] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [history, setHistory] = useState<string[]>([]); // IDs of labeled images
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Fetch next image
  const fetchNextImage = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/label');
      const data = await res.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      if (!data.image) {
        setCurrentImage(null);
        return;
      }

      setCurrentImage(data.image);
      setSelectedStyles(new Set());
    } catch (err) {
      setError('Failed to fetch image');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/label/stats');
      const data = await res.json();
      if (!data.error) {
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchNextImage();
    fetchStats();
  }, [fetchNextImage, fetchStats]);

  // Save label and move to next
  const saveAndNext = useCallback(
    async (skipped = false) => {
      if (!currentImage || saving) return;

      setSaving(true);
      try {
        const res = await fetch('/api/admin/label', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageId: currentImage.id,
            styles: Array.from(selectedStyles),
            skipped,
          }),
        });

        const data = await res.json();
        if (data.error) {
          setError(data.error);
          return;
        }

        // Track history
        setHistory((prev) => [...prev, currentImage.id]);

        // Refresh stats occasionally
        if ((history.length + 1) % 10 === 0) {
          fetchStats();
        }

        // Move to next
        fetchNextImage();
      } catch (err) {
        setError('Failed to save label');
        console.error(err);
      } finally {
        setSaving(false);
      }
    },
    [currentImage, selectedStyles, saving, history.length, fetchNextImage, fetchStats]
  );

  // Show delete confirmation dialog
  const promptDelete = useCallback(() => {
    if (!currentImage || deleting || saving) return;
    setShowDeleteDialog(true);
  }, [currentImage, deleting, saving]);

  // Actually delete the image (called after confirmation)
  const confirmDelete = useCallback(async () => {
    if (!currentImage || deleting) return;

    setShowDeleteDialog(false);
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/label', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageId: currentImage.id }),
      });

      const data = await res.json();
      if (data.error) {
        setError(data.error);
        return;
      }

      // Move to next image
      fetchNextImage();
    } catch (err) {
      setError('Failed to delete image');
      console.error(err);
    } finally {
      setDeleting(false);
    }
  }, [currentImage, deleting, fetchNextImage]);

  // Toggle a style
  const toggleStyle = useCallback((style: string) => {
    setSelectedStyles((prev) => {
      const next = new Set(prev);
      if (next.has(style)) {
        next.delete(style);
      } else {
        next.add(style);
      }
      return next;
    });
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const key = e.key.toLowerCase();

      // Style shortcuts
      if (STYLE_SHORTCUTS[key]) {
        e.preventDefault();
        toggleStyle(STYLE_SHORTCUTS[key]);
        return;
      }

      // Navigation shortcuts
      if (key === ' ' || key === 'enter') {
        e.preventDefault();
        if (selectedStyles.size > 0) {
          saveAndNext(false);
        }
        return;
      }

      if (key === 's') {
        e.preventDefault();
        saveAndNext(true); // Skip
        return;
      }

      if (key === 'd') {
        e.preventDefault();
        promptDelete(); // Show delete confirmation
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleStyle, saveAndNext, promptDelete, selectedStyles.size]);

  // Render style button
  const renderStyleButton = (style: string, shortcut: string) => {
    const isSelected = selectedStyles.has(style);
    const displayName = STYLE_DISPLAY_NAMES[style] || style;
    const currentTag = currentImage?.currentTags.find((t) => t.style_name === style);

    return (
      <button
        key={style}
        onClick={() => toggleStyle(style)}
        className={`
          relative px-3 py-2 text-xs font-body rounded transition-all
          ${
            isSelected
              ? 'bg-ink text-paper ring-2 ring-ink ring-offset-1'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }
        `}
      >
        <span className="font-mono text-[10px] text-gray-400 mr-1">{shortcut}</span>
        {displayName}
        {currentTag && (
          <span className="ml-1 text-[10px] text-gray-400">
            ({Math.round(currentTag.confidence * 100)}%)
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/styles"
              className="text-gray-400 hover:text-ink transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 className="font-heading text-base font-bold text-ink">Style Labeling</h1>
          </div>
          <p className="text-[12px] text-gray-500 font-body mt-0.5">
            Label images to train the ML style classifier
          </p>
        </div>

        {/* Stats */}
        {stats && (
          <div className="text-right text-[11px] font-body text-gray-500">
            <div>
              <span className="font-semibold text-ink">{stats.labeledCount}</span> labeled
              <span className="mx-1">/</span>
              <span className="text-gray-400">{stats.skippedCount} skipped</span>
            </div>
            <div className="text-[10px]">
              {stats.remaining.toLocaleString()} remaining
            </div>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 text-xs rounded">
          {error}
        </div>
      )}

      {/* Main content */}
      {loading ? (
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : !currentImage ? (
        <div className="text-center py-16">
          <p className="text-gray-500 font-body">No more images to label!</p>
          <p className="text-[12px] text-gray-400 mt-1">
            All {stats?.labeledCount || 0} images have been labeled.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-[1fr,320px] gap-6">
          {/* Image */}
          <div className="space-y-3">
            <div className="relative aspect-square bg-gray-100 rounded overflow-hidden max-w-xl">
              {currentImage.thumbnailUrl ? (
                <Image
                  src={currentImage.thumbnailUrl}
                  alt="Tattoo image to label"
                  fill
                  className="object-contain"
                  priority
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  No image available
                </div>
              )}
            </div>

            {/* Artist info */}
            <div className="text-[12px] text-gray-500 font-body">
              <a
                href={`https://instagram.com/${currentImage.artist.instagram_handle}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-ink transition-colors"
              >
                @{currentImage.artist.instagram_handle}
              </a>
              <span className="mx-1">·</span>
              <span>{currentImage.artist.name}</span>
            </div>

            {/* Current auto-tags */}
            {currentImage.currentTags.length > 0 && (
              <div className="text-[11px] text-gray-400">
                Current tags:{' '}
                {currentImage.currentTags.map((t) => (
                  <span key={t.style_name} className="mr-2">
                    {t.style_name} ({Math.round(t.confidence * 100)}%)
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Style selection panel */}
          <div className="space-y-4">
            {/* Core styles */}
            <div>
              <h3 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Core Styles (1-9)
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {renderStyleButton('traditional', '1')}
                {renderStyleButton('neo-traditional', '2')}
                {renderStyleButton('realism', '3')}
                {renderStyleButton('black-and-gray', '4')}
                {renderStyleButton('blackwork', '5')}
                {renderStyleButton('new-school', '6')}
                {renderStyleButton('watercolor', '7')}
                {renderStyleButton('ornamental', '8')}
                {renderStyleButton('fine-line', '9')}
              </div>
            </div>

            {/* Niche styles */}
            <div>
              <h3 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Niche Styles (Q-I)
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {renderStyleButton('tribal', 'Q')}
                {renderStyleButton('biomechanical', 'W')}
                {renderStyleButton('trash-polka', 'E')}
                {renderStyleButton('sketch', 'R')}
                {renderStyleButton('geometric', 'T')}
                {renderStyleButton('dotwork', 'Y')}
                {renderStyleButton('surrealism', 'U')}
                {renderStyleButton('lettering', 'I')}
              </div>
            </div>

            {/* Content-based styles */}
            <div>
              <h3 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Content-Based (O-P)
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {renderStyleButton('anime', 'O')}
                {renderStyleButton('japanese', 'P')}
              </div>
            </div>

            {/* Action buttons */}
            <div className="pt-4 border-t border-gray-200 space-y-2">
              <button
                onClick={() => saveAndNext(false)}
                disabled={saving || selectedStyles.size === 0}
                className={`
                  w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded font-body text-sm
                  transition-all
                  ${
                    selectedStyles.size > 0
                      ? 'bg-ink text-paper hover:bg-ink/90'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }
                `}
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Save & Next
                    <span className="text-[10px] opacity-60">(Space)</span>
                  </>
                )}
              </button>

              <button
                onClick={() => saveAndNext(true)}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded font-body text-xs
                  text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <SkipForward className="w-3.5 h-3.5" />
                Skip
                <span className="text-[10px] opacity-60">(S)</span>
              </button>

              <button
                onClick={promptDelete}
                disabled={deleting || saving}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded font-body text-xs
                  text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors"
              >
                {deleting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                Delete (not a tattoo)
                <span className="text-[10px] opacity-60">(D)</span>
              </button>
            </div>

            {/* Session progress */}
            <div className="text-[11px] text-gray-400 text-center">
              Session: {history.length} labeled
            </div>

            {/* Keyboard shortcuts reference */}
            <div className="text-[10px] text-gray-400 pt-2 border-t border-gray-100">
              <div className="font-semibold mb-1">Shortcuts:</div>
              <div>1-9: Core styles · Q-P: Other styles</div>
              <div>Space/Enter: Save · S: Skip · D: Delete</div>
            </div>
          </div>
        </div>
      )}

      {/* Style distribution */}
      {stats && stats.styleDistribution.length > 0 && (
        <div className="pt-4 border-t border-gray-200">
          <h3 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Label Distribution (Target: {stats.targetPerStyle}/style)
          </h3>
          <div className="grid grid-cols-4 gap-2 text-[11px]">
            {stats.styleDistribution.map(({ style, count }) => (
              <div key={style} className="flex items-center gap-2">
                <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-ink h-full transition-all"
                    style={{ width: `${Math.min((count / stats.targetPerStyle) * 100, 100)}%` }}
                  />
                </div>
                <span className="text-gray-500 w-24 truncate">
                  {STYLE_DISPLAY_NAMES[style] || style}
                </span>
                <span className="text-gray-400 font-mono w-8 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        title="Delete Image"
        message="Delete this image permanently? This cannot be undone. Only use for non-tattoo images (digital art, photos, etc)."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setShowDeleteDialog(false)}
      />
    </div>
  );
}
