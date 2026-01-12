'use client';

/**
 * Input Dialog - Editorial Design
 *
 * Confirmation modal with text input field
 * Uses the INK & ETHER design language
 */

import { useEffect, useRef, useCallback, useState } from 'react';

interface InputDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  inputLabel?: string;
  inputPlaceholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'default';
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

export default function InputDialog({
  isOpen,
  title,
  message,
  inputLabel,
  inputPlaceholder = '',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  onConfirm,
  onCancel,
}: InputDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [inputValue, setInputValue] = useState('');

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
      setInputValue(''); // Reset on open

      // Focus input after animation
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = '';
        previousFocusRef.current?.focus();
      };
    }
  }, [isOpen, handleKeyDown]);

  const handleConfirm = () => {
    if (inputValue.trim()) {
      onConfirm(inputValue.trim());
      setInputValue('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleConfirm();
  };

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
        role="dialog"
        aria-modal="true"
        aria-labelledby="input-dialog-title"
        aria-describedby="input-dialog-message"
        className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 animate-in zoom-in-95 fade-in duration-200"
      >
        <form onSubmit={handleSubmit} className="bg-paper border border-gray-200 shadow-xl">
          {/* Header - thin top accent line */}
          <div
            className={`h-1 ${variant === 'danger' ? 'bg-status-error' : 'bg-ink'}`}
          />

          {/* Content */}
          <div className="p-6">
            <h2
              id="input-dialog-title"
              className="font-heading text-xl tracking-tight text-ink mb-2"
            >
              {title}
            </h2>
            <p
              id="input-dialog-message"
              className="font-body text-sm text-gray-600 leading-relaxed mb-4"
            >
              {message}
            </p>

            {/* Input field */}
            <div>
              {inputLabel && (
                <label
                  htmlFor="dialog-input"
                  className="block font-mono text-[10px] uppercase tracking-wider text-gray-500 mb-1"
                >
                  {inputLabel}
                </label>
              )}
              <input
                ref={inputRef}
                id="dialog-input"
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={inputPlaceholder}
                className="w-full px-3 py-2 text-sm font-body border border-ink/20 bg-paper text-ink
                         focus:outline-none focus:border-ink/40 placeholder:text-gray-400"
              />
            </div>
          </div>

          {/* Actions - editorial button style */}
          <div className="flex border-t border-gray-200">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-3 font-mono text-xs uppercase tracking-widest text-gray-500 transition-colors hover:bg-gray-50 hover:text-ink focus:outline-none focus:bg-gray-50"
            >
              {cancelLabel}
            </button>
            <div className="w-px bg-gray-200" />
            <button
              type="submit"
              disabled={!inputValue.trim()}
              className={`flex-1 py-3 font-mono text-xs uppercase tracking-widest transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
                variant === 'danger'
                  ? 'text-status-error hover:bg-status-error hover:text-white focus:bg-status-error focus:text-white disabled:hover:bg-transparent disabled:hover:text-status-error'
                  : 'text-ink hover:bg-ink hover:text-paper focus:bg-ink focus:text-paper disabled:hover:bg-transparent disabled:hover:text-ink'
              }`}
            >
              {confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
