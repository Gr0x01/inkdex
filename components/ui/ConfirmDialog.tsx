'use client';

/**
 * Confirm Dialog - Editorial Design
 *
 * Minimal, typographically-focused confirmation modal
 * Uses the INK & ETHER design language with dramatic timing
 */

import { useEffect, useRef, useCallback } from 'react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'default';
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // ESC key handler
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    },
    [onCancel]
  );

  // Focus trap and scroll lock
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';

      // Focus confirm button after animation
      setTimeout(() => {
        confirmButtonRef.current?.focus();
      }, 100);

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = '';
        previousFocusRef.current?.focus();
      };
    }
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
        className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 animate-in zoom-in-95 fade-in duration-200"
      >
        <div className="bg-paper border border-gray-200 shadow-xl">
          {/* Header - thin top accent line */}
          <div
            className={`h-1 ${variant === 'danger' ? 'bg-error' : 'bg-ink'}`}
          />

          {/* Content */}
          <div className="p-6">
            <h2
              id="confirm-title"
              className="font-heading text-xl tracking-tight text-ink mb-2"
            >
              {title}
            </h2>
            <p
              id="confirm-message"
              className="font-body text-sm text-gray-600 leading-relaxed"
            >
              {message}
            </p>
          </div>

          {/* Actions - editorial button style */}
          <div className="flex border-t border-gray-200">
            <button
              onClick={onCancel}
              className="flex-1 py-3 font-mono text-xs uppercase tracking-widest text-gray-500 transition-colors hover:bg-gray-50 hover:text-ink focus:outline-none focus:bg-gray-50"
            >
              {cancelLabel}
            </button>
            <div className="w-px bg-gray-200" />
            <button
              ref={confirmButtonRef}
              onClick={onConfirm}
              className={`flex-1 py-3 font-mono text-xs uppercase tracking-widest transition-colors focus:outline-none ${
                variant === 'danger'
                  ? 'text-red-600 hover:bg-red-600 hover:text-white focus:bg-red-600 focus:text-white'
                  : 'text-ink hover:bg-ink hover:text-paper focus:bg-ink focus:text-paper'
              }`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
