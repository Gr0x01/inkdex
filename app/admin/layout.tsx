/**
 * Root Admin Layout
 *
 * This layout wraps ALL /admin/* routes.
 * The ConditionalLayout in app/layout.tsx detects /admin routes
 * and excludes the main site navigation (navbar, footer, search).
 *
 * Authentication is handled by the (authenticated) route group layout.
 * The login page bypasses auth since it's not in the (authenticated) group.
 */

export const metadata = {
  title: 'Admin | Inkdex',
  description: 'Inkdex Admin Panel',
  robots: 'noindex, nofollow', // Admin pages should not be indexed
};

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
