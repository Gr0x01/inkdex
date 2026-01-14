'use client';

/**
 * Compact Admin Select Component
 * Minimal dropdown for admin interfaces - smaller, denser styling
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface SelectOption {
  value: string;
  label: string;
}

interface AdminSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  className?: string;
}

export default function AdminSelect({
  value,
  onChange,
  options,
  className = '',
}: AdminSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  const closeDropdown = useCallback(() => {
    setIsOpen(false);
    setHighlightedIndex(-1);
  }, []);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        closeDropdown();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [closeDropdown]);

  // Handle keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!isOpen) {
      if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
        event.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        closeDropdown();
        break;
      case 'ArrowDown':
        event.preventDefault();
        setHighlightedIndex((prev) =>
          prev < options.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        event.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : options.length - 1
        );
        break;
      case 'Enter':
        event.preventDefault();
        if (highlightedIndex >= 0 && options[highlightedIndex]) {
          onChange(options[highlightedIndex].value);
          closeDropdown();
        }
        break;
      case 'Tab':
        closeDropdown();
        break;
    }
  };

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div ref={containerRef} className={`relative ${className}`} onKeyDown={handleKeyDown}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-2 py-1.5 bg-paper border border-ink/10 text-left font-body text-[13px] text-ink
                   transition-colors hover:border-ink/30 focus:outline-none focus:border-ink/30
                   flex items-center justify-between gap-1"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={selectedOption ? '' : 'text-gray-400'}>
          {selectedOption ? selectedOption.label : 'Select...'}
        </span>
        <ChevronDown
          className={`w-3 h-3 text-gray-400 transition-transform duration-150 shrink-0 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-0.5 bg-paper border border-ink/20 shadow-md">
          <div className="py-0.5" role="listbox">
            {options.map((option, index) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  closeDropdown();
                }}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={`w-full px-2 py-1 text-left font-body text-[13px] transition-colors duration-75
                  flex items-center justify-between gap-2 ${
                  value === option.value && option.value !== ''
                    ? 'bg-ink text-paper'
                    : highlightedIndex === index
                    ? 'bg-gray-100 text-ink'
                    : 'text-ink hover:bg-gray-50'
                }`}
                role="option"
                aria-selected={value === option.value}
              >
                <span>{option.label}</span>
                {value === option.value && option.value !== '' && (
                  <Check className="w-2.5 h-2.5 shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
