import { headers } from 'next/headers';
import NavbarWithAuth from '@/components/layout/NavbarWithAuth';
import Footer from '@/components/layout/Footer';
import { SearchProvider } from '@/components/search/SearchProvider';
import GlobalSearchModal from '@/components/search/GlobalSearchModal';
import { CookieBanner } from '@/components/consent/CookieBanner';

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

  // All other pages get the full site layout
  return (
    <SearchProvider>
      <NavbarWithAuth />
      <GlobalSearchModal />
      {children}
      <Footer />
      <CookieBanner />
    </SearchProvider>
  );
}
