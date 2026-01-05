'use client';

import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { useScrollDirection } from '@/hooks/useScrollDirection';

interface NavbarContextValue {
  isNavbarHidden: boolean;
  isCompact: boolean; // True when scrolled past threshold (mobile shrinks)
}

const NavbarContext = createContext<NavbarContextValue>({
  isNavbarHidden: false,
  isCompact: false,
});

/**
 * Provider for navbar visibility state
 * Used by secondary sticky elements to adjust their position
 */
export function NavbarVisibilityProvider({ children }: { children: ReactNode }) {
  const scrollDirection = useScrollDirection({ threshold: 50, topOffset: 10 });
  const isNavbarHidden = scrollDirection === 'down';
  const [isCompact, setIsCompact] = useState(false);

  // Track scroll position to determine compact mode
  useEffect(() => {
    const handleScroll = () => {
      // Switch to compact mode after scrolling 50px
      setIsCompact(window.scrollY > 50);
    };

    // Check initial position
    handleScroll();

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <NavbarContext.Provider value={{ isNavbarHidden, isCompact }}>
      {children}
    </NavbarContext.Provider>
  );
}

/**
 * Hook to access navbar visibility state
 * Returns isNavbarHidden (scrolling down) and isCompact (scrolled past threshold)
 */
export function useNavbarVisibility() {
  return useContext(NavbarContext);
}
