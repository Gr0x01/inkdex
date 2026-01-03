import { redirect } from 'next/navigation';

export default function AdminPage() {
  // Redirect to mining dashboard as the default view
  redirect('/admin/mining');
}
