'use client';

/**
 * Custom Select Component - Editorial Design
 *
 * Replaces native <select> with a fully styled dropdown
 * Sharp corners, monospace labels, editorial aesthetic
 */

import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string | null;
  onChange: (value: string | null) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
}

export default function Select({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  className = '',
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-[var(--paper-white)] border-2 border-[var(--border-subtle)] text-left font-body text-[1.0625rem] text-[var(--text-primary)] transition-all duration-150 hover:border-[var(--gray-500)] focus:outline-none focus:border-[var(--ink-black)] focus:shadow-sm flex items-center justify-between"
        style={{ padding: 'var(--space-sm) var(--space-sm)' }}
      >
        <span className={selectedOption ? '' : 'text-[var(--text-tertiary)] italic'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-[var(--gray-500)] transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-[var(--paper-white)] border-2 border-[var(--ink-black)] shadow-lg max-h-60 overflow-auto">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value || null);
                setIsOpen(false);
              }}
              className={`w-full px-4 py-2.5 text-left font-body text-[1.0625rem] transition-colors duration-100 ${
                value === option.value
                  ? 'bg-[var(--ink-black)] text-[var(--paper-white)]'
                  : 'text-[var(--text-primary)] hover:bg-[var(--gray-100)]'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
