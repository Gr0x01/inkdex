import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/admin/whitelist';
import AdminLayoutComponent from '@/components/admin/AdminLayout';

export default async function AuthenticatedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Require authentication and admin email
  if (!user || !isAdminEmail(user.email)) {
    redirect('/admin/login');
  }

  return (
    <AdminLayoutComponent userEmail={user.email || 'Unknown'}>
      {children}
    </AdminLayoutComponent>
  );
}
