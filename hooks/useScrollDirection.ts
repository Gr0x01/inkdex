'use client';

import { useState, useEffect, useCallback } from 'react';

type ScrollDirection = 'up' | 'down' | null;

interface UseScrollDirectionOptions {
  /** Minimum scroll distance before triggering direction change (prevents jitter) */
  threshold?: number;
  /** Distance from top where navbar is always shown */
  topOffset?: number;
}

/**
 * Hook to detect scroll direction with debouncing
 * Used for hide-on-scroll-down, show-on-scroll-up navbar behavior
 */
export function useScrollDirection({
  threshold = 50,
  topOffset = 10,
}: UseScrollDirectionOptions = {}): ScrollDirection {
  const [scrollDirection, setScrollDirection] = useState<ScrollDirection>(null);
  const [lastScrollY, setLastScrollY] = useState(0);

  const updateScrollDirection = useCallback(() => {
    const currentScrollY = window.scrollY;

    // Always show navbar when near top of page
    if (currentScrollY < topOffset) {
      setScrollDirection(null);
      setLastScrollY(currentScrollY);
      return;
    }

    const delta = currentScrollY - lastScrollY;

    // Ignore small movements to prevent jitter
    if (Math.abs(delta) < threshold) {
      return;
    }

    const newDirection: ScrollDirection = delta > 0 ? 'down' : 'up';

    if (newDirection !== scrollDirection) {
      setScrollDirection(newDirection);
    }

    setLastScrollY(currentScrollY);
  }, [lastScrollY, scrollDirection, threshold, topOffset]);

  useEffect(() => {
    // Set initial scroll position
    setLastScrollY(window.scrollY);

    // Check if user prefers reduced motion
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    // If reduced motion, don't hide navbar (accessibility)
    if (prefersReducedMotion) {
      return;
    }

    // Use passive listener for better scroll performance
    window.addEventListener('scroll', updateScrollDirection, { passive: true });

    return () => {
      window.removeEventListener('scroll', updateScrollDirection);
    };
  }, [updateScrollDirection]);

  return scrollDirection;
}
