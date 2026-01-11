import { headers } from 'next/headers';
import NavbarWithAuth from '@/components/layout/NavbarWithAuth';
import Footer from '@/components/layout/Footer';
import { SearchProvider } from '@/components/search/SearchProvider';
import GlobalSearchModal from '@/components/search/GlobalSearchModal';
import { CookieBanner } from '@/components/consent/CookieBanner';
import { NavbarVisibilityProvider } from '@/components/layout/NavbarContext';
import { createClient } from '@/lib/supabase/server';

interface ConditionalLayoutProps {
  children: React.ReactNode;
}

/**
 * Server Component that conditionally renders the main site layout
 * (navbar, footer, search) based on the current pathname.
 * Admin routes get a clean slate without site navigation.
 */
export default async function ConditionalLayout({ children }: ConditionalLayoutProps) {
  // Get the pathname from headers (set by Next.js middleware)
  const headersList = await headers();
  const pathname = headersList.get('x-pathname') || headersList.get('x-invoke-path') || '';

  // Admin routes should NOT have the main site navigation
  const isAdminRoute = pathname.startsWith('/admin');

  if (isAdminRoute) {
    // Admin pages render without site chrome
    return <>{children}</>;
  }

  // Fetch real state data for footer (only states with artists that have images)
  const supabase = await createClient();
  const { data: statesData } = await supabase.rpc('get_location_counts', {
    p_grouping: 'regions',
    p_country_code: 'US'
  });

  // Map to Footer's expected format (location_code -> region, display_name -> region_name)
  const statesForFooter = (statesData || []).map((s: { location_code: string; display_name: string; artist_count: number }) => ({
    region: s.location_code,
    region_name: s.display_name,
    artist_count: s.artist_count
  }));

  // All other pages get the full site layout
  return (
    <SearchProvider>
      <NavbarVisibilityProvider>
        <NavbarWithAuth />
        <GlobalSearchModal />
        {children}
        <Footer statesWithArtists={statesForFooter} />
        <CookieBanner />
      </NavbarVisibilityProvider>
    </SearchProvider>
  );
}
