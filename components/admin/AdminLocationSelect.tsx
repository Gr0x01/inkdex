'use client';

/**
 * Admin Location Select with Typeahead
 * Fetches unique locations from the database and allows filtering
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, X } from 'lucide-react';

interface AdminLocationSelectProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

interface LocationOption {
  city: string;
  state: string;
  count: number;
}

export default function AdminLocationSelect({
  value,
  onChange,
  className = '',
}: AdminLocationSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch locations on mount
  useEffect(() => {
    async function fetchLocations() {
      setLoading(true);
      try {
        const res = await fetch('/api/admin/locations');
        if (res.ok) {
          const data = await res.json();
          setLocations(data.locations || []);
        }
      } catch (err) {
        console.error('Failed to fetch locations:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchLocations();
  }, []);

  // Filter locations based on search
  const filteredLocations = searchQuery
    ? locations.filter(
        (loc) =>
          loc.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
          loc.state.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : locations;

  const closeDropdown = useCallback(() => {
    setIsOpen(false);
    setSearchQuery('');
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

  // Focus input when opening
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Keyboard navigation
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
          prev < filteredLocations.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        event.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredLocations.length - 1
        );
        break;
      case 'Enter':
        event.preventDefault();
        if (highlightedIndex >= 0 && filteredLocations[highlightedIndex]) {
          const loc = filteredLocations[highlightedIndex];
          onChange(`${loc.city}, ${loc.state}`);
          closeDropdown();
        }
        break;
      case 'Tab':
        closeDropdown();
        break;
    }
  };

  const displayValue = value || 'All Locations';

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
        <span className={value ? 'truncate' : 'text-gray-400 truncate'}>
          {displayValue}
        </span>
        <div className="flex items-center gap-0.5 flex-shrink-0">
          {value && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
              className="p-0.5 hover:bg-gray-100 text-gray-400 hover:text-ink"
            >
              <X className="w-3 h-3" />
            </button>
          )}
          <ChevronDown
            className={`w-3 h-3 text-gray-400 transition-transform duration-150 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </div>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-48 mt-0.5 bg-paper border border-ink/20 shadow-md">
          {/* Search Input */}
          <div className="p-1.5 border-b border-ink/10">
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setHighlightedIndex(0);
              }}
              placeholder="Search..."
              className="w-full px-2 py-1 font-body text-[12px] border border-ink/10
                         focus:outline-none focus:border-ink/20 text-ink placeholder-gray-400"
            />
          </div>

          {/* Options List */}
          <div className="max-h-48 overflow-auto py-0.5" role="listbox">
            {/* All option */}
            <button
              type="button"
              onClick={() => {
                onChange('');
                closeDropdown();
              }}
              onMouseEnter={() => setHighlightedIndex(-1)}
              className={`w-full px-2 py-1 text-left font-body text-[13px] transition-colors duration-75
                flex items-center justify-between ${
                !value
                  ? 'bg-ink text-paper'
                  : 'text-ink hover:bg-gray-50'
              }`}
            >
              <span>All Locations</span>
              <span className="font-mono text-[10px] opacity-60">
                {locations.reduce((sum, l) => sum + l.count, 0)}
              </span>
            </button>

            {loading ? (
              <div className="px-2 py-3 text-center text-gray-400 text-[12px]">
                Loading...
              </div>
            ) : filteredLocations.length === 0 ? (
              <div className="px-2 py-3 text-center text-gray-400 text-[12px]">
                No matches
              </div>
            ) : (
              filteredLocations.map((loc, index) => {
                const locValue = `${loc.city}, ${loc.state}`;
                return (
                  <button
                    key={locValue}
                    type="button"
                    onClick={() => {
                      onChange(locValue);
                      closeDropdown();
                    }}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`w-full px-2 py-1 text-left font-body text-[13px] transition-colors duration-75
                      flex items-center justify-between ${
                      value === locValue
                        ? 'bg-ink text-paper'
                        : highlightedIndex === index
                        ? 'bg-gray-100 text-ink'
                        : 'text-ink hover:bg-gray-50'
                    }`}
                    role="option"
                    aria-selected={value === locValue}
                  >
                    <span className="truncate">{locValue}</span>
                    <span className={`font-mono text-[10px] flex-shrink-0 ${
                      value === locValue ? 'opacity-60' : 'text-gray-400'
                    }`}>
                      {loc.count}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
