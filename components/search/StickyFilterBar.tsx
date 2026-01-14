'use client';

import { ReactNode } from 'react';
import { useNavbarVisibility } from '@/components/layout/NavbarContext';

interface StickyFilterBarProps {
  children: ReactNode;
}

/**
 * Client component wrapper for sticky filter bars
 * Adjusts position based on navbar visibility (hidden on scroll down)
 * Uses compact height on mobile when scrolled
 */
export function StickyFilterBar({ children }: StickyFilterBarProps) {
  const { isNavbarHidden, isCompact } = useNavbarVisibility();

  // Determine top position based on navbar state
  const getTopClass = () => {
    if (isNavbarHidden) return 'top-0';
    // On mobile, use compact height when scrolled
    if (isCompact) return 'top-(--navbar-height-compact) md:top-(--navbar-height-desktop)';
    return 'top-(--navbar-height) md:top-(--navbar-height-desktop)';
  };

  return (
    <div
      className={`sticky z-40 bg-[#F8F7F5] backdrop-blur-md border-b border-ink/10 shadow-sm transition-[top] duration-300 ${getTopClass()}`}
    >
      {children}
    </div>
  );
}
