'use client';

/**
 * Custom Select Component - Editorial Design
 *
 * Replaces native <select> with a fully styled dropdown
 * Sharp corners, monospace labels, editorial aesthetic
 * Supports typeahead search for faster selection
 * Uses React Portal to avoid overflow clipping issues
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
  searchable?: boolean;
  searchPlaceholder?: string;
  size?: 'default' | 'sm';
}

export default function Select({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  className = '',
  searchable = false,
  searchPlaceholder = 'Type to search...',
  size = 'default',
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState(false);

  // Track mounted state for portal
  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  // Update dropdown position when opened
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 4, // 4px gap (mt-1)
        left: rect.left + window.scrollX,
        width: rect.width, // min-width will be the button width
      });
    }
  }, [isOpen]);

  // Filter options based on search query
  const filteredOptions = searchable && searchQuery
    ? options.filter((opt) =>
        opt.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        opt.value.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : options;

  // Reset search and highlight when closing
  const closeDropdown = useCallback(() => {
    setIsOpen(false);
    setSearchQuery('');
    setHighlightedIndex(-1);
  }, []);

  // Close on outside click (check both container and dropdown portal)
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      const clickedContainer = containerRef.current && containerRef.current.contains(target);
      const clickedDropdown = dropdownRef.current && dropdownRef.current.contains(target);

      if (!clickedContainer && !clickedDropdown) {
        closeDropdown();
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, closeDropdown]);

  // Focus search input when opening
  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen, searchable]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll('[data-option]');
      const item = items[highlightedIndex] as HTMLElement;
      if (item) {
        item.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex]);

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
          prev < filteredOptions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        event.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredOptions.length - 1
        );
        break;
      case 'Enter':
        event.preventDefault();
        if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
          onChange(filteredOptions[highlightedIndex].value || null);
          closeDropdown();
        }
        break;
      case 'Tab':
        closeDropdown();
        break;
    }
  };

  const selectedOption = options.find((opt) => opt.value === value);

  // Size-specific classes
  const triggerClasses = size === 'sm'
    ? 'px-2 py-1 text-[13px]'
    : 'px-3 py-2.5 text-[1.0625rem]';

  const optionClasses = size === 'sm'
    ? 'px-2 py-1 text-[13px]'
    : 'px-4 py-2.5 text-[1.0625rem]';

  // Render dropdown content
  const dropdownContent = isOpen && isMounted && (
    <div
      ref={dropdownRef}
      className="fixed z-[100] bg-[var(--paper-white)] border-2 border-[var(--ink-black)] shadow-lg"
      style={{
        top: `${dropdownPosition.top}px`,
        left: `${dropdownPosition.left}px`,
        width: `${dropdownPosition.width}px`,
      }}
    >
          {/* Search Input */}
          {searchable && (
            <div className="p-1.5 border-b border-[var(--gray-200)]">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setHighlightedIndex(0);
                }}
                placeholder={searchPlaceholder}
                className="w-full px-2 py-1 font-body text-[13px] border border-[var(--gray-200)] focus:outline-none focus:border-[var(--gray-400)]"
              />
            </div>
          )}

          {/* Options List */}
          <div ref={listRef} className="max-h-60 overflow-auto" role="listbox">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-3 text-[var(--gray-500)] italic font-body text-sm">
                No matches found
              </div>
            ) : (
              filteredOptions.map((option, index) => (
                <button
                  key={option.value}
                  type="button"
                  data-option
                  onClick={() => {
                    onChange(option.value || null);
                    closeDropdown();
                  }}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`w-full text-left font-body transition-colors duration-100 overflow-hidden text-ellipsis whitespace-nowrap ${optionClasses} ${
                    value === option.value
                      ? 'bg-[var(--ink-black)] text-[var(--paper-white)]'
                      : highlightedIndex === index
                      ? 'bg-[var(--gray-100)] text-[var(--text-primary)]'
                      : 'text-[var(--text-primary)] hover:bg-[var(--gray-100)]'
                  }`}
                  role="option"
                  aria-selected={value === option.value}
                  title={option.label}
                >
                  {option.label}
                </button>
              ))
            )}
          </div>
        </div>
  );

  return (
    <div ref={containerRef} className={`relative ${className}`} onKeyDown={handleKeyDown}>
      {/* Trigger Button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full bg-[var(--paper-white)] border-2 border-[var(--border-subtle)] text-left font-body text-[var(--text-primary)] transition-all duration-150 hover:border-[var(--gray-500)] focus:outline-none focus:border-[var(--ink-black)] focus:shadow-sm flex items-center justify-between gap-2 ${triggerClasses}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={selectedOption ? 'truncate' : 'text-[var(--text-tertiary)] italic truncate'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`w-3 h-3 text-[var(--gray-500)] flex-shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu - Rendered via Portal */}
      {typeof window !== 'undefined' && dropdownContent && createPortal(dropdownContent, document.body)}
    </div>
  );
}
