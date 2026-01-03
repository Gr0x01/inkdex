/**
 * Root Admin Layout
 *
 * This is the base layout for all /admin/* routes.
 * Authentication is handled by the (authenticated) route group layout.
 * The login page bypasses auth since it's not in the (authenticated) group.
 */

export const metadata = {
  title: 'Admin | Inkdex',
  description: 'Inkdex Admin Panel',
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
